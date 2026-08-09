import { api } from "../api/client";

// Applies the live Altınkaynak feed to any priceSource-linked entries: returns entries
// with fresh prices right away, and persists the change in the background. Shared by
// every screen that displays asset values (Varlığım, Rapor) so neither depends on the
// other having been visited first to be up to date.
export async function syncLiveAssetPrices(entries, prefetchedPrices) {
  const hasLive = entries.some((e) => e.priceSource);
  if (!hasLive) return entries;

  const prices = prefetchedPrices ?? (await api.getPrices().catch(() => []));
  if (prices.length === 0) return entries;

  return entries.map((entry) => {
    if (!entry.priceSource) return entry;
    const live = prices.find((p) => p.kind === entry.priceSource.kind && p.code === entry.priceSource.code);
    if (!live || live.buy === entry.unitPrice) return entry;
    api.updateAssetEntry(entry._id, { unitPrice: live.buy }).catch(() => {});
    return { ...entry, unitPrice: live.buy };
  });
}
