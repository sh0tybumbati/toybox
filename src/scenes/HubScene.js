// The city map: an overlay over the paused game, drawn as a bumpy hand-inked landscape (art/reference/).
// Buildings stand on dirt plots along winding paths, each shown as a chubby little model of itself. Tap one
// to visit it or to build and decorate it; tap an empty dashed plot (with its sign) to build there.
import { W, H } from '../config.js';
import { CARD, COLORS, TEXT, iconButton, inkButton, inkChip, inkPanel, richText } from '../ui.js';
import { spriteImage } from '../systems/itemTextures.js';
import { BLUEPRINTS, BUILDABLE, PATHS, SLOTS, isHouse, newBuilding } from '../data/buildings.js';
import { isLet, marketRent, newLet, whyNotLet } from '../systems/hard/landlord.js';
import { acquireHouse, acquireLot, editRights, lotPrice, shortMoney, whyNotBuyLot } from '../systems/hard/property.js';
import { mortgageOffer, takeMortgage } from '../systems/hard/credit.js';
import { paintBuildingMini } from '../data/exterior.js';
import { INK, blob, inkFill, inkStroke, smoothPath } from '../data/ink.js';
import { MAP_COLORS, paintPlot, paintScenery, paintSign, paintTerrain } from '../data/mapart.js';
import { demolishRefund, entryZone, whyNotBuild, whyNotDemolish } from '../systems/world.js';
import { floatText } from '../systems/interactions.js';

