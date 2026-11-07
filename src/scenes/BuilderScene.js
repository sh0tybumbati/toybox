// The building-maker: an overlay over the city map. A cross-section of the building shows its floors
// and rooms; add rooms and floors, stretch rooms, shuffle them, drop in elevators, stairs and ladders,
// and repaint the outside. Every change is a plain edit of the building data (systems/builder.js).
import { W, H } from '../config.js';
import { touchable } from '../ui.js';
import { BUILD_COST, MAX_FLOORS, MAX_ROOMS, ROOM_W } from '../data/buildings.js';
import { ROOMS, defaultFurniture, scaleX } from '../data/rooms.js';
import { EXTERIOR_WALLS, ROOF_COLORS, ROOF_STYLES, TRIMS, paintBuildingMini } from '../data/exterior.js';
import { addFloor, addRoom, findRoom, floorWidth, isBuildableRoom, moveRoom, removeFloor, removeRoom, resizeRoom, setExterior } from '../systems/builder.js';
import { floorLabel, sectionId } from '../systems/world.js';
import { floatText } from '../systems/interactions.js';

const ink = '#4a3426';
const txt = (size, extra = {}) => ({ fontSize: `${size}px`, color: ink, ...extra });
const ROOM_COLORS = { kitchen: 0xcdeee6, bedroom: 0xffe8b0, living: 0xbfe3d4, hall: 0xdfe6f2, empty: 0xf3ece0, park: 0x9ed88c, playground: 0xa7e0ff, shop: 0xffd0dc };
const CONNECTORS = [
  { kind: 'elevator', label: '🛗 Elevator', blurb: 'every floor' },
  { kind: 'stairs', label: '🪜 Stairs', blurb: 'this floor + above' },
  { kind: 'ladder', label: '🪜 Ladder', blurb: 'this floor + above' },
];

export default class BuilderScene extends Phaser.Scene {
  constructor() { super('Builder'); }

  init(data) {
    this.room = data.room; this.slot = data.slot; this.hub = data.hub;
    this.selRoom = null;                // the selected room's id
    this.ui = [];
  }

  get b() { return this.room.city[this.slot]; }

  create() {
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.render();
  }

  render() {
    this.ui.forEach(o => o.destroy());
    this.ui = [];
    const add = o => { this.ui.push(o); return o; };
    const b = this.b;
    if (!this.selRoom || !findRoom(b, this.selRoom)) this.selRoom = b.floors[0].rooms[0].id;

    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
    add(this.add.rectangle(W / 2, H / 2, 920, 560, 0xfff4e0).setStrokeStyle(6, 0xe3c9a0));
    add(this.add.text(48, 38, `🔨 ${b.name}`, txt(28, { fontStyle: 'bold' })));
    add(this.add.text(W / 2 + 100, 46, `🪙 ${this.room.coins}`, txt(22, { backgroundColor: '#ffffff', padding: { x: 10, y: 4 } })));
    this.btn(add, W - 60, 48, '✖', '#c0392b', () => this.close());

    // left: the model, and the paint box for the outside
    add(this.add.rectangle(220, 190, 330, 220, 0xcfeaff).setStrokeStyle(3, 0xe3c9a0));
    add(this.add.rectangle(220, 262, 330, 36, 0x8fd481));
    const g = add(this.add.graphics());
    paintBuildingMini(g, b, 220, 270, 300, 190);
    this.paintBox(add);

    // right: the cross-section
    this.crossSection(add);
    this.toolbar(add);
  }

  btn(add, x, y, text, color, onTap, size = 18) {
    const t = add(this.add.text(x, y, text, { fontSize: `${size}px`, color: '#ffffff', backgroundColor: color, padding: { x: 10, y: 6 } }).setOrigin(0.5));
    return touchable(t, 3).on('pointerdown', onTap);
  }

