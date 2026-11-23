/* ==========================================================
   ヒーローの「縁の輪」（three.js）
   ------------------------------------------------------------------
   ・小さな輪（人・場所・文化）がゆっくり漂い、近づくと糸（縁）で結ばれる
   ・ポインターの近くでは縁が朱色に灯る（＝人が来ると縁が生まれる）
   ・スクロールで、ばらばらの輪がひとつの大きな円（和・輪・縁）に集まる
   ・このファイルは元ソース。編集したら次のコマンドで min を作り直す：
       npx esbuild assets/js/src/hero-en.js --bundle --minify --format=esm \
         --outfile=assets/js/hero-en.min.js
   ========================================================== */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color,
  RingGeometry, MeshBasicMaterial, InstancedMesh, Object3D,
  BufferGeometry, BufferAttribute, LineSegments, LineBasicMaterial,
  InstancedBufferAttribute, DynamicDrawUsage
} from 'three';

const BG = new Color('#F6F1E6');
const INK = new Color('#1B2A41');
const VERMILLION = new Color('#BE3B26');
const GOLD = new Color('#A6813C');

export function initHeroEn(container){
  let renderer;
  try{
    renderer = new WebGLRenderer({ antialias:true, alpha:true, powerPreference:'low-power' });
  }catch(e){ return null; }

  const small = window.innerWidth < 760;
  const COUNT = small ? 34 : 64;
  const LINK_DIST = small ? 2.3 : 2.1;
  const MAX_SEG = COUNT * 6;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 16;

  // 画面の見えている範囲（z=0 平面）
  let halfW = 8, halfH = 5;

  /* ---------- 輪（InstancedMesh） ---------- */
  const ringGeo = new RingGeometry(0.86, 1, 48);
  const ringMat = new MeshBasicMaterial({ transparent:true, depthWrite:false });
  const rings = new InstancedMesh(ringGeo, ringMat, COUNT);
  rings.instanceMatrix.setUsage(DynamicDrawUsage);
  const colors = new Float32Array(COUNT * 3);
  rings.instanceColor = new InstancedBufferAttribute(colors, 3);
  scene.add(rings);

  const nodes = [];
  for(let i = 0; i < COUNT; i++){
    // 数個だけ朱と金。ほかは墨紺を生成りに溶かした色
    const accent = i % 13 === 0 ? VERMILLION : (i % 17 === 5 ? GOLD : null);
    const base = accent ? accent.clone().lerp(BG, 0.25) : INK.clone().lerp(BG, 0.55 + Math.random() * 0.2);
    nodes.push({
      x:0, y:0, z:(Math.random() - .5) * 4,
      hx:Math.random(), hy:Math.random(),           // 漂う位置（0〜1、画面サイズに合わせて展開）
      vx:(Math.random() - .5) * .006, vy:(Math.random() - .5) * .006,
      s:(accent ? .17 : .08) + Math.random() * .12,
      phase:Math.random() * Math.PI * 2,
      base, accent:!!accent,
      angle:(i / COUNT) * Math.PI * 2                // 集まるときの円周上の位置
    });
  }

  /* ---------- 縁の糸（LineSegments） ---------- */
  const linePos = new Float32Array(MAX_SEG * 6);
  const lineCol = new Float32Array(MAX_SEG * 6);
  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute('position', new BufferAttribute(linePos, 3).setUsage(DynamicDrawUsage));
  lineGeo.setAttribute('color', new BufferAttribute(lineCol, 3).setUsage(DynamicDrawUsage));
  const lines = new LineSegments(lineGeo, new LineBasicMaterial({ vertexColors:true, transparent:true, depthWrite:false }));
  scene.add(lines);

  const dummy = new Object3D();
  const tmp = new Color();
  const pointer = { x:999, y:999, tx:999, ty:999, active:false };
  let gather = 0;        // 0 = 漂う ／ 1 = ひとつの円に集まる（スクロール連動）
  let gatherSmooth = 0;
  let shift = 0, shiftSmooth = 0;  // スクロールした分（ヒーロー高さ比）。円を画面の中央に保つ
  let running = false, rafId = 0, t = 0;

  function resize(){
    const w = container.clientWidth, h = container.clientHeight;
    if(!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
    halfW = halfH * camera.aspect;
  }

  function onPointer(e){
    const r = container.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width * 2 - 1) * halfW;
    pointer.ty = -((e.clientY - r.top) / r.height * 2 - 1) * halfH;
    pointer.active = true;
  }
  function onLeave(){ pointer.active = false; }

  function frame(){
    t += 0.016;
    gatherSmooth += (gather - gatherSmooth) * 0.08;
    shiftSmooth += (shift - shiftSmooth) * 0.2;
    const g = gatherSmooth * gatherSmooth * (3 - 2 * gatherSmooth); // smoothstep
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;

    const R = Math.min(halfW, halfH) * 0.58;   // 集まる円の半径
    // 円の中心＝見えている画面の中央。ただしヒーローの下端からはみ出さない位置まで
    const cyc = Math.max(-shiftSmooth * 2 * halfH, -halfH + R * 1.12);
    const spin = t * 0.05;

    for(let i = 0; i < COUNT; i++){
      const n = nodes[i];
      // 漂う
      n.hx += n.vx * 0.12; n.hy += n.vy * 0.12;
      if(n.hx < -.05 || n.hx > 1.05) n.vx *= -1;
      if(n.hy < -.05 || n.hy > 1.05) n.vy *= -1;
      let fx = (n.hx * 2 - 1) * halfW * 1.05 + Math.sin(t * .4 + n.phase) * .25;
      let fy = (n.hy * 2 - 1) * halfH * 1.05 + Math.cos(t * .35 + n.phase) * .25;

      // ポインターにそっと引き寄せられる
      if(pointer.active){
        const dx = pointer.x - fx, dy = pointer.y - fy;
        const d = Math.hypot(dx, dy);
        if(d < 3.2){ const k = (1 - d / 3.2) * .35; fx += dx * k; fy += dy * k; }
      }
      // ひとつの円へ
      const a = n.angle + spin;
      const cx = Math.cos(a) * R, cy = cyc + Math.sin(a) * R;
      n.x = fx + (cx - fx) * g;
      n.y = fy + (cy - fy) * g;
      const z = n.z * (1 - g);

      const pulse = 1 + Math.sin(t * 1.3 + n.phase) * .06;
      dummy.position.set(n.x, n.y, z);
      dummy.scale.setScalar(n.s * pulse * (1 + g * .25));
      dummy.updateMatrix();
      rings.setMatrixAt(i, dummy.matrix);
      n.base.toArray(colors, i * 3);
    }
    rings.instanceMatrix.needsUpdate = true;
    rings.instanceColor.needsUpdate = true;

    // 縁の糸：近い輪どうし。集まるほど、円周上の隣どうしが結ばれる
    let seg = 0;
    // 集まるほど、円周上の隣どうしだけが結ばれる（＝ひとつの輪）
    const linkDist = LINK_DIST * (1 - g) + (Math.PI * 2 * R / COUNT) * 2.2 * g;
    for(let i = 0; i < COUNT && seg < MAX_SEG; i++){
      const a = nodes[i];
      for(let j = i + 1; j < COUNT && seg < MAX_SEG; j++){
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if(d > linkDist) continue;
        let s = 1 - d / linkDist;
        let c = INK;
        if(pointer.active){
          const mx = (a.x + b.x) / 2 - pointer.x, my = (a.y + b.y) / 2 - pointer.y;
          if(Math.hypot(mx, my) < 2.4){ c = VERMILLION; s = Math.min(1, s * 1.6); }
        }
        if(g > .5 && (a.accent || b.accent)) c = VERMILLION;
        tmp.copy(BG).lerp(c, s * (0.42 + g * 0.2));
        const o = seg * 6;
        linePos[o] = a.x; linePos[o+1] = a.y; linePos[o+2] = a.z * (1 - g);
        linePos[o+3] = b.x; linePos[o+4] = b.y; linePos[o+5] = b.z * (1 - g);
        tmp.toArray(lineCol, o); tmp.toArray(lineCol, o + 3);
        seg++;
      }
    }
    lineGeo.setDrawRange(0, seg * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    // ほんの少しだけ視点が動く
    camera.position.x += ((pointer.active ? pointer.x * .04 : 0) - camera.position.x) * .05;
    camera.position.y += ((pointer.active ? pointer.y * .04 : 0) - camera.position.y) * .05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    if(running) rafId = requestAnimationFrame(frame);
  }

  function start(){ if(running) return; running = true; rafId = requestAnimationFrame(frame); }
  function stop(){ running = false; cancelAnimationFrame(rafId); }

  // 画面外・タブ非表示のときは描画を止める
  const io = new IntersectionObserver(([e]) => { e.isIntersecting && !document.hidden ? start() : stop(); });
  io.observe(container);
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) stop();
    else if(container.getBoundingClientRect().bottom > 0) start();
  });

  const hero = container.parentElement;
  hero.addEventListener('pointermove', onPointer, { passive:true });
  hero.addEventListener('pointerleave', onLeave);
  window.addEventListener('resize', resize);
  resize();
  frame();
  container.classList.add('is-ready');

  return {
    setGather(p, s){ gather = Math.max(0, Math.min(1, p)); if(s != null) shift = s; }
  };
}
