// Buying, building on and selling property (pure; `city` is the array of buildings, `cash` is cash). Every check returns '' when it is fine, else why not.
import { BLUEPRINTS, newBuilding } from '../../data/buildings.js';
import { BUILD_PRICE, LISTINGS, LOT_PRICE, SELL_RATE } from '../../data/hard/property.js';
import { BIZ, BIZ_BLUEPRINTS } from '../../data/hard/business.js';
import { newBiz } from './business.js';

const money = n => `$${n.toLocaleString('en-US')}`;

// A house you can live in as an adult: a front door on the road side, a mailbox, a shower in the last room of the ground floor.
export function readyHouse(b) {
  const rooms = b.floors[0].rooms, add = (r, ...props) => { r.extra = [...(r.extra || []), ...props]; };
  add(rooms[0], { type: 'frontdoor', x: 70, y: 440 }, { type: 'mailbox', x: 250, y: 540 });
  add(rooms[rooms.length - 1], { type: 'shower', x: 860, y: 540 });
  return b;
}

export const shortMoney = n => (n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);

// Houses on the market at the start of a game, as [slot, building] pairs.
export const listings = () => LISTINGS.map(l => [l.slot, readyHouse({ ...newBuilding(l.key), name: l.name, house: true, forSale: l.price })]);

export const lotPrice = key => LOT_PRICE + (BIZ_BLUEPRINTS[key] ? BIZ[BIZ_BLUEPRINTS[key]].fitout : (BUILD_PRICE[key] ?? 0));              // the lot plus the build or the fit-out, in one go

export function whyNotBuyHouse(city, slot, cash) {
  const b = city[slot];
  if (!b) return 'nothing there';
  if (b.owned) return 'already yours';
  if (!b.forSale) return 'not for sale';
  return cash < b.forSale ? `${money(b.forSale - cash)} more` : '';
}

// The house at `slot` becomes yours (the caller takes the payment or the mortgage). Returns its price.
export function acquireHouse(city, slot) {
  const b = city[slot], price = b.forSale;
  delete b.forSale; b.owned = true; b.house = true;
  return price;
}

// Buy a house that is for sale, paying outright. Returns { cash, price } or null.
export function buyHouse(city, slot, cash) {
  if (whyNotBuyHouse(city, slot, cash)) return null;
  const price = acquireHouse(city, slot);
  return { cash: cash - price, price };
}

export function whyNotBuyLot(city, slot, key, cash) {
  if (!(slot >= 0 && slot < city.length)) return 'no such lot';
  if (city[slot]) return 'lot is taken';
  if (!(BLUEPRINTS[key] && ((BLUEPRINTS[key].house && key in BUILD_PRICE) || BIZ_BLUEPRINTS[key]))) return 'not for sale';
  return cash < lotPrice(key) ? `${money(lotPrice(key) - cash)} more` : '';
}

// A business premises: a counter to manage it from, and for a farm a couple of beds.
export function readyBiz(b, type, day = 0) {
  const r = b.floors[0].rooms[0], add = (...props) => { r.extra = [...(r.extra || []), ...props]; };
  add({ type: 'bizdesk', x: 480, y: 520 });
  if (type === 'farm') add({ type: 'gardenbed', x: 250, y: 530 }, { type: 'gardenbed', x: 720, y: 530 });
  b.biz = newBiz(type, day);
  return b;
}

// A lot bought and built on (the caller takes the payment or the mortgage). Returns its price.
export function acquireLot(city, slot, key, day = 0) {
  if (BIZ_BLUEPRINTS[key]) {
    city[slot] = readyBiz({ ...newBuilding(key), owned: true }, BIZ_BLUEPRINTS[key], day);
    delete city[slot].cost; delete city[slot].unique;
    return lotPrice(key);
  }
  city[slot] = readyHouse({ ...newBuilding(key), owned: true, house: true });
  delete city[slot].cost; delete city[slot].unique;
  return lotPrice(key);
}

// Buy an empty lot and have a house built on it, paying outright. Returns { cash, price } or null.
export function buildOnLot(city, slot, key, cash, day = 0) {
  if (whyNotBuyLot(city, slot, key, cash)) return null;
  return { cash: cash - acquireLot(city, slot, key, day), price: lotPrice(key) };
}

// What you may do to a building in hard mode: 'full' (rebuild, repaint and arrange), 'furniture' (arrange your own things in the home you rent) or '' (nothing).
export function editRights(building, home, slot) {
  if (!building) return '';
  if (building.owned) return 'full';
  return home && home.slot === slot ? 'furniture' : '';
}

// What a place sells for: part of what it would cost to build again (a house's rooms and floors count).
export function sellPrice(building) {
  const rooms = building.floors.reduce((n, f) => n + f.rooms.length, 0);
  return Math.round((BUILD_PRICE.blank * Math.max(1, rooms) * SELL_RATE) / 1000) * 1000;
}
