/* ============================================================
   KARMA — systems/roomgl.js   (v10.71)

   STÜDYO ODASI · KENDİ WEBGL MOTORU (harici kütüphane yok)

   NEDEN?
   -----
   CSS izometrik sahne "gerçek nesne" hissi vermiyordu ve kamera
   serbest değildi. three.js 600 KB+ olduğu ve entegrasyonun yazma
   yolu ~150 KB'yi taşımadığı için kendi küçük motorumuz yazıldı (~14 KB).

   NE VAR?
   ------
   · Serbest kamera: sürükle = yörünge (yaw/pitch), tekerlek = zoom,
     yumuşak sınırlar (kamera odanın altına/tepesine kaçmaz)
   · Gerçek geometri: kutu, silindir, küre, düzlem ilkelleri
   · Lambert ışık (tepe + yan dolgu) + zemin gölge diski
   · Eşya seçimi: ekrana projeksiyonla en yakın eşya
   · Sürükle-bırak: zemine/masa yüzeyine ışın-ızgara kesişimi
   · Masaya bırakınca katman değişir (studioroom.js kararı verir)

   VERİ SÖZLEŞMESİ
   ---------------
   Bu modül HİÇBİR durum tutmaz. Konum yüzdeleri (x,y) korunur:
     dünya.x = (x - 50) / 25      dünya.z = (y - 50) / 25
   Böylece eski kayıtlar ve `player.studioRoom` şeması aynen geçerli.
   WebGL yoksa `available()` false döner; arayüz aynen çalışmaya devam eder.
   ============================================================ */
