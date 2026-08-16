/* =============================================================================
   Hovenier.nl — herbouw
   Alle interactie, zonder externe libraries.
   ============================================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var on = function (el, ev, fn, o) { if (el) el.addEventListener(ev, fn, o); };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------------
     Header: schaduw zodra de pagina scrollt
     ------------------------------------------------------------------------- */
  (function header() {
    var el = $('.site-header');
    if (!el) return;
    var ticking = false;
    function update() {
      el.classList.toggle('is-stuck', window.scrollY > 4);
      ticking = false;
    }
    on(window, 'scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  /* ---------------------------------------------------------------------------
     Megamenu (desktop): klik + hover + toetsenbord
     ------------------------------------------------------------------------- */
  (function megamenu() {
    var items = $$('.nav-item--has-menu');
    if (!items.length) return;
    var closeTimer;

    function close(item) {
      item.classList.remove('is-open');
      var btn = $('.nav-link', item);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
    function closeAll(except) {
      items.forEach(function (i) { if (i !== except) close(i); });
    }
    function open(item) {
      closeAll(item);
      item.classList.add('is-open');
      var btn = $('.nav-link', item);
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }

    // Op apparaten met een muis opent het menu bij hover en volgt een klik de link.
    // Zonder hover (touch) opent de eerste tik het menu, de tweede volgt de link.
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    items.forEach(function (item) {
      var btn = $('.nav-link', item);
      on(btn, 'click', function (e) {
        if (canHover) return;                 // laat de link zijn werk doen
        if (!item.classList.contains('is-open')) { e.preventDefault(); open(item); }
      });
      on(btn, 'keydown', function (e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault(); open(item);
          var f = $('.megamenu a', item); if (f) f.focus();
        }
      });
      on(item, 'mouseenter', function () { window.clearTimeout(closeTimer); open(item); });
      on(item, 'mouseleave', function () {
        closeTimer = window.setTimeout(function () { close(item); }, 180);
      });
      on(btn, 'focus', function () { open(item); });
      on(item, 'focusout', function (e) {
        if (!item.contains(e.relatedTarget)) close(item);
      });
    });

    on(document, 'click', function (e) {
      if (!e.target.closest('.nav-item--has-menu')) closeAll();
    });
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
  })();

  /* ---------------------------------------------------------------------------
     Mobiele navigatie
     ------------------------------------------------------------------------- */
  (function mobileNav() {
    var panel  = $('.mobile-nav');
    var toggle = $('.nav-toggle');
    if (!panel || !toggle) return;
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      panel.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
      var first = $('.mobile-nav__close', panel);
      if (first) first.focus();
    }
    function close() {
      panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus();
    }

    on(toggle, 'click', function () {
      panel.classList.contains('is-open') ? close() : open();
    });
    on($('.mobile-nav__close', panel), 'click', close);
    on($('.mobile-nav__scrim', panel), 'click', close);
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
    });
    $$('.mobile-nav__body a', panel).forEach(function (a) { on(a, 'click', close); });

    // Focus binnen het paneel houden
    on(panel, 'keydown', function (e) {
      if (e.key !== 'Tab' || !panel.classList.contains('is-open')) return;
      var f = $$('a[href], button:not([disabled]), input, select, textarea', panel)
                .filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Uitklapbare subsecties
    $$('.mobile-nav__body [data-acc]', panel).forEach(function (btn) {
      on(btn, 'click', function () {
        var sub = btn.parentNode.querySelector('.sub');
        var openNow = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!openNow));
        if (sub) sub.classList.toggle('is-open', !openNow);
      });
    });
  })();

  /* ---------------------------------------------------------------------------
     Accordeon (veelgestelde vragen e.d.)
     ------------------------------------------------------------------------- */
  (function accordion() {
    $$('.accordion').forEach(function (acc) {
      var single = acc.hasAttribute('data-single');
      $$('.accordion__btn', acc).forEach(function (btn) {
        on(btn, 'click', function () {
          var panel  = document.getElementById(btn.getAttribute('aria-controls'));
          var isOpen = btn.getAttribute('aria-expanded') === 'true';
          if (single && !isOpen) {
            $$('.accordion__btn', acc).forEach(function (b) {
              b.setAttribute('aria-expanded', 'false');
              var p = document.getElementById(b.getAttribute('aria-controls'));
              if (p) p.classList.remove('is-open');
            });
          }
          btn.setAttribute('aria-expanded', String(!isOpen));
          if (panel) panel.classList.toggle('is-open', !isOpen);
        });
      });
    });
  })();

  /* ---------------------------------------------------------------------------
     Carousel (reviews, bedrijven)
     ------------------------------------------------------------------------- */
  (function carousels() {
    $$('.carousel').forEach(function (car) {
      var vp   = $('.carousel__viewport', car);
      var prev = $('.carousel__btn--prev', car);
      var next = $('.carousel__btn--next', car);
      if (!vp) return;

      function step() {
        var first = vp.firstElementChild;
        if (!first) return vp.clientWidth;
        var gap = parseFloat(getComputedStyle(vp).columnGap || '16') || 16;
        return first.getBoundingClientRect().width + gap;
      }
      function sync() {
        var max = vp.scrollWidth - vp.clientWidth - 2;
        if (prev) prev.disabled = vp.scrollLeft <= 2;
        if (next) next.disabled = vp.scrollLeft >= max;
        var nav = $('.carousel__nav', car);
        if (nav) nav.style.display = max > 4 ? '' : 'none';
      }
      on(prev, 'click', function () { vp.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }); });
      on(next, 'click', function () { vp.scrollBy({ left:  step(), behavior: reduced ? 'auto' : 'smooth' }); });
      on(vp, 'scroll', sync, { passive: true });
      on(window, 'resize', sync);
      sync();
    });
  })();

  /* ---------------------------------------------------------------------------
     Lange reviews inklappen
     ------------------------------------------------------------------------- */
  (function reviewClamp() {
    $$('.review__text').forEach(function (p) {
      if (p.scrollHeight <= p.clientHeight + 4) { p.classList.remove('is-clamped'); return; }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'review__more';
      btn.textContent = 'Lees meer';
      btn.setAttribute('aria-expanded', 'false');
      on(btn, 'click', function () {
        var open = p.classList.toggle('is-clamped') === false;
        btn.textContent = open ? 'Toon minder' : 'Lees meer';
        btn.setAttribute('aria-expanded', String(open));
      });
      p.parentNode.appendChild(btn);
    });
  })();

  /* ---------------------------------------------------------------------------
     Lightbox voor de projectgalerij
     ------------------------------------------------------------------------- */
  (function lightbox() {
    var boxes = $$('[data-gallery]');
    if (!boxes.length) return;

    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Projectfoto');
    lb.innerHTML =
      '<figure class="lightbox__fig">' +
        '<img alt="">' +
        '<figcaption class="lightbox__cap"></figcaption>' +
      '</figure>' +
      '<button type="button" class="lightbox__btn lightbox__btn--close" aria-label="Sluiten">' +
        '<svg class="ico" viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button type="button" class="lightbox__btn lightbox__btn--prev" aria-label="Vorige foto">' +
        '<svg class="ico" viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button type="button" class="lightbox__btn lightbox__btn--next" aria-label="Volgende foto">' +
        '<svg class="ico" viewBox="0 0 24 24" width="22" height="22"><path d="M9 5l7 7-7 7"/></svg></button>';
    document.body.appendChild(lb);

    var img  = $('img', lb);
    var cap  = $('.lightbox__cap', lb);
    var items = [], index = 0, opener = null;

    function show(i) {
      if (!items.length) return;
      index = (i + items.length) % items.length;
      var it = items[index];
      img.src = it.src;
      img.alt = it.alt;
      cap.innerHTML = escapeHtml(it.alt) + '<span>Foto ' + (index + 1) + ' van ' + items.length + '</span>';
    }
    function open(list, i, trigger) {
      items = list; opener = trigger;
      show(i);
      lb.classList.add('is-open');
      document.body.classList.add('is-locked');
      $('.lightbox__btn--close', lb).focus();
    }
    function close() {
      lb.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      if (opener) opener.focus();
    }

    boxes.forEach(function (box) {
      var triggers = $$('.gallery__item', box);
      var list = triggers.map(function (t) {
        var im = $('img', t);
        return { src: t.getAttribute('data-full') || im.src, alt: im.alt };
      });
      triggers.forEach(function (t, i) {
        on(t, 'click', function () { open(list, i, t); });
      });
    });

    on($('.lightbox__btn--close', lb), 'click', close);
    on($('.lightbox__btn--prev', lb), 'click', function () { show(index - 1); });
    on($('.lightbox__btn--next', lb), 'click', function () { show(index + 1); });
    on(lb, 'click', function (e) { if (e.target === lb) close(); });
    on(document, 'keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowLeft')  show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    // Swipe op touch
    var x0 = null;
    on(lb, 'touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    on(lb, 'touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  })();

  /* ---------------------------------------------------------------------------
     Filteren van lijsten (bedrijven, specialisaties, inspiratie)
     ------------------------------------------------------------------------- */
  (function filters() {
    $$('[data-filter-root]').forEach(function (root) {
      var input   = $('[data-filter-input]', root);
      var select  = $('[data-filter-select]', root);
      var items   = $$('[data-filter-item]', root);
      var counter = $('[data-filter-count]', root);
      var empty   = $('[data-filter-empty]', root);
      var reset   = $('[data-filter-reset]', root);
      var more    = $('[data-filter-more]', root);
      var pageSize = parseInt(root.getAttribute('data-page-size') || '0', 10);
      var shown   = pageSize || items.length;

      function apply() {
        var q   = (input && input.value || '').trim().toLowerCase();
        var cat = (select && select.value) || '';
        var hits = 0, rendered = 0;

        items.forEach(function (it) {
          var hay = (it.getAttribute('data-search') || it.textContent).toLowerCase();
          var val = it.getAttribute('data-cat') || '';
          var ok  = (!q || hay.indexOf(q) !== -1) && (!cat || val === cat);
          if (ok) {
            hits++;
            var visible = rendered < shown;
            it.classList.toggle('is-hidden', !visible);
            if (visible) rendered++;
          } else {
            it.classList.add('is-hidden');
          }
        });

        if (counter) counter.innerHTML = '<strong>' + hits + '</strong> ' + (hits === 1 ? 'resultaat' : 'resultaten');
        if (empty)   empty.classList.toggle('is-hidden', hits !== 0);
        if (more)    more.classList.toggle('is-hidden', hits <= rendered);
        if (reset)   reset.classList.toggle('is-hidden', !q && !cat);
      }

      var t;
      on(input, 'input', function () { clearTimeout(t); t = setTimeout(function () { shown = pageSize || items.length; apply(); }, 140); });
      on(select, 'change', function () { shown = pageSize || items.length; apply(); });
      on(reset, 'click', function () {
        if (input) input.value = '';
        if (select) select.value = '';
        shown = pageSize || items.length;
        apply();
        if (input) input.focus();
      });
      on(more, 'click', function () { shown += (pageSize || 12); apply(); });
      on(root, 'submit', function (e) { e.preventDefault(); apply(); });
      apply();
    });
  })();

  /* ---------------------------------------------------------------------------
     Formuliervalidatie + meerstaps offerteformulier
     ------------------------------------------------------------------------- */
  var Validate = {
    postcode: function (v) { return /^[1-9][0-9]{3}\s?[a-zA-Z]{2}$/.test(v.trim()); },
    email:    function (v) { return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v.trim()); },
    tel:      function (v) { return /^(\+31|0031|0)[\s\-]?[1-9](?:[\s\-]?[0-9]){8}$/.test(v.replace(/\s/g, '')); },
    required: function (v) { return v.trim().length > 0; }
  };

  function markError(row, msg) {
    if (!row) return;
    row.classList.add('has-error');
    var e = $('.error', row);
    if (e) { e.textContent = msg; }
    var f = $('input, select, textarea', row);
    if (f) f.setAttribute('aria-invalid', 'true');
  }
  function clearError(row) {
    if (!row) return;
    row.classList.remove('has-error');
    var f = $('input, select, textarea', row);
    if (f) f.removeAttribute('aria-invalid');
  }

  function validateField(field) {
    var row  = field.closest('.form-row') || field.closest('fieldset');
    var val  = field.value || '';
    var rule = field.getAttribute('data-rule');
    var req  = field.hasAttribute('required');

    if (req && !Validate.required(val)) {
      markError(row, field.getAttribute('data-msg-required') || 'Dit veld is verplicht.');
      return false;
    }
    if (val.trim() && rule && Validate[rule] && !Validate[rule](val)) {
      markError(row, field.getAttribute('data-msg-invalid') || 'Controleer dit veld.');
      return false;
    }
    clearError(row);
    return true;
  }

  function validateScope(scope) {
    var ok = true;
    $$('input, select, textarea', scope).forEach(function (f) {
      if (f.type === 'hidden' || f.disabled) return;
      if (f.type === 'radio' || f.type === 'checkbox') return;
      if (!validateField(f)) ok = false;
    });
    // Verplichte radiogroepen
    $$('fieldset[data-required]', scope).forEach(function (fs) {
      var checked = $$('input[type="radio"], input[type="checkbox"]', fs).some(function (r) { return r.checked; });
      if (!checked) { markError(fs, fs.getAttribute('data-msg') || 'Maak een keuze.'); ok = false; }
      else clearError(fs);
    });
    return ok;
  }

  // Live opschonen zodra er getypt wordt
  $$('form input, form select, form textarea').forEach(function (f) {
    on(f, 'input', function () {
      var row = f.closest('.form-row');
      if (row && row.classList.contains('has-error')) validateField(f);
    });
    on(f, 'change', function () {
      var fs = f.closest('fieldset[data-required]');
      if (fs) clearError(fs);
    });
    on(f, 'blur', function () { if ((f.value || '').trim()) validateField(f); });
  });

  (function multistep() {
    $$('[data-multistep]').forEach(function (form) {
      var steps  = $$('.step', form);
      var bar    = $$('.steps-bar li', form);
      var done   = $('.form-done', form.parentNode) || $('.form-done', form);
      var cur    = 0;

      function render() {
        steps.forEach(function (s, i) { s.classList.toggle('is-current', i === cur); });
        bar.forEach(function (b, i) {
          b.classList.toggle('is-current', i === cur);
          b.classList.toggle('is-done', i < cur);
        });
        var first = $('input, select, textarea', steps[cur]);
        if (first && cur > 0) first.focus({ preventScroll: true });
        var top = form.getBoundingClientRect().top + window.scrollY - 110;
        if (window.scrollY > top) window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
      }

      $$('[data-next]', form).forEach(function (btn) {
        on(btn, 'click', function () {
          if (!validateScope(steps[cur])) {
            var bad = $('.has-error input, .has-error select, .has-error textarea', steps[cur]);
            if (bad) bad.focus();
            return;
          }
          if (cur < steps.length - 1) { cur++; render(); }
        });
      });
      $$('[data-prev]', form).forEach(function (btn) {
        on(btn, 'click', function () { if (cur > 0) { cur--; render(); } });
      });

      on(form, 'submit', function (e) {
        e.preventDefault();
        if (!validateScope(steps[cur])) return;

        // Samenvatting opbouwen uit de ingevulde velden
        var data = {};
        $$('input, select, textarea', form).forEach(function (f) {
          if ((f.type === 'radio' || f.type === 'checkbox') && !f.checked) return;
          if (!f.name) return;
          var label = f.closest('.choice') ? $('.label', f.closest('.choice')).textContent.trim() : f.value;
          data[f.name] = data[f.name] ? data[f.name] + ', ' + label : label;
        });

        var target = $('[data-summary]', done);
        if (target) {
          target.innerHTML = Object.keys(data).filter(function (k) { return data[k]; }).map(function (k) {
            return '<div class="listcard-row"><span>' + escapeHtml(labelFor(form, k)) + '</span><strong>' + escapeHtml(data[k]) + '</strong></div>';
          }).join('');
        }
        form.style.display = 'none';
        if (done) { done.classList.add('is-visible'); done.setAttribute('tabindex', '-1'); done.focus(); }
        var ref = $('[data-ref]', done);
        if (ref) ref.textContent = 'HV-' + new Date().getFullYear() + '-' +
          String(Math.floor(Math.random() * 90000) + 10000);
      });

      render();
    });
  })();

  function labelFor(form, name) {
    var map = {
      klus: 'Werkzaamheid', omvang: 'Omvang', wanneer: 'Wanneer', budget: 'Budget',
      postcode: 'Postcode', plaats: 'Plaats', omschrijving: 'Omschrijving',
      naam: 'Naam', email: 'E-mailadres', telefoon: 'Telefoon', aanhef: 'Aanhef'
    };
    return map[name] || name.charAt(0).toUpperCase() + name.slice(1);
  }

  /* ---------------------------------------------------------------------------
     Losse formulieren (nieuwsbrief, snelstart)
     ------------------------------------------------------------------------- */
  (function simpleForms() {
    $$('[data-simple-form]').forEach(function (form) {
      on(form, 'submit', function (e) {
        e.preventDefault();
        if (!validateScope(form)) {
          var bad = $('.has-error input', form);
          if (bad) bad.focus();
          return;
        }
        var msg = $('[data-form-msg]', form) || $('[data-form-msg]', form.parentNode);
        if (msg) {
          msg.classList.add('is-visible');
          msg.setAttribute('role', 'status');
        }
        var btn = $('button[type="submit"]', form);
        if (btn) { btn.disabled = true; btn.textContent = btn.getAttribute('data-done') || 'Verzonden'; }
        $$('input:not([type=hidden])', form).forEach(function (f) { f.value = ''; f.blur(); });
      });
    });
  })();

  (function quickstart() {
    // Snelstart in de hero: geeft de gekozen waarden door aan het offerteformulier
    $$('[data-quickstart]').forEach(function (form) {
      on(form, 'submit', function (e) {
        e.preventDefault();
        if (!validateScope(form)) return;
        var qs = [];
        $$('input, select', form).forEach(function (f) {
          if (f.name && f.value) qs.push(encodeURIComponent(f.name) + '=' + encodeURIComponent(f.value));
        });
        window.location.href = form.getAttribute('action') + (qs.length ? '?' + qs.join('&') : '');
      });
    });

    // Waarden uit de URL overnemen op de aanvraagpagina
    var params = new URLSearchParams(window.location.search);
    if (![].concat(Array.from(params.keys())).length) return;
    params.forEach(function (val, key) {
      var field = document.querySelector('[name="' + key.replace(/"/g, '') + '"]');
      if (!field) return;
      if (field.type === 'radio') {
        var opt = document.querySelector('[name="' + key + '"][value="' + val.replace(/"/g, '') + '"]');
        if (opt) opt.checked = true;
      } else {
        field.value = val;
      }
    });
  })();

  /* ---------------------------------------------------------------------------
     Kostenindicatie
     ------------------------------------------------------------------------- */
  (function calculator() {
    $$('[data-calc]').forEach(function (calc) {
      var area   = $('[data-calc-area]', calc);
      var level  = $$('[data-calc-level]', calc);
      var min    = parseFloat(calc.getAttribute('data-min') || '0');
      var max    = parseFloat(calc.getAttribute('data-max') || '0');
      var unit   = calc.getAttribute('data-unit') || 'm²';
      var outLow = $('[data-calc-low]', calc);
      var outHigh= $('[data-calc-high]', calc);
      var outNote= $('[data-calc-note]', calc);
      if (!area || !outLow) return;

      function fmt(n) {
        return '€ ' + (Math.round(n / 10) * 10).toLocaleString('nl-NL');
      }
      function run() {
        var a = Math.max(1, parseFloat(area.value) || 0);
        var f = 1;
        level.forEach(function (r) { if (r.checked) f = parseFloat(r.getAttribute('data-factor') || '1'); });
        var lo = min * a * f, hi = max * a * f;
        outLow.textContent  = fmt(lo);
        outHigh.textContent = fmt(hi);
        if (outNote) outNote.textContent = a.toLocaleString('nl-NL') + ' ' + unit;
      }
      on(area, 'input', run);
      level.forEach(function (r) { on(r, 'change', run); });
      run();
    });
  })();

  /* ---------------------------------------------------------------------------
     Inhoudsopgave: markeer de zichtbare paragraaf
     ------------------------------------------------------------------------- */
  (function tocSpy() {
    var toc = $('.toc');
    if (!toc || !('IntersectionObserver' in window)) return;
    var links = $$('a[href^="#"]', toc);
    var map = {};
    var targets = links.map(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) map[el.id] = a;
      return el;
    }).filter(Boolean);
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        if (map[en.target.id]) map[en.target.id].classList.add('is-active');
      });
    }, { rootMargin: '-90px 0px -70% 0px', threshold: 0 });
    targets.forEach(function (t) { io.observe(t); });
  })();

  /* ---------------------------------------------------------------------------
     Zwevende knoppen
     ------------------------------------------------------------------------- */
  (function floating() {
    var top = $('.to-top');
    var cta = $('.mobile-cta');
    var ticking = false;
    function update() {
      var y = window.scrollY;
      if (top) top.classList.toggle('is-visible', y > 700);
      if (cta) {
        var footer = $('.site-footer');
        var nearEnd = footer && footer.getBoundingClientRect().top < window.innerHeight;
        cta.classList.toggle('is-visible', y > 500 && !nearEnd);
      }
      ticking = false;
    }
    on(window, 'scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    on(top, 'click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
    update();
  })();

  /* ---------------------------------------------------------------------------
     Cookiemelding (bewaart de keuze in het geheugen van deze sessie)
     ------------------------------------------------------------------------- */
  (function cookiebar() {
    var bar = $('.cookiebar');
    if (!bar) return;
    if (window.__hvCookieChoice) return;
    window.setTimeout(function () { bar.classList.add('is-visible'); }, 900);
    $$('[data-cookie]', bar).forEach(function (btn) {
      on(btn, 'click', function () {
        window.__hvCookieChoice = btn.getAttribute('data-cookie');
        bar.classList.remove('is-visible');
      });
    });
  })();

  /* ---------------------------------------------------------------------------
     Scroll-reveal
     ------------------------------------------------------------------------- */
  (function reveal() {
    var els = $$('.reveal');
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------------------------
     Hulpjes
     ------------------------------------------------------------------------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Jaartal in de footer
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
