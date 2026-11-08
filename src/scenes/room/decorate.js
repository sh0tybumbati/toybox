// Room scene mixin — Decorate mode: repaint the room in view (wallpaper, floor) and place, move, resize and remove its
// windows, with a live preview. A saved look stores only what the player changed (systems/decorate.js).
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { H, W } from '../../config.js';
import { FLOORS, WALLPAPERS, defaultLook, paintRoom } from '../../data/decor.js';
import { INK, inkDashed, wobblyPoly, rectPoints } from '../../data/ink.js';
import { ROOMS } from '../../data/rooms.js';
import { MAX_WINDOWS, WIN, addWindow, moveWindow, removeWindow, resizeWindow, withLook } from '../../systems/decorate.js';
import { CARD, COLORS, TEXT, hitZone, inkButton, inkChip, inkPanel, inkSwatch, pin } from '../../ui.js';

const D = 9600;

export const decorateMethods = {
  enterDecorate() {
    if (this.switching || this.heldItem || this.characters.some(c => c.held)) return;
    if (this.editRights() !== 'full') return;
    if (this.editMode) this.exitEdit();
    this.tipEvent('decorate');
    this.hideTip();
    this.decor = { tab: 'walls', sel: 0, ui: [], world: [] };
    this.sfx.click();
    this.buildDecorUI();
  },

  exitDecorate() {
    if (!this.decor) return;
    this.clearDecorUI();
    this.decor = null;
    this.refreshTip();
    this.dirty = true;
    this.sfx.click();
  },

  clearDecorUI() {
    if (!this.decor) return;
    [...this.decor.ui, ...this.decor.world].forEach(o => o.destroy());
    this.decor.ui = []; this.decor.world = [];
  },

  // The room being decorated: whichever one is in the middle of the screen.
  decorSection() { return this.currentSection(); },
  decorLook(sec) { return this.sectionLook(sec); },

  // (Re)build the bottom panel for the current room and tab.
  buildDecorUI() {
    this.clearDecorUI();
    const sec = this.decorSection(), type = ROOMS[sec.type], d = this.decor, ui = fn => { const o = pin(fn); o.setDepth?.(D + 1); d.ui.push(o); return o; };
    const panel = pin(inkPanel(this, W / 2, H - 92, 928, 168, { depth: D, seed: 15 }));
    d.ui.push(panel.setInteractive(new Phaser.Geom.Rectangle(W / 2 - 464, H - 176, 928, 168), Phaser.Geom.Rectangle.Contains));   // taps on the panel don't fall through
    ui(inkChip(this, 178, H - 156, `🎨 ${type.label.split(' ').slice(1).join(' ')}`, { size: 23, depth: D + 1, h: 36, fill: CARD }));
    const tabs = [['walls', 'Walls'], ['floor', 'Floor'], ['windows', 'Windows']];
    tabs.forEach(([id, label], i) => ui(inkButton(this, 400 + i * 118, H - 156, label, {
      w: 108, h: 42, size: 21, fill: d.tab === id ? COLORS.gold : CARD, depth: D + 1, seed: i + 3, onTap: () => { d.tab = id; d.sel = 0; this.sfx.click(); this.buildDecorUI(); } })));
    ui(inkButton(this, W - 96, H - 156, '✔ Done', { w: 120, h: 44, size: 22, fill: COLORS.green, depth: D + 1, onTap: () => this.exitDecorate() }));

    if (type.outdoor) { ui(this.add.text(W / 2, H - 80, 'Outdoors is already lovely — head inside to redecorate!', { fontSize: '24px', color: TEXT }).setOrigin(0.5)); return; }
    if (d.tab === 'windows') this.buildWindowTools(sec, ui);
    else this.buildSwatches(sec, ui, d.tab === 'walls' ? WALLPAPERS : FLOORS, d.tab === 'walls' ? 'wall' : 'floor');
  },

  // Rows of wallpaper / flooring swatches.
  buildSwatches(sec, ui, catalog, key) {
    const look = this.decorLook(sec), g = ui(this.add.graphics()), entries = Object.entries(catalog);
    entries.forEach(([id, item], i) => {
      const x = 118 + (i % 8) * 108, y = H - 110 + Math.floor(i / 8) * 54;
      inkSwatch(g, x, y, 21, item.swatch, look[key] === id, i + 5);
      ui(hitZone(this, x, y, 50, 50, () => this.setLook(sec, l => ({ ...l, [key]: id })), D + 2));
      ui(this.add.text(x + 28, y - 12, item.name, { fontSize: '17px', color: TEXT }).setOrigin(0, 0));
    });
  },

  buildWindowTools(sec, ui) {
    const d = this.decor, look = this.decorLook(sec), wins = look.windows;
    if (d.sel >= wins.length) d.sel = Math.max(0, wins.length - 1);
    // the windows themselves are tappable, and the chosen one gets a dashed ink outline
    wins.forEach((w, i) => {
      const r = hitZone(this, sec.offset + w.x + w.w / 2, w.y + w.h / 2, w.w, w.h, () => { d.sel = i; this.sfx.pop(); this.buildDecorUI(); }, D - 1);
      d.world.push(r);
    });
    if (wins[d.sel]) {
      const w = wins[d.sel], g = this.add.graphics().setDepth(D - 1);
      inkDashed(g, wobblyPoly(rectPoints(sec.offset + w.x - 8, w.y - 8, w.w + 16, w.h + 16), { amp: 1, seed: 5, step: 18 }), { color: INK, w: 4, on: 3, off: 2 });
      d.world.push(g);
    }
    const b = (x, y, label, fn, fill = COLORS.blue, w) => ui(inkButton(this, x, y, label, { w, h: 42, size: 20, fill, depth: D + 1, seed: Math.round(x), onTap: fn }));
    const edit = fn => this.setLook(sec, l => ({ ...l, windows: fn(l.windows) }));
    const sel = d.sel, mv = (dx, dy) => () => edit(ws => (ws[sel] ? moveWindow(ws, sel, dx, dy, sec.w) : ws));
    const rs = (dw, dh) => () => edit(ws => (ws[sel] ? resizeWindow(ws, sel, dw, dh, sec.w) : ws));
    b(130, H - 108, '➕ Add', () => { const next = addWindow(this.decorLook(sec).windows, sec.w); if (next) { d.sel = next.length - 1; edit(() => next); } else this.sfx.nope(); }, COLORS.green, 116);
    b(262, H - 108, '🗑 Remove', () => { if (wins[sel]) edit(ws => removeWindow(ws, sel)); }, COLORS.red, 130);
    ui(this.add.text(352, H - 118, `${wins.length} / ${MAX_WINDOWS} windows — tap one to pick it`, { fontSize: '19px', color: TEXT }));
    const labels = [['Left', mv(-WIN.move, 0)], ['Right', mv(WIN.move, 0)], ['Up', mv(0, -WIN.move)], ['Down', mv(0, WIN.move)]];
    labels.forEach(([l, fn], i) => b(76 + i * 88, H - 56, l, fn, COLORS.blue, 80));
    [['Wider', rs(WIN.step, 0)], ['Narrower', rs(-WIN.step, 0)], ['Taller', rs(0, WIN.step)], ['Shorter', rs(0, -WIN.step)]].forEach(([l, fn], i) => b(470 + i * 122, H - 56, l, fn, COLORS.blue, 112));
  },

  // Change the room's look (live), remembering only what differs from its type.
  setLook(sec, change) {
    this.looks = withLook(this.looks, sec.id, defaultLook(ROOMS[sec.type], sec.w), change);
    this.repaintSection(sec);
    this.dirty = true;
    this.sfx.pop();
    if (this.decor) this.buildDecorUI();
  },

  repaintSection(sec) {
    const gfx = this.sectionGfx[sec.id];
    if (!gfx) return;
    gfx.room.clear();
    paintRoom(gfx.room, ROOMS[sec.type], this.sectionLook(sec), sec.w);
    if (this.night) this.drawSky();
  },
};