(function (K) {
  "use strict";

  /* ---------------- mat4 (kolon-büyük) ---------------- */
  function ident() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
  function mul(a, b) {
    const o = new Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      o[i * 4 + j] = s;
    }
    return o;
  }
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect,0,0,0, 0,f,0,0, 0,0,(far + near) * nf,-1, 0,0,2 * far * near * nf,0];
  }
  function lookAt(eye, center, up) {
    const z = norm(sub(eye, center)), x = norm(cross(up, z)), y = cross(z, x);
    return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
  }
  const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const dot = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; }
  function trs(t, s, ry) {
    const c = Math.cos(ry || 0), n = Math.sin(ry || 0);
    return [c*s[0],0,-n*s[0],0, 0,s[1],0,0, n*s[2],0,c*s[2],0, t[0],t[1],t[2],1];
  }
  function invert(m) {
    const inv = new Array(16);
    inv[0]=m[5]*m[10]*m[15]-m[5]*m[11]*m[14]-m[9]*m[6]*m[15]+m[9]*m[7]*m[14]+m[13]*m[6]*m[11]-m[13]*m[7]*m[10];
    inv[4]=-m[4]*m[10]*m[15]+m[4]*m[11]*m[14]+m[8]*m[6]*m[15]-m[8]*m[7]*m[14]-m[12]*m[6]*m[11]+m[12]*m[7]*m[10];
    inv[8]=m[4]*m[9]*m[15]-m[4]*m[11]*m[13]-m[8]*m[5]*m[15]+m[8]*m[7]*m[13]+m[12]*m[5]*m[11]-m[12]*m[7]*m[9];
    inv[12]=-m[4]*m[9]*m[14]+m[4]*m[10]*m[13]+m[8]*m[5]*m[14]-m[8]*m[6]*m[13]-m[12]*m[5]*m[10]+m[12]*m[6]*m[9];
    inv[1]=-m[1]*m[10]*m[15]+m[1]*m[11]*m[14]+m[9]*m[2]*m[15]-m[9]*m[3]*m[14]-m[13]*m[2]*m[11]+m[13]*m[3]*m[10];
    inv[5]=m[0]*m[10]*m[15]-m[0]*m[11]*m[14]-m[8]*m[2]*m[15]+m[8]*m[3]*m[14]+m[12]*m[2]*m[11]-m[12]*m[3]*m[10];
    inv[9]=-m[0]*m[9]*m[15]+m[0]*m[11]*m[13]+m[8]*m[1]*m[15]-m[8]*m[3]*m[13]-m[12]*m[1]*m[11]+m[12]*m[3]*m[9];
    inv[13]=m[0]*m[9]*m[14]-m[0]*m[10]*m[13]-m[8]*m[1]*m[14]+m[8]*m[2]*m[13]+m[12]*m[1]*m[10]-m[12]*m[2]*m[9];
    inv[2]=m[1]*m[6]*m[15]-m[1]*m[7]*m[14]-m[5]*m[2]*m[15]+m[5]*m[3]*m[14]+m[13]*m[2]*m[7]-m[13]*m[3]*m[6];
    inv[6]=-m[0]*m[6]*m[15]+m[0]*m[7]*m[14]+m[4]*m[2]*m[15]-m[4]*m[3]*m[14]-m[12]*m[2]*m[7]+m[12]*m[3]*m[6];
    inv[10]=m[0]*m[5]*m[15]-m[0]*m[7]*m[13]-m[4]*m[1]*m[15]+m[4]*m[3]*m[13]+m[12]*m[1]*m[7]-m[12]*m[3]*m[5];
    inv[14]=-m[0]*m[5]*m[14]+m[0]*m[6]*m[13]+m[4]*m[1]*m[14]-m[4]*m[2]*m[13]-m[12]*m[1]*m[6]+m[12]*m[2]*m[5];
    inv[3]=-m[1]*m[6]*m[11]+m[1]*m[7]*m[10]+m[5]*m[2]*m[11]-m[5]*m[3]*m[10]-m[9]*m[2]*m[7]+m[9]*m[3]*m[6];
    inv[7]=m[0]*m[6]*m[11]-m[0]*m[7]*m[10]-m[4]*m[2]*m[11]+m[4]*m[3]*m[10]+m[8]*m[2]*m[7]-m[8]*m[3]*m[6];
    inv[11]=-m[0]*m[5]*m[11]+m[0]*m[7]*m[9]+m[4]*m[1]*m[11]-m[4]*m[3]*m[9]-m[8]*m[1]*m[7]+m[8]*m[3]*m[5];
    inv[15]=m[0]*m[5]*m[10]-m[0]*m[6]*m[9]-m[4]*m[1]*m[10]+m[4]*m[2]*m[9]+m[8]*m[1]*m[6]-m[8]*m[2]*m[5];
    const det = m[0]*inv[0]+m[1]*inv[4]+m[2]*inv[8]+m[3]*inv[12] || 1;
    return inv.map(v => v / det);
  }
  /* projeksiyon: dünya → ekran (0..1) */
  function project(mvp, p) {
    const x = mvp[0]*p[0]+mvp[4]*p[1]+mvp[8]*p[2]+mvp[12];
    const y = mvp[1]*p[0]+mvp[5]*p[1]+mvp[9]*p[2]+mvp[13];
    const w = mvp[3]*p[0]+mvp[7]*p[1]+mvp[11]*p[2]+mvp[15];
    if (!w) return null;
    return { x: (x / w) * 0.5 + 0.5, y: 1 - ((y / w) * 0.5 + 0.5), w };
  }

  /* ---------------- geometri ---------------- */
  function box(w, h, d) {
    const x = w/2, y = h/2, z = d/2;
    const f = [[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
    const b = [[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z]];
    const q = (a,b,c,d) => [a,b,c, a,c,d];
    const v = [];
    q(f[0],f[1],f[2],f[3]).forEach(p=>v.push(p[0],p[1],p[2]));
    q(b[1],b[0],b[3],b[2]).forEach(p=>v.push(p[0],p[1],p[2]));
    q(f[1],b[1],b[2],f[2]).forEach(p=>v.push(p[0],p[1],p[2]));
    q(b[0],f[0],f[3],b[3]).forEach(p=>v.push(p[0],p[1],p[2]));
    q(f[3],f[2],b[2],b[3]).forEach(p=>v.push(p[0],p[1],p[2]));
    q(b[0],b[1],f[1],f[0]).forEach(p=>v.push(p[0],p[1],p[2]));
    return v;
  }
  function cyl(r, h, seg) {
    const v = [], n = seg || 14;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const x0 = Math.cos(a0)*r, z0 = Math.sin(a0)*r, x1 = Math.cos(a1)*r, z1 = Math.sin(a1)*r;
      v.push(x0,0,z0, x1,0,z1, x1,h,z1, x0,0,z0, x1,h,z1, x0,h,z0);
      v.push(0,h,0, x1,h,z1, x0,h,z0);
    }
    return v;
  }
  function sphere(r, seg) {
    const v = [], n = seg || 10;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const p = (a, b) => {
        const th = (a / n) * Math.PI, ph = (b / n) * Math.PI * 2;
        return [r*Math.sin(th)*Math.cos(ph), r*Math.cos(th), r*Math.sin(th)*Math.sin(ph)];
      };
      const a = p(i, j), b = p(i+1, j), c = p(i+1, j+1), d = p(i, j+1);
      v.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
    return v;
  }

  /* ---------------- eşya → dünya ---------------- */
  const pc = (x, y) => [ (x - 50) / 25, (y - 50) / 25 ];
  const DESK = { y: 0.62, h: 0.72 };

  /* her slot için ilkel seti: {geo, pos(world), scale, color, rot} */
  function partsFor(slot, item, layer) {
    const [wx, wz] = pc(item.x, item.y);
    const baseY = layer === "desk" ? DESK.h : 0;
    switch (slot) {
      case "masa": return [
        { g: box(2.1, 0.09, 0.85), t: [0, DESK.h, 0.3], c: [0.32,0.24,0.18] },
        { g: box(0.08, DESK.h, 0.08), t: [-0.95, DESK.h/2, 0.6], c: [0.22,0.17,0.13] },
        { g: box(0.08, DESK.h, 0.08), t: [0.95, DESK.h/2, 0.6], c: [0.22,0.17,0.13] },
        { g: box(0.08, DESK.h, 0.08), t: [-0.95, DESK.h/2, 0.02], c: [0.22,0.17,0.13] },
        { g: box(0.08, DESK.h, 0.08), t: [0.95, DESK.h/2, 0.02], c: [0.22,0.17,0.13] }
      ];
      case "hoparlor": return [
        { g: box(0.36, 0.5, 0.32), t: [wx + 0.5, baseY + 0.25, wz], c: [0.13,0.13,0.15] },
        { g: cyl(0.11, 0.05, 12), t: [wx + 0.5, baseY + 0.3, wz + 0.17], r: [Math.PI/2,0,0], c: [0.35,0.36,0.4] },
        { g: box(0.36, 0.5, 0.32), t: [wx - 0.5, baseY + 0.25, wz], c: [0.13,0.13,0.15] },
        { g: cyl(0.11, 0.05, 12), t: [wx - 0.5, baseY + 0.3, wz + 0.17], r: [Math.PI/2,0,0], c: [0.35,0.36,0.4] }
      ];
      case "mikrofon": return [
        { g: cyl(0.035, 0.95, 10), t: [wx + 1.0, baseY, wz - 0.4], c: [0.5,0.5,0.55] },
        { g: sphere(0.1, 10), t: [wx + 1.0, baseY + 1.02, wz - 0.4], c: [0.75,0.76,0.8] },
        { g: box(0.34, 0.03, 0.3), t: [wx + 1.0, 0.015, wz - 0.4], c: [0.18,0.18,0.2] }
      ];
      case "hali": return [
        { g: box(2.6, 0.02, 1.9), t: [0, 0.011, 0.35], c: [0.42,0.18,0.16] }
      ];
      case "koltuk": return [
        { g: box(0.62, 0.12, 0.62), t: [wx, 0.42, wz + 0.35], c: [0.2,0.22,0.28] },
        { g: box(0.62, 0.55, 0.12), t: [wx, 0.68, wz + 0.68], c: [0.18,0.2,0.26] },
        { g: cyl(0.05, 0.42, 8), t: [wx, 0, wz + 0.35], c: [0.3,0.3,0.34] }
      ];
      case "kabin": return [
        { g: box(1.1, 1.7, 1.1), t: [wx, 0.85, wz], c: [0.16,0.17,0.21] },
        { g: box(0.95, 1.5, 0.02), t: [wx, 0.8, wz + 0.56], c: [0.28,0.32,0.38] }
      ];
      case "tablo": return [
        { g: box(1.2, 0.7, 0.06), t: [wx, 1.45, -1.55], c: [0.26,0.34,0.48] }
      ];
      case "isik": return [
        { g: sphere(0.14, 10), t: [wx, baseY + 1.45, wz], c: [1.0,0.93,0.72] },
        { g: cyl(0.03, 0.6, 8), t: [wx, baseY + 1.45, wz], c: [0.3,0.3,0.34] }
      ];
      default: return [];
    }
  }

  /* ---------------- motor ---------------- */
  const state = {
    canvas: null, gl: null, prog: null, buf: null,
    cam: { yaw: -0.6, pitch: 0.55, dist: 5.2, target: [0, 0.7, 0.2] },
    items: [],            // {slot, pos:[x,y,z], layer, mesh}
    mvp: null, drag: null, ok: false
  };

  const VS = `attribute vec3 aP; uniform mat4 uMVP; uniform mat4 uM; varying vec3 vN;
    void main(){ vN = mat3(uM) * vec3(0.0,1.0,0.0); gl_Position = uMVP * vec4(aP,1.0); }`;
  const FS = `precision mediump float; uniform vec3 uC; uniform vec3 uL; varying vec3 vN;
    void main(){ float d = max(dot(normalize(vN), normalize(uL)), 0.0);
      vec3 c = uC * (0.42 + 0.75 * d); gl_FragColor = vec4(c,1.0); }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }

  function mount(canvas) {
    if (!canvas || !canvas.getContext) { state.ok = false; return false; }
    const gl = canvas.getContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
    if (!gl) { state.ok = false; return false; }
    const vs = compile(gl, gl.VERTEX_SHADER, VS), fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { state.ok = false; return false; }
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { state.ok = false; return false; }
    state.gl = gl; state.canvas = canvas; state.prog = p; state.buf = gl.createBuffer();
    state.ok = true;
    build();
    bindInput();
    return true;
  }

  /* eşyaları sahneden topla (veri studioroom.js'te) */
  function build() {
    const R = K.studioRoom;
    if (!R) return;
    const st = R.st();
    state.items = [];
    Object.keys(st.placed).forEach(slot => {
      const it = R.byId(st.placed[slot]);
      if (!it) return;
      const layer = R.layerOf(slot);
      const [wx, wz] = pc(R.posOf(it).x, R.posOf(it).y);
      state.items.push({ slot, item: it, layer, pos: [wx, layer === "desk" ? DESK.h : 0, wz],
        parts: partsFor(slot, it, layer) });
    });
    state.items.push({ slot: "__room", parts: roomParts(), pos: [0,0,0] });
  }
  function roomParts() {
    return [
      { g: box(4.4, 0.04, 4.4), t: [0, -0.02, 0], c: [0.19,0.2,0.24] },          // zemin
      { g: box(4.4, 2.0, 0.06), t: [0, 1.0, -2.2], c: [0.16,0.17,0.21] },        // arka duvar
      { g: box(0.06, 2.0, 4.4), t: [-2.2, 1.0, 0], c: [0.14,0.15,0.19] },        // sol
      { g: box(0.06, 2.0, 4.4), t: [2.2, 1.0, 0], c: [0.13,0.14,0.18] },         // sağ
      { g: box(1.9, 0.04, 0.9), t: [0, DESK.h, 0.3], c: [0.3,0.22,0.16] }        // masa yüzeyi
    ];
  }

  function draw() {
    if (!state.ok) return;
    const gl = state.gl, c = state.canvas;
    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(0.05, 0.06, 0.08, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const { yaw, pitch, dist, target } = state.cam;
    const eye = [
      target[0] + dist * Math.cos(pitch) * Math.sin(yaw),
      target[1] + dist * Math.sin(pitch),
      target[2] + dist * Math.cos(pitch) * Math.cos(yaw)
    ];
    const view = lookAt(eye, target, [0, 1, 0]);
    const proj = perspective(0.9, c.width / Math.max(1, c.height), 0.1, 60);
    const vp = mul(proj, view);
    state.mvp = vp;

    gl.useProgram(state.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buf);
    const aP = gl.getAttribLocation(state.prog, "aP");
    gl.enableVertexAttribArray(aP);
    gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
    const uMVP = gl.getUniformLocation(state.prog, "uMVP");
    const uM = gl.getUniformLocation(state.prog, "uM");
    const uC = gl.getUniformLocation(state.prog, "uC");
    const uL = gl.getUniformLocation(state.prog, "uL");
    gl.uniform3fv(uL, [0.4, 1.0, 0.55]);
    gl.uniformMatrix4fv(uMVP, false, new Float32Array(vp));

    const all = [];
    state.items.forEach(o => (o.parts || []).forEach(pt => all.push(pt)));
    all.forEach(pt => {
      const m = trs(pt.t || [0,0,0], [1,1,1], pt.ry || 0);
      gl.uniformMatrix4fv(uM, false, new Float32Array(m));
      gl.uniform3fv(uC, pt.c || [0.6,0.6,0.65]);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pt.g), gl.STATIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, pt.g.length / 3);
    });
  }

  /* ---------------- kamera / seçim / sürükleme ---------------- */
  function bindInput() {
    const c = state.canvas;
    let orbit = null, pick = null;
    c.addEventListener("pointerdown", (e) => {
      const hit = nearestItem(e);
      if (hit && e.button === 0) { pick = hit; c.setPointerCapture(e.pointerId); e.preventDefault(); return; }
      orbit = { x: e.clientX, y: e.clientY, yaw: state.cam.yaw, pitch: state.cam.pitch };
    });
    c.addEventListener("pointermove", (e) => {
      if (pick) {
        const w = planePoint(e, pick.layer === "desk" ? DESK.h : 0);
        if (w) { moveItem(pick, w); draw(); }
        return;
      }
      if (!orbit) return;
      state.cam.yaw = orbit.yaw + (e.clientX - orbit.x) * 0.008;
      state.cam.pitch = Math.max(0.08, Math.min(1.35, orbit.pitch - (e.clientY - orbit.y) * 0.006));
      draw();
    });
    const up = () => {
      if (pick) { commit(pick); pick = null; }
      orbit = null;
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("wheel", (e) => {
      e.preventDefault();
      state.cam.dist = Math.max(2.2, Math.min(9, state.cam.dist + Math.sign(e.deltaY) * 0.45));
      draw();
    }, { passive: false });
  }

  /* ekran → ışın → y=height düzlemi kesişimi */
  function planePoint(e, height) {
    if (!state.mvp) return null;
    const c = state.canvas, b = c.getBoundingClientRect();
    const nx = ((e.clientX - b.left) / b.width) * 2 - 1;
    const ny = 1 - ((e.clientY - b.top) / b.height) * 2;
    const inv = invert(state.mvp);
    const un = (x, y, z) => {
      const w = inv[3]*x + inv[7]*y + inv[11]*z + inv[15];
      return [(inv[0]*x + inv[4]*y + inv[8]*z + inv[12]) / w,
              (inv[1]*x + inv[5]*y + inv[9]*z + inv[13]) / w,
              (inv[2]*x + inv[6]*y + inv[10]*z + inv[14]) / w];
    };
    const near = un(nx, ny, -1), far = un(nx, ny, 1);
    const d = sub(far, near);
    if (Math.abs(d[1]) < 1e-6) return null;
    const t = (height - near[1]) / d[1];
    if (t < 0) return null;
    return [near[0] + d[0] * t, height, near[2] + d[2] * t];
  }

  function nearestItem(e) {
    const c = state.canvas, b = c.getBoundingClientRect();
    let best = null, bestD = 34;
    state.items.forEach(o => {
      if (o.slot === "__room") return;
      const p = project(state.mvp, [o.pos[0], (o.layer === "desk" ? DESK.h : 0) + 0.35, o.pos[2]]);
      if (!p) return;
      const sx = b.left + p.x * b.width, sy = b.top + p.y * b.height;
      const d = Math.hypot(e.clientX - sx, e.clientY - sy);
      if (d < bestD) { bestD = d; best = o; }
    });
    return best;
  }

  function moveItem(o, w) {
    o.pos = [Math.max(-2, Math.min(2, w[0])), o.layer === "desk" ? DESK.h : 0, Math.max(-2, Math.min(2, w[2]))];
    o.parts = partsFor(o.slot, { ...o.item, x: 50 + o.pos[0] * 25, y: 50 + o.pos[2] * 25 }, o.layer);
  }

  /* bırakınca: masa üstünde mi? → veri güncelle */
  function commit(o) {
    const R = K.studioRoom;
    if (!R) return;
    const px = 50 + o.pos[0] * 25, py = 50 + o.pos[2] * 25;
    const layer = (Math.abs(px - 50) <= 21 && Math.abs(py - 62) <= 8) ? "desk" : (o.layer === "desk" ? "floor" : "floor");
    R.moveTo(o.slot, px, py, layer);
    o.layer = layer;
    o.parts = partsFor(o.slot, { ...o.item, x: px, y: py }, layer);
    if (K.save) K.save();
    draw();
  }

  K.roomGL = {
    available: function () { return state.ok; },
    supported: function () {
      try {
        const c = document.createElement("canvas");
        return !!(c.getContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
      } catch (e) { return false; }
    },
    mount: mount,
    draw: draw,
    rebuild: function () { if (state.ok) { build(); draw(); } },
    orbit: function (dyaw, dpitch) {
      state.cam.yaw += dyaw;
      state.cam.pitch = Math.max(0.08, Math.min(1.35, state.cam.pitch + (dpitch || 0)));
      draw();
    },
    zoom: function (d) { state.cam.dist = Math.max(2.2, Math.min(9, state.cam.dist + d)); draw(); },
    /* testler için saf matematik */
    _math: { ident, mul, perspective, lookAt, project, invert, trs, pc,
      deskHeight: function () { return DESK.h; } },
    _cam: function () { return state.cam; },
    _items: function () { return state.items; }
  };
})(window.K = window.K || {});
