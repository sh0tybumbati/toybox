// Room scene mixin — Playground gear: friends ride swings, seesaws and spring horses, sit on benches and
// whizz down slides (systems/play.js). Tap a piece to send the selected friend over; tap it again, or tap
// the rider, to get off. These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { FLOOR_BOTTOM, FLOOR_TOP } from '../../config.js';
import { CLIMB_SHARE, RAMP, SLIDE_MS, freeSeat, partAngle, seatCount, seatPoint, slidePoint } from '../../systems/play.js';
import { floatText, puff, squashTo } from '../../systems/interactions.js';
import { clamp } from '../../util.js';

const riders = prop => (prop.riders || (prop.riders = []));
const floorY = prop => prop.y + prop.def.h / 2;

export const playMethods = {
  // Tapping playground gear: the selected friend goes to ride it; if it is full (or they are already on), someone hops off.
  tapPlay(prop) {
    const on = riders(prop);
    const slide = prop.def.ride.slide;
    if (!slide && on.length >= seatCount(prop.def.ride)) { this.dismount(on[0]); return; }
    const c = this.walkerFor({ x: prop.x });
    if (!c || (c.riding && c.riding.prop === prop)) { if (c) this.dismount(c); return; }
    if (c.riding) this.dismount(c, true);
    if (c.sleeping) this.wakeUp(c, true);
    const seat = slide ? null : freeSeat(prop.def.ride, on.map(r => r.riding));
    const at = slide ? { x: prop.x + slide.base.x + 34, lane: floorY(prop) + 8 } : this.seatApproach(prop, seat);
    c.goal = { x: clamp(at.x, 60, this.worldW - 60), lane: clamp(at.lane, FLOOR_TOP + 20, FLOOR_BOTTOM) };
    c.z = 0;
    this.showWalkMarker(c.goal.x, c.goal.lane);
    c.onArrive = () => { if (prop.active && !c.riding) this.mount(c, prop, seat); };
  },

  // Where to stand to get on a seat: just in front of it.
  seatApproach(prop, seat) {
    const s = prop.def.ride.parts[seat.part].seats[seat.seat];
    return { x: prop.x + s.x, lane: floorY(prop) + 10 };
  },

  // A friend dropped on the gear climbs on.
  tryPlay(c) {
    const prop = this.props.find(p => p.def.behaviour === 'play' && Math.abs(c.x - p.x) <= p.def.w / 2 && c.lane >= floorY(p) - 60 && c.lane <= floorY(p) + 40
      && (p.def.ride.slide || freeSeat(p.def.ride, riders(p).map(r => r.riding))));
    if (!prop) return false;
    this.mount(c, prop, prop.def.ride.slide ? null : freeSeat(prop.def.ride, riders(prop).map(r => r.riding)));
    return true;
  },

  mount(c, prop, seat) {
    const ride = prop.def.ride;
    if (c.riding || c.held) return;
    if (!ride.slide) {
      seat = seat && !riders(prop).some(r => r.riding.part === seat.part && r.riding.seat === seat.seat) ? seat : freeSeat(ride, riders(prop).map(r => r.riding));
      if (!seat) return;
    }
    c.goal = null; c.onArrive = null; c.walking = false; c.z = 0; c.vz = 0;
    c.lane = floorY(prop);
    c.riding = ride.slide ? { prop, slide: true, u: 0 } : { prop, part: seat.part, seat: seat.seat };
    riders(prop).push(c);
    prop.boing(0.5);
    this.sfx.pop();
    puff(this, prop.x, prop.y, 0xfff3a0, 4);
    this.dirty = true;
  },

  // Get off. `instant` snaps them to the ground (leaving the room, furniture mode); otherwise a little hop.
  dismount(c, instant = false) {
    const r = c.riding;
    if (!r) return;
    const prop = r.prop;
    c.riding = null;
    c.sitting = false;
    prop.riders = riders(prop).filter(x => x !== c);
    const out = r.slide ? { x: prop.x + prop.def.ride.slide.end.x + 50, lane: floorY(prop) + 14 }
      : { x: prop.x + prop.def.ride.parts[r.part].seats[r.seat].x, lane: floorY(prop) + 14 };
    c.setAngle(0);
    c.x = clamp(out.x, 60, Math.max(60, this.worldW - 60));
    c.lane = clamp(out.lane, FLOOR_TOP + 20, FLOOR_BOTTOM);
    c.y = c.lane - c.foot();
    c.z = 0;
    if (!instant) { squashTo(this, c, 0.92, 1.08, 120); this.sfx.pop(); }
    this.dirty = true;
  },

  dismountProp(prop, instant = false) { [...riders(prop)].forEach(c => this.dismount(c, instant)); },
  dismountAll(instant = false) { this.characters.forEach(c => { if (c.riding) this.dismount(c, instant); }); },

  // Every frame: rock the moving parts (more when somebody is on), carry riders with their seats, run the slide.
  tickPlay(dt, now) {
    for (const prop of this.props) {
      const ride = prop.def.ride;
      if (!ride) continue;
      const on = riders(prop).filter(c => c.active && this.characters.includes(c) && c.riding && c.riding.prop === prop);
      prop.riders = on;
      prop.rock = clamp((prop.rock || 0) + (on.length ? RAMP : -RAMP) * dt, 0, 1);
      const t = now / 1000, angles = (ride.parts || []).map(part => partAngle(part, t, prop.rock));
      (prop.parts || []).forEach((g, i) => { if (g) g.setRotation(angles[i] || 0); });

      for (const c of on) {
        const r = c.riding;
        let at, lean = 0;
        if (r.slide) {
          r.u += dt * 1000 / SLIDE_MS;
          if (r.u >= 1) { this.dismount(c); floatText(this, c.x, c.headTopY() - 10, '🎉'); this.earn('play', c.x, c.headTopY() - 40); continue; }
          const p = slidePoint(ride.slide, r.u);
          at = p; lean = p.lean;
        } else {
          at = seatPoint(ride, r.part, r.seat, angles[r.part]);
          lean = angles[r.part] * 180 / Math.PI * 0.5;
        }
        c.x = prop.x + at.x;
        c.y = prop.y + at.y - (c.layout.hip.y - 8) * c.scaleX;      // hips on the seat
        c.sitting = !r.slide || r.u >= CLIMB_SHARE;
        c.setAngle(lean);
        c.setDepth(prop.depth + 0.01);
        c.lane = floorY(prop);
      }
    }
  },
};
