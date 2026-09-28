/* ============================================================
   KARMA — systems/audio.js
   ŞARKI ÖNİZLEME MOTORU v2 (Web Audio)
   Türüne ve kalitesine göre TEMSİLÎ enstrümantal önizleme üretir:
   808 / sub-bass, kick, snare, clap, hi-hat + roll, shaker, tom dolgu,
   cowbell, marimba, log drum, darbuka, ney, bell, akor yastığı,
   supersaw, arp, chord stab, riser, vinil — reverb + delay + saturasyon.
   Harici ses dosyası ve telif gerektirmez.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  let ctx = null, master = null, lp = null, analyser = null;
  let revBus = null, delBus = null, satNode = null, satAmt = 0;
  let schedTimer = null, nextTime = 0, step = 0;
  let noiseBuf = null, irBuf = null;

  const st = {
    playing: false, song: null, startedAt: 0,
    bpm: 140, bars: 8, stepDur: 0, loopDur: 0, rate: 1,
    genre: "trap", quality: 60, seed: 1, volume: 0.28
  };

  /* ---------------- tür profilleri ---------------- */
  const STYLE = {
    trap:     { bpm: 142, kick: [0, 7, 11], snare: [8], hat: "16", roll: true, bass: "808", pad: 0, lead: 0.35, arp: 0, sub: 1, cow: 0, mar: 0, log: 0, dar: 0, ney: 0, bell: 0, shaker: 0, stab: 0.4, reverb: 0.25, delay: 0.15, sat: 0.10, swing: 0, vinyl: 0 },
    drill:    { bpm: 144, kick: [0, 10], snare: [8], hat: "triplet", roll: true, bass: "slide", pad: 0, lead: 0.30, arp: 0, sub: 1, cow: 0, mar: 0, log: 0, dar: 0, ney: 0, bell: 0.2, shaker: 0, stab: 0.2, reverb: 0.25, delay: 0.25, sat: 0.30, swing: 0, vinyl: 0 },
    phonk:    { bpm: 132, kick: [0, 4, 8, 12], snare: [4, 12], hat: "8", roll: true, bass: "808", pad: 0, lead: 0.5, arp: 0, sub: 1, cow: 1, mar: 0, log: 0, dar: 0, ney: 0, bell: 0.3, shaker: 0.5, stab: 0, reverb: 0.30, delay: 0.15, sat: 0.55, swing: 0, vinyl: 0.06 },
    rap:      { bpm: 92,  kick: [0, 7], snare: [4, 12], hat: "8", roll: false, bass: "808", pad: 0, lead: 0.3, arp: 0, sub: 1, cow: 0, mar: 0, log: 0, dar: 0, ney: 0, bell: 0, shaker: 0.4, stab: 0.5, reverb: 0.22, delay: 0.10, sat: 0.12, swing: 0.18, vinyl: 0.04 },
    hiphop:   { bpm: 90,  kick: [0, 6, 10], snare: [4, 12], hat: "8", roll: false, bass: "808", pad: 0.8, lead: 0.3, arp: 0, sub: 1, cow: 0, mar: 0.4, log: 0, dar: 0, ney: 0, bell: 0, shaker: 0.4, stab: 0.6, reverb: 0.30, delay: 0.12, sat: 0.10, swing: 0.2, vinyl: 0.04 },
    boombap:  { bpm: 88,  kick: [0, 7, 10], snare: [4, 12], hat: "8", roll: false, bass: "sub", pad: 0, lead: 0.25, arp: 0, sub: 1, cow: 0, mar: 0, log: 0, dar: 0, ney: 0, bell: 0, shaker: 0.5, stab: 0.7, reverb: 0.28, delay: 0.10, sat: 0.22, swing: 0.28, vinyl: 0.10 },
    cloudrap: { bpm: 128, kick: [0, 8], snare: [8], hat: "8", roll: false, bass: "808", pad: 1, lead: 0.45, arp: 0.3, sub: 1, cow: 0, mar: 0.3, log: 0, dar: 0, ney: 0, bell: 0.3, shaker: 0, stab: 0, reverb: 0.62, delay: 0.38, sat: 0.06, swing: 0, vinyl: 0.03 },
    afrotrap: { bpm: 104, kick: [0, 3, 8, 11], snare: [4, 12], hat: "16", roll: false, bass: "sub", pad: 0.7, lead: 0.5, arp: 0.4, sub: 1, cow: 0, mar: 0.8, log: 1, dar: 0.3, ney: 0, bell: 0, shaker: 0.8, stab: 0.2, reverb: 0.32, delay: 0.18, sat: 0.10, swing: 0.12, vinyl: 0 },
    pop:      { bpm: 118, kick: [0, 4, 8, 12], snare: [4, 12], hat: "8", roll: false, bass: "sub", pad: 0.9, lead: 0.6, arp: 0.7, sub: 1, cow: 0, mar: 0.4, log: 0, dar: 0, ney: 0, bell: 0.4, shaker: 0.5, stab: 0.8, reverb: 0.34, delay: 0.20, sat: 0.08, swing: 0, vinyl: 0 },
    rnb:      { bpm: 84,  kick: [0, 8], snare: [4, 12], hat: "8", roll: false, bass: "sub", pad: 1, lead: 0.4, arp: 0.3, sub: 1, cow: 0, mar: 0.5, log: 0, dar: 0, ney: 0, bell: 0.3, shaker: 0.4, stab: 0.5, reverb: 0.45, delay: 0.22, sat: 0.05, swing: 0.14, vinyl: 0.02 },
    arabesk:  { bpm: 96,  kick: [0, 6, 8, 14], snare: [4, 12], hat: "8", roll: false, bass: "sub", pad: 1, lead: 0.7, arp: 0.3, sub: 1, cow: 0.7, mar: 0, log: 0, dar: 1, ney: 1, bell: 0, shaker: 0.3, stab: 0.2, reverb: 0.45, delay: 0.25, sat: 0.12, swing: 0.16, vinyl: 0.04 },
    hyperpop: { bpm: 160, kick: [0, 4, 8, 12], snare: [4, 12], hat: "16", roll: true, bass: "808", pad: 0.8, lead: 0.7, arp: 1, sub: 1, cow: 0, mar: 0.6, log: 0, dar: 0, ney: 0, bell: 0.6, shaker: 0.3, stab: 0.6, reverb: 0.3, delay: 0.3, sat: 0.25, swing: 0, vinyl: 0 },
    indie:    { bpm: 100, kick: [0, 6], snare: [8], hat: "8", roll: false, bass: "sub", pad: 1, lead: 0.4, arp: 0.4, sub: 1, cow: 0, mar: 0.7, log: 0, dar: 0, ney: 0, bell: 0.4, shaker: 0.5, stab: 0.3, reverb: 0.45, delay: 0.25, sat: 0.08, swing: 0.1, vinyl: 0.06 },
    euro:     { bpm: 126, kick: [0, 4, 8, 12], snare: [4, 12], hat: "16", roll: false, bass: "slide", pad: 0.9, lead: 0.5, arp: 0.6, sub: 1, cow: 0, mar: 0.3, log: 0, dar: 0, ney: 0, bell: 0.3, shaker: 0.5, stab: 0.7, reverb: 0.34, delay: 0.22, sat: 0.28, swing: 0, vinyl: 0 }
  };

  const PROGS = [
    [0, -4, -7, -5], [0, 3, -5, -2], [0, -5, -3, -7], [0, -2, -7, 3], [0, 5, 3, -2], [0, -3, -5, -8]
  ];
  const SCALE = [0, 2, 3, 5, 7, 8, 10];
  /* MELODİ: rastgele nota yerine sabit, akor içi motifler.
     Değerler akor tonu indeksidir → hiçbir zaman akorla çakışmaz. */
  const CHORD_TONES = [0, 3, 7, 10, 12];   // minör7 + oktav
  /* MELODİ KAPALI: kullanıcı isteğiyle melodi katmanları çalınmaz.
     Yalnızca ritim (kick/snare/hat/clap/tom/darbuka) + bas + akor yastığı. */
  const MELODY_ENABLED = false;
  let melodicCount = 0;
  const MOTIFS = [
    [0, null, null, 1, null, null, 2, null, 1, null, null, 2, null, null, 0, null],
    [null, null, 1, null, 2, null, null, 1, null, null, 2, null, 1, null, null, null],
    [0, null, 1, null, null, 2, null, 3, null, 2, null, null, 1, null, 2, null],
    [2, null, null, 1, null, null, 0, null, null, 1, null, 2, null, null, 1, null],
    [0, null, 2, null, 1, null, 2, null, 0, null, 2, null, 1, null, null, null]
  ];
  function tone(idx) { return CHORD_TONES[idx % CHORD_TONES.length]; }

  function noteHz(semi, base) { return (base || 110) * Math.pow(2, semi / 12); }
  function AC() { return window.AudioContext || window.webkitAudioContext; }
  function supported() { return typeof window !== "undefined" && !!AC(); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ---------------- kurulum ---------------- */
  function ensure() {
    if (ctx) return ctx;
    const C = AC();
    if (!C) return null;
    ctx = new C();

    master = ctx.createGain(); master.gain.value = 0;
    lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 9000;
    analyser = ctx.createAnalyser(); analyser.fftSize = 128; analyser.smoothingTimeConstant = 0.78;

    // saturasyon (soft clip)
    satNode = ctx.createWaveShaper();
    satNode.curve = makeCurve(1);

    master.connect(lp); lp.connect(satNode); satNode.connect(analyser); analyser.connect(ctx.destination);

    // reverb yolu
    revBus = ctx.createGain(); revBus.gain.value = 0.5;
    const conv = ctx.createConvolver(); conv.buffer = makeIR(2.2, 2.6);
    revBus.connect(conv); conv.connect(analyser);

    // delay yolu
    delBus = ctx.createGain(); delBus.gain.value = 0.35;
    const dl = ctx.createDelay(1.0); dl.delayTime.value = 0.32;
    const fb = ctx.createGain(); fb.gain.value = 0.34;
    const df = ctx.createBiquadFilter(); df.type = "lowpass"; df.frequency.value = 3200;
    delBus.connect(dl); dl.connect(df); df.connect(fb); fb.connect(dl); df.connect(analyser);

    return ctx;
  }

  function makeCurve(amount) {
    const n = 1024, c = new Float32Array(n), k = amount * 8;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      c[i] = k === 0 ? x : (1 + k) * x / (1 + k * Math.abs(x));
    }
    return c;
  }

  function makeIR(seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function noise() {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 1.2);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = b;
    return b;
  }

  function send(node, rev, del) {
    if (revBus && rev > 0) { const g = ctx.createGain(); g.gain.value = rev * 0.8; node.connect(g); g.connect(revBus); }
    if (delBus && del > 0) { const g = ctx.createGain(); g.gain.value = del * 0.7; node.connect(g); g.connect(delBus); }
  }
  function panner(x) { const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) p.pan.value = x; return p; }
  function chain(from, pan, out) {
    if (pan) { const p = panner(pan); from.connect(p); p.connect(out || master); return p; }
    from.connect(out || master); return out || master;
  }

  /* ---------------- enstrümanlar ---------------- */
  function kick(t, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(rnd(112, 128), t);
    o.frequency.exponentialRampToValueAtTime(41, t + 0.09);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1.0 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g); chain(g, 0);
    o.start(t); o.stop(t + 0.36);
    // click
    const s = ctx.createBufferSource(); s.buffer = noise();
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2600;
    const cg = ctx.createGain(); cg.gain.setValueAtTime(0.16 * v, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    s.connect(hp); hp.connect(cg); chain(cg, 0); s.start(t); s.stop(t + 0.04);
  }

  function subBass(t, semi, dur, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = noteHz(semi - 12, 110);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.55 * v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); chain(g, 0); o.start(t); o.stop(t + dur + 0.02);
  }

  function bass808(t, semi, dur, v, slideFrom) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    const f = noteHz(semi - 24, 110);
    if (slideFrom != null) {
      o.frequency.setValueAtTime(noteHz(slideFrom - 24, 110), t);
      o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.22, dur * 0.5));
    } else o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.92 * v, t + 0.012);
    g.gain.setValueAtTime(0.92 * v, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); chain(g, 0);
    o.start(t); o.stop(t + dur + 0.02);
    // drive harmoniği
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = "triangle"; o2.frequency.value = f * 2;
    g2.gain.setValueAtTime(0.10 * v, t); g2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.7);
    o2.connect(g2); chain(g2, 0); o2.start(t); o2.stop(t + dur + 0.02);
  }

  function hat(t, open, v, pan) {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = rnd(7200, 8600);
    const g = ctx.createGain();
    const d = open ? 0.15 : 0.032;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.26 * v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(hp); hp.connect(g); chain(g, pan == null ? 0.22 : pan);
    s.start(t); s.stop(t + d + 0.02);
  }

  function shaker(t, v) {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 6200; bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.14 * v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    s.connect(bp); bp.connect(g); chain(g, -0.3);
    s.start(t); s.stop(t + 0.11);
  }

  function snare(t, v, pan) {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = rnd(1700, 2100); bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.40 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    s.connect(bp); bp.connect(g); chain(g, pan || 0); send(g, 0.25, 0.1);
    s.start(t); s.stop(t + 0.22);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "triangle"; o.frequency.value = 190;
    og.gain.setValueAtTime(0.17 * v, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(og); chain(og, 0); o.start(t); o.stop(t + 0.14);
  }

  function clap(t, v) {
    for (let i = 0; i < 3; i++) {
      const d = i * 0.010;
      const s = ctx.createBufferSource(); s.buffer = noise();
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 1.1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(0.20 * v * (1 - i * 0.22), t + d + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + d + (i === 2 ? 0.16 : 0.045));
      s.connect(bp); bp.connect(g); chain(g, 0.1); send(g, 0.3, 0.12);
      s.start(t + d); s.stop(t + d + 0.2);
    }
  }

  function rimshot(t, v) {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = 2.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22 * v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(bp); bp.connect(g); chain(g, -0.2); s.start(t); s.stop(t + 0.06);
  }

  function tom(t, semi, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(noteHz(semi, 220) * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(noteHz(semi, 220), t + 0.16);
    g.gain.setValueAtTime(0.28 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g); chain(g, rnd(-0.4, 0.4)); send(g, 0.22, 0.1);
    o.start(t); o.stop(t + 0.26);
  }

  function cowbell(t, semi, v) {
    [1, 1.47].forEach((m, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = noteHz(semi, 540) * m;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15 * v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
      o.connect(g); chain(g, i ? 0.25 : -0.25); send(g, 0.15, 0.08);
      o.start(t); o.stop(t + 0.19);
    });
  }

  function marimba(t, semi, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = noteHz(semi, 220);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = "sine"; o2.frequency.value = noteHz(semi, 220) * 4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.20 * v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.07 * v, t + 0.004);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); o2.connect(g2); chain(g, 0.3); chain(g2, 0.3); send(g, 0.3, 0.15);
    o.start(t); o.stop(t + 0.38); o2.start(t); o2.stop(t + 0.14);
  }

  function logDrum(t, semi, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(noteHz(semi, 220) * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(noteHz(semi, 220), t + 0.05);
    g.gain.setValueAtTime(0.26 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); chain(g, -0.15); send(g, 0.2, 0.1);
    o.start(t); o.stop(t + 0.32);
  }

  function darbuka(t, v, low) {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = low ? 320 : 1900; bp.Q.value = low ? 2.2 : 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime((low ? 0.26 : 0.19) * v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + (low ? 0.18 : 0.09));
    s.connect(bp); bp.connect(g); chain(g, rnd(-0.25, 0.25)); send(g, 0.24, 0.12);
    s.start(t); s.stop(t + 0.2);
  }

  function pluck(t, semi, dur, v, type, pan) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "triangle"; o.frequency.value = noteHz(semi, 220);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.20 * v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); chain(g, pan == null ? 0.15 : pan); send(g, 0.3, 0.25);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function ney(t, semi, dur, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = "sine"; o.frequency.value = noteHz(semi, 220);
    lfo.frequency.value = 5.2; lg.gain.value = 3.2;
    lfo.connect(lg); lg.connect(o.frequency);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = "triangle"; o2.frequency.value = noteHz(semi, 220) * 2; g2.gain.value = 0.10;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * v, t + 0.09);
    g.gain.linearRampToValueAtTime(0.11 * v, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); o2.connect(g2); g2.connect(g);
    chain(g, 0.05); send(g, 0.5, 0.3);
    o.start(t); o.stop(t + dur + 0.05);
    lfo.start(t); lfo.stop(t + dur + 0.05);
    o2.start(t); o2.stop(t + dur + 0.05);
  }

  function bell(t, semi, v) {
    const car = ctx.createOscillator(), mod = ctx.createOscillator();
    const mg = ctx.createGain(), g = ctx.createGain();
    car.type = "sine"; car.frequency.value = noteHz(semi, 440);
    mod.type = "sine"; mod.frequency.value = noteHz(semi, 440) * 2.76;
    mg.gain.value = noteHz(semi, 440) * 0.8;
    mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    car.connect(g); chain(g, 0.3); send(g, 0.55, 0.3);
    car.start(t); car.stop(t + 0.95); mod.start(t); mod.stop(t + 0.95);
  }

  function chordStab(t, semis, dur, v, type) {
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.setValueAtTime(3600, t);
    f.frequency.exponentialRampToValueAtTime(1200, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.10 * v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    semis.forEach(sm => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type || "sawtooth"; o.frequency.value = noteHz(sm, 220);
      o.detune.value = rnd(-7, 7); og.gain.value = 0.5;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.02);
    });
    g.connect(f); chain(f, 0); send(f, 0.35, 0.2);
  }

  function pad(t, semis, dur, v, type) {
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.setValueAtTime(900, t);
    f.frequency.linearRampToValueAtTime(2600, t + dur * 0.4);
    f.frequency.linearRampToValueAtTime(1200, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.085 * v, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    semis.forEach(sm => {
      [1, 1.005].forEach(det => {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = type || "sawtooth";
        o.frequency.value = noteHz(sm, 220) * det;
        o.detune.value = rnd(-9, 9); og.gain.value = 0.32;
        o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05);
      });
    });
    g.connect(f); chain(f, 0); send(f, 0.6, 0.25);
  }

  function supersaw(t, semis, dur, v) {
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 5200;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07 * v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    for (let i = 0; i < 7; i++) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = noteHz(semis[i % semis.length], 220);
      o.detune.value = (i - 3) * 9 + rnd(-4, 4);
      og.gain.value = 0.16;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.03);
    }
    g.connect(f); chain(f, 0.05); send(f, 0.35, 0.2);
  }

  function riser(t, dur, v) {
    const s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.10 * v, t + dur * 0.9);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(bp); bp.connect(g); chain(g, 0); send(g, 0.4, 0.1);
    s.start(t); s.stop(t + dur + 0.03);
  }

  function vinyl(t, dur, v) {
    const s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.028 * v;
    s.connect(bp); bp.connect(g); chain(g, 0);
    s.start(t); s.stop(t + dur);
  }

  /* ---------------- bar planlayıcı ---------------- */
  function scheduleBar(t0, bar, style, prog, seed) {
    const S = st.stepDur;
    const t = i => t0 + i * S + (style.swing && i % 2 === 1 ? S * style.swing * 0.5 : 0);
    const root = prog[bar % prog.length];
    const last = bar === st.bars - 1;

    // davul
    style.kick.forEach(k => kick(t(k), rnd(0.85, 1.0)));
    style.snare.forEach(s => (bar % 2 === 1 && s === 12 ? clap(t(s), 0.8) : snare(t(s), rnd(0.7, 0.9))));
    if (bar % 4 === 3) rimshot(t(14), 0.6);
    // şarkıya özel groove (melodi olmadan ayrışma)
    if (seed % 3 === 0 && bar % 2 === 1) kick(t(14), 0.5);
    if (seed % 5 === 0 && bar % 2 === 0) snare(t(10), 0.35);

    // bas
    const bs = style.kick.slice(0, 3);
    bs.forEach((k, i) => {
      const nx = bs[i + 1] != null ? bs[i + 1] : 16;
      const dur = Math.min(1.5, (nx - k) * S * 0.95);
      if (style.bass === "slide") {
        bass808(t(k), root, dur, 0.95, tone(i + 1) + root - 12);
      } else if (style.bass === "sub") {
        if (style.sub) subBass(t(k), root, dur * 0.8, 0.9);
        bass808(t(k), root, dur, 0.75);
      } else {
        bass808(t(k), root, dur, 0.95);
      }
    });

    // hatlar
    const hatSteps = style.hat === "16" ? [0, 2, 4, 6, 8, 10, 12, 14]
      : style.hat === "triplet" ? [0, 2.7, 5.3, 8, 10.7, 13.3]
        : [0, 4, 8, 12];
    hatSteps.forEach((h, i) => hat(t(h), i % 4 === 3, rnd(0.6, 0.9)));
    if (style.roll && bar % 2 === 1) for (let r = 0; r < 3; r++) hat(t(12 + r * 1.33), false, 0.5);
    if (style.shaker > 0) for (let i = 0; i < 8; i++) if (i % 2 === 0 || seed % 2) shaker(t(i * 2 + 1), style.shaker);

    // dolgu (son bar)
    if (last) {
      [0, 2, 4, 6].forEach((i, k) => tom(t(i + 8), SCALE[(seed + k) % SCALE.length] + root, 0.7));
      riser(t(0), S * 8, 0.8);
      snare(t(12), 0.9); snare(t(14), 0.8); snare(t(15), 0.7);
    }

    // enstrüman katmanları
    // ---- MELODİ KAPALI: yalnızca ritim + bas + akor yastığı ----
    if (MELODY_ENABLED) {
      if (style.cow > 0) [0, 6, 10].forEach((c, i) => cowbell(t(c), tone(i) + root + 12, style.cow));
      if (style.mar > 0) [1, 5, 9, 13].forEach((c, i) => marimba(t(c), tone(i) + root + 12, style.mar * 0.8));
      if (style.log > 0) [0, 6, 11].forEach((c, i) => logDrum(t(c), tone(i) + root + 12, style.log * 0.9));
      if (style.bell > 0) [0, 8].forEach((c, i) => bell(t(c), tone(i * 2) + root + 24, style.bell * 0.7));
      if (style.ney > 0) ney(t(0), root + 12, S * 16 * 0.95, style.ney);
      if (style.arp > 0) [3, 7, 11, 15].forEach((c, i) => pluck(t(c), tone(i) + root + 24, S * 0.9, style.arp * 0.4, "square", i % 2 ? -0.28 : 0.28));
      if (style.lead > 0) {
        const mot = MOTIFS[seed % MOTIFS.length];
        for (let i = 0; i < 16; i++) { const d = mot[i]; if (d == null) continue; pluck(t(i), tone(d) + root + 12, S * 2.0, style.lead * 0.55, "triangle"); }
      }
    }
    // perdesiz perküsyon
    if (style.dar > 0) { [0, 3, 6, 8, 11, 14].forEach(c => darbuka(t(c), style.dar, false)); [0, 8].forEach(c => darbuka(t(c), style.dar, true)); }

    // armoni (melodi değil): akor yastığı + ritmik akor
    if (style.pad > 0) {
      const third = (seed + bar) % 2 ? 3 : 4;
      pad(t(0), [root, root + third, root + 7], S * 16 * 0.98, style.pad * 0.5);
    }
    if (style.stab > 0) {
      [0, 6, 10].forEach((c, i) => {
        if ((seed + bar + i) % 4 === 0) return;
        const third = (seed + bar) % 2 ? 3 : 4;
        chordStab(t(c), [root, root + third, root + 7], S * 3, style.stab * 0.55, i % 2 ? "sawtooth" : "square");
      });
    }
    if (style.sat > 0.35 && bar % 4 === 0) supersaw(t(0), [root, root + 3, root + 7], S * 8, style.sat * 0.5);
  }

  function scheduler() {
    if (!st.playing || !ctx) return;
    const lookahead = 0.16;
    const style = STYLE[st.genre] || STYLE.trap;
    const prog = PROGS[st.seed % PROGS.length];
    let guard = 0;
    while (nextTime < ctx.currentTime + lookahead && guard < 96) {
      const bar = Math.floor(step / 16);
      if (step % 16 === 0) {
        if (bar === 0) {
          if (satNode) satNode.curve = makeCurve(style.sat);
          if (style.vinyl > 0) vinyl(nextTime, st.loopDur, style.vinyl);
        }
        scheduleBar(nextTime, bar, style, prog, st.seed);
      }
      nextTime += st.stepDur;
      step = (step + 1) % (st.bars * 16);
      guard++;
    }
  }

  /* ---------------- çözümleyici ---------------- */
  function resolve(track) {
    let genre = "trap", quality = 60;
    let seed = U.hashHue(((track && (track.title || track.id || "x")) || "x") + "|" + ((track && track.artistName) || ""));
    const ps = K.state && K.state.player.songs.find(x => x.id === (track && track.id));
    if (ps) { genre = ps.genre; quality = ps.quality; seed = U.hashHue(ps.id + ps.title); }
    else if (track && track.artistId && track.artistId !== "player" && track.artistId !== "real") {
      const a = K.artistById(track.artistId); if (a) genre = a.genre;
    } else if (track && track.artistName) {
      const a = K.resolveArtistByName && K.resolveArtistByName(track.artistName); if (a) genre = a.genre;
    }
    if (!STYLE[genre]) genre = "trap";
    return { genre, quality, seed };
  }

  /* ---------------- public ---------------- */
  K.audio = {
    supported,
    isPlaying() { return st.playing; },
    current() { return st.song; },
    style() { return STYLE[st.genre] || STYLE.trap; },
    analyser() { return analyser; },
    volume() { return st.volume; },
    rate() { return st.rate; },
    debug() {
      return {
        motif: MOTIFS[st.seed % MOTIFS.length], chordTones: CHORD_TONES,
        motifs: MOTIFS.length, bars: st.bars,
        melody: MELODY_ENABLED, melodicEvents: melodicCount, bpm: Math.round(st.bpm)
      };
    },
    resetMelodicCounter() { melodicCount = 0; },

    progress() {
      if (!st.playing || !ctx) return 0;
      const el = ctx.currentTime - st.startedAt;
      return st.loopDur ? (el % st.loopDur) / st.loopDur : 0;
    },
    elapsed() {
      if (!st.playing || !ctx) return 0;
      return (ctx.currentTime - st.startedAt) % (st.loopDur || 1);
    },
    loopDuration() { return st.loopDur || 0; },

    setRate(r) {
      st.rate = U.clamp(r, 0.5, 1.6);
      if (st.playing) K.audio.play(st.song);   // yeni hızla yeniden başlat
    },

    setVolume(v) {
      st.volume = U.clamp(v, 0, 1);
      if (master && ctx) master.gain.setTargetAtTime(st.playing ? st.volume : 0, ctx.currentTime, 0.05);
    },

    play(track) {
      if (!track) return false;
      const r = resolve(track);
      st.song = {
        id: track.id, title: track.title || "Bilinmeyen",
        artistName: track.artistName || "", art: track.art || null,
        genre: r.genre, quality: r.quality
      };
      st.genre = r.genre; st.quality = r.quality; st.seed = Math.abs(r.seed) || 1;
      K.bus.emit("audio:changed", st.song);

      if (!supported()) { st.playing = false; return false; }
      ensure();
      if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }

      const style = STYLE[st.genre] || STYLE.trap;
      // şarkıya özel tempo (tür tabanından ±%6) → aynı türde bile ayrışır
      st.bpm = style.bpm * st.rate * (0.94 + (Math.abs(st.seed) % 9) / 100);
      st.bars = 8;
      const beat = 60 / st.bpm;
      st.stepDur = (beat * 4) / 16;
      st.loopDur = st.stepDur * 16 * st.bars;

      if (satNode) satNode.curve = makeCurve(style.sat);
      lp.frequency.setTargetAtTime(Math.round(2200 + (st.quality / 100) * 11000), ctx.currentTime, 0.1);

      st.playing = true;
      st.startedAt = ctx.currentTime;
      nextTime = ctx.currentTime + 0.06;
      step = 0;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.setTargetAtTime(st.volume, ctx.currentTime, 0.25);

      if (schedTimer) clearInterval(schedTimer);
      schedTimer = setInterval(scheduler, 25);
      scheduler();
      return true;
    },

    stop() {
      st.playing = false;
      if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
      if (master && ctx) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
      K.bus.emit("audio:stopped", null);
    },

    toggle() {
      if (st.playing) { K.audio.stop(); return false; }
      if (st.song) { K.audio.play(st.song); return true; }
      return false;
    }
  };
})(window.K);
