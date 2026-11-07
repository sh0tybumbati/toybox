// Cashier: scan each thing in the customer's basket, then count out their change. Hand-inked.
import { W } from '../../config.js';
import MiniGame from './MiniGame.js';
import { COLORS, TEXT, hitZone, inkButton } from '../../ui.js';
import { iconImage } from '../../systems/itemTextures.js';
import { CHANGE_COINS, CUSTOMERS, checkChange, coinsFor, newOrder } from '../../systems/cashier.js';
import { priceOf } from '../../systems/market.js';

export default class CashierScene extends MiniGame {
  constructor() { super('Cashier'); }

  create() {
    this.frame();
    this.served = 0; this.earned = 0;
    this.who = this.add.text(W / 2 + 60, 52, '', { fontSize: '26px', color: TEXT }).setDepth(3);
    this.say = this.add.text(W / 2, 128, '', { fontSize: '26px', color: TEXT, align: 'center' }).setOrigin(0.5).setDepth(3);
    this.nextCustomer();
  }

  nextCustomer() {
    (this.live || []).forEach(o => o.destroy());
    this.live = [];
    if (this.served >= CUSTOMERS) return this.results([`${CUSTOMERS} customers served`, `+${this.earned} coins`], { coins: this.earned });
    this.order = newOrder();
    this.scanned = 0; this.left = this.order.items.length; this.given = 0; this.mistakes = 0; this.stage = 'scan';
    this.who.setText(`Customer ${this.served + 1} / ${CUSTOMERS}`);
    this.say.setText('Tap each thing to scan it');
    this.total = this.keep(this.add.text(W - 120, 190, 'Total: 0 🪙', { fontSize: '28px', color: TEXT, fontStyle: 'bold' }).setOrigin(0.5).setDepth(3));
    this.keep(this.add.rectangle(W / 2, 308, 760, 22, 0x6b7482).setDepth(2));                                       // the belt
    const n = this.order.items.length, gap = 130, x0 = W / 2 - 120 - ((n - 1) * gap) / 2;
    this.order.items.forEach((key, i) => {
      const x = x0 + i * gap, pic = iconImage(this, `item:${key}`, x, 250, 84).setDepth(4);
      const tag = this.add.text(x, 322, `${priceOf(key)} 🪙`, { fontSize: '20px', color: TEXT, backgroundColor: '#fff4e0', padding: { x: 6, y: 2 } }).setOrigin(0.5).setDepth(4);
      const zone = hitZone(this, x, 270, 110, 110, () => this.scan(i, pic, tag, zone), 5);
      this.keep(pic); this.keep(tag); this.keep(zone);
    });
  }

  keep(o) { this.live.push(o); return o; }

  scan(i, pic, tag, zone) {
    if (this.stage !== 'scan' || !zone.input.enabled) return;
    zone.disableInteractive();
    this.room.sfx.pop();
    this.scanned += priceOf(this.order.items[i]);
    this.total.setText(`Total: ${this.scanned} 🪙`);
    this.tweens.add({ targets: [pic, tag], y: '+=120', alpha: 0, duration: 260 });
    if (--this.left === 0) this.time.delayedCall(350, () => this.payUp());
  }

  // Everything is scanned: they hand over a note, and you count the change into the tray.
  payUp() {
    this.stage = 'change';
    this.room.sfx.ding();
    this.say.setText(`They pay with ${this.order.paid} 🪙.\nGive back the change!`);
    this.tray = this.keep(this.add.text(W / 2, 240, '', { fontSize: '34px', color: TEXT, fontStyle: 'bold' }).setOrigin(0.5).setDepth(3));
    this.showTray();
    CHANGE_COINS.forEach((c, i) => this.keep(inkButton(this, W / 2 - 250 + i * 130, 400, `+${c}`, { w: 110, h: 54, size: 28, fill: COLORS.gold, depth: 5, seed: 40 + i, onTap: () => { this.given += c; this.room.sfx.coin(); this.showTray(); } })));
    this.keep(inkButton(this, W / 2 + 150, 400, 'Clear', { w: 110, h: 54, size: 24, fill: COLORS.grey, depth: 5, onTap: () => { this.given = 0; this.showTray(); } }));
    this.keep(inkButton(this, W / 2 + 290, 400, '✔ Give', { w: 130, h: 54, size: 26, fill: COLORS.green, depth: 5, onTap: () => this.give() }));
  }

  showTray() { this.tray.setText(`Change: ${this.given} 🪙`); }

  give() {
    if (this.stage !== 'change') return;
    const r = checkChange(this.order, this.given);
    if (r !== 'right') {
      this.mistakes++; this.given = 0; this.showTray();
      this.room.sfx.nope();
      this.say.setText(r === 'short' ? 'Not enough! Try again.' : 'That is too much! Try again.');
      return;
    }
    this.stage = 'thanks';
    const c = coinsFor(this.mistakes);
    this.earned += c; this.served++;
    this.room.sfx.fanfare();
    this.say.setText(`Thank you! ${c ? `+${c} 🪙` : ''}`);
    this.time.delayedCall(900, () => this.nextCustomer());
  }
}
