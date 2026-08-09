import { Router } from "express";

const router = Router();

const SOURCES = {
  gold: "https://static.altinkaynak.com/public/Gold",
  currency: "https://static.altinkaynak.com/public/Currency",
};

// Altınkaynak's numbers are Turkish-formatted ("6.607,26") — strip thousands dots,
// swap the decimal comma for a dot.
function parseTurkishNumber(s) {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

let cache = { data: null, fetchedAt: 0 };
const CACHE_MS = 60_000;

router.get("/", async (req, res) => {
  if (cache.data && Date.now() - cache.fetchedAt < CACHE_MS) {
    return res.json(cache.data);
  }
  try {
    const [goldRes, currencyRes] = await Promise.all([fetch(SOURCES.gold), fetch(SOURCES.currency)]);
    const [gold, currency] = await Promise.all([goldRes.json(), currencyRes.json()]);
    const toItems = (kind) => (list) =>
      list.map((r) => ({
        kind,
        code: r.Kod,
        name: r.Aciklama.trim(),
        buy: parseTurkishNumber(r.Alis),
        updatedAt: r.GuncellenmeZamani,
      }));
    const data = [...toItems("gold")(gold), ...toItems("currency")(currency)];
    cache = { data, fetchedAt: Date.now() };
    res.json(data);
  } catch (e) {
    if (cache.data) return res.json(cache.data); // serve stale rather than fail
    res.status(502).json({ error: "Fiyat kaynağına ulaşılamadı: " + e.message });
  }
});

export default router;
