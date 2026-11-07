// Room scene mixin — Coins and the shop: earning, locked premium items, buying, park coins.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { FLOOR_BOTTOM, FLOOR_TOP } from '../../config.js';
import { PREMIUM, earnAmount } from '../../data/economy.js';
import { floatText, puff } from '../../systems/interactions.js';
import { priceOf } from '../../systems/market.js';
import { spriteImage } from '../../systems/itemTextures.js';

export const economyMethods = {
  // Pay out for something the player did (rules + cooldowns in data/economy.js).
  earn(rule, x, y) {
    if (this.hard) return;                                  // no coin rewards in hard mode: money comes from work
    const n = earnAmount(rule, this.lastEarned[rule], this.time.now);
    if (!n) return;
    this.lastEarned[rule] = this.time.now;
    this.coins += n;
    this.updateNav();
    this.sfx.coin();
    floatText(this, x, y, `+${n} 🪙`, 28);
    this.dirty = true;
  },

  // Premium shelf items start locked: greyed, with a price tag. Tap to buy.
  lockItem(item) {
    item.locked = true;
    item.input.draggable = false;
    item.setAlpha(0.55);
    item.tag = this.add.text(item.x, item.y + 46, `🔒 ${PREMIUM[item.key]} 🪙`,
      { fontSize: '15px', color: '#4a3426', backgroundColor: '#fff4e0', padding: { x: 6, y: 2 } })
      .setOrigin(0.5).setDepth(item.depth);
    item.on('pointerdown', () => this.attemptBuy(item));
  },

  attemptBuy(item) {
    if (!item.locked) return;
    const price = PREMIUM[item.key];
    if (this.coins < price) {                    // not yet: wiggle, and say how many more
      this.sfx.nope();
      this.tweens.add({ targets: item, x: item.x + 6, duration: 50, yoyo: true, repeat: 3, onComplete: () => { item.x = item.tag ? item.tag.x : item.x; } });
      floatText(this, item.x, item.y - 60, `${price - this.coins} more 🪙`, 24);
      return;
    }
    this.coins -= price;
    this.tipEvent('shop');
    this.unlocked.add(item.key);
    item.locked = false;
    item.input.draggable = true;
    item.setAlpha(1);
    if (item.tag) { item.tag.destroy(); item.tag = null; }
    this.updateNav();
    this.sfx.ding();
    puff(this, item.x, item.y, 0xfff3a0, 8);
    floatText(this, item.x, item.y - 60, `-${price} 🪙`, 28);
    this.dirty = true;
  },

  // Supermarket shelf items wear a price tag; you can only take one if you can pay for it.
  priceItem(item, price) {
    item.price = price;
    item.tag = this.add.text(item.x, item.y + 46, `${price} 🪙`,
      { fontSize: '15px', color: '#4a3426', backgroundColor: '#fff4e0', padding: { x: 6, y: 2 } })
      .setOrigin(0.5).setDepth(item.depth);
    item.on('pointerdown', () => { if (item.onShelf && this.coins < price) this.tooPricey(item); });
    this.dimUnaffordable(item);
  },

  dimUnaffordable(item) {
    const ok = this.coins >= item.price;
    item.input.draggable = ok && !this.editMode;
    item.setAlpha(ok ? 1 : 0.6);
  },

  // Coins changed: shelf items you can't afford grey out, and ones you now can come back to life.
  refreshPrices() {
    for (const b of this.bodies || []) if (b.onShelf && b.price && !b.dead) this.dimUnaffordable(b);
  },

  tooPricey(item) {
    this.sfx.nope();
    this.tweens.add({ targets: item, x: item.x + 6, duration: 50, yoyo: true, repeat: 3, onComplete: () => { item.x = item.shelfPos.x; } });
    floatText(this, item.x, item.y - 60, `${item.price - this.coins} more 🪙`, 24);
  },

  // Taken off the shelf: pay up (the tag goes with it).
  payFor(item) {
    this.coins -= item.price;
    this.tipEvent('groceries');
    if (item.tag) { item.tag.destroy(); item.tag = null; }
    item.setAlpha(1);
    this.updateNav();
    this.sfx.coin();
    floatText(this, item.x, item.y - 60, `-${item.price} 🪙`, 24);
    item.price = 0;
  },

  // Coins to find lying around in the park.
  spawnCoin() {
    this.groundCoins = this.groundCoins.filter(c => c.active);
    if (this.groundCoins.length >= 4) return;
    const parks = this.zone.sections.filter(s => s.type === 'park');
    if (!parks.length) return;
    const sec = Phaser.Utils.Array.GetRandom(parks);
    const x = sec.offset + Phaser.Math.Between(90, Math.min(860, sec.w - 90)), y = Phaser.Math.Between(FLOOR_TOP + 20, FLOOR_BOTTOM - 20);
    const base = 48 / 128;                                       // the coin's drawing is 64 units in a 128px texture
    const coin = spriteImage(this, 'coin', x, y - 60, 48).setDepth(3000).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: coin, y, duration: 350, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: coin, scale: coin.scaleX * 1.15, duration: 600, yoyo: true, repeat: -1, delay: 400 });
    coin.on('pointerdown', () => {
      this.earn('pickup', coin.x, coin.y - 40);
      puff(this, coin.x, coin.y, 0xfff3a0, 4);
      this.tweens.killTweensOf(coin);
      coin.destroy();
    });
    this.groundCoins.push(coin);
    this.roomGfx.push(coin);
  },
};
