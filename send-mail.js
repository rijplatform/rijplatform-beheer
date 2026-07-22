// Vercel serverless functie — verstuurt automatisch e-mails via Resend (resend.com).
// Vereist in Vercel (Settings → Environment Variables):
//   RESEND_API_KEY  = je API-sleutel van resend.com
//   MAIL_FROM       = afzenderadres, bijv. noreply@rijplatform.nl (domein eerst verifiëren bij Resend)
//                     Tijdens testen kun je MAIL_FROM weglaten; dan wordt onboarding@resend.dev gebruikt,
//                     maar daarmee kun je alleen naar je eigen e-mailadres mailen.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Alleen POST toegestaan" });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: "RESEND_API_KEY ontbreekt. Maak een gratis account op resend.com en zet de sleutel in Vercel bij Settings → Environment Variables.",
    });
  }

  const { to, subject, text, fromName } = req.body || {};
  if (!to || !subject || !text) {
    return res.status(400).json({ error: "Ontvanger, onderwerp en tekst zijn verplicht." });
  }

  const from = process.env.MAIL_FROM || "onboarding@resend.dev";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${(fromName || "Rijschool").replace(/[<>]/g, "")} <${from}>`,
        to: [to],
        subject: String(subject).slice(0, 200),
        text: String(text),
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data.message || "Resend gaf een fout terug." });
    }
    return res.status(200).json({ id: data.id });
  } catch (e) {
    return res.status(500).json({ error: "Verbinding met Resend mislukt: " + e.message });
  }
};
