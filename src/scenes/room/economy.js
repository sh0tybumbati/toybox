// Room scene mixin — Coins and the shop: earning, locked premium items, buying, park coins.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { FLOOR_BOTTOM, FLOOR_TOP } from '../../config.js';
import { PREMIUM, earnAmount } from '../../data/economy.js';
import { floatText, puff } from '../../systems/interactions.js';

export const economyMethods = {
  // Pay out for something the player did (rules + cooldowns in data/economy.js).
  earn(rule, x, y) {
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

  // Coins to find lying around in the park.
  spawnCoin() {
    this.groundCoins = this.groundCoins.filter(c => c.active);
    if (this.groundCoins.length >= 4) return;
    const x = Phaser.Math.Between(90, 860), y = Phaser.Math.Between(FLOOR_TOP + 20, FLOOR_BOTTOM - 20);
    const coin = this.add.text(x, y - 60, '🪙', { fontSize: '40px' }).setOrigin(0.5).setDepth(3000)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: coin, y, duration: 350, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: coin, scale: 1.15, duration: 600, yoyo: true, repeat: -1, delay: 400 });
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
