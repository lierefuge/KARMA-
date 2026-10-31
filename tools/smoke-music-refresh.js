#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const YAML = require('yaml');
const ROOT = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'karma-music-'));
const dataDir = path.join(temp, 'js/data');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.join(temp, 'tools'));
for (const f of ['fetch-new-releases.js', 'ai-enrich.js', 'release-intel-io.js', 'refresh-discographies.js', 'fetch-artist-discography.js']) {
  fs.copyFileSync(path.join(ROOT, 'tools', f), path.join(temp, 'tools', f));
}
const file = path.join(dataDir, 'release-intel.js');
const calls = path.join(temp, 'calls');
const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
const old = '2020-01-01';
const source = obj => '/* fixture header */\n(function(K){ K.RELEASE_INTEL = ' + JSON.stringify(obj, null, 1) + ';\n})(window.K = window.K || {});\n';
const row = (id, title, date = today) => ({ title, artistId: id, artistName: id === 'alpha' ? 'Alpha' : 'Beta',
  trackArtist: id === 'alpha' ? 'Alpha' : 'Beta', releaseDate: date, album: 'Fixture', art: '',
  ms: 1000, url: null, preview: null, isNew: true, intel: null });
function reset(rows = [row('alpha', 'Eski', old), row('beta', 'Eski', old)], ids = { alpha: 1, beta: 2 }) {
  const releases = Object.fromEntries(rows.map(r => [r.artistId + '::' + require('./release-intel-io').norm(r.title), r]));
  fs.writeFileSync(file, source({ meta: { source: 'itunes-lookup-tr', count: rows.length, newCount: rows.length, artistIds: ids }, releases }));
  fs.writeFileSync(calls, '');
}
fs.writeFileSync(path.join(dataDir, 'artists.js'), 'window.K={ARTISTS:[{id:"alpha",stageName:"Alpha"},{id:"beta",stageName:"Beta"}]};');
fs.writeFileSync(path.join(dataDir, 'real-songs.js'), 'window.K={REAL_SONGS:{}};');
fs.writeFileSync(path.join(dataDir, 'real-youtube.js'), 'window.K={REAL_YT:{}};');
const load = () => { const w = {}; new Function('window', fs.readFileSync(file, 'utf8'))(w); return w.K.RELEASE_INTEL; };
const bytes = () => fs.readFileSync(file, 'utf8');
function run(tool, scenario, args = [], key = true) {
  fs.writeFileSync(calls, '');
  const r = spawnSync(process.execPath, ['--require', path.join(ROOT, 'tools/fixtures/music-provider.cjs'),
    path.join(temp, 'tools', tool), '--delay', '0', ...args], {
    cwd: temp, encoding: 'utf8', timeout: 10000,
    env: { ...process.env, GEMINI_API_KEY: key ? 'synthetic-test-key' : '', GOOGLE_API_KEY: '',
      KARMA_MUSIC_SCENARIO: scenario, KARMA_MUSIC_CALLS: calls }
  });
  if (r.error) throw r.error;
  assert(!((r.stdout || '') + (r.stderr || '')).includes('synthetic-test-key'), 'secret leaked');
  return { ...r, calls: fs.readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).length };
}
let passed = 0;
function check(name, test) { test(); passed++; console.log('✅ ' + name); }
try {
  for (const scenario of ['catalog-empty', 'catalog-json', 'catalog-shape', 'album-empty']) {
    check(scenario + ': previous data byte-preserved', () => {
      reset(); const before = bytes(); assert.equal(run('fetch-new-releases.js', scenario).status, 1); assert.equal(bytes(), before);
    });
  }
  /* v10.71.0 — PARÇA DÜZEYİ BOZUKLUK sanatçıyı iptal etmez.
     29-30 Ekim koşularında tek bir bozuk kayıt (ön sipariş parçasının
     releaseDate: null olması) yüzünden her gün 3 sanatçının taraması
     tümden iptal oluyordu. Artık o parça atlanır, sebebi adıyla loglanır,
     sanatçının geri kalanı yazılır ve koşu başarısız sayılmaz. */
  check('one malformed track is skipped, valid tracks still written', () => {
    reset([]);
    const r = run('fetch-new-releases.js', 'catalog-one-bad');
    assert.equal(r.status, 0);                                     /* sanatçı reddedilmedi */
    assert.deepEqual(Object.keys(load().releases), ['alpha::yeni parça']);
    assert(/atlandı: "Ön Sipariş" · alan: releaseDate/.test(r.stdout));  /* teşhis adlandırılmış */
    assert(/atlanan parça: 2/.test(r.stdout));                     /* iki sanatçı, iki bozuk parça */
  });
  /* Tarihi geçersiz parça da atlanır (sanatçı reddedilmez). Sonuç tamamen
     boş kalırsa "mevcut veriyi ezme" koruması devreye girer: exit 1 + dosya korunur. */
  check('invalid track date is skipped; empty result never overwrites data', () => {
    reset(); const before = bytes();
    const r = run('fetch-new-releases.js', 'catalog-date');
    assert.equal(r.status, 1);
    assert.equal(bytes(), before);
    assert(/alan: releaseDate/.test(r.stdout));
  });
  check('partial outage preserves failed artist, expires successful artist only', () => {
    reset(); assert.equal(run('fetch-new-releases.js', 'partial').status, 1);
    assert(load().releases['beta::eski']); assert(!load().releases['alpha::eski']); assert(load().releases['alpha::yeni parça']);
  });
  check('duplicates collapsed and guest not assigned primary ownership', () => {
    reset([]); assert.equal(run('fetch-new-releases.js', 'ok').status, 0);
    assert.deepEqual(Object.keys(load().releases), ['alpha::yeni parça']);
    const before = bytes(); assert.equal(run('fetch-new-releases.js', 'ok').status, 0); assert.equal(bytes(), before);
  });
  check('near-name artist is not accepted', () => {
    reset([]); assert.equal(run('fetch-new-releases.js', 'catalog-owner').status, 0); assert.equal(load().meta.count, 0);
  });
  check('unrelated artist search result is not accepted', () => {
    reset([], {}); assert.equal(run('fetch-new-releases.js', 'ok').status, 1); assert.equal(load().meta.count, 0);
  });
  check('only scan leaves other artists untouched; dry scan never writes', () => {
    reset(); const before = bytes(); assert.equal(run('fetch-new-releases.js', 'ok', ['--only', 'alpha', '--dry']).status, 0); assert.equal(bytes(), before);
    assert.equal(run('fetch-new-releases.js', 'ok', ['--only', 'alpha']).status, 0); assert(load().releases['beta::eski']);
  });
  check('catalog refresh preserves enrichment cache', () => {
    const r = row('alpha', 'Yeni Parça'); r.intel = { note: 'cache', v: 1 }; reset([r]);
    assert.equal(run('fetch-new-releases.js', 'ok').status, 0); assert.deepEqual(load().releases['alpha::yeni parça'].intel, r.intel);
  });
  check('broken local data aborts before network or writes', () => {
    for (const tool of ['fetch-new-releases.js', 'ai-enrich.js']) {
      fs.writeFileSync(file, 'broken JSON data'); const before = bytes();
      const r = run(tool, 'no-network'); assert.equal(r.status, 1); assert.equal(r.calls, 0); assert.equal(bytes(), before);
    }
  });
  for (const scenario of ['ai-empty', 'ai-json', 'ai-duplicate', 'ai-missing', 'ai-invalid', 'quota', 'model404']) {
    check(scenario + ': invalid AI cannot replace existing data', () => {
      reset([row('alpha', 'Bir'), row('alpha', 'İki')]); const before = bytes();
      const r = run('ai-enrich.js', scenario); assert.equal(r.status, 1); assert.equal(bytes(), before);
      if (scenario === 'quota') assert.equal(r.calls, 4);
      if (scenario === 'model404') assert.equal(r.calls, 1);
    });
  }
  check('partial AI failure keeps valid results and reports failure', () => {
    reset([row('alpha', 'Bir'), row('alpha', 'İki')]);
    assert.equal(run('ai-enrich.js', 'ai-partial').status, 1);
    assert.equal(load().releases['alpha::bir'].intel, null); assert(load().releases['alpha::iki'].intel);
  });
  check('discography wrapper supplies arguments and restores failed writes', () => {
    reset();
    for (const f of ['real-songs.js', 'discography.js', 'real-previews.js']) fs.writeFileSync(path.join(dataDir, f), 'original');
    fs.writeFileSync(path.join(temp, 'tools/fetch-artist-discography.js'), `
      const fs = require('fs'); const assert = require('node:assert/strict');
      const [slug, name, id] = process.argv.slice(2);
      assert(['alpha','beta'].includes(slug)); assert(name); assert(['1','2'].includes(id));
      fs.writeFileSync('js/data/real-songs.js', 'broken partial write'); process.exit(1);
    `);
    assert.equal(run('refresh-discographies.js', 'no-network').status, 1);
    for (const f of ['real-songs.js', 'discography.js', 'real-previews.js']) assert.equal(fs.readFileSync(path.join(dataDir, f), 'utf8'), 'original');
  });
  check('discography ignores date-only rewrites and rejects empty successful output', () => {
    reset();
    const names = ['REAL_SONGS', 'DISCOGRAPHY', 'REAL_PREVIEWS'];
    const files = ['real-songs.js', 'discography.js', 'real-previews.js'];
    const song = title => ({ title, artistName: title === 'A' ? 'Alpha' : 'Beta', album: 'Fixture',
      year: '2026', art: 'https://example.invalid/art.jpg', ms: 120000 });
    const originals = names.map((name, i) => '/* old date */window.K = window.K || {}; window.K.'+name+' = ' + JSON.stringify({
      alpha: i === 0 ? [song('A')] : i === 1 ? [{ title: 'Fixture', tracks: ['A'] }] : { A: { p: 'https://example.invalid/a', a: 'https://music.apple.com/tr/a' } },
      beta: i === 0 ? [song('B')] : i === 1 ? [{ title: 'Fixture', tracks: ['B'] }] : { B: { p: 'https://example.invalid/b', a: 'https://music.apple.com/tr/b' } }
    }) + ';');
    files.forEach((f, i) => fs.writeFileSync(path.join(dataDir, f), originals[i]));
    fs.writeFileSync(path.join(temp, 'tools/fetch-artist-discography.js'), `
      const fs = require('fs');
      for (const file of ['real-songs.js','discography.js','real-previews.js']) {
        const p = 'js/data/' + file;
        fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('old date', 'new date'));
      }
    `);
    assert.equal(run('refresh-discographies.js', 'no-network').status, 0);
    files.forEach((f, i) => assert.equal(fs.readFileSync(path.join(dataDir, f), 'utf8'), originals[i]));
    fs.writeFileSync(path.join(temp, 'tools/fetch-artist-discography.js'), `
      require('fs').writeFileSync('js/data/real-songs.js', 'window.K={REAL_SONGS:{}};');
    `);
    assert.equal(run('refresh-discographies.js', 'no-network').status, 1);
    files.forEach((f, i) => assert.equal(fs.readFileSync(path.join(dataDir, f), 'utf8'), originals[i]));
  });
  check('daily merge preserves missing songs/media and admits only fully verified additions', () => {
    reset();
    const globals = ['REAL_SONGS', 'DISCOGRAPHY', 'REAL_PREVIEWS'];
    const files = ['real-songs.js', 'discography.js', 'real-previews.js'];
    const song = title => ({ title, artistName: 'Alpha', album: 'Old', year: '2026', art: 'https://example.invalid/art.jpg', ms: 1000 });
    const preview = { p: 'https://example.invalid/audio', a: 'https://music.apple.com/tr/a' };
    const original = [
      { alpha: [song('old'), song('missing')], beta: [song('beta')] },
      { alpha: [{ title: 'Old', tracks: ['old', 'missing'] }], beta: [{ title: 'Old', tracks: ['beta'] }] },
      { alpha: { old: preview, missing: preview }, beta: { beta: preview } }
    ];
    const write = (data, index) => '/* fixture date */(function(K){ K.' + globals[index] + ' = ' + JSON.stringify(data) + ';})(window.K=window.K||{});';
    files.forEach((f, i) => fs.writeFileSync(path.join(dataDir, f), write(original[i], i)));
    fs.writeFileSync(path.join(dataDir, 'real-youtube.js'), 'window.K={REAL_YT:' + JSON.stringify({ alpha: {
      ready: { v: 'abcdefghijk', t: 'Alpha ready' }, noPreview: { v: 'abcdefghijl', t: 'Alpha noPreview' },
      badVideo: { v: 'bad', t: 'invalid' }
    } }) + '};');
    fs.writeFileSync(path.join(temp, 'tools/fetch-artist-discography.js'), `
      if (process.argv[2] === 'beta') process.exit(0);
      const fs = require('fs');
      const names = ${JSON.stringify(globals)}, files = ${JSON.stringify(files)};
      const song = ${song.toString()};
      const candidates = [
        [{ ...song('old'), year: '' }, song('ready'), song('noPreview'), song('noVideo'), song('badVideo')],
        [{ title: 'New', tracks: ['ready', 'noVideo', 'noPreview'] }],
        { ready: ${JSON.stringify(preview)}, noVideo: ${JSON.stringify(preview)}, badVideo: ${JSON.stringify(preview)} }
      ];
      files.forEach((file, i) => {
        const w={}; new Function('window', fs.readFileSync('js/data/'+file,'utf8'))(w);
        w.K[names[i]].alpha = candidates[i];
        fs.writeFileSync('js/data/'+file, 'window.K={'+names[i]+':'+JSON.stringify(w.K[names[i]])+'};');
      });
    `);
    const betaBefore = original.map(data => JSON.stringify(data.beta));
    const mergedRun = run('refresh-discographies.js', 'no-network');
    assert.equal(mergedRun.status, 0, mergedRun.stdout + mergedRun.stderr);
    const payloads = files.map((f, i) => { const w={}; new Function('window', fs.readFileSync(path.join(dataDir,f),'utf8'))(w); return w.K[globals[i]]; });
    assert.deepEqual(payloads[0].alpha.map(r => r.title), ['old', 'missing', 'ready']);
    assert.deepEqual(payloads[2].alpha.old, preview); assert.deepEqual(payloads[2].alpha.missing, preview);
    assert.deepEqual(payloads[1].alpha.find(a => a.title === 'New').tracks, ['ready']);
    payloads.forEach((data, i) => assert.equal(JSON.stringify(data.beta), betaBefore[i]));
    const before = files.map(f => fs.readFileSync(path.join(dataDir, f), 'utf8'));
    assert.equal(run('refresh-discographies.js', 'no-network').status, 0);
    files.forEach((f, i) => assert.equal(fs.readFileSync(path.join(dataDir,f),'utf8'), before[i]));
  });
  check('single artist CLI recognizes a roster alias without treating guests as owners', () => {
    fs.copyFileSync(path.join(ROOT, 'tools/fetch-artist-discography.js'), path.join(temp, 'tools/fetch-artist-discography.js'));
    const roster = fs.readFileSync(path.join(dataDir, 'artists.js'));
    fs.writeFileSync(path.join(dataDir, 'artists.js'), 'window.K={ARTISTS:[{id:"alpha",stageName:"Alpha Alias",aliases:["Alpha"]}]};');
    const r = spawnSync(process.execPath, ['--require', path.join(ROOT, 'tools/fixtures/music-provider.cjs'),
      path.join(temp, 'tools/fetch-artist-discography.js'), 'alpha', 'Alpha Alias', '11'], {
      cwd: temp, encoding: 'utf8', timeout: 10000, env: { ...process.env, KARMA_MUSIC_SCENARIO: 'ok', KARMA_MUSIC_CALLS: calls }
    });
    assert.equal(r.status, 0, r.stderr);
    const w={}; new Function('window', fs.readFileSync(path.join(dataDir,'discography.js'),'utf8'))(w);
    assert.equal(w.K.DISCOGRAPHY.alpha.length, 1); assert(r.stdout.includes('kendi: 1'));
    fs.writeFileSync(path.join(dataDir, 'artists.js'), roster);
  });
  check('AI dry requires neither key nor network; missing key fails clearly', () => {
    reset([row('alpha', 'Bir')]); const before = bytes();
    const r = run('ai-enrich.js', 'no-network', ['--dry'], false); assert.equal(r.status, 0); assert.equal(r.calls, 0); assert.equal(bytes(), before);
    assert.equal(run('ai-enrich.js', 'no-network', [], false).status, 1); assert.equal(bytes(), before);
  });
  check('AI maps by index, clips ranges, preserves catalog facts and skips cache', () => {
    reset([row('alpha', 'Bir'), row('alpha', 'İki')]); const before = load();
    assert.equal(run('ai-enrich.js', 'ai-reordered').status, 0);
    Object.keys(before.releases).forEach((k, i) => {
      const r = load().releases[k]; assert.deepEqual({ ...r, intel: null }, before.releases[k]);
      assert.equal(r.intel.energy, 10); assert.equal(r.intel.fit.newmusic, 1); assert.equal(r.intel.note, 'Sentetik küratör notu ' + i);
    });
    assert(bytes().startsWith('/* fixture header */')); const cached = bytes();
    const r = run('ai-enrich.js', 'no-network'); assert.equal(r.status, 0); assert.equal(r.calls, 0); assert.equal(bytes(), cached);
    assert.equal(run('ai-enrich.js', 'quota', ['--force']).status, 1); assert.equal(bytes(), cached);
  });
  check('limit controls quota consumption', () => {
    reset([row('alpha', 'Bir'), row('alpha', 'İki')]); assert.equal(run('ai-enrich.js', 'ok', ['--limit', '1']).status, 0);
    assert.equal(Object.values(load().releases).filter(r => r.intel).length, 1);
  });
  /* 2026-10-31 günlük koşusunda istek 45 sn'yi aşınca abort edildi ve o turda
     hiçbir kayıt zenginleştirilemedi. Davranış: zaman aşımı SINIRLI tekrar
     denenir (1 + 3), sonsuz döngü yok, dosya yine de bozulmaz. */
  check('request timeout is retried a bounded number of times', () => {
    reset([row('alpha', 'Bir'), row('alpha', 'İki')]); const before = bytes();
    const r = run('ai-enrich.js', 'ai-hang', ['--timeout', '1000']);
    assert.equal(r.status, 1);                       /* kayıtlar işlenemedi */
    assert.equal(r.calls, 4);                        /* 1 + 3 tekrar, ne 1 ne sonsuz */
    assert.equal(bytes(), before);                   /* dosya bayt bayt korunur */
    assert(/zaman aşımı/.test((r.stdout || '') + (r.stderr || '')));
  });
  /* Gecikmenin asıl kaynağı düşünme token'ları: varsayılan kapalı olmalı ve
     çıktı tavanı 2048 olmalı. Hız regresyonu bu iki ayardan okunur. */
  check('fast request config: thinking off, output capped', () => {
    reset([row('alpha', 'Bir')]); assert.equal(run('ai-enrich.js', 'ok').status, 0);
    const cfg = JSON.parse(fs.readFileSync(calls + '.req', 'utf8'));
    assert.equal(cfg.think.thinkingBudget, 0);
    assert.equal(cfg.max, 2048);
    assert(/düşünme kapalı/.test(run('ai-enrich.js', 'ok', ['--force']).stdout));
  });
  /* Model `thinkingConfig` alanını tanımıyorsa: alan BİR KEZ kaldırılır,
     istek tekrarlanır, zenginleştirme yine de tamamlanır. */
  check('unknown thinkingConfig is dropped and the request retried once', () => {
    reset([row('alpha', 'Bir')]);
    const r = run('ai-enrich.js', 'ai-reject-thinking');
    assert.equal(r.status, 0);
    assert.equal(r.calls, 2);                          /* 1 reddedilen + 1 başarılı */
    assert.equal(JSON.parse(fs.readFileSync(calls + '.req', 'utf8')).think, null);
    assert(load().releases['alpha::bir'].intel, 'kayıt zenginleştirildi');
  });
  check('workflow YAML, midnight cron, dispatch, locks and scoped pushes', () => {
    const dailyText = fs.readFileSync(path.join(ROOT, '.github/workflows/daily-refresh.yml'), 'utf8');
    const buildText = fs.readFileSync(path.join(ROOT, '.github/workflows/build-artifact.yml'), 'utf8');
    const daily = YAML.parse(dailyText), build = YAML.parse(buildText);
    assert.equal(daily.on.schedule[0].cron, '0 21 * * *');
    assert.equal(daily.on.workflow_dispatch.inputs.dry_run.default, true);
    assert.equal(daily.concurrency.group, build.concurrency.group);
    assert.equal(daily.concurrency['cancel-in-progress'], false); assert.equal(build.concurrency['cancel-in-progress'], false);
    assert(build.jobs.build.if.includes("github.event_name == 'workflow_dispatch'"));
    assert(!/git add (?:-A|js\/data\s)/.test(dailyText + buildText));
    assert(!/HEAD:main|--ref main/.test(dailyText.replace(/^\s*#.*$/gm, '') + buildText.replace(/^\s*#.*$/gm, '')));
    const ai = daily.jobs.refresh.steps.find(s => s.id === 'ai');
    assert.equal(ai.env.GEMINI_API_KEY, '${{ secrets.GEMINI_API_KEY }}'); assert(ai['continue-on-error']);
    assert(daily.jobs.refresh.steps.some(s => s.run && s.run.includes('npm run verify')));
    assert(daily.jobs.refresh.steps.some(s => s.run === 'node tools/fetch-youtube.js'));
    assert(daily.jobs.refresh.steps.some(s => s.run === 'node tools/refresh-discographies.js'));
  });
  console.log('\nGeçen: ' + passed + ' · Kalan: 0');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
