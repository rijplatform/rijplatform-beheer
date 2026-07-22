// Vercel serverless functie — maakt een Mollie-betaallink aan.
// De API-sleutel staat veilig in de Vercel-omgeving (MOLLIE_API_KEY),
// en is dus nooit zichtbaar voor bezoekers van de site.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Alleen POST toegestaan" });
  }

  const key = process.env.MOLLIE_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: "MOLLIE_API_KEY ontbreekt. Voeg deze toe in Vercel onder Settings → Environment Variables.",
    });
  }

  const { amount, description } = req.body || {};
  if (!amount || Number(amount) <= 0 || !description) {
    return res.status(400).json({ error: "Bedrag en omschrijving zijn verplicht." });
  }

  try {
    const r = await fetch("https://api.mollie.com/v2/payment-links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency: "EUR", value: Number(amount).toFixed(2) },
        description: String(description).slice(0, 255),
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data.detail || data.title || "Mollie gaf een fout terug." });
    }

    return res.status(200).json({
      id: data.id,
      paymentUrl: data._links && data._links.paymentLink ? data._links.paymentLink.href : null,
    });
  } catch (e) {
    return res.status(500).json({ error: "Verbinding met Mollie mislukt: " + e.message });
  }
};
