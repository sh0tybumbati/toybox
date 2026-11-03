// The world map: an overlay over the paused room. Tap a place to go there.
import { W, H } from '../config.js';
import { iconButton } from '../ui.js';
import { ROOMS, ROOM_ORDER } from '../data/rooms.js';

const label = { color: '#4a3426', fontStyle: 'bold' };
const ROADS = [['kitchen', 'bedroom'], ['kitchen', 'park'], ['park', 'shop'], ['bedroom', 'shop']];
const TREES = [[330, 120], [420, 480], [640, 330], [880, 170], [620, 520], [60, 90], [930, 520], [350, 340]];

export default class HubScene extends Phaser.Scene {
  constructor() { super('Hub'); }

  init(data) { this.room = data.room; }

  create() {
    const here = this.room.roomKey;
    this.add.rectangle(0, 0, W, H, 0x7fc8e8).setOrigin(0).setInteractive();       // sea (blocks the room beneath)
    const g = this.add.graphics();
    g.fillStyle(0xf6e7b4, 1).fillEllipse(W / 2, 330, 900, 520);                    // beach
    g.fillStyle(0xa8d98a, 1).fillEllipse(W / 2, 330, 840, 470);                    // island

    g.lineStyle(30, 0xe9d8a6, 1);                                                  // roads
    for (const [a, b] of ROADS) g.lineBetween(ROOMS[a].map.x, ROOMS[a].map.y, ROOMS[b].map.x, ROOMS[b].map.y);
    for (const [x, y] of TREES) this.add.text(x, y, '🌳', { fontSize: '44px' }).setOrigin(0.5);

    for (const key of ROOM_ORDER) this.card(key, key === here);

    this.add.text(W / 2, 40, 'Where to?', { ...label, fontSize: '36px', color: '#ffffff', stroke: '#2a6f97', strokeThickness: 6 })
      .setOrigin(0.5);
    this.add.text(70, 40, `🪙 ${this.room.coins}`, { ...label, fontSize: '26px', backgroundColor: '#fff4e0', padding: { x: 12, y: 6 } })
      .setOrigin(0.5);
    iconButton(this, W - 50, 40, '✖', () => this.go(here), 0);
    this.input.keyboard.on('keydown-ESC', () => this.go(here));
  }

  card(key, current) {
    const { map, label: name } = ROOMS[key];
    const bg = this.add.rectangle(map.x, map.y, 140, 120, current ? 0xffe9a8 : 0xfff4e0)
      .setStrokeStyle(current ? 6 : 3, current ? 0xe0a030 : 0x4a3426)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.go(key));
    this.add.text(map.x, map.y - 12, map.emoji, { fontSize: '58px' }).setOrigin(0.5);
    this.add.text(map.x, map.y + 40, name.split(' ').slice(1).join(' '), { ...label, fontSize: '20px' }).setOrigin(0.5);
    if (current) {
      const pin = this.add.text(map.x, map.y - 84, '📍 You are here', { ...label, fontSize: '16px', backgroundColor: '#ffffff', padding: { x: 8, y: 3 } })
        .setOrigin(0.5);
      this.tweens.add({ targets: pin, y: pin.y - 6, duration: 600, yoyo: true, repeat: -1 });
    } else {
      bg.on('pointerover', () => bg.setScale(1.06)).on('pointerout', () => bg.setScale(1));
    }
  }

  go(key) {
    const room = this.room;
    this.scene.resume('Room');
    this.scene.stop();
    if (key !== room.roomKey) room.goToRoom(key);
  }
}
