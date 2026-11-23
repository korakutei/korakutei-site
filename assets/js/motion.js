/* ==========================================================
   スクロール演出（GSAP ScrollTrigger）＋ヒーローの「縁の輪」
   ------------------------------------------------------------------
   ・見出し・カードの出現は従来どおり main.js の .reveal に任せる（二重にしない）
   ・ここで足すのは「スクロールに連動して動くもの」だけ
       1. ヒーロー：縁の輪（three.js）が、スクロールでひとつの円に集まる
       2. ヒーロー：文字とロゴが少し遅れて上へ抜ける
       3. ヘッダー：読み進んだ分だけ朱の細い線が伸びる
       4. PROJECT の写真・KITAMI VISION の背景：ゆっくり視差
   ・prefers-reduced-motion のときは何もしない
   ・GSAP や WebGL が読めない環境でも、ページはそのまま普通に表示される
   ========================================================== */
(function(){
  var here = document.currentScript && document.currentScript.src;
  if(!window.gsap || !window.ScrollTrigger) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if(reduce.matches) return;

  gsap.registerPlugin(ScrollTrigger);

  /* 1. ヒーローの縁の輪（three.js は後から読み込み、表示を遅らせない） */
  var hero = document.querySelector('.hero');
  var holder = document.querySelector('.hero-en');
  var heroScene = null;
  var gatherP = 0, shiftP = 0;
  if(hero && holder){
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: function(self){
        gatherP = Math.min(1, self.progress * 2.4);
        shiftP = self.progress;
        if(heroScene) heroScene.setGather(gatherP, shiftP);
        // 集まるほど、中央の薄さを解いて円を見せる（文字はこのとき抜けている）
        holder.style.setProperty('--en-c', (0.18 + 0.72 * gatherP).toFixed(3));
      }
    });
    var load = function(){
      import(new URL('hero-en.min.js', here || location.href).href).then(function(m){
        heroScene = m.initHeroEn(holder);
        if(heroScene) heroScene.setGather(gatherP);
        // 集まるほど、中央の薄さを解いて円を見せる（文字はこのとき抜けている）
        holder.style.setProperty('--en-c', (0.18 + 0.72 * gatherP).toFixed(3));
      }).catch(function(){ /* 読めなければ、従来の七宝の背景のまま */ });
    };
    if('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 1500 });
    else setTimeout(load, 300);
  }

  /* 2. ヒーローの文字：スクロールで少し遅れて抜ける */
  if(hero){
    var tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 }
    });
    tl.to('.hero-logo', { yPercent: -18, scale: .92, ease: 'none' }, 0)
      .to('.hero-copy, .hero-brand', { yPercent: -40, opacity: 0, ease: 'none', duration: .55 }, 0)
      .to('.hero-desc, .hero-cta', { yPercent: -60, opacity: 0, ease: 'none', duration: .35 }, 0)
      .to('.scroll-cue', { opacity: 0, ease: 'none', duration: .2 }, 0)
      .set({}, {}, 1);  // タイムラインの長さを1に固定（各要素の duration ＝ 抜けるまでの割合）
  }

  /* 3. 読み進んだ分の線 */
  var header = document.querySelector('header');
  if(header){
    var bar = document.createElement('span');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    header.appendChild(bar);
    gsap.to(bar, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.3 }
    });
  }

  /* 4. 写真の視差（枠からはみ出さない程度に拡大してから動かす） */
  gsap.utils.toArray('.pj-media > picture').forEach(function(pic){
    gsap.fromTo(pic, { yPercent: -6, scale: 1.14 }, {
      yPercent: 6, scale: 1.14, ease: 'none',
      scrollTrigger: { trigger: pic.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
  var visionBg = document.querySelector('.vision-bg');
  if(visionBg){
    gsap.fromTo(visionBg, { yPercent: -10, scale: 1.24 }, {
      yPercent: 10, scale: 1.24, ease: 'none',
      scrollTrigger: { trigger: '.vision', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  // 画像・フォントの読み込みで高さが変わったら、位置を測り直す
  window.addEventListener('load', function(){ ScrollTrigger.refresh(); });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ ScrollTrigger.refresh(); });
})();
