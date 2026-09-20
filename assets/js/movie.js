/* ============================================================
   多言語ブランドムービー（#movie）

   ▼▼▼ ここだけ書き換えれば動きます ▼▼▼
   YouTubeに「限定公開」でアップした動画のIDを入れてください。
   　例）https://www.youtube.com/watch?v=AbCdEfGh123
   　　　→ 'AbCdEfGh123' の部分だけをコピーして貼り付け
   （youtu.be/AbCdEfGh123 の場合も、スラッシュより後ろがIDです）

   3つとも空のあいだは #movie セクションごと非表示になります。
   1つでも入れればその言語だけ公開され、残りのパネルは自動で消えます。
   ============================================================ */
var MOVIE_VIDEO_IDS = {
  ja: '',   /* 日本語ナレーション版 */
  en: '',   /* 英語ナレーション版 */
  es: ''    /* スペイン語ナレーション版 */
};
/* ▲▲▲ 書き換えるのはここまで ▲▲▲ */


(function(){
  var section = document.getElementById('movie');
  if(!section) return;

  var ids = {};
  Object.keys(MOVIE_VIDEO_IDS).forEach(function(k){
    var v = (MOVIE_VIDEO_IDS[k] || '').trim();
    if(v) ids[k] = v;
  });

  var panels = Array.prototype.slice.call(section.querySelectorAll('.movie-panel'));
  // IDが入っていない言語のパネルは表に出さない
  panels = panels.filter(function(p){
    if(ids[p.dataset.lang]) return true;
    p.remove();
    return false;
  });
  // 1本も設定されていなければ、セクションは隠したまま何もしない
  if(!panels.length) return;

  section.hidden = false;
  if(panels.length < 3) section.querySelector('.movie-panels').classList.add('is-few');
  var navLink = document.querySelector('nav a[href="#movie"]');
  if(navLink) navLink.hidden = false;
  // 先頭のパネルを初期選択にする
  panels.forEach(function(p, i){ p.classList.toggle('is-active', i === 0); });

  var demo = section.querySelector('.movie-demo');
  var fallback = section.querySelector('[data-movie-fallback]');
  var players = {};
  var activeLang = panels[0].dataset.lang;
  var apiPromise = null;

  function ytWatchUrl(lang){ return 'https://www.youtube.com/watch?v=' + ids[lang]; }

  function loadApi(){
    if(apiPromise) return apiPromise;
    apiPromise = new Promise(function(resolve, reject){
      if(window.YT && window.YT.Player) return resolve(window.YT);
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function(){
        if(typeof prev === 'function'){ try{ prev(); }catch(e){} }
        resolve(window.YT);
      };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = function(){ reject(new Error('iframe_api')); };
      document.head.appendChild(s);
      // 読み込みが極端に遅い/ブロックされた場合の保険
      setTimeout(function(){ if(!(window.YT && window.YT.Player)) reject(new Error('timeout')); }, 12000);
    });
    return apiPromise;
  }

  // いま再生中の位置。言い出しが切れないよう少しだけ手前に戻す
  function currentTime(){
    var p = players[activeLang];
    if(p && typeof p.getCurrentTime === 'function'){
      try{
        var t = p.getCurrentTime();
        if(isFinite(t) && t > 0) return Math.max(0, t - 0.4);
      }catch(e){}
    }
    return 0;
  }

  function updateCaptions(){
    panels.forEach(function(p){
      var cap = p.querySelector('[data-movie-cap]');
      if(!cap) return;
      cap.textContent = demo.classList.contains('is-live') && !p.classList.contains('is-active')
        ? 'この言語に切り替える'
        : 'この言語で聴く';
    });
  }

  function showFallback(lang){
    if(!fallback) return;
    var a = fallback.querySelector('a');
    if(a && ids[lang]) a.href = ytWatchUrl(lang);
    fallback.hidden = false;
  }

  function activate(lang){
    if(!ids[lang]) return;
    var t = currentTime();

    panels.forEach(function(p){ p.classList.toggle('is-active', p.dataset.lang === lang); });
    demo.classList.add('is-live');
    activeLang = lang;
    updateCaptions();

    // 他の言語は止めておく（音が重ならないように）
    Object.keys(players).forEach(function(k){
      if(k === lang) return;
      try{ players[k].pauseVideo(); }catch(e){}
    });

    if(players[lang]){
      try{ players[lang].seekTo(t, true); players[lang].playVideo(); }catch(e){}
      return;
    }

    var panel = panels.filter(function(p){ return p.dataset.lang === lang; })[0];
    if(panel) panel.classList.add('is-loading');

    loadApi().then(function(YT){
      var vars = {
        autoplay: 1,
        start: Math.floor(t),
        rel: 0,
        modestbranding: 1,
        playsinline: 1
      };
      if(location.protocol === 'http:' || location.protocol === 'https:') vars.origin = location.origin;

      players[lang] = new YT.Player('movieMount-' + lang, {
        host: 'https://www.youtube-nocookie.com',
        videoId: ids[lang],
        playerVars: vars,
        events: {
          onReady: function(e){
            if(panel){ panel.classList.remove('is-loading'); panel.classList.add('has-player'); }
            try{ e.target.seekTo(t, true); e.target.playVideo(); }catch(err){}
          },
          onError: function(){
            if(panel) panel.classList.remove('is-loading', 'has-player');
            showFallback(lang);
          }
        }
      });
    }).catch(function(){
      if(panel) panel.classList.remove('is-loading');
      showFallback(lang);
    });
  }

  panels.forEach(function(p){
    var cover = p.querySelector('[data-movie-cover]');
    if(cover) cover.addEventListener('click', function(){ activate(p.dataset.lang); });
  });

  updateCaptions();
})();