  // --- exterior ---------------------------------------------------------------------------
  paintBox(add) {
    const ex = this.b.exterior;
    const row = (y, title, entries, current, key, swatch) => {
      add(this.add.text(70, y - 11, title, txt(14, { fontStyle: 'bold' })));
      entries.forEach(([id, value], i) => {
        const x = 150 + i * 30, on = id === current;
        const sw = add(this.add.rectangle(x, y, 24, 24, swatch ? value : 0xffffff).setStrokeStyle(on ? 4 : 2, on ? 0xe0a030 : 0x9a8a78));
        if (!swatch) add(this.add.text(x, y, value, txt(13, { fontStyle: 'bold' })).setOrigin(0.5));
        touchable(sw, 2).on('pointerdown', () => { setExterior(this.b, { [key]: id }); this.room.dirty = true; this.render(); });
      });
    };
    row(338, 'Walls', Object.entries(EXTERIOR_WALLS).map(([id, w]) => [id, w.color]), ex.wall, 'wall', true);
    row(374, 'Trim', Object.entries(TRIMS), ex.trim, 'trim', true);
    row(410, 'Roof', Object.entries(ROOF_COLORS), ex.roofColor, 'roofColor', true);
    const styles = Object.keys(ROOF_STYLES);
    add(this.add.text(70, 436, 'Shape', txt(14, { fontStyle: 'bold' })));
    styles.forEach((id, i) => {
      const t = add(this.add.text(150 + i * 62, 446, ROOF_STYLES[id], txt(13, { backgroundColor: id === ex.roofStyle ? '#ffd166' : '#ffffff', padding: { x: 5, y: 3 } })).setOrigin(0, 0.5));
      touchable(t, 3).on('pointerdown', () => { setExterior(this.b, { roofStyle: id }); this.room.dirty = true; this.render(); });
    });
  }

  // --- the cross-section: floors top to bottom, rooms as boxes as wide as they are -----------------
  crossSection(add) {
    const b = this.b, X0 = 410, Y0 = 84, AREA_W = 500, ROW_H = 58;
    const scale = Math.min(0.16, AREA_W / Math.max(...b.floors.map(floorWidth)));
    add(this.add.text(X0, Y0 - 24, 'Floors and rooms — tap a room', txt(15)));
    const floors = [...b.floors].reverse();
    floors.forEach((f, ri) => {
      const idx = b.floors.indexOf(f), y = Y0 + ri * (ROW_H + 8);
      add(this.add.text(X0 - 6, y + ROW_H / 2, floorLabel(idx).replace('Ground floor', 'G').replace('Floor ', ''), txt(15, { fontStyle: 'bold' })).setOrigin(1, 0.5));
      let x = X0;
      for (const r of f.rooms) {
        const w = r.w * scale, sel = r.id === this.selRoom;
        const box = add(this.add.rectangle(x, y, w - 4, ROW_H, ROOM_COLORS[r.type] || 0xffffff).setOrigin(0).setStrokeStyle(sel ? 5 : 2, sel ? 0xe0a030 : 0x9a8a78));
        add(this.add.text(x + w / 2 - 2, y + ROW_H / 2, `${ROOMS[r.type].label.split(' ')[0]}\n${(r.w / 960).toFixed(2).replace(/\.?0+$/, '')}×`, txt(14, { align: 'center' })).setOrigin(0.5));
        const has = this.connectorsIn(r);
        if (has.length) add(this.add.text(x + w - 8, y + 3, has.join(''), { fontSize: '13px' }).setOrigin(1, 0));
        touchable(box, 0).on('pointerdown', () => { this.selRoom = r.id; this.render(); });
        x += w;
      }
    });
    this.rowsBottom = Y0 + floors.length * (ROW_H + 8);
  }

  // Emoji for the connectors a room currently has (from its saved furniture, or its starting furniture).
  connectorsIn(r) {
    const id = sectionId(this.slot, r.id);
    const list = this.room.propState[id] || defaultFurniture(r.type, r.w, r.extra);
    const icons = { elevator: '🛗', stairs: '🪜', ladder: '🪜' };
    return [...new Set(list.map(p => icons[p.type]).filter(Boolean))];
  }

