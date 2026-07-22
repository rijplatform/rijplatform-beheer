// Stripe — betaalstatus controleren van een Checkout Session
// De app roept dit aan met ?id=cs_... en krijgt { paid: true/false } terug,
// in dezelfde vorm als de Mollie-statusfunctie.

module.exports = async (req, res) => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: "STRIPE_SECRET_KEY ontbreekt in Vercel." });

  const id = req.query && req.query.id;
  if (!id) return res.status(400).json({ error: "Geen betaal-id meegegeven." });

  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: (j.error && j.error.message) || "Stripe gaf een fout terug." });
    return res.status(200).json({ paid: j.payment_status === "paid", status: j.payment_status });
  } catch (e) {
    return res.status(500).json({ error: "Verbinding met Stripe mislukt: " + e.message });
  }
};
