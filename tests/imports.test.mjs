// Catches broken imports without a browser: every relative import must point at a
// real file, and every named import must actually be exported by it. (Handy because
// the game is plain ES modules — a typo only shows up when that scene first loads.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [path.join(root, 'main.js'),
  ...fs.readdirSync(path.join(root, 'src'), { recursive: true }).filter(f => f.endsWith('.js')).map(f => path.join(root, 'src', f))];

const exportsOf = text => {
  const names = new Set();
  for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) m[1].split(',').forEach(n => names.add(n.trim().split(/\s+as\s+/).pop()));
  if (/^export\s+default\b/m.test(text)) names.add('default');
  return names;
};

test('every relative import resolves, and every named import is exported', () => {
  const problems = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/import\s+([^'";]+?)\s+from\s+'(\.[^']+)'/g)) {
      const target = path.resolve(path.dirname(file), m[2]);
      const rel = path.relative(root, file);
      if (!fs.existsSync(target)) { problems.push(`${rel}: ${m[2]} does not exist`); continue; }
      const have = exportsOf(fs.readFileSync(target, 'utf8'));
      const spec = m[1].trim();
      const named = spec.match(/\{([^}]*)\}/);
      const def = spec.replace(/\{[^}]*\}/, '').replace(',', '').trim();
      if (def && !have.has('default')) problems.push(`${rel}: ${m[2]} has no default export`);
      for (const n of named ? named[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean) : []) {
        if (!have.has(n)) problems.push(`${rel}: ${m[2]} does not export ${n}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