const HAND = '"Patrick Hand", "Comic Sans MS", "Noto Color Emoji", cursive';
const label = { fontFamily: HAND, color: '#3a2a22', fontStyle: 'bold' };
const RIVER = [{ x: -20, y: 584 }, { x: 160, y: 566 }, { x: 330, y: 592 }, { x: 520, y: 570 }, { x: 700, y: 594 }, { x: 980, y: 572 }];
const LOT = { w: 132, h: 108 };

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

  refreshCoins() { this.coinText.setLabel(this.room.hard ? `$ ${this.room.cash.toLocaleString('en-US')}` : `🪙 ${this.room.coins}`); }

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
        const board = paintSign(g, pos.x + 14, pos.y + 44, 66, 30, i);
        this.lots.add(this.add.text(board.x, board.y, this.room.hard ? 'FOR\nSALE' : 'BUILD\nHERE', { ...label, fontSize: '12px', align: 'center', lineSpacing: -3 }).setOrigin(0.5));
        hit.on('pointerdown', () => this.openBuildPicker(i));
        return;
      }
      paintBuildingMini(g, b, pos.x, pos.y + 42, LOT.w - 14, LOT.h - 8, i * 13 + 5);
      this.lots.add(inkChip(this, pos.x, pos.y + 58, b.name, { size: 16, h: 26, fill: b.owned ? 0xcfeec0 : 0xf3e3b8, depth: 5, seed: i + 30 }));
      if (b.let && b.let.listed && !b.let.tenant) {
        const board = paintSign(g, pos.x + 44, pos.y + 22, 58, 26, i + 9);
        this.lots.add(this.add.text(board.x, board.y, 'TO\nLET', { ...label, fontSize: '11px', align: 'center', lineSpacing: -3 }).setOrigin(0.5));
      }
      if (b.forSale) {
        const board = paintSign(g, pos.x + 44, pos.y + 22, 58, 26, i + 7);
        this.lots.add(this.add.text(board.x, board.y, 'FOR\nSALE', { ...label, fontSize: '11px', align: 'center', lineSpacing: -3 }).setOrigin(0.5));
      }
      if (i === here) {
        const pin = spriteImage(this, 'icon-pin', pos.x, pos.y - 64, 30);
        this.tweens.add({ targets: pin, y: pin.y - 7, duration: 600, yoyo: true, repeat: -1 });
        this.lots.add(pin);
      }
      hit.on('pointerdown', () => this.openBuildingMenu(i));
    });
  }

  // A delivery van drives from the post office to every building that has post waiting.
  addVans() {
    const post = Math.max(0, this.room.city.findIndex(b => b && b.name === 'Post Office'));
    for (const key of new Set(this.room.parcels.map(p => `${p.from ?? post}>${p.to}`))) {
      const [from, slot] = key.split('>').map(Number), a = SLOTS[from], b = SLOTS[slot], van = spriteImage(this, 'van', a.x, a.y + 70, 56).setDepth(6);
      this.tweens.add({
        targets: van, x: b.x, y: b.y + 70, duration: 5200, yoyo: true, repeat: -1, hold: 600, ease: 'Sine.easeInOut',
        onUpdate: (tw, t) => van.setFlipX(b.x < a.x ? tw.progress > 0.5 : tw.progress < 0.5 ? b.x < a.x : false),
      });
      this.add.text(b.x, b.y - 74, from === post ? '📮' : '🚚', { fontSize: '20px' }).setOrigin(0.5);
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
    const b = this.room.city[slot], hard = Boolean(this.room.hard), house = isHouse(b);
    const rights = hard ? editRights(b, this.room.hard.home, slot) : (house ? 'full' : '');
    const acts = [{ text: '🚪 Visit', fill: COLORS.green, tap: () => this.visit(slot) }];
    if (hard && b.forSale) {
      acts.push({ text: `🏷 Buy for ${shortMoney(b.forSale)}`, fill: COLORS.gold, tap: () => this.openFinance(slot, b.forSale, this.houseMaker(slot)) });
    }
    if (hard && b.owned && house && !isLet(b) && !(this.room.hard.home && this.room.hard.home.slot === slot)) acts.push({ text: '🔑 Move in', fill: COLORS.blue, tap: () => { this.room.moveIn(slot); this.closePopup(); floatText(this, SLOTS[slot].x, SLOTS[slot].y - 30, 'Home!', 28); } });
    if (hard && !whyNotLet(b, this.room.hard.home, slot)) acts.push({ text: isLet(b) ? '🏘 Your tenant' : '🏘 Rent it out', fill: COLORS.purple, tap: () => { this.closePopup(); this.openLandlord(slot); } });
    if (rights === 'full') acts.push({ text: '🔨 Build & decorate', fill: COLORS.orange, tap: () => { this.closePopup(); this.openBuilder(slot); } });
    if (!hard && house) acts.push(this.demolishAction(slot));
    const h = 130 + acts.length * 66 + 60, add = this.openPopup(b.name, 400, h), top = H / 2 - h / 2 + 100;
    acts.forEach((a, i) => { const btn = this.button(add, W / 2, top + i * 66, a.text, a.fill, a.tap, 270); if (a.arm) a.arm(btn); });
    this.button(add, W / 2, H / 2 + h / 2 - 44, 'Close', COLORS.grey, () => this.closePopup(), 270);
  }

  nope(why) { this.room.sfx.nope(); floatText(this, W / 2, H / 2 + 190, why, 26); }

  // The kid-mode demolish button: the first tap asks, the second one does it.
  demolishAction(slot) {
    const b = this.room.city[slot], why = whyNotDemolish(this.room.city, slot), idle = why ? '🗑 Demolish' : `🗑 Demolish (+${demolishRefund(b)} 🪙)`;
    let btn = null;
    return {
      text: idle, fill: why ? COLORS.grey : COLORS.red, arm: x => { btn = x; },
      tap: () => {
        if (why) { this.nope(why === 'the last building stays' ? 'You need at least one building' : why); return; }
        if (!this.armed) { this.armed = true; btn.setLabel('Tap again to demolish'); this.time.delayedCall(2200, () => { this.armed = false; if (btn.active) btn.setLabel(idle); }); return; }
        this.armed = false;
        this.demolish(slot);
      },
    };
  }

  openBuildPicker(slot) {
    const hard = Boolean(this.room.hard), add = this.openPopup(hard ? 'A lot for sale: buy it and build' : 'What shall we build?', 920, 440);
    BUILDABLE.forEach((key, i) => {
      const bp = BLUEPRINTS[key], x = W / 2 - 280 + i * 280, y = H / 2 + 20;
      add(inkPanel(this, x, y, 250, 260, { fill: CARD, depth: 500, seed: 20 + i, radius: 14, shadow: false, weight: 3.2 }));
      const g = add(this.add.graphics().setDepth(500));
      paintBuildingMini(g, bp, x, y + 8, 130, 96);
      add(this.add.text(x, y - 108, bp.name, { fontSize: '24px', fontStyle: 'bold', color: TEXT }).setOrigin(0.5).setDepth(500));
      const rooms = bp.floors.reduce((n, f) => n + f.rooms.length, 0);
      add(this.add.text(x, y + 38, `${bp.floors.length} floor${bp.floors.length > 1 ? 's' : ''}, ${rooms} room${rooms > 1 ? 's' : ''}`, { fontSize: '17px', color: TEXT }).setOrigin(0.5).setDepth(500));
      const why = hard ? whyNotBuyLot(this.room.city, slot, key, Infinity) : whyNotBuild(this.room.city, slot, key, this.room.coins);
      const buy = this.button(add, x, y + 88, hard ? shortMoney(lotPrice(key)) : 'Free', why ? COLORS.grey : COLORS.green, () => (hard ? this.openFinance(slot, lotPrice(key), () => acquireLot(this.room.city, slot, key)) : this.build(slot, key)), 150);
      buy.y = y + 92;
      if (why) buy.setAlpha(0.7);
    });
  }

  demolish(slot) {
    if (whyNotDemolish(this.room.city, slot)) return;
    this.room.coins += demolishRefund(this.room.city[slot]);
    this.room.city[slot] = null;
    this.room.forgetBuilding(slot);
    this.room.sfx.whoosh();
    this.refreshCoins();
    this.closePopup();
    this.drawLots();
    floatText(this, SLOTS[slot].x, SLOTS[slot].y - 30, 'Gone!', 30);
  }

  build(slot, key) {
    const why = whyNotBuild(this.room.city, slot, key, this.room.coins);
    if (why) { this.nope(why === 'lot is taken' ? why : `Need ${why}`); return; }
    this.room.coins -= BLUEPRINTS[key].cost;
    this.room.city[slot] = newBuilding(key);
    this.finishBuild(slot, '🏗️ Built!');
  }

  finishBuild(slot, words) {
    this.room.tipEvent('build');
    this.room.sfx.fanfare();
    this.room.dirty = true;
    this.refreshCoins();
    this.closePopup();
    this.drawLots();
    floatText(this, SLOTS[slot].x, SLOTS[slot].y - 30, words, 30);
  }

  // How will you pay? Outright from your pocket, or a mortgage: a down payment now and a payment every month.
  openFinance(slot, price, make) {
    const r = this.room, h = r.hard, offer = mortgageOffer(h, price), cash = r.wallet;
    const add = this.openPopup(`Pay ${shortMoney(price)}`, 560, 360);
    add(this.add.text(W / 2, H / 2 - 110, `Cash on you: ${shortMoney(cash)}`, { fontSize: '16px', color: '#7a6a58' }).setOrigin(0.5).setDepth(500));
    this.button(add, W / 2, H / 2 - 62, `Pay in full · ${shortMoney(price)}`, cash >= price ? COLORS.green : COLORS.grey, () => this.purchase(slot, price, make, 'cash'), 440);
    add(this.add.text(W / 2, H / 2 + 10, offer.why ? `No mortgage: ${offer.why}.` : `Credit ${h.credit.score} (${offer.tier.label}): ${shortMoney(offer.down)} down, then ${shortMoney(offer.payment)} a month for ${offer.term} months at ${(offer.rate * 100).toFixed(2)}%`, { fontSize: '17px', color: TEXT, align: 'center', wordWrap: { width: 500 } }).setOrigin(0.5).setDepth(500));
    this.button(add, W / 2, H / 2 + 76, offer.why ? 'Mortgage unavailable' : `Mortgage · ${shortMoney(offer.down)} down`, !offer.why && cash >= offer.down ? COLORS.gold : COLORS.grey, () => this.purchase(slot, price, make, 'mortgage'), 440);
    this.button(add, W / 2, H / 2 + 138, 'Back', COLORS.grey, () => this.closePopup(), 200);
  }

  houseMaker(slot) { return () => acquireHouse(this.room.city, slot); }

  // Buy the house for sale at `slot`, 'cash' or 'mortgage' (what the buttons do).
  buyListed(slot, how) { return this.purchase(slot, this.room.city[slot].forSale, this.houseMaker(slot), how); }

  // Pay for a property ('cash' in full, or a 'mortgage'); `make` hands it over. Returns whether it went through.
  purchase(slot, price, make, how) {
    const r = this.room, h = r.hard, cash = r.wallet;
    if (how === 'cash') {
      if (cash < price) { this.nope(`${shortMoney(price - cash)} more cash`); return false; }
      r.wallet -= price; make(); this.finishBuild(slot, '🔑 Yours!');
      return true;
    }
    const offer = mortgageOffer(h, price);
    if (offer.why) { this.nope(offer.why); return false; }
    if (cash < offer.down) { this.nope(`${shortMoney(offer.down - cash)} more for the down payment`); return false; }
    r.wallet -= offer.down; make(); takeMortgage(h, slot, price, offer); this.finishBuild(slot, '🔑 Mortgaged!');
    return true;
  }

  // --- leaving ----------------------------------------------------------------------------
  visit(slot) {
    this.scene.stop();
    this.room.exitCityMap(entryZone(this.room.city, slot), true);
  }

  openLandlord(slot) {
    const b = this.room.city[slot];
    if (!b.let) b.let = newLet(marketRent(b, null));
    this.scene.pause();
    this.scene.launch('Landlord', { room: this.room, slot, hub: this });
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
