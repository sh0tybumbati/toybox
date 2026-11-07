// The building-maker: an overlay over the city map. A cross-section of the building shows its floors
// and rooms; add rooms and floors, stretch rooms, shuffle them, drop in elevators, stairs and ladders,
// and repaint the outside. Every change is a plain edit of the building data (systems/builder.js).
import { W, H } from '../config.js';
import { CARD, COLORS, TEXT, hitZone, iconButton, inkButton, inkChip, inkPanel, inkSwatch, richText } from '../ui.js';
import { BUILD_COST, MAX_FLOORS, MAX_ROOMS } from '../data/buildings.js';
import { ROOMS, defaultFurniture, scaleX } from '../data/rooms.js';
import { EXTERIOR_WALLS, ROOF_COLORS, ROOF_STYLES, TRIMS, paintBuildingMini, paintCutaway } from '../data/exterior.js';
import { INK, inkFill, wobblyPoly, rectPoints } from '../data/ink.js';
import { addFloor, addRoom, findRoom, floorWidth, isBuildableRoom, moveRoom, removeFloor, removeRoom, resizeRoom, setExterior } from '../systems/builder.js';
import { floorLabel, sectionId } from '../systems/world.js';
import { floatText } from '../systems/interactions.js';

const ROOM_COLORS = { kitchen: 0xcdeee6, bedroom: 0xffe8b0, living: 0xbfe3d4, hall: 0xdfe6f2, empty: 0xf3ece0, park: 0x9ed88c, playground: 0xa7e0ff, shop: 0xffd0dc };
const CONNECTORS = [
  { kind: 'elevator', label: '🛗 Elevator', blurb: 'every floor' },
  { kind: 'stairs', label: '🪜 Stairs', blurb: 'this floor + above' },
  { kind: 'ladder', label: '🪜 Ladder', blurb: 'this floor + above' },
];
const D = 10;                            // everything here sits above the map beneath

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
    const add = o => { o.setDepth?.(D); this.ui.push(o); return o; };
    const b = this.b;
    if (!this.selRoom || !findRoom(b, this.selRoom)) this.selRoom = b.floors[0].rooms[0].id;
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
    add(inkPanel(this, W / 2, H / 2, 920, 566, { depth: D, seed: 8 }));
    this.g = add(this.add.graphics()).setDepth(D + 0.5);                     // all the flat shapes of this render, above the panel
    add(richText(this, b.name, { fontSize: '34px', fontStyle: 'bold' })).setPosition(48 + 70, 46);
    add(inkChip(this, W / 2 + 120, 46, `🪙 ${this.room.coins}`, { size: 24, depth: D, h: 40, fill: CARD }));
    this.ui.push(iconButton(this, W - 60, 46, '✖', () => this.close(), D));

    // left: the model on a bit of ground, and the paint box for the outside
    inkFill(this.g, wobblyPoly(rectPoints(60, 82, 320, 214), { amp: 1.4, seed: 3, step: 24 }), 0xcfeaff, { w: 3.4, seed: 3, heavy: 0 });
    this.g.fillStyle(0x93cf75, 1).fillPoints(wobblyPoly(rectPoints(62, 262, 316, 32), { amp: 1.2, seed: 4, step: 24 }), true);
    paintBuildingMini(this.g, b, 220, 272, 290, 178);
    this.paintBox(add);

    // right: the cross-section
    this.crossSection(add);
    this.toolbar(add);
  }

  btn(add, x, y, text, fill, onTap, size = 19) {
    return add(inkButton(this, x, y, text, { fill, onTap, size, depth: D, h: 38 }));
  }

  // --- exterior ---------------------------------------------------------------------------
  paintBox(add) {
    const ex = this.b.exterior;
    const row = (y, title, entries, current, key) => {
      add(this.add.text(64, y - 11, title, { fontSize: '19px', fontStyle: 'bold', color: TEXT }));
      entries.forEach(([id, color], i) => {
        const x = 148 + i * 30;
        inkSwatch(this.g, x, y, 11.5, color, id === current, i + y);
        this.ui.push(hitZone(this, x, y, 28, 28, () => { setExterior(this.b, { [key]: id }); this.room.dirty = true; this.render(); }, D + 1));
      });
    };
    row(332, 'Walls', Object.entries(EXTERIOR_WALLS).map(([id, w]) => [id, w.color]), ex.wall, 'wall');
    row(366, 'Trim', Object.entries(TRIMS), ex.trim, 'trim');
    row(400, 'Roof', Object.entries(ROOF_COLORS), ex.roofColor, 'roofColor');
    add(this.add.text(64, 424, 'Shape', { fontSize: '19px', fontStyle: 'bold', color: TEXT }));
    Object.keys(ROOF_STYLES).forEach((id, i) => {
      add(inkButton(this, 168 + i * 64, 437, ROOF_STYLES[id], { w: 60, h: 28, size: 16, fill: id === ex.roofStyle ? COLORS.gold : CARD, depth: D, seed: i + 2,
        onTap: () => { setExterior(this.b, { roofStyle: id }); this.room.dirty = true; this.render(); } }));
    });
  }

  // --- the cross-section: a wonky stack of rooms, as wide as they are (art/reference/ "stackable rooms") -----------
  crossSection(add) {
    const b = this.b, X0 = 440, Y0 = 92, AREA_W = 470, n = b.floors.length;
    const rowH = [56, 56, 56, 46, 38, 30][n] || 30, gap = [14, 14, 12, 10, 8, 6][n] || 6, roofH = [46, 46, 44, 40, 36, 34][n] || 34;
    add(this.add.text(X0, 66, 'Tap a room', { fontSize: '19px', color: TEXT }));
    const rects = paintCutaway(this.g, b, { x: X0, y: Y0, width: Math.min(AREA_W, Math.max(...b.floors.map(floorWidth)) * 0.16), rowH, gap, roofH, colorOf: t => ROOM_COLORS[t] || 0xffffff, selected: this.selRoom });
    const byId = new Map(rects.map(r => [r.id, r]));
    b.floors.forEach((f, idx) => {
      const first = byId.get(f.rooms[0].id);
      add(this.add.text(X0 - 8, first.y + rowH / 2, floorLabel(idx).replace('Ground floor', 'G').replace('Floor ', ''), { fontSize: '20px', fontStyle: 'bold', color: TEXT }).setOrigin(1, 0.5));
      for (const r of f.rooms) {
        const rc = byId.get(r.id);
        add(richText(this, `${ROOMS[r.type].label.split(' ')[0]} ${(r.w / 960).toFixed(2).replace(/\.?0+$/, '')}×`, { fontSize: rowH > 40 ? '19px' : '15px' })).setPosition(rc.x + rc.w * 0.6, rc.y + rowH / 2).setDepth(D + 1);
        const has = this.connectorsIn(r);
        if (has.length) add(richText(this, has.join(''), { fontSize: '14px' }, { iconPx: 18 })).setPosition(rc.x + rc.w - 18, rc.y + 12).setDepth(D + 1);
        this.ui.push(hitZone(this, rc.x + rc.w / 2, rc.y + rowH / 2, rc.w, rowH, () => { this.selRoom = r.id; this.render(); }, D + 1));
      }
    });
    this.rowsBottom = Math.max(...rects.map(r => r.y + r.h)) + 12;
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
    let y = this.rowsBottom + 14;
    add(richText(this, `${ROOMS[r.type].label} · ${floorLabel(floorIdx)}`, { fontSize: '23px', fontStyle: 'bold' })).setPosition(424 + 130, y);
    y += 34;
    let x = 424;
    const place = t => { t.x = x + t.width / 2; x += t.width + 8; return t; };
    place(this.btn(add, x, y, 'Left', COLORS.blue, () => this.act(() => moveRoom(b, r.id, -1)), 18));
    place(this.btn(add, x, y, 'Right', COLORS.blue, () => this.act(() => moveRoom(b, r.id, 1)), 18));
    place(this.btn(add, x, y, '➖ Narrower', COLORS.blue, () => this.act(() => resizeRoom(b, r.id, -1)), 18));
    place(this.btn(add, x, y, '➕ Wider', COLORS.blue, () => this.act(() => resizeRoom(b, r.id, 1)), 18));
    place(this.btn(add, x, y, '🗑 Room', COLORS.red, () => this.act(() => removeRoom(b, r.id)), 18));
    y += 36;
    add(this.add.text(424, y - 10, 'Add a room to this floor:', { fontSize: '18px', color: TEXT }));
    x = 424; y += 30;
    for (const type of Object.keys(ROOMS).filter(isBuildableRoom)) {
      const t = this.btn(add, x, y, `${ROOMS[type].label.split(' ')[1]} 🪙${BUILD_COST.room}`, COLORS.green, () => this.buyRoom(floor.id, type), 16);
      if (x + t.width > 900) { x = 424; y += 38; t.y = y; }                  // wrap to a second row
      place(t);
    }
    x = 424; y += 40;
    place(this.btn(add, x, y, `➕ New floor 🪙${BUILD_COST.floor}`, COLORS.green, () => this.buyFloor(), 18));
    place(this.btn(add, x, y, '🗑 This floor', COLORS.red, () => this.act(() => removeFloor(b, floor.id)), 18));
    y += 34;
    add(this.add.text(424, y - 10, 'Link floors from this room (stairs and ladders reach the floor above):', { fontSize: '17px', color: TEXT }));
    x = 424; y += 30;
    for (const c of CONNECTORS) place(this.btn(add, x, y, c.label, COLORS.orange, () => this.addConnector(c.kind), 18));
  }

  act(fn) {
    if (fn()) { this.room.dirty = true; this.room.sfx.click(); this.render(); } else this.room.sfx.nope();
  }

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
