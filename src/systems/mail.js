// The post: items dropped on a mailbox are addressed to a building and delivered the next time you go there.
// Parcels are { k: itemKey, to: lotNumber }. Pure helpers, tested.
export const MAX_PARCELS = 12;

// Every building in the city you can post to: [{ slot, name }].
export const destinations = city => city.map((b, slot) => (b ? { slot, name: b.name } : null)).filter(Boolean);

// The parcels with one more added, or null if the van is full.
// `from` (the lot the van sets off from) is only recorded for deliveries from somewhere other than the post office.
export const addParcel = (parcels, key, to, from) => (parcels.length >= MAX_PARCELS ? null : [...parcels, from == null ? { k: key, to } : { k: key, to, from }]);

// Take out what is addressed to `slot`: { delivered: [itemKey], rest: [parcel] }.
export function takeParcels(parcels, slot) {
  const delivered = parcels.filter(p => p.to === slot).map(p => p.k);
  return { delivered, rest: parcels.filter(p => p.to !== slot) };
}

// Parcels from the save, cleaned: real items, real buildings, no more than MAX_PARCELS.
export function cleanParcels(list, isItem, city) {
  return (Array.isArray(list) ? list : []).filter(p => p && isItem(p.k) && Number.isInteger(p.to) && city[p.to]).slice(0, MAX_PARCELS).map(p => (Number.isInteger(p.from) && city[p.from] ? { k: p.k, to: p.to, from: p.from } : { k: p.k, to: p.to }));
}
