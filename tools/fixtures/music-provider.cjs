/* Synthetic providers for isolated subprocess tests only; never loaded by CI refresh. */
const assert = require('node:assert/strict');
const fs = require('fs');
const scenario = process.env.KARMA_MUSIC_SCENARIO;
const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
const setTimer = global.setTimeout;
let rejectedThinking = false;
global.setTimeout = (fn, ms, ...args) => setTimer(fn, ms >= 45000 ? ms : 0, ...args);
const reply = (data, status = 200) => ({ ok: status === 200, status,
  text: async () => typeof data === 'string' ? data : JSON.stringify(data),
  json: async () => typeof data === 'string' ? JSON.parse(data) : data });
const catalog = results => reply({ resultCount: results.length, results });
global.fetch = async (url, options) => {
  fs.appendFileSync(process.env.KARMA_MUSIC_CALLS, 'call\n');
  if (scenario === 'no-network') throw new Error('Unexpected network request');
  if (String(url).includes('generativelanguage')) {
    assert.equal(options.headers['x-goog-api-key'], 'synthetic-test-key');
    assert(!String(url).includes('synthetic-test-key'));
    if (scenario === 'quota') return reply('synthetic-test-key SECRET must never be logged', 429);
    if (scenario === 'model404') return reply('synthetic-test-key', 404);
    if (scenario === 'ai-empty') return reply({ candidates: [] });
    /* Yanıt hiç gelmez: gerçek fetch gibi abort sinyaline AbortError ile
       tepki verir. ai-enrich'in zaman aşımı + sınırlı tekrar yolunu sınar. */
    if (scenario === 'ai-hang') return new Promise((_, reject) => {
      const s = options && options.signal;
      if (!s) return;
      s.addEventListener('abort', () => {
        const e = new Error('This operation was aborted'); e.name = 'AbortError'; reject(e);
      });
    });
    const reqBody = JSON.parse(options.body);
    const gc = reqBody.generationConfig || {};
    /* Son isteğin üretim ayarlarını testin okuyabilmesi için yaz. */
    fs.writeFileSync(process.env.KARMA_MUSIC_CALLS + '.req', JSON.stringify({
      think: gc.thinkingConfig || null, max: gc.maxOutputTokens || null }));
    /* `thinkingConfig` alanını tanımayan sağlayıcı: ilk istek 400, alan
       kaldırılınca aynı istek geçer. Fallback yolunu sınar. */
    if (scenario === 'ai-reject-thinking' && gc.thinkingConfig && !rejectedThinking) {
      rejectedThinking = true;
      return reply('Invalid JSON payload received. Unknown name "thinkingConfig"', 400);
    }
    const content = reqBody.contents[0].parts[0].text;
    const n = [...content.matchAll(/^  \[\d+\]/gm)].length;
    const items = Array.from({ length: n }, (_, i) => ({ i, genre: 'rap', mood: 'sakin', energy: 12,
      tempo: 'mid', fit: Object.fromEntries(['rapturkiye','traptr','drilltr','newmusic','nightmode','popturkiye'].map(p => [p, 1.2])),
      note: 'Sentetik küratör notu ' + i, tags: ['test', 'yerel', 'sentetik'], title: 'IGNORE INVENTED TITLE' }));
    if (scenario === 'ai-duplicate') items.forEach(x => { x.i = 0; });
    if (scenario === 'ai-missing') delete items[0].i;
    if (scenario === 'ai-invalid') items.forEach(x => { delete x.energy; });
    if (scenario === 'ai-partial') delete items[0].energy;
    if (scenario === 'ai-reordered') items.reverse();
    const text = scenario === 'ai-json' ? '{broken synthetic-test-key' : JSON.stringify({ items });
    return reply({ candidates: [{ content: { parts: [{ text }] } }] });
  }
  const u = new URL(url);
  assert.equal(u.searchParams.get('country'), 'TR');
  if (scenario === 'catalog-empty') return catalog([]);
  if (scenario === 'catalog-json') return reply('{broken');
  if (scenario === 'catalog-shape') return reply({ results: {} });
  const id = Number(u.searchParams.get('id'));
  if (scenario === 'partial' && id === 2) return reply({}, 503);
  if (u.pathname === '/search') return catalog([{ wrapperType: 'artist', artistId: 99, artistName: 'Unrelated Artist' }]);
  if (u.searchParams.get('entity') === 'album') return catalog([
    { wrapperType: 'artist', artistId: id },
    { wrapperType: 'collection', collectionId: id + 10, releaseDate: today }
  ]);
  if (scenario === 'album-empty') return catalog([{ wrapperType: 'collection', collectionId: id }]);
  const artistName = id === 11 ? 'Alpha & Beta' : 'Alpha & Beta';
  const track = { wrapperType: 'track', collectionId: id, trackId: 101,
    trackName: 'Yeni Parça', artistName, collectionName: 'Sentetik Single', releaseDate: today,
    trackTimeMillis: 120000, trackViewUrl: 'https://music.apple.com/tr/test', artworkUrl100: '', previewUrl: null };
  if (scenario === 'catalog-one-bad') return catalog([{ wrapperType: 'collection', collectionId: id }, track,
    { ...track, trackId: 102, trackName: 'Ön Sipariş', releaseDate: null }]);
  if (scenario === 'catalog-date') track.releaseDate = '2026-02-30';
  if (scenario === 'catalog-owner') track.artistName = 'Alphabet';
  return catalog([{ wrapperType: 'collection', collectionId: id }, track, { ...track }]);
};
