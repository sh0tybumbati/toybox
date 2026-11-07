// The city map: an overlay over the paused game, drawn as a bumpy hand-inked landscape (art/reference/).
// Buildings stand on dirt plots along winding paths, each shown as a chubby little model of itself. Tap one
// to visit it or to build and decorate it; tap an empty dashed plot (with its sign) to build there.
import { W, H } from '../config.js';
import { CARD, COLORS, TEXT, iconButton, inkButton, inkChip, inkPanel, richText } from '../ui.js';
import { spriteImage } from '../systems/itemTextures.js';
import { BLUEPRINTS, BUILDABLE, PATHS, SLOTS, newBuilding } from '../data/buildings.js';
import { paintBuildingMini } from '../data/exterior.js';
import { INK, blob, inkFill, inkStroke, smoothPath } from '../data/ink.js';
import { MAP_COLORS, paintPlot, paintScenery, paintSign, paintTerrain } from '../data/mapart.js';
import { entryZone, whyNotBuild } from '../systems/world.js';
import { floatText } from '../systems/interactions.js';

const HAND = '"Patrick Hand", "Comic Sans MS", "Noto Color Emoji", cursive';
const label = { fontFamily: HAND, color: '#3a2a22', fontStyle: 'bold' };
const RIVER = [{ x: -20, y: 584 }, { x: 160, y: 566 }, { x: 330, y: 592 }, { x: 520, y: 570 }, { x: 700, y: 594 }, { x: 980, y: 572 }];
const LOT = { w: 150, h: 130 };

export default class HubScene extends Phaser.Scene {
  constructor() { super('Hub'); }

  init(data) { this.room = data.room; this.popup = []; }

  create() {
    this.add.rectangle(0, 0, W, H, MAP_COLORS.grass).setOrigin(0).setInteractive();      // blocks what's beneath
    const land = this.add.graphics();
    paintTerrain(land, W, H, PATHS, RIVER);
    paintScenery(land);
    this.lots = this.add.container(0, 0);
    this.drawLots();
    this.addWalkers();
    this.addVans();

    this.add.text(W / 2, 30, 'The City', { ...label, fontSize: '40px', color: '#fff7e0', stroke: '#3a2a22', strokeThickness: 7 }).setOrigin(0.5);
    this.coinText = inkChip(this, 84, 32, '', { size: 26, depth: 20, h: 42 });
    this.refreshCoins();
    iconButton(this, W - 44, 30, '✖', () => this.close(), 0);
    this.input.keyboard.on('keydown-ESC', () => (this.popup.length ? this.closePopup() : this.close()));
  }

  refreshCoins() { this.coinText.setLabel(`🪙 ${this.room.coins}`); }

