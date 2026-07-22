// Stripe — betaallink maken (Checkout Session met iDEAL + kaart)
// Vereist in Vercel (Settings → Environment Variables):
//   STRIPE_SECRET_KEY = je geheime sleutel (sk_test_... om te testen, sk_live_... voor echt)
// Sleutel vind je in het Stripe-dashboard → Developers → API keys.
// De app roept dit aan met { amount, description, redirectUrl } en krijgt { id, url } terug.

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Alleen POST toegestaan" });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return res.status(500).json({
      error: "STRIPE_SECRET_KEY ontbreekt. Zet je Stripe-sleutel in Vercel bij Settings → Environment Variables en doe een Redeploy.",
    });
  }

  const { amount, description, redirectUrl } = req.body || {};
  const bedrag = Math.round(Number(amount) * 100); // euro's → centen
  if (!bedrag || bedrag < 50) return res.status(400).json({ error: "Ongeldig bedrag (minimaal €0,50)." });

  const terug = redirectUrl || "https://rijplatform.nl";

  const vorm = new URLSearchParams();
  vorm.append("mode", "payment");
  vorm.append("payment_method_types[0]", "ideal");
  vorm.append("payment_method_types[1]", "card");
  vorm.append("line_items[0][quantity]", "1");
  vorm.append("line_items[0][price_data][currency]", "eur");
  vorm.append("line_items[0][price_data][unit_amount]", String(bedrag));
  vorm.append("line_items[0][price_data][product_data][name]", String(description || "Factuur rijschool").slice(0, 250));
  vorm.append("success_url", terug + "?betaald=1");
  vorm.append("cancel_url", terug + "?betaald=0");

  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: vorm.toString(),
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: (j.error && j.error.message) || "Stripe gaf een fout terug." });
    // Zelfde vorm als de Mollie-functie, zodat de app beide kan gebruiken:
    return res.status(200).json({ id: j.id, url: j.url, provider: "stripe" });
  } catch (e) {
    return res.status(500).json({ error: "Verbinding met Stripe mislukt: " + e.message });
  }
};
