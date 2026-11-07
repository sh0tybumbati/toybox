// The city map: an overlay over the paused game. Buildings stand on lots along the roads, each shown as a
// little model of itself. Tap one to visit it or to build and decorate it; tap an empty lot to build there.
import { W, H } from '../config.js';
import { iconButton, touchable } from '../ui.js';
import { BLUEPRINTS, BUILDABLE, SLOTS, ROAD, newBuilding } from '../data/buildings.js';
import { paintBuildingMini } from '../data/exterior.js';
import { entryZone, whyNotBuild } from '../systems/world.js';
import { floatText } from '../systems/interactions.js';

const label = { color: '#4a3426', fontStyle: 'bold' };
const LOT = { w: 124, h: 118 };
const TREES = [[330, 60], [630, 560], [20, 300], [940, 300], [480, 300], [180, 300], [780, 300]];

export default class HubScene extends Phaser.Scene {
  constructor() { super('Hub'); }

  init(data) { this.room = data.room; this.popup = []; }

  create() {
    this.add.rectangle(0, 0, W, H, 0x8fd481).setOrigin(0).setInteractive();                // grass (blocks what's beneath)
    this.drawRoads();
    this.lots = this.add.container(0, 0);
    this.drawLots();

    this.add.text(W / 2, 28, 'The City', { ...label, fontSize: '34px', color: '#ffffff', stroke: '#3a7a3a', strokeThickness: 6 }).setOrigin(0.5);
    this.coinText = this.add.text(70, 28, '', { ...label, fontSize: '24px', backgroundColor: '#fff4e0', padding: { x: 12, y: 6 } }).setOrigin(0.5);
    this.refreshCoins();
    iconButton(this, W - 44, 30, '✖', () => this.close(), 0);
    this.input.keyboard.on('keydown-ESC', () => (this.popup.length ? this.closePopup() : this.close()));
  }

  refreshCoins() { this.coinText.setText(`🪙 ${this.room.coins}`); }

  drawRoads() {
    const g = this.add.graphics();
    g.fillStyle(0xcfd3d8, 1).fillRect(0, ROAD.y - 24, W, 48);                                 // main road
    for (const x of ROAD.cross) g.fillRect(x - 12, 0, 24, H);                                  // cross streets
    g.fillStyle(0xe6e9ec, 1).fillRect(0, ROAD.y - 24, W, 4).fillRect(0, ROAD.y + 20, W, 4);   // kerbs
    g.lineStyle(4, 0xffffff, 0.9);
    for (let x = 10; x < W; x += 44) g.lineBetween(x, ROAD.y, x + 24, ROAD.y);
    for (const [x, y] of TREES) if (Math.abs(y - ROAD.y) > 30 || !ROAD.cross.includes(x)) this.add.text(x, y, '🌳', { fontSize: '34px' }).setOrigin(0.5).setAlpha(0.9);
    for (const [emoji, y, from, to, dur] of [['🚗', ROAD.y - 9, -40, W + 40, 9000], ['🚌', ROAD.y + 10, W + 40, -40, 12000]]) {   // a little traffic
      const car = this.add.text(from, y, emoji, { fontSize: '30px' }).setOrigin(0.5).setFlipX(from > to);
      this.tweens.add({ targets: car, x: to, duration: dur, repeat: -1 });
    }
  }