  // One plot per lot: a model of the building on flat dirt, or an empty dashed plot with a sign.
  drawLots() {
    this.lots.removeAll(true);
    const here = this.room.zone && this.room.zone.slot;
    const g = this.add.graphics();
    this.lots.add(g);
    SLOTS.forEach((pos, i) => {
      const b = this.room.city[i];
      paintPlot(g, pos.x, pos.y + 38, b ? 78 : 66, b ? 26 : 24, i + 3, !b);
      const hit = this.add.rectangle(pos.x, pos.y + 4, LOT.w, LOT.h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      this.lots.add(hit);
      if (!b) {
        const board = paintSign(g, pos.x + 22, pos.y + 56, 84, 36, i);
        this.lots.add(this.add.text(board.x, board.y, 'BUILD\nHERE', { ...label, fontSize: '15px', align: 'center', lineSpacing: -2 }).setOrigin(0.5));
        hit.on('pointerdown', () => this.openBuildPicker(i));
        return;
      }
      paintBuildingMini(g, b, pos.x, pos.y + 42, LOT.w - 14, LOT.h - 8, i * 13 + 5);
      this.lots.add(inkChip(this, pos.x, pos.y + 64, b.name, { size: 19, h: 30, fill: 0xf3e3b8, depth: 5, seed: i + 30 }));
      if (i === here) {
        const pin = spriteImage(this, 'icon-pin', pos.x, pos.y - 70, 34);
        this.tweens.add({ targets: pin, y: pin.y - 7, duration: 600, yoyo: true, repeat: -1 });
        this.lots.add(pin);
      }
      hit.on('pointerdown', () => this.openBuildingMenu(i));
    });
  }

  // A delivery van drives from the post office to every building that has post waiting.
  addVans() {
    const from = Math.max(0, this.room.city.findIndex(b => b && b.name === 'Post Office')), a = SLOTS[from];
    for (const slot of new Set(this.room.parcels.map(p => p.to))) {
      const b = SLOTS[slot], van = spriteImage(this, 'van', a.x, a.y + 70, 56).setDepth(6);
      this.tweens.add({
        targets: van, x: b.x, y: b.y + 70, duration: 5200, yoyo: true, repeat: -1, hold: 600, ease: 'Sine.easeInOut',
        onUpdate: (tw, t) => van.setFlipX(b.x < a.x ? tw.progress > 0.5 : tw.progress < 0.5 ? b.x < a.x : false),
      });
      this.add.text(b.x, b.y - 74, '📮', { fontSize: '20px' }).setOrigin(0.5);
    }
  }

  // Little people ambling along the paths (they're decoration — and they make it feel like a town).
  addWalkers() {
    const skins = [0xf1c27d, 0x8d5524, 0xffd9a8, 0xc68642], shirts = [0xff6b8b, 0x6ec6ff, 0xffd166, 0x7bd88f];
    PATHS.slice(0, 2).forEach((path, pi) => {
      const pts = smoothPath(path, 8);
      [0, 1].forEach(j => {
        const person = this.add.graphics().setDepth(5);
        const sk = skins[(pi * 2 + j) % 4], sh = shirts[(pi * 2 + j + 1) % 4];
        inkFill(person, blob(0, -12, 7, 9, { n: 10, amp: 0.1, seed: 3 + j }), sh, { w: 2.2, heavy: 0 });
        inkFill(person, blob(0, -26, 8.5, 8, { n: 12, amp: 0.1, seed: 5 + j }), sk, { w: 2.4, heavy: 0 });
        inkStroke(person, [{ x: -3, y: -4 }, { x: -4, y: 2 }], { w: 2.4, heavy: 0 });
        inkStroke(person, [{ x: 3, y: -4 }, { x: 4, y: 2 }], { w: 2.4, heavy: 0 });
        const t = { v: j * 0.5 };
        this.tweens.addCounter({
          from: 0, to: 1, duration: 26000 + pi * 6000 + j * 9000, repeat: -1, yoyo: true,
          onUpdate: tw => {
            const u = tw.getValue(), i = Math.min(pts.length - 2, Math.floor(((u + t.v) % 1) * (pts.length - 1)));
            const a = pts[i], b = pts[i + 1];
            person.setPosition(a.x, a.y + 4 + Math.abs(Math.sin(u * 300)) * -2).setScale(b.x >= a.x ? 1 : -1, 1);
          },
        });
      });
    });
  }

  // --- popups -------------------------------------------------------------------------
  openPopup(title, w, h) {
    this.closePopup();
    const add = o => { o.setDepth(500); this.popup.push(o); return o; };
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive().on('pointerdown', () => this.closePopup()));
    add(inkPanel(this, W / 2, H / 2, w, h, { depth: 500, seed: 6 })).setInteractive(new Phaser.Geom.Rectangle(W / 2 - w / 2, H / 2 - h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    add(richText(this, title, { fontSize: '32px', fontStyle: 'bold' })).setPosition(W / 2, H / 2 - h / 2 + 36);
    return add;
  }

  closePopup() { this.popup.forEach(o => o.destroy()); this.popup = []; }

  button(add, x, y, text, fill, onTap, w) {
    return add(inkButton(this, x, y, text, { fill, onTap, w, size: 24, depth: 500, h: 48 }));
  }

  openBuildingMenu(slot) {
    const b = this.room.city[slot];
    const add = this.openPopup(b.name, 400, 300);
    this.button(add, W / 2, H / 2 - 24, '🚪 Visit', COLORS.green, () => this.visit(slot), 250);
    this.button(add, W / 2, H / 2 + 44, '🔨 Build & decorate', COLORS.orange, () => { this.closePopup(); this.openBuilder(slot); }, 250);
    this.button(add, W / 2, H / 2 + 112, 'Close', COLORS.grey, () => this.closePopup(), 250);
  }

  openBuildPicker(slot) {
    const add = this.openPopup('What shall we build?', 920, 520);
    BUILDABLE.forEach((key, i) => {
      const bp = BLUEPRINTS[key], x = W / 2 - 322 + (i % 4) * 215, y = H / 2 - 128 + Math.floor(i / 4) * 140;
      add(inkPanel(this, x, y, 205, 130, { fill: CARD, depth: 500, seed: 20 + i, radius: 14, shadow: false, weight: 3.2 }));
      const g = add(this.add.graphics().setDepth(500));
      paintBuildingMini(g, bp, x - 46, y + 38, 84, 72);
      add(this.add.text(x - 94, y - 60, bp.name, { fontSize: '21px', fontStyle: 'bold', color: TEXT }).setDepth(500));
      const rooms = bp.floors.reduce((n, f) => n + f.rooms.length, 0);
      add(this.add.text(x + 4, y - 26, `${bp.floors.length} floor${bp.floors.length > 1 ? 's' : ''}\n${rooms} room${rooms > 1 ? 's' : ''}`, { fontSize: '16px', color: TEXT }).setDepth(500));
      const why = whyNotBuild(this.room.city, slot, key, this.room.coins);
      const buy = this.button(add, x + 46, y + 40, `🪙 ${bp.cost}`, why ? COLORS.grey : COLORS.green, () => this.build(slot, key), 92);
      buy.setScale(0.9);
      if (why) buy.setAlpha(this.room.coins < bp.cost ? 0.6 : 1);
    });
  }

  build(slot, key) {
    const why = whyNotBuild(this.room.city, slot, key, this.room.coins);
    if (why) {
      this.room.sfx.nope();
      floatText(this, W / 2, H / 2 + 190, why === 'lot is taken' ? why : `Need ${why}`, 26);
      return;
    }
    this.room.coins -= BLUEPRINTS[key].cost;
    this.room.city[slot] = newBuilding(key);
    this.room.sfx.fanfare();
    this.room.dirty = true;
    this.refreshCoins();
    this.closePopup();
    this.drawLots();
    floatText(this, SLOTS[slot].x, SLOTS[slot].y - 30, '🏗️ Built!', 30);
  }

  // --- leaving ----------------------------------------------------------------------------
  visit(slot) {
    this.scene.stop();
    this.room.exitCityMap(entryZone(this.room.city, slot), true);
  }

  openBuilder(slot) {
    this.scene.pause();
    this.scene.launch('Builder', { room: this.room, slot, hub: this });
  }

  // Back to where we were (the building may have been edited, so the room rebuilds).
  close() {
    this.scene.stop();
    this.room.exitCityMap(this.room.zoneKey, false);
  }
}
