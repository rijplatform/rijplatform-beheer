// CBR WSAPI — VERBINDINGSTEST (alleen-lezen, stap 0)
// Zet in Vercel (Settings → Environment Variables):
//   CBR_GEBRUIKER   = je TOP-gebruikersnaam
//   CBR_WACHTWOORD  = je TOP-wachtwoord
// Daarna: Deployments → Redeploy. Open vervolgens in je browser:
//   https://JOUWSITE.vercel.app/api/cbr-test
// en stuur het resultaat (JSON) door — daarmee bepalen we de volgende stap.
//
// Deze test doet twee onschuldige dingen:
//   1. WSDL ophalen (het "technische contract") — bewijst dat CBR bereikbaar is
//   2. GetUserInformation aanroepen — bewijst dat je inloggegevens werken
// Er wordt NIETS ingediend, gereserveerd of gewijzigd.

const xmlEscape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

module.exports = async (req, res) => {
  const gebruiker = process.env.CBR_GEBRUIKER;
  const wachtwoord = process.env.CBR_WACHTWOORD;

  const uitkomst = { stap1_wsdl: null, stap2_login: null, advies: "" };

  // ---- Stap 1: WSDL bereikbaar? ----
  try {
    const r = await fetch("https://top.cbr.nl/wsapi/authenticationservice.svc?wsdl", {
      method: "GET",
      headers: { "User-Agent": "RijPlatform-Koppeling/0.1" },
    });
    const tekst = await r.text();
    uitkomst.stap1_wsdl = {
      status: r.status,
      lijktWsdl: tekst.includes("wsdl") || tekst.includes("definitions"),
      eersteStuk: tekst.slice(0, 400),
    };
  } catch (e) {
    uitkomst.stap1_wsdl = { fout: e.message };
  }

  // ---- Stap 2: inloggen met UsernameToken (GetUserInformation) ----
  if (!gebruiker || !wachtwoord) {
    uitkomst.stap2_login = { overgeslagen: "CBR_GEBRUIKER en/of CBR_WACHTWOORD ontbreken in Vercel." };
  } else {
    const envelop =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
      '<s:Header>' +
      '<wsse:Security s:mustUnderstand="1" ' +
      'xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">' +
      '<wsse:UsernameToken>' +
      `<wsse:Username>${xmlEscape(gebruiker)}</wsse:Username>` +
      '<wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">' +
      xmlEscape(wachtwoord) +
      "</wsse:Password>" +
      "</wsse:UsernameToken>" +
      "</wsse:Security>" +
      "</s:Header>" +
      "<s:Body>" +
      '<UserInformationRequest xmlns="http://cbr.nl/wsapi" />' +
      "</s:Body>" +
      "</s:Envelope>";

    // Meerdere gangbare SOAPAction-varianten proberen; het WSDL-resultaat
    // van stap 1 vertelt ons straks welke de juiste is.
    const acties = [
      '"http://cbr.nl/wsapi/AuthenticationService/GetUserInformation"',
      '"http://tempuri.org/IAuthenticationService/GetUserInformation"',
    ];

    uitkomst.stap2_login = [];
    for (const actie of acties) {
      try {
        const r = await fetch("https://top.cbr.nl/wsapi/authenticationservice.svc", {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            SOAPAction: actie,
            "User-Agent": "RijPlatform-Koppeling/0.1",
          },
          body: envelop,
        });
        const tekst = await r.text();
        uitkomst.stap2_login.push({
          soapAction: actie,
          status: r.status,
          antwoord: tekst.slice(0, 600),
        });
        if (r.status === 200) break; // gelukt — stoppen met proberen
      } catch (e) {
        uitkomst.stap2_login.push({ soapAction: actie, fout: e.message });
      }
    }
  }

  uitkomst.advies =
    "Stuur deze volledige uitkomst (screenshot of kopie) naar Claude. " +
    "Status 200 bij stap 2 = verbinding werkt. Een foutmelding is ook nuttig: " +
    "die vertelt precies wat de volgende stap is. Wachtwoorden staan niet in deze uitvoer.";

  res.status(200).json(uitkomst);
};
