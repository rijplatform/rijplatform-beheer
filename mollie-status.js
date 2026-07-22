// Vercel serverless functie — vraagt bij Mollie op of een betaallink is betaald.

module.exports = async (req, res) => {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: "MOLLIE_API_KEY ontbreekt. Voeg deze toe in Vercel onder Settings → Environment Variables.",
    });
  }

  const id = req.query && req.query.id;
  if (!id || !/^pl_[A-Za-z0-9]+$/.test(id)) {
    return res.status(400).json({ error: "Geldig betaallink-id (pl_…) is verplicht." });
  }

  try {
    const r = await fetch(`https://api.mollie.com/v2/payment-links/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data.detail || data.title || "Mollie gaf een fout terug." });
    }

    return res.status(200).json({
      paid: Boolean(data.paidAt),
      paidAt: data.paidAt || null,
    });
  } catch (e) {
    return res.status(500).json({ error: "Verbinding met Mollie mislukt: " + e.message });
  }
};
