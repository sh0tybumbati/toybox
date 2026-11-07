// The mini-games. A station (a piece of furniture with behaviour 'station' and a `game`) launches one when tapped:
// the room scene pauses, the game's scene runs as an overlay, and its result comes back to RoomScene.onGameResult.
// A result is { coins?, items?: [itemKey], note? } plus whatever the game itself hands back (a shirt design, a toy…).
export const MINIGAMES = {
  fishing: { name: 'Fishing',          scene: 'Fishing',  blurb: 'Cast, wait for the bite, then reel it in!' },
  arcade:  { name: 'Star Catcher',     scene: 'Arcade',   blurb: 'Catch the falling stars — dodge the socks!' },
  shirt:   { name: 'Shirt Factory',    scene: 'ShirtShop', blurb: 'Design a brand-new shirt and wear it.' },
  sculpt:  { name: 'Toy Workshop',     scene: 'Sculpt',   blurb: 'Sculpt a new toy out of clay.' },
  camp:    { name: 'Marshmallows',     scene: 'Camp',     blurb: 'Toast it golden — not burnt!' },
};
export const GAME_IDS = Object.keys(MINIGAMES);
