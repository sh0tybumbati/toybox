// QA: substances OFF, through the UI as a player would see it (no forcing of pages).
import { launch, wait } from '../e2e/harness.mjs';
const S = n => `__toybox.scene.getScene('${n}')`;
const g = await launch();
try {
  await g.open(); await g.clearSave(); await g.open(); await wait(1500);
  await g.room('r.openSettings();'); await wait(400);
  for (let i = 0; i < 7; i++) await g.ev(`${S('Settings')}.tapVersion()`);
  await wait(400); await g.ev(`${S('AdultGate')}.proceed()`); await wait(600);
  for (let k = 0; k < 2; k++) { for (const d of '1234') await g.ev(`${S('Pin')}.press('${d}')`); await wait(400); }
  await g.ev(`(s => { s.setup.scenario = 'flat'; s.setup.toggles.substances = false; s.start(); })(${S('HardSetup')})`);
  await wait(1500); await g.open(); await wait(2500);
  await g.ev(`(c => { c.scene.resume('Room'); c.scene.stop(); })(${S('Creator')})`).catch(() => {});
  const out = {};
  const slot = await g.room("return r.city.findIndex(b => b && b.name === 'Back Alley');");
  await g.room("r.hard.autonomy=false; r.clock.day=20; r.clock.minute=22*60; r.hard.phone=true; r.cash=50000;");
  await g.room(`r.goToZone('${slot}.0');`); await wait(2200);
  await g.room("const c=r.characters[0], d=r.props.find(p=>p.type==='dealer'); const f=r.frontOf(d); c.x=f.x; c.lane=f.lane; c.goal=null; r.queueAction(c,'deal',d); r.passTime(10);");
  await wait(900);
  out.dealTexts = await g.ev(`${S('Deal')}.dyn.filter(o => o.type === 'Text').map(o => o.text)`);
  out.hasTabs = out.dealTexts.some(t => /Dark supplies/.test(t));
  // seeds / catalogue / bag
  out.corner = await g.room("const p=r.props.find(p=>p.type==='corner'); return p && {hidden:p.hidden, visible:p.visible};");
  // can the hidden corner still be activated?
  await g.room("const c=r.characters[0], p=r.props.find(p=>p.type==='corner'); const f=r.frontOf(p); c.x=f.x; c.lane=f.lane; c.goal=null; r.queueAction(c,'sell',p); r.passTime(10);");
  await wait(700);
  out.sellOpensDespiteOff = await g.ev(`__toybox.scene.isActive('Sell')`);
  // police: carry hidden product, check search ignores it, and phone Texts
  await g.room("r.hard.heat=90; r.hard.goods=[{crop:'nightbloom',at:'carry',name:'X',potency:9,purity:80,units:30,effects:[],adds:[]}]; r.policeRng=()=>0;");
  let stops=0, arrests=0;
  for (let i=0;i<6;i++){ await g.room("r.policeEvent=null; r.passTime(60);"); if (await g.room('return !!r.policeEvent;')) stops++; }
  out.stopsWithHiddenProduct = stops;
  out.jailed = await g.room('return r.hard.record;');
  out.bagCount = await g.room("return r.characters[0].bag.length;");
  out.errors = g.errors;
  console.log(JSON.stringify(out, null, 1));
} finally { await g.close(); }
