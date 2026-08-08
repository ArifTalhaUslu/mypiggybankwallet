// In-memory cache of already-fetched months, keyed by "YYYY-MM". Single-user local app,
// so this is safe: once we've loaded a month's items, re-visiting it (back/forward
// navigation) is instant instead of a fresh network round trip. Mutations replace the
// cached entry directly from the mutation response, never going stale.
const cache = new Map();

export function getCachedMonth(month) {
  return cache.get(month);
}

export function setCachedMonth(month, items) {
  cache.set(month, items);
}

export function invalidateMonth(month) {
  cache.delete(month);
}