  // One tile per lot: the building's model, or an empty plot with a "build" sign.
  drawLots() {
    this.lots.removeAll(true);
    const here = this.room.zone && this.room.zone.slot;
    SLOTS.forEach((pos, i) => {
      const b = this.room.city[i];
      const hit = this.add.rectangle(pos.x, pos.y, LOT.w, LOT.h, b ? 0xffffff : 0xeaf7df, b ? 0 : 0.8)
        .setStrokeStyle(b ? 0 : 3, 0x6aa85a).setInteractive({ useHandCursor: true });
      this.lots.add(hit);
      if (!b) {
        this.lots.add(this.add.text(pos.x, pos.y - 8, '➕', { fontSize: '36px' }).setOrigin(0.5));
        this.lots.add(this.add.text(pos.x, pos.y + 30, 'Build here', { ...label, fontSize: '16px' }).setOrigin(0.5));
        hit.on('pointerdown', () => this.openBuildPicker(i));
        return;
      }
      const g = this.add.graphics();
      paintBuildingMini(g, b, pos.x, pos.y + 40, LOT.w - 8, LOT.h - 34);
      this.lots.add(g);
      this.lots.add(this.add.text(pos.x, pos.y + 52, b.name, { ...label, fontSize: '15px', backgroundColor: '#fff4e0', padding: { x: 6, y: 1 } }).setOrigin(0.5));
      if (i === here) {
        const pin = this.add.text(pos.x, pos.y - 58, '📍', { fontSize: '24px' }).setOrigin(0.5);
        this.tweens.add({ targets: pin, y: pin.y - 6, duration: 600, yoyo: true, repeat: -1 });
        this.lots.add(pin);
      }
      hit.on('pointerdown', () => this.openBuildingMenu(i));
    });
  }

  // --- popups -------------------------------------------------------------------------
  openPopup(title, w, h) {
    this.closePopup();
    const add = o => { o.setDepth(500); this.popup.push(o); return o; };
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive().on('pointerdown', () => this.closePopup()));
    add(this.add.rectangle(W / 2, H / 2, w, h, 0xfff4e0).setStrokeStyle(6, 0xe3c9a0).setInteractive());
    add(this.add.text(W / 2, H / 2 - h / 2 + 30, title, { ...label, fontSize: '26px' }).setOrigin(0.5));
    return add;
  }

  closePopup() { this.popup.forEach(o => o.destroy()); this.popup = []; }

  button(add, x, y, text, color, onTap) {
    const b = add(this.add.text(x, y, text, { fontSize: '22px', color: '#ffffff', backgroundColor: color, padding: { x: 18, y: 9 } }).setOrigin(0.5));
    return touchable(b, 4).on('pointerdown', onTap);
  }

  openBuildingMenu(slot) {
    const b = this.room.city[slot];
    const add = this.openPopup(`${b.emoji || ''} ${b.name}`, 380, 270);
    this.button(add, W / 2, H / 2 - 28, '🚪 Visit', '#3b8f5a', () => this.visit(slot));
    this.button(add, W / 2, H / 2 + 36, '🔨 Build & decorate', '#e0a030', () => { this.closePopup(); this.openBuilder(slot); });
    this.button(add, W / 2, H / 2 + 100, 'Close', '#9a8a78', () => this.closePopup());
  }

  openBuildPicker(slot) {
    const add = this.openPopup('What shall we build?', 860, 440);
    const keys = BUILDABLE;
    keys.forEach((key, i) => {
      const bp = BLUEPRINTS[key], x = W / 2 - 300 + (i % 3) * 300 + (keys.length < 3 ? 150 : 0), y = H / 2 - 20 + Math.floor(i / 3) * 190;
      add(this.add.rectangle(x, y, 270, 170, 0xffffff).setStrokeStyle(3, 0xe0a030));
      const g = add(this.add.graphics());
      paintBuildingMini(g, bp, x - 70, y + 30, 100, 90);
      add(this.add.text(x + 30, y - 52, bp.name, { ...label, fontSize: '20px' }));
      const rooms = bp.floors.reduce((n, f) => n + f.rooms.length, 0);
      add(this.add.text(x + 30, y - 26, `${bp.floors.length} floor${bp.floors.length > 1 ? 's' : ''}\n${rooms} room${rooms > 1 ? 's' : ''}`, { ...label, fontSize: '15px', fontStyle: 'normal' }));
      const why = whyNotBuild(this.room.city, slot, key, this.room.coins);
      const buy = this.button(add, x + 40, y + 52, `🪙 ${bp.cost}`, why && why !== '' && this.room.coins < bp.cost ? '#9a8a78' : '#3b8f5a', () => this.build(slot, key));
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
