// The mini-games. A station (a piece of furniture with behaviour 'station' and a `game`) launches one when tapped:
// the room scene pauses, the game's scene runs as an overlay, and its result comes back to RoomScene.onGameResult.
// A result is { coins?, items?: [itemKey], note? } plus whatever the game itself hands back (a shirt design, a toy…).
export const MINIGAMES = {
  fishing: { name: 'Fishing',          scene: 'Fishing',  blurb: 'Cast, wait for the bite, then reel it in!' },
  arcade:  { name: 'TV and Games',      scene: 'Console',  blurb: 'Pick a cartridge and play!' },
  shirt:   { name: 'Shirt Factory',    scene: 'ShirtShop', blurb: 'Design a brand-new shirt and wear it.' },
  sculpt:  { name: 'Toy Workshop',     scene: 'Sculpt',   blurb: 'Sculpt a new toy out of clay.' },
  cashier: { name: 'Checkout',        scene: 'Cashier',  blurb: 'Scan the shopping and give the right change.' },
  ikea:    { name: 'Flat-pack Furniture', scene: 'Ikea', blurb: 'Build it from the numbered parts, then send it home.' },
  camp:    { name: 'Marshmallows',     scene: 'Camp',     blurb: 'Toast it golden — not burnt!' },
};
export const GAME_IDS = Object.keys(MINIGAMES);

// The cartridges for the TV's console (each is a scene that extends MiniGame with gameId 'arcade').
export const ARCADE_GAMES = {
  starcatcher: { name: 'Star Catcher', scene: 'Arcade',  blurb: 'Catch stars, dodge socks', icon: 'star' },
  bubbles:     { name: 'Bubble Pop',   scene: 'Bubbles', blurb: 'Pop them fast for combos', icon: 'bubble' },
  memory:      { name: 'Memory Match', scene: 'Memory',  blurb: 'Find all the pairs',       icon: 'item:duck' },
  hopper:      { name: 'Hopper',       scene: 'Hopper',  blurb: 'Jump over everything',     icon: 'icon-feet' },
};
