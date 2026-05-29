/* Pickleball Rocky Point, site motion + interactions.
   Vanilla JS. GSAP + ScrollTrigger enhance if present; degrades gracefully.
   prefers-reduced-motion honored throughout.
   Adapted from the La Palapa ATV build: i18n, loader, scroll, menu, reveal,
   marquee, lightbox kept verbatim; reserve/waiver machinery replaced with a
   light contact form (AJAX FormSubmit + WhatsApp/mailto fallback). */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = typeof window.ScrollTrigger !== 'undefined';

  function $(q, s) { return (s || document).querySelector(q); }
  function $$(q, s) { return Array.prototype.slice.call((s || document).querySelectorAll(q)); }

  if (hasGSAP && hasST) { gsap.registerPlugin(ScrollTrigger); }

  /* =====================================================
     Safe storage helpers (Safari private mode etc. can throw)
     ===================================================== */
  function safeStorageGet(store, key) {
    try { return window[store] ? window[store].getItem(key) : null; } catch (e) { return null; }
  }
  function safeStorageSet(store, key, val) {
    try { if (window[store]) window[store].setItem(key, val); } catch (e) { /* no-op */ }
  }

  /* =====================================================
     i18n: EN primary, ES toggle (data-en / data-es)
     Auto-detect once, then respect localStorage + ?lang=
     ===================================================== */
  var I18N_KEY = 'pk_lang';
  function getInitialLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('lang') === 'es') return 'es';
      if (params.get('lang') === 'en') return 'en';
    } catch (e) { /* URLSearchParams not available */ }
    var stored = safeStorageGet('localStorage', I18N_KEY);
    if (stored === 'es' || stored === 'en') return stored;
    var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    return nav.indexOf('es') === 0 ? 'es' : 'en';
  }

  function applyLang(lang) {
    var attr = lang === 'es' ? 'data-es' : 'data-en';
    function setLangContent(el, val) {
      if (el.tagName === 'TITLE') { el.textContent = val; return; }
      var hasChildEls = el.children && el.children.length > 0;
      if (!hasChildEls) { el.textContent = val; return; }
      var firstText = null;
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3) { firstText = el.childNodes[i]; break; }
      }
      if (firstText) {
        var needsTrailing = el.children.length > 0 && val && val.charAt(val.length - 1) !== ' ';
        firstText.nodeValue = needsTrailing ? (val + ' ') : val;
      } else {
        el.insertBefore(document.createTextNode(val + ' '), el.firstChild);
      }
    }
    $$('[data-en]').forEach(function (el) {
      var val = el.getAttribute(attr);
      if (val === null) return;
      setLangContent(el, val);
    });
    // placeholders
    $$('[data-placeholder-en]').forEach(function (el) {
      var p = el.getAttribute(lang === 'es' ? 'data-placeholder-es' : 'data-placeholder-en');
      if (p !== null) el.setAttribute('placeholder', p);
    });
    // meta description
    var meta = document.getElementById('metaDescription');
    if (meta) {
      meta.setAttribute('content', lang === 'es'
        ? 'Canchas de pickleball en Puerto Peñasco (Rocky Point). 4 canchas y una de voleibol. Paga 100 pesos por persona y juega todo el día, de día o de noche con luces. Solo llega, sin reservar.'
        : 'Pickleball courts in Puerto Penasco (Rocky Point). 4 courts plus a volleyball court. Pay 100 pesos per player and play all day, day or night under the lights. Just show up, no booking.');
    }
    document.documentElement.lang = lang;
    safeStorageSet('localStorage', I18N_KEY, lang);
    $$('.lang-toggle button').forEach(function (b) {
      var active = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  var currentLang = getInitialLang();
  applyLang(currentLang);

  $$('.lang-toggle button').forEach(function (b) {
    b.addEventListener('click', function () {
      currentLang = b.getAttribute('data-lang');
      applyLang(currentLang);
    });
  });

  /* =====================================================
     Loader (per session)
     ===================================================== */
  var loader = document.getElementById('loader');
  var hero = document.getElementById('hero');
  function kickHero() { if (hero) hero.classList.add('is-loaded'); }
  function finishLoader() {
    if (loader) {
      loader.classList.add('is-done');
      setTimeout(function () { if (loader && loader.parentNode) loader.remove(); }, 700);
    }
    document.body.classList.remove('is-locked');
    kickHero();
  }

  if (loader) {
    var seen = safeStorageGet('sessionStorage', 'pk_seen') === '1';
    if (seen || reduceMotion) {
      loader.classList.add('is-ready');
      setTimeout(finishLoader, reduceMotion ? 120 : 350);
    } else {
      safeStorageSet('sessionStorage', 'pk_seen', '1');
      document.body.classList.add('is-locked');
      setTimeout(function () { loader.classList.add('is-ready'); }, 60);
      var bar = loader.querySelector('.loader__bar');
      var n = 0;
      var iv = setInterval(function () {
        n += Math.floor(Math.random() * 9) + 4;
        if (n >= 100) n = 100;
        if (bar) bar.style.width = n + '%';
        if (n >= 100) { clearInterval(iv); setTimeout(finishLoader, 280); }
      }, 55);
      setTimeout(finishLoader, 4000); // safety
    }
  } else {
    kickHero();
  }

  /* =====================================================
     Scroll progress + nav solidify
     ===================================================== */
  var progressTop = document.getElementById('progressTop');
  var nav = document.getElementById('nav');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var pct = Math.min(100, Math.max(0, y / docH * 100));
    if (progressTop) progressTop.style.width = pct + '%';
    if (nav) {
      if (y > 20 || !hero) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* =====================================================
     Mobile menu
     ===================================================== */
  var menu = document.getElementById('menu');
  var menuBtn = document.getElementById('menuBtn');
  var menuClose = document.getElementById('menuClose');
  function openMenu() {
    if (!menu) return;
    menu.classList.add('is-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
  }
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }
  if (menuBtn) menuBtn.addEventListener('click', openMenu);
  if (menuClose) menuClose.addEventListener('click', closeMenu);
  if (menu) $$('.menu__links a, .menu__cta a', menu).forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu && menu.classList.contains('is-open')) closeMenu();
  });

  /* =====================================================
     Smooth anchor scroll with nav offset
     ===================================================== */
  function navOffset() { return (window.matchMedia('(min-width: 900px)').matches ? 72 : 64) + 12; }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.scrollY - navOffset();
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* =====================================================
     Reveal on scroll (.rise)
     CRITICAL: threshold 0.12 + bottom rootMargin so tall sections still trigger.
     ===================================================== */
  if (reduceMotion) {
    $$('.rise').forEach(function (el) { el.classList.add('is-in'); });
  } else if (hasGSAP && hasST) {
    $$('.rise').forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { el.classList.add('is-in'); } });
    });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    $$('.rise').forEach(function (el) { io.observe(el); });
  } else {
    $$('.rise').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* =====================================================
     Light parallax on big section photos (desktop, motion ok)
     ===================================================== */
  if (hasGSAP && hasST && !reduceMotion && window.matchMedia('(min-width: 900px)').matches) {
    $$('.why__photo img').forEach(function (img) {
      gsap.to(img, {
        yPercent: -8, ease: 'none',
        scrollTrigger: { trigger: img.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* =====================================================
     Marquee: clone children so the -50% loop is seamless
     ===================================================== */
  $$('.marquee__track').forEach(function (track) {
    if (reduceMotion) return;
    Array.prototype.slice.call(track.children).forEach(function (k) { track.appendChild(k.cloneNode(true)); });
  });

  /* =====================================================
     FAQ accordion: native <details> needs no JS, but close siblings
     when one opens for a cleaner one-at-a-time accordion.
     ===================================================== */
  var faqItems = $$('.faq__item');
  faqItems.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) faqItems.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* =====================================================
     Contact form: validation + AJAX FormSubmit + WhatsApp/mailto fallback
     - PRIMARY recipient stays the already-activated becca@ address so the
       owner never has to click FormSubmit's one-time "Activate Form" link
       (only the primary needs it; CC recipients never do).
     - OWNER_CC_LIST holds the owner inbox(es); they receive every inquiry on
       CC with zero setup. Empty until the owner provides one (TBD).
     - FormSubmit /ajax/ is fine here (no file attachments on this form).
     ===================================================== */
  var RECIPIENT_EMAIL = 'becca@neonframewebdesign.com';
  var OWNER_CC_LIST = ''; // TODO: owner inbox(es), comma-separated, once provided
  var FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/' + RECIPIENT_EMAIL;
  // TBD: Pickleball Rocky Point's own WhatsApp/phone. Left EMPTY on purpose so we never
  // misdirect to another business's line. When provided, set the E.164 digits (no +) here
  // and the WhatsApp fallback button + tel: affordances light up automatically.
  var OWNER_PHONE_DIGITS = '';
  var OWNER_PHONE_DISPLAY = '';
  var SUBMIT_TIMEOUT_MS = 18000;
  var SUBMIT_MAX_RETRIES = 1;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  var isSubmitting = false;

  function ccLine(customerEmail) {
    var parts = [];
    if (OWNER_CC_LIST) parts.push(OWNER_CC_LIST);
    if (customerEmail) parts.push(customerEmail);
    return parts.join(',');
  }
  function safeStr(v, max) {
    if (v == null) return '';
    var s = String(v).replace(/[\x00-\x1F\x7F]/g, '').trim();
    if (max && s.length > max) s = s.slice(0, max);
    return s;
  }
  function digitsOnly(v) { return safeStr(v).replace(/\D+/g, ''); }
  function looksLikePhone(v) { return digitsOnly(v).length >= 7; }
  function looksLikeEmail(v) { return EMAIL_RE.test(safeStr(v)); }
  function setError(field) { if (field) field.classList.add('has-error'); }
  function clearError(field) { if (field) field.classList.remove('has-error'); }

  function buildInquirySummary(d, lang) {
    var L = lang === 'es' ? {
      title: 'Consulta, Pickleball Rocky Point',
      name: 'Nombre', email: 'Correo', phone: 'Teléfono', topic: 'Tema', message: 'Mensaje', none: '(ninguno)'
    } : {
      title: 'Inquiry, Pickleball Rocky Point',
      name: 'Name', email: 'Email', phone: 'Phone', topic: 'Topic', message: 'Message', none: '(none)'
    };
    return [
      L.title, '',
      L.name + ': ' + (d.name || L.none),
      L.email + ': ' + (d.email || L.none),
      L.phone + ': ' + (d.phone || L.none),
      L.topic + ': ' + (d.topic || L.none),
      '',
      L.message + ': ' + (d.message || L.none)
    ].join('\n');
  }
  function buildWhatsappURL(summary) {
    return 'https://wa.me/' + OWNER_PHONE_DIGITS + '?text=' + encodeURIComponent(summary);
  }
  function buildMailtoURL(summary, d) {
    var subj = 'Pickleball Rocky Point, ' + (d.name || 'inquiry');
    return 'mailto:' + RECIPIENT_EMAIL + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(summary);
  }

  function postInquiry(fd, attempt) {
    attempt = attempt || 0;
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) try { ctrl.abort(); } catch (e) {} }, SUBMIT_TIMEOUT_MS);
    return fetch(FORMSUBMIT_ENDPOINT, {
      method: 'POST', body: fd,
      headers: { 'Accept': 'application/json' },
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < SUBMIT_MAX_RETRIES) {
          return new Promise(function (r) { setTimeout(r, 600); }).then(function () { return postInquiry(fd, attempt + 1); });
        }
        throw new Error('formsubmit_status_' + res.status);
      }
      return res.json().catch(function () { return { success: 'true' }; });
    }, function (err) {
      clearTimeout(timer);
      var transient = err && (err.name === 'AbortError' || err.name === 'TypeError');
      if (transient && attempt < SUBMIT_MAX_RETRIES) {
        return new Promise(function (r) { setTimeout(r, 600); }).then(function () { return postInquiry(fd, attempt + 1); });
      }
      throw err;
    });
  }

  var form = document.getElementById('contactForm');
  if (form) {
    // live-clear errors as the user types
    $$('#contactForm input, #contactForm select, #contactForm textarea').forEach(function (el) {
      el.addEventListener('input', function () { clearError(el.closest('.field')); });
      el.addEventListener('change', function () { clearError(el.closest('.field')); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isSubmitting) return;

      // honeypot
      var honey = document.getElementById('cWebsite');
      if (honey && honey.value) { showContactSuccess(); return; }

      var nameEl = document.getElementById('cName');
      var emailEl = document.getElementById('cEmail');
      var phoneEl = document.getElementById('cPhone');
      var topicEl = document.getElementById('cTopic');
      var msgEl = document.getElementById('cMessage');

      var data = {
        name: safeStr(nameEl && nameEl.value, 120),
        email: safeStr(emailEl && emailEl.value, 254),
        phone: safeStr(phoneEl && phoneEl.value, 40),
        topic: safeStr(topicEl && topicEl.value, 80),
        message: safeStr(msgEl && msgEl.value, 2000)
      };

      var firstInvalid = null;

      // name required (>=2)
      if (data.name.length < 2) { setError(nameEl.closest('.field')); if (!firstInvalid) firstInvalid = nameEl; }
      else clearError(nameEl.closest('.field'));

      // at least one of email/phone, and each valid if provided
      var emailOk = !data.email || looksLikeEmail(data.email);
      var phoneOk = !data.phone || looksLikePhone(data.phone);
      var contactOk = (data.email || data.phone) && emailOk && phoneOk;
      if (!emailOk) { setError(emailEl.closest('.field')); if (!firstInvalid) firstInvalid = emailEl; }
      if (!phoneOk) { setError(phoneEl.closest('.field')); if (!firstInvalid) firstInvalid = phoneEl; }
      if (!contactOk) {
        var contactErr = document.getElementById('cContactErr');
        var cf = contactErr ? contactErr.closest('.field') : null;
        if (cf) setError(cf);
        if (!data.email && !data.phone) { setError(emailEl.closest('.field')); }
        if (!firstInvalid) firstInvalid = emailEl;
      }

      if (firstInvalid) {
        var yy = firstInvalid.getBoundingClientRect().top + window.scrollY - navOffset() - 8;
        window.scrollTo({ top: yy, behavior: reduceMotion ? 'auto' : 'smooth' });
        try { firstInvalid.focus({ preventScroll: true }); } catch (err) { try { firstInvalid.focus(); } catch (e2) {} }
        return;
      }

      // submitting state
      isSubmitting = true;
      var btn = document.getElementById('contactSubmit');
      var label = btn ? btn.querySelector('.btn-label') : null;
      if (btn) btn.disabled = true;
      if (label) {
        label.textContent = '';
        var sp = document.createElement('span'); sp.className = 'spinner'; sp.setAttribute('aria-hidden', 'true');
        label.appendChild(sp);
        label.appendChild(document.createTextNode(' ' + (currentLang === 'es' ? 'Enviando...' : 'Sending...')));
      }
      var errNotice = document.getElementById('contactError');
      if (errNotice) errNotice.classList.remove('is-shown');

      var summaryES = buildInquirySummary(data, 'es');
      var summaryCustomer = buildInquirySummary(data, currentLang);
      var autoresponse = currentLang === 'es'
        ? ('Hola ' + (data.name || '') + ',\n\nRecibimos tu mensaje en Pickleball Rocky Point. Te respondemos pronto. Recuerda: 4 canchas, 100 pesos por persona, todo el día, de día o de noche. Solo llega.\n\nPickleball Rocky Point')
        : ('Hi ' + (data.name || '') + ',\n\nWe got your message at Pickleball Rocky Point. We will get back to you soon. Remember: 4 courts, 100 pesos per player, all day, day or night. Just show up.\n\nPickleball Rocky Point');

      var fd = new FormData();
      fd.append('Name/Nombre', data.name);
      fd.append('Email/Correo', data.email);
      fd.append('Phone/Telefono', data.phone);
      fd.append('Topic/Tema', data.topic);
      fd.append('Message/Mensaje', data.message);
      fd.append('Summary/Resumen', summaryES);
      fd.set('_subject', 'Pickleball Rocky Point, consulta: ' + (data.name || 'nueva'));
      fd.set('_template', 'table');
      fd.set('_captcha', 'false');
      var cc = ccLine(data.email);
      if (cc) fd.set('_cc', cc);
      if (data.email) fd.set('_replyto', data.email);
      fd.set('_autoresponse', autoresponse);
      fd.set('_honey', safeStr(honey && honey.value));

      postInquiry(fd).then(function () {
        isSubmitting = false;
        showContactSuccess();
      }, function () {
        isSubmitting = false;
        showContactError(data, summaryCustomer);
        if (btn) btn.disabled = false;
        if (label) label.textContent = currentLang === 'es' ? 'Enviar mensaje' : 'Send message';
      });
    });
  }

  function showContactSuccess() {
    var card = document.getElementById('contactCard');
    var nameEl = document.getElementById('cName');
    var nameVal = safeStr(nameEl && nameEl.value);
    var body = document.getElementById('contactSuccessBody');
    if (body) {
      body.textContent = currentLang === 'es'
        ? ('¡Gracias' + (nameVal ? ', ' + nameVal : '') + '! Recibimos tu mensaje y te respondemos pronto. Nos vemos en las canchas.')
        : ('Thanks' + (nameVal ? ', ' + nameVal : '') + '! We got your message and will reply soon. See you on the courts.');
    }
    if (card) card.classList.add('is-sent');
    var success = document.getElementById('contactSuccess');
    if (success && card) {
      var y = card.getBoundingClientRect().top + window.scrollY - navOffset() - 8;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
      success.setAttribute('tabindex', '-1');
      try { success.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  function showContactError(data, summary) {
    var notice = document.getElementById('contactError');
    if (!notice) return;
    var wa = document.getElementById('contactErrWhatsapp');
    var ml = document.getElementById('contactErrMailto');
    // WhatsApp button only appears once the venue's own number is known (TBD).
    if (wa) {
      if (OWNER_PHONE_DIGITS) { wa.setAttribute('href', buildWhatsappURL(summary)); wa.hidden = false; }
      else { wa.hidden = true; }
    }
    if (ml) ml.setAttribute('href', buildMailtoURL(summary, data));
    notice.classList.add('is-shown');
    var y = notice.getBoundingClientRect().top + window.scrollY - navOffset() - 8;
    window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  var contactErrRetry = document.getElementById('contactErrRetry');
  if (contactErrRetry) {
    contactErrRetry.addEventListener('click', function () {
      var notice = document.getElementById('contactError');
      if (notice) notice.classList.remove('is-shown');
      var b = document.getElementById('contactSubmit');
      if (b) b.disabled = false;
    });
  }

  /* =====================================================
     Gallery lightbox (focus-trapped, ESC, arrows, swipe)
     ===================================================== */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCount = document.getElementById('lbCount');
  var items = $$('.gallery__item');
  var galleryData = items.map(function (it) {
    var img = it.querySelector('img');
    return { full: it.getAttribute('data-full'), alt: img ? img.getAttribute('alt') : '' };
  });
  var lbIndex = 0;
  var lastFocused = null;

  function openLightbox(i) {
    if (!lb) return;
    lbIndex = (i + galleryData.length) % galleryData.length;
    lastFocused = document.activeElement;
    lbImg.src = galleryData[lbIndex].full;
    lbImg.alt = galleryData[lbIndex].alt;
    if (lbCount) lbCount.textContent = (lbIndex + 1) + ' / ' + galleryData.length;
    lb.classList.add('is-open');
    document.body.classList.add('is-locked');
    var closeBtn = document.getElementById('lbClose');
    if (closeBtn) closeBtn.focus();
  }
  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    lbImg.src = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function step(d) { openLightbox(lbIndex + d); }

  items.forEach(function (it, i) { it.addEventListener('click', function () { openLightbox(i); }); });
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbPrev) lbPrev.addEventListener('click', function () { step(-1); });
  if (lbNext) lbNext.addEventListener('click', function () { step(1); });
  if (lb) lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });

  document.addEventListener('keydown', function (e) {
    if (!lb || !lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Tab') {
      var focusables = $$('button', lb);
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  if (lb) {
    var sx = 0;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* =====================================================
     Footer year
     ===================================================== */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

})();
