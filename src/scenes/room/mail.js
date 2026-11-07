// Room scene mixin — The post: drop an item on a mailbox, choose a building, and it arrives the next time you go there.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { H, W } from '../../config.js';
import { addParcel, destinations, takeParcels } from '../../systems/mail.js';
import { deliveryFee } from '../../systems/market.js';
import { floatText } from '../../systems/interactions.js';
import { spawnFront } from '../../systems/spawn.js';
import { COLORS, inkButton, inkPanel, pin, richText } from '../../ui.js';

export const mailMethods = {
  // An item was dropped on a mailbox: it slips in, and the destination picker opens.
  postItem(box, item) {
    const key = item.key;
    this.discard(item, { x: box.x, y: box.y - 40, scale: 0.2, duration: 220 });
    box.boing(0.8);
    this.sfx.whoosh();
    this.openMailPicker(box, key);
  },

  openMailPicker(box, key) {
    this.closeMailPicker();
    const fee = box.def.fee, dests = destinations(this.city).filter(d => !fee || d.slot !== this.zone.slot), ui = (this.mailUI = []);
    const add = o => { pin(o).setDepth(9700); ui.push(o); return o; };
    const back = () => { this.closeMailPicker(); spawnFront(this, key, box, 60); };          // changed your mind: it pops back out
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0).setInteractive().on('pointerdown', back));
    const rows = Math.ceil(dests.length / 2), h = 130 + rows * 56;
    add(inkPanel(this, W / 2, H / 2, 560, h, { depth: 9700, seed: 14 })).setInteractive(new Phaser.Geom.Rectangle(W / 2 - 280, H / 2 - h / 2, 560, h), Phaser.Geom.Rectangle.Contains);
    add(richText(this, fee ? 'Deliver it to…  🚚' : 'Post it to…  📮', { fontSize: '30px', fontStyle: 'bold' })).setPosition(W / 2, H / 2 - h / 2 + 36);
    dests.forEach((d, i) => {
      const x = W / 2 + (i % 2 ? 130 : -130), y = H / 2 - h / 2 + 90 + Math.floor(i / 2) * 56;
      add(inkButton(this, x, y, fee ? `${d.name} · ${deliveryFee(this.zone.slot, d.slot)} 🪙` : d.name, { w: 230, h: 44, size: 22, fill: COLORS.green, depth: 9700, onTap: () => this.sendParcel(key, d.slot, box) }));
    });
    add(inkButton(this, W / 2, H / 2 + h / 2 - 34, 'Never mind', { w: 180, h: 38, size: 20, fill: COLORS.grey, depth: 9700, onTap: back }));
  },

  closeMailPicker() { (this.mailUI || []).forEach(o => o.destroy()); this.mailUI = []; },

  // Put the parcel on the van (the item is already in the box).
  sendParcel(key, slot, box) {
    const fee = box.def.fee ? deliveryFee(this.zone.slot, slot) : 0;
    this.closeMailPicker();
    if (fee > this.coins) { this.sfx.nope(); floatText(this, box.x, box.y - 90, `${fee - this.coins} more 🪙 for the van`, 24); spawnFront(this, key, box, 60); return; }
    const next = addParcel(this.parcels, key, slot, box.def.fee ? this.zone.slot : undefined);
    if (!next) { this.sfx.nope(); floatText(this, box.x, box.y - 90, 'The van is full!', 24); spawnFront(this, key, box, 60); return; }
    this.parcels = next;
    this.sfx.ding();
    if (fee) { this.coins -= fee; this.updateNav(); }
    box.setState(true);
    this.time.delayedCall(900, () => { if (box.active) box.setState(false); });
    floatText(this, box.x, box.y - 80, `${fee ? '🚚' : '📮'} Off to ${this.city[slot].name}!`, 26);
    if (!fee) this.earn('mail', box.x, box.y - 130);
    this.dirty = true;
  },

  // We've arrived somewhere: whatever was posted here turns up in a little pile by the kids.
  deliverParcels() {
    if (!this.parcels.length) return;
    const { delivered, rest } = takeParcels(this.parcels, this.zone.slot);
    if (!delivered.length) return;
    this.parcels = rest;
    const kid = this.selected || this.characters[0], at = { x: (kid ? kid.x : 300) + 140, y: 430, def: { h: 80 } };
    this.time.delayedCall(700, () => {
      floatText(this, at.x, 330, "📮 You've got mail!", 32);
      this.sfx.fanfare();
      delivered.forEach((key, i) => this.time.delayedCall(i * 260, () => spawnFront(this, key, at, 140)));
    });
    this.dirty = true;
  },
};
