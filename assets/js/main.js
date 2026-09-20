(function(){
  var header = document.querySelector('header');
  var darkSections = document.querySelectorAll('.vmv, .vision, .movie-sec');

  function updateHeader(){
    var probeY = 44;
    var dark = false;
    darkSections.forEach(function(sec){
      var r = sec.getBoundingClientRect();
      if(r.top <= probeY && r.bottom >= probeY) dark = true;
    });
    header.classList.toggle('on-dark', dark);
    header.classList.toggle('scrolled', window.scrollY > 30);
  }
  window.addEventListener('scroll', function(){ requestAnimationFrame(updateHeader); }, {passive:true});
  window.addEventListener('resize', updateHeader);
  updateHeader();

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('nav a'));
  var navSections = navLinks.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  if('IntersectionObserver' in window){
    var navObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          var id = entry.target.id;
          navLinks.forEach(function(a){ a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    navSections.forEach(function(sec){ if(sec) navObserver.observe(sec); });
  }

  if('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    var revealEls = document.querySelectorAll('.reveal');
    revealEls.forEach(function(el){ el.classList.add('js-anim'); });
    var revealObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function(el){ revealObserver.observe(el); });
  }
})();

(function(){
  var navToggle = document.getElementById('navToggle');
  var primaryNav = document.getElementById('primaryNav');
  if(!navToggle || !primaryNav) return;

  function isOpen(){ return navToggle.getAttribute('aria-expanded') === 'true'; }

  function closeNav(returnFocus){
    navToggle.setAttribute('aria-expanded','false');
    navToggle.setAttribute('aria-label','メニューを開く');
    primaryNav.classList.remove('open');
    document.body.classList.remove('nav-open');
    if(returnFocus) navToggle.focus();
  }
  function openNav(){
    navToggle.setAttribute('aria-expanded','true');
    navToggle.setAttribute('aria-label','メニューを閉じる');
    primaryNav.classList.add('open');
    document.body.classList.add('nav-open');
    var firstLink = primaryNav.querySelector('a');
    if(firstLink) firstLink.focus();
  }

  navToggle.addEventListener('click', function(){
    if(isOpen()){ closeNav(false); } else { openNav(); }
  });
  primaryNav.addEventListener('click', function(e){
    if(e.target === primaryNav || e.target.tagName === 'A'){ closeNav(false); }
  });
  document.addEventListener('keydown', function(e){
    if(!isOpen()) return;
    if(e.key === 'Escape'){ closeNav(true); return; }
    if(e.key !== 'Tab') return;
    // メニュー展開中はフォーカスをメニュー内（＋閉じるボタン）に閉じ込める
    var items = [navToggle].concat(Array.prototype.slice.call(primaryNav.querySelectorAll('a')));
    var first = items[0], last = items[items.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });
  // メニュー展開中に画面幅がデスクトップに戻った場合、ロックを解除する
  window.addEventListener('resize', function(){
    if(isOpen() && window.innerWidth > 760) closeNav(false);
  });
})();

(function(){
  var form = document.getElementById('contactForm');
  if(!form) return;

  var CONTACT_ENDPOINT = ''; // TODO: Formspree等の外部フォームサービスのエンドポイントURLを設定するとAjax送信に切り替わります
  var statusEl = document.getElementById('formStatus');
  var submitBtn = document.getElementById('cfSubmit');
  var howtoEl = document.getElementById('formHowto');
  var rescueEl = document.getElementById('formRescue');
  var copyBtn = document.getElementById('cfCopy');
  var copyNote = document.getElementById('cfCopyNote');
  var submitting = false;
  var lastMailBody = '';

  // 送信先が設定されたら、メール前提の案内とボタン文言を通常の送信に戻す
  if(CONTACT_ENDPOINT){
    if(howtoEl) howtoEl.hidden = true;
    submitBtn.textContent = '相談してみる';
  }

  if(copyBtn){
    copyBtn.addEventListener('click', function(){
      var text = 'お問い合わせ先: korakutei29@gmail.com\n\n' + lastMailBody;
      function done(ok){
        if(!copyNote) return;
        copyNote.textContent = ok
          ? 'コピーしました。メールに貼り付けてお送りください。'
          : 'コピーできませんでした。お手数ですが入力内容を手動でお送りください。';
        copyNote.className = 'form-rescue-note ' + (ok ? 'ok' : 'ng');
      }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); });
        return;
      }
      // clipboard API が使えない環境向けのフォールバック
      try{
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly','');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        done(ok);
      }catch(e){ done(false); }
    });
  }

  function setError(id, message){
    var el = form.querySelector('[data-error-for="'+id+'"]');
    var input = document.getElementById(id);
    if(el){
      el.textContent = message || '';
      el.classList.toggle('show', !!message);
    }
    if(input){ input.setAttribute('aria-invalid', message ? 'true' : 'false'); }
  }

  function validate(){
    var ok = true;
    var category = document.getElementById('cf-category');
    var name = document.getElementById('cf-name');
    var email = document.getElementById('cf-email');
    var detail = document.getElementById('cf-detail');
    var agree = document.getElementById('cf-agree');

    setError('cf-category',''); setError('cf-name',''); setError('cf-email',''); setError('cf-detail',''); setError('cf-agree','');

    if(!category.value){ setError('cf-category','選択してください'); ok = false; }
    if(!name.value.trim()){ setError('cf-name','氏名を入力してください'); ok = false; }
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!email.value.trim()){ setError('cf-email','メールアドレスを入力してください'); ok = false; }
    else if(!emailPattern.test(email.value.trim())){ setError('cf-email','メールアドレスの形式が正しくありません'); ok = false; }
    if(!detail.value.trim()){ setError('cf-detail','ご相談内容を入力してください'); ok = false; }
    if(!agree.checked){ setError('cf-agree','同意が必要です'); ok = false; }

    return ok;
  }

  function buildMailBody(data){
    return [
      '相談内容の分類: ' + data.category,
      '氏名: ' + data.name,
      '会社・団体名: ' + data.org,
      'メールアドレス: ' + data.email,
      '希望時期: ' + data.timing,
      '参加予定人数: ' + data.headcount,
      '予算目安: ' + data.budget,
      '',
      'ご相談内容:',
      data.detail
    ].join('\n');
  }

  function trackContactSubmit(){
    try{
      if(typeof window.gtag === 'function'){
        window.gtag('event', 'contact_submit');
      } else if(Array.isArray(window.dataLayer)){
        window.dataLayer.push({ event: 'contact_submit' });
      }
    }catch(e){}
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(submitting) return;
    if(document.getElementById('cf-company2').value){ return; }

    if(!validate()){
      statusEl.textContent = '入力内容をご確認ください。';
      statusEl.className = 'form-status error';
      return;
    }

    var data = {
      category: document.getElementById('cf-category').value,
      name: document.getElementById('cf-name').value.trim(),
      org: document.getElementById('cf-org').value.trim(),
      email: document.getElementById('cf-email').value.trim(),
      timing: document.getElementById('cf-timing').value.trim(),
      headcount: document.getElementById('cf-headcount').value.trim(),
      budget: document.getElementById('cf-budget').value.trim(),
      detail: document.getElementById('cf-detail').value.trim()
    };

    submitting = true;
    submitBtn.disabled = true;
    statusEl.textContent = '送信中です…';
    statusEl.className = 'form-status';

    if(CONTACT_ENDPOINT){
      fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function(res){
        if(!res.ok) throw new Error('送信に失敗しました');
        statusEl.textContent = 'お問い合わせを受け付けました。ありがとうございます。';
        statusEl.className = 'form-status success';
        trackContactSubmit();
        form.reset();
      }).catch(function(){
        statusEl.textContent = '送信に失敗しました。お手数ですが下記メールより直接ご連絡ください。';
        statusEl.className = 'form-status error';
      }).finally(function(){
        submitting = false;
        submitBtn.disabled = false;
      });
    } else {
      // 送信先が未設定のあいだはメール送信。
      // mailto は「開いたかどうか」をJSから知る手段がないため、成功とは言い切らず、
      // 開かなかった人向けの受け皿（コピー／直接メール）を必ず出しておく。
      var subject = encodeURIComponent('【交樂庭HP】お問い合わせ（' + data.category + '）');
      var body = encodeURIComponent(buildMailBody(data));
      window.location.href = 'mailto:korakutei29@gmail.com?subject=' + subject + '&body=' + body;

      lastMailBody = buildMailBody(data);
      statusEl.textContent = 'メールソフトを起動しました。内容をご確認のうえ、そのまま送信してください。';
      statusEl.className = 'form-status notice';
      if(rescueEl) rescueEl.hidden = false;

      trackContactSubmit();
      submitting = false;
      submitBtn.disabled = false;
    }
  });
})();

/* YouTube埋め込みのファサード
   ------------------------------------------------------------------
   .video-embed[data-yt="動画ID"] の中のリンクを、クリックされるまで
   ただのサムネイル画像として置いておく。押された時点ではじめて
   youtube-nocookie の iframe に差し替えるため、ページを開いただけでは
   YouTubeへの通信が発生しない（表示も軽くなる）。
   JSが動かない環境では、リンクのままYouTubeが新しいタブで開く。
   ------------------------------------------------------------------ */
(function(){
  var embeds = document.querySelectorAll('.video-embed[data-yt]');
  if(!embeds.length) return;

  Array.prototype.forEach.call(embeds, function(box){
    var id = (box.getAttribute('data-yt') || '').trim();
    var link = box.querySelector('.video-facade');
    if(!id || !link) return;

    link.addEventListener('click', function(e){
      // 新しいタブで開きたい場合（Ctrl/⌘クリック等）は邪魔しない
      if(e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();

      var title = link.querySelector('.video-facade-cap');
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
                   '?autoplay=1&rel=0&playsinline=1';
      iframe.title = title ? title.textContent.replace(/を再生$/, '') : 'YouTube動画';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

      box.replaceChild(iframe, link);
      box.classList.add('is-playing');
    });
  });
})();
