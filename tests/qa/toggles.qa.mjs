// QA: with each setup toggle OFF, what hard-mode content still shows? Report only; no asserts.
import { launch, wait } from '../e2e/harness.mjs';
const S = n => `__toybox.scene.getScene('${n}')`;
const OFF = process.argv[2] || 'substances';
const g = await launch();
try {
  await g.open(); await g.clearSave(); await g.open();
  await wait(1500);
  // seed a hard save through the real setup scene
  await g.room('r.openSettings();'); await wait(400);
  for (let i = 0; i < 7; i++) await g.ev(`${S('Settings')}.tapVersion()`);
  await wait(400); await g.ev(`${S('AdultGate')}.proceed()`); await wait(600);
  for (const d of '1234') await g.ev(`${S('Pin')}.press('${d}')`);
  await wait(300);
  for (const d of '1234') await g.ev(`${S('Pin')}.press('${d}')`);
  await wait(500);
  await g.ev(`(s => { s.setup.scenario = 'flat'; s.setup.toggles['${OFF}'] = false; s.start(); })(${S('HardSetup')})`);
  await wait(1500); await g.open(); await wait(2500);
  await g.ev(`(c => { c.scene.resume('Room'); c.scene.stop(); })(${S('Creator')})`).catch(() => {});
  const toggles = await g.room('return r.hard.setup.toggles;');
  const out = { OFF, toggles };
  // props in the alley
  const slot = await g.room("return r.city.findIndex(b => b && b.name === 'Back Alley');");
  await g.room("r.hard.autonomy=false; r.clock.day=20; r.clock.minute=22*60; r.hard.phone=true; r.cash=50000;");
  await g.room(`r.goToZone('${slot}.0');`); await wait(2200);
  out.alleyProps = await g.room('return r.props.map(p => p.type + (p.hidden ? ":hidden" : "") + (p.visible === false ? ":invisible" : ""));');
  await g.room("const c=r.characters[0], d=r.props.find(p=>p.type==='dealer'); if(d){const f=r.frontOf(d); c.x=f.x; c.lane=f.lane; c.goal=null; r.queueAction(c,'deal',d); r.passTime(10);}");
  await wait(900);
  out.dealOpen = await g.ev(`__toybox.scene.isActive('Deal')`);
  if (out.dealOpen) {
    out.dealSupplies = await g.ev(`(async()=>{const m=await import('/src/data/hard/alley.js').catch(()=>null);return m?Object.keys(m):null})()`);
    out.supplies = await g.ev(`(s => { if (s.page !== 'goods') s.build(); const tabs = s.dyn.filter(o => o.type === 'Text').map(o => o.text); s.page = 'supplies'; s.build(); return s.dyn.filter(o => o.type === 'Text').map(o => o.text).filter(t => /[A-Za-z]{4}/.test(t)).slice(0, 40); })(${S('Deal')})`);
    await g.shot(`/tmp/claude-1000/-home-ad/2db6df4f-5b8f-48a2-9303-bbe6a6576fe3/scratchpad/deal-${OFF}-off.png`);
  }
  // heat from buying
  out.heatBefore = await g.room('return r.hard.heat;');
  // police: patrol, raid, arrest with heat 90 carrying product
  await g.room("r.hard.heat=90; r.hard.goods=[{crop:'nightbloom',at:'carry',name:'X',potency:9,purity:80,units:30,effects:[],adds:[]}];");
  out.policeFns = await g.room("return ['policeHourly','policeDaily'].map(k => typeof r[k]);");
  let stops = 0, raids = 0;
  await g.room("r.policeRng = () => 0;");  // always roll low = worst case
  for (let i = 0; i < 6; i++) {
    await g.room("r.policeEvent=null; r.passTime(60);");
    const ev = await g.room('return r.policeEvent && (r.policeEvent.kind || r.policeEvent.type || JSON.stringify(r.policeEvent)).toString().slice(0,40);');
    if (ev) stops++;
  }
  out.policeEventsInSixHours = stops;
  out.heatAfter = await g.room('return r.hard.heat;');
  out.activePolice = await g.ev(`__toybox.scene.isActive('Police')`);
  // nursery: dark seeds in catalogue? labbench in furniture catalogue?
  out.catalogueDark = await g.ev(`(async()=>{const m=await import('/src/data/props.js');return Object.keys(m.PROPS||m.default||{}).filter(k=>/lab|dealer|corner|growtent/.test(k));})()`);
  // weather/theft
  await g.room("r.hard.heat=0; r.policeEvent=null; r.clock.day=100; r.clock.minute=2*60;");
  out.errors = g.errors;
  console.log(JSON.stringify(out, null, 1));
} finally { await g.close(); }
