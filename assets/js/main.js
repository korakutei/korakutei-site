(function(){
  var header = document.querySelector('header');
  var darkSections = document.querySelectorAll('.vmv, .vision');

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

  function closeNav(returnFocus){
    navToggle.setAttribute('aria-expanded','false');
    navToggle.setAttribute('aria-label','メニューを開く');
    primaryNav.classList.remove('open');
    if(returnFocus) navToggle.focus();
  }
  function openNav(){
    navToggle.setAttribute('aria-expanded','true');
    navToggle.setAttribute('aria-label','メニューを閉じる');
    primaryNav.classList.add('open');
    var firstLink = primaryNav.querySelector('a');
    if(firstLink) firstLink.focus();
  }

  navToggle.addEventListener('click', function(){
    var expanded = navToggle.getAttribute('aria-expanded') === 'true';
    if(expanded){ closeNav(false); } else { openNav(); }
  });
  primaryNav.addEventListener('click', function(e){
    if(e.target === primaryNav || e.target.tagName === 'A'){ closeNav(false); }
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true'){ closeNav(true); }
  });
})();

(function(){
  var form = document.getElementById('contactForm');
  if(!form) return;

  var CONTACT_ENDPOINT = ''; // TODO: Formspree等の外部フォームサービスのエンドポイントURLを設定するとAjax送信に切り替わります
  var statusEl = document.getElementById('formStatus');
  var submitBtn = document.getElementById('cfSubmit');
  var submitting = false;

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
      var subject = encodeURIComponent('【交樂庭HP】お問い合わせ（' + data.category + '）');
      var body = encodeURIComponent(buildMailBody(data));
      window.location.href = 'mailto:korakutei29@gmail.com?subject=' + subject + '&body=' + body;
      statusEl.textContent = 'メールソフトが開きます。内容をご確認の上、送信してください。';
      statusEl.className = 'form-status success';
      trackContactSubmit();
      submitting = false;
      submitBtn.disabled = false;
    }
  });
})();