  // --- tools for the selected room / floor -------------------------------------------------------
  toolbar(add) {
    const b = this.b, hit = findRoom(b, this.selRoom), { room: r, floor } = hit;
    const floorIdx = b.floors.indexOf(floor);
    let y = Math.max(this.rowsBottom + 16, 330);
    add(this.add.text(410, y, `${ROOMS[r.type].label} · ${floorLabel(floorIdx)}`, txt(17, { fontStyle: 'bold' })));
    y += 30;
    let x = 440;
    const tool = (label, color, fn) => { const t = this.btn(add, x, y, label, color, fn, 16); x += t.width + 14; return t; };
    tool('◀', '#6b7a99', () => this.act(() => moveRoom(b, r.id, -1)));
    tool('▶', '#6b7a99', () => this.act(() => moveRoom(b, r.id, 1)));
    tool('➖ Narrower', '#6b7a99', () => this.act(() => resizeRoom(b, r.id, -1)));
    tool('➕ Wider', '#6b7a99', () => this.act(() => resizeRoom(b, r.id, 1)));
    tool('🗑 Room', '#c0392b', () => this.act(() => removeRoom(b, r.id) && this.refund(0)));
    x = 440; y += 40;
    add(this.add.text(410, y - 10, 'Add a room to this floor:', txt(14)));
    y += 18;
    for (const type of Object.keys(ROOMS).filter(isBuildableRoom)) {
      const t = this.btn(add, x, y, `${ROOMS[type].label.split(' ')[0]} ${ROOMS[type].label.split(' ').slice(1).join(' ')} 🪙${BUILD_COST.room}`, '#3b8f5a', () => this.buyRoom(floor.id, type), 14);
      x += t.width + 8;
      if (x > 860) { x = 440; y += 34; }
    }
    x = 440; y += 38;
    this.btn(add, x + 40, y, `➕ New floor 🪙${BUILD_COST.floor}`, '#3b8f5a', () => this.buyFloor(), 15);
    this.btn(add, x + 230, y, '🗑 This floor', '#c0392b', () => this.act(() => removeFloor(b, floor.id)), 15);
    y += 38;
    add(this.add.text(410, y - 10, 'Add to this room, linking floors:', txt(14)));
    x = 440; y += 18;
    for (const c of CONNECTORS) { const t = this.btn(add, x + 40, y, `${c.label} (${c.blurb})`, '#e0a030', () => this.addConnector(c.kind), 14); x += t.width + 8; }
  }

  act(fn) {
    if (fn()) { this.room.dirty = true; this.room.sfx.click(); this.render(); } else this.room.sfx.nope();
  }
  refund() { return true; }

  spend(cost) {
    if (this.room.coins < cost) { this.room.sfx.nope(); floatText(this, W / 2, H - 30, `${cost - this.room.coins} more coins`, 24); return false; }
    this.room.coins -= cost;
    this.room.sfx.coin();
    return true;
  }

  buyRoom(floorId, type) {
    const f = this.b.floors.find(x => x.id === floorId);
    if (f.rooms.length >= MAX_ROOMS) { this.room.sfx.nope(); floatText(this, W / 2, H - 30, 'That floor is full', 24); return; }
    if (!this.spend(BUILD_COST.room)) return;
    const made = addRoom(this.b, floorId, type);
    if (!made) { this.room.coins += BUILD_COST.room; this.room.sfx.nope(); floatText(this, W / 2, H - 30, 'No more room on this floor', 24); return; }
    this.selRoom = made.id;
    this.room.dirty = true;
    this.render();
  }

  buyFloor() {
    if (this.b.floors.length >= MAX_FLOORS) { this.room.sfx.nope(); floatText(this, W / 2, H - 30, `Buildings top out at ${MAX_FLOORS} floors`, 24); return; }
    if (!this.spend(BUILD_COST.floor)) return;
    const f = addFloor(this.b);
    this.selRoom = f.rooms[0].id;
    this.room.dirty = true;
    this.render();
  }

  // Put a connector into the selected room — and its partner on the other floor(s) it should reach.
  addConnector(kind) {
    const b = this.b, { room: r, floor } = findRoom(b, this.selRoom), at = b.floors.indexOf(floor);
    const targets = kind === 'elevator' ? b.floors.map((f, i) => [f, i]) : [[floor, at], ...(b.floors[at + 1] ? [[b.floors[at + 1], at + 1]] : [])];
    if (kind !== 'elevator' && targets.length < 2) { this.room.sfx.nope(); floatText(this, W / 2, H - 30, 'Add a floor above first', 24); return; }
    const roomIndex = floor.rooms.indexOf(r);
    for (const [f] of targets) {
      const rm = f.rooms[Math.min(roomIndex, f.rooms.length - 1)], id = sectionId(this.slot, rm.id);
      const list = [...(this.room.propState[id] || defaultFurniture(rm.type, rm.w, rm.extra))];
      if (list.some(p => p.type === kind)) continue;                                  // already has one
      list.push({ type: kind, x: scaleX(kind === 'elevator' ? 480 : kind === 'stairs' ? 860 : 780, rm.w), y: 434, items: [] });
      this.room.propState[id] = list;
    }
    this.room.dirty = true;
    this.room.sfx.ding();
    this.render();
  }

  close() {
    this.scene.stop();
    this.scene.resume('Hub');
    this.hub.drawLots();
    this.hub.refreshCoins();
    this.room.save();
  }
}
