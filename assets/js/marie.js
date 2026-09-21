/* 看板犬マリーの道案内
   ------------------------------------------------------------------
   ・画面右下についてきて、各セクションの data-marie に書いたひとことを、
     はじめて通りかかったときに吹き出しで話す。
     流し読みで通り過ぎたセクションでは話さず、少し立ち止まってから話す。
   ・最初のひとことでは、手をふって自己紹介もする。
   ・マリーを押すと「おさんぽマップ」（行き先の一覧）が開く。
     いま見ているセクションには「いまここ」が付く。
   ・トップ（ヒーロー）には出さない。
   ・マリーは画面に1匹だけ。プロフィール・CONTACT など、
     本人（data-marie-here）が見えている間は、右下のマリーは隠れる。
   ・「マリーを休ませる」を押すと肉球ボタンだけになる（次に来たときも覚えておく）。
   ・セリフを変えたいときは index.html の data-marie を書き換える。
   ------------------------------------------------------------------ */
(function(){
  var guide = document.getElementById('marieGuide');
  if(!guide) return;

  var btn = document.getElementById('marieBtn');
  var callBtn = document.getElementById('marieCall');
  var restBtn = document.getElementById('marieRest');
  var bubble = document.getElementById('marieBubble');
  var map = document.getElementById('marieMap');
  var nowEl = document.getElementById('marieNow');
  var hero = document.querySelector('.hero');
  var contact = document.getElementById('contact');
  var sections = Array.prototype.slice.call(document.querySelectorAll('section[data-marie]'));
  var heres = Array.prototype.slice.call(document.querySelectorAll('[data-marie-here]'));
  var mapLinks = Array.prototype.slice.call(map.querySelectorAll('.marie-map-list a'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var REST_KEY = 'korakutei-marie-rest';
  var HELLO = 'はじめまして！ 交樂庭の看板犬、マリーです。';
  var HINT = 'わたしを押すと、おさんぽマップが開くよ。';
  var MAP_GREETING = 'どこへ行こうか？ 行きたいところを選んでね。';
  var CALLED = 'よんだ？ いっしょに歩こう！';

  var current = null;   // いま画面の中ほどにあるセクション
  var seen = {};        // 一度話したセクション（同じことは繰り返さない）
  var greeted = false;  // 自己紹介はページを開いて最初の1回だけ
  var hintShown = false;
  var away = true;
  var everShown = false;
  var resting = false;
  var talkTimer = null, hushTimer = null, runTimer = null;
  try{ resting = window.localStorage.getItem(REST_KEY) === '1'; }catch(e){}

  function lineOf(sec){ return sec ? (sec.getAttribute('data-marie') || '') : ''; }

  function isVisible(el){
    if(!el || !el.getClientRects().length) return false;
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  // 右下のマリーが出番でない場所：ヒーロー、CONTACTから下、本人が見えている場所
  function isAway(){
    var vh = window.innerHeight;
    if(hero && hero.getBoundingClientRect().bottom > vh * 0.5) return true;
    if(contact && contact.getBoundingClientRect().top < vh * 0.75) return true;
    for(var i = 0; i < heres.length; i++){
      if(isVisible(heres[i])) return true;
    }
    return false;
  }

  function currentSection(){
    var probe = window.innerHeight * 0.45;
    for(var i = 0; i < sections.length; i++){
      var s = sections[i];
      if(s.hidden) continue;
      var r = s.getBoundingClientRect();
      if(r.top <= probe && r.bottom > probe) return s;
    }
    return null;
  }

  /* ---------- 吹き出し ---------- */
  function hush(){
    clearTimeout(hushTimer);
    guide.classList.remove('is-talking', 'is-waving');
  }

  function say(text, wave){
    if(!text) return;
    bubble.textContent = '';
    // 読み終わるくらいの時間だけ出しておく
    var hold = Math.min(9000, 3800 + text.length * 80);
    // 最初のひとことでは、手をふって自己紹介する
    if(!greeted){
      greeted = true;
      wave = true;
      var hello = document.createElement('span');
      hello.className = 'marie-hello';
      hello.textContent = HELLO;
      bubble.appendChild(hello);
      hold += 1600;
    }
    bubble.appendChild(document.createTextNode(text));
    // 最初のひとことにだけ、マップの開き方を添える
    if(!hintShown){
      hintShown = true;
      var hint = document.createElement('span');
      hint.className = 'marie-hint';
      hint.textContent = HINT;
      bubble.appendChild(hint);
      hold += 2400;
    }
    guide.classList.remove('is-talking');
    void guide.offsetWidth; // 話すたびに、ぴょんと跳ねる動きをやり直す
    guide.classList.add('is-talking');
    guide.classList.toggle('is-waving', !!wave);
    clearTimeout(hushTimer);
    hushTimer = setTimeout(hush, hold);
  }

  function scheduleTalk(sec){
    clearTimeout(talkTimer);
    if(!sec || seen[sec.id]) return;
    talkTimer = setTimeout(function(){
      if(current !== sec || away || resting || isOpen() || seen[sec.id]) return;
      seen[sec.id] = true;
      say(lineOf(sec));
    }, 800);
  }

  /* ---------- 走るポーズ（移動中だけ） ---------- */
  function run(ms){
    if(reduce) return;
    guide.classList.add('is-running');
    clearTimeout(runTimer);
    runTimer = setTimeout(function(){ guide.classList.remove('is-running'); }, ms);
  }

  /* ---------- おさんぽマップ ---------- */
  function markCurrent(sec){
    var href = sec ? '#' + sec.id : '';
    mapLinks.forEach(function(a){
      if(a.getAttribute('href') === href) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    nowEl.textContent = lineOf(sec) || MAP_GREETING;
  }

  function isOpen(){ return btn.getAttribute('aria-expanded') === 'true'; }

  function openMap(moveFocus){
    hush();
    clearTimeout(talkTimer);
    hintShown = true; // 自分で開けた人には、もう開き方の案内はいらない
    markCurrent(current);
    map.hidden = false;
    guide.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'おさんぽマップを閉じる');
    if(moveFocus){
      var target = map.querySelector('[aria-current]') || map.querySelector('a');
      if(target) target.focus();
    }
  }

  function closeMap(returnFocus){
    if(!isOpen()) return;
    map.hidden = true;
    guide.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'マリーのおさんぽマップを開く');
    if(returnFocus) btn.focus();
  }

  /* ---------- 休憩 ---------- */
  function applyResting(){
    guide.classList.toggle('is-resting', resting);
    btn.hidden = resting;
    callBtn.hidden = !resting;
  }

  function setResting(on){
    resting = on;
    try{
      if(on) window.localStorage.setItem(REST_KEY, '1');
      else window.localStorage.removeItem(REST_KEY);
    }catch(e){}
    applyResting();
  }

  /* ---------- スクロールに合わせて、ついていく ---------- */
  function update(){
    var nowAway = isAway();
    if(nowAway !== away){
      away = nowAway;
      guide.classList.toggle('is-away', away);
      if(away){
        hush();
        closeMap(false);
      }else{
        // はじめて出てくるときは、駆け寄ってくる
        if(!everShown){ everShown = true; run(900); }
        scheduleTalk(current);
      }
    }

    var sec = currentSection();
    if(sec !== current){
      current = sec;
      markCurrent(sec);
      hush();
      scheduleTalk(sec);
    }
  }

  var ticking = false;
  function onScroll(){
    if(ticking) return;
    ticking = true;
    window.requestAnimationFrame(function(){
      ticking = false;
      update();
    });
  }

  /* ---------- 操作 ---------- */
  btn.addEventListener('click', function(e){
    if(isOpen()){ closeMap(false); return; }
    // キーボードで開いたときだけ、マップの中へフォーカスを移す
    openMap(e.detail === 0);
  });

  map.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('a') : null;
    if(!a) return;
    closeMap(false);
    run(1300); // 目的地まで駆けていく
  });

  restBtn.addEventListener('click', function(){
    closeMap(false);
    hush();
    setResting(true);
    callBtn.focus();
  });

  callBtn.addEventListener('click', function(){
    setResting(false);
    btn.focus();
    say(CALLED, true);
  });

  // 吹き出しは、押せばすぐ閉じる
  bubble.addEventListener('click', hush);

  // マウスを乗せている間は、吹き出しを消さない
  guide.addEventListener('mouseenter', function(){ clearTimeout(hushTimer); });
  guide.addEventListener('mouseleave', function(){
    if(!guide.classList.contains('is-talking')) return;
    clearTimeout(hushTimer);
    hushTimer = setTimeout(hush, 2500);
  });

  document.addEventListener('click', function(e){
    if(isOpen() && !guide.contains(e.target)) closeMap(false);
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && isOpen()) closeMap(true);
  });
  guide.addEventListener('focusout', function(e){
    if(isOpen() && e.relatedTarget && !guide.contains(e.relatedTarget)) closeMap(false);
  });

  applyResting();
  update();
  guide.hidden = false;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
