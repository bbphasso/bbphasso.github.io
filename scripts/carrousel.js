/**
 * carrousel.js — Composant carrousel autonome
 *
 * Usage minimal :
 *   createcarrousel('#mon-conteneur', ['img1.jpg', 'img2.jpg']);
 *
 * Usage complet :
 *   createcarrousel('#mon-conteneur', [
 *     { src: 'img1.jpg', caption: 'Légende 1', alt: 'Description 1' },
 *     { src: 'img2.jpg', caption: 'Légende 2' },
 *     'img3.jpg'                              // forme courte acceptée
 *   ], {
 *     autoplay:    5000,   // ms entre slides (0 = désactivé)
 *     loop:        true,   // boucle infinie
 *     thumbnails:  true,   // bande de miniatures
 *     dots:        true,   // points de navigation
 *     arrows:      true,   // boutons précédent / suivant
 *     counter:     true,   // "1 / N"
 *     keyboard:    true,   // touches ← →
 *     swipe:       true,   // swipe tactile
 *   });
 *
 * L'appel retourne un objet API :
 *   const c = createcarrousel(...);
 *   c.goTo(2);      // aller au slide 2 (0-indexé)
 *   c.next();
 *   c.prev();
 *   c.play();
 *   c.pause();
 *   c.destroy();    // nettoie les listeners et vide le conteneur
 */

(function (global) {
  'use strict';

  /* ── Icônes SVG inline ─────────────────────────────────── */
  const SVG_PREV = `<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`;
  const SVG_NEXT = `<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`;

  /* ── Normalisation des slides ──────────────────────────── */
  function normalizeSlides(raw) {
    return raw.map((item) => {
      if (typeof item === 'string') return { src: item, caption: '', alt: '' };
      return { src: item.src || '', caption: item.caption || '', alt: item.alt || item.caption || '' };
    });
  }

  /* ── Options par défaut ────────────────────────────────── */
  const DEFAULTS = {
    autoplay:   0,
    loop:       true,
    thumbnails: true,
    dots:       true,
    arrows:     true,
    counter:    true,
    keyboard:   true,
    swipe:      true,
  };

  /* ── Constructeur principal ────────────────────────────── */
  function createCarrousel(selector, rawImages, userOptions) {
    const root = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!root) { console.warn('[Carrousel] Conteneur introuvable :', selector); return null; }
    if (!rawImages || rawImages.length === 0) { console.warn('[Carrousel] Aucune image fournie.'); return null; }

    const opts   = Object.assign({}, DEFAULTS, userOptions);
    const slides = normalizeSlides(rawImages);
    const n      = slides.length;

    let current   = 0;
    let autoTimer = null;
    let progTimer = null;
    let destroyed = false;

    /* ── Construire le DOM ─────────────────────────────────── */
    root.classList.add('carrousel-wrapper');
    root.innerHTML = '';

    // Scène
    const stage = el('div', 'carrousel-stage');

    // Skeleton
    const skeleton = el('div', 'carrousel-skeleton');
    stage.appendChild(skeleton);

    // Images
    const imgs = slides.map((slide, i) => {
      const img = new Image();
      img.alt = slide.alt;
      img.className = i === 0 ? 'is-active' : '';
      img.onload = () => { if (i === 0) skeleton.remove(); };
      img.src = slide.src;          // déclenche le chargement
      stage.appendChild(img);
      return img;
    });

    // Caption
    const caption = el('div', 'carrousel-caption');
    caption.textContent = slides[0].caption;
    stage.appendChild(caption);

    // Boutons
    if (opts.arrows) {
      const btnPrev = makeBtn('carrousel-btn carrousel-btn--prev', SVG_PREV, 'Précédent');
      const btnNext = makeBtn('carrousel-btn carrousel-btn--next', SVG_NEXT, 'Suivant');
      btnPrev.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); stop(); prev();});
      btnNext.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); stop(); prev();});
      stage.appendChild(btnPrev);
      stage.appendChild(btnNext);
    }

    // Compteur
    const counter = opts.counter ? el('div', 'carrousel-counter') : null;
    if (counter) stage.appendChild(counter);

    // Barre de progression
    const progress = el('div', 'carrousel-progress');
    stage.appendChild(progress);

    root.appendChild(stage);

    // Points
    let dotEls = [];
    if (opts.dots && n > 1) {
      const dotsWrap = el('div', 'carrousel-dots');
      dotEls = slides.map((_, i) => {
        const d = el('button', i === 0 ? 'carrousel-dot is-active' : 'carrousel-dot');
        d.setAttribute('aria-label', `Slide ${i + 1}`);
        d.addEventListener('click', () => { stop(); goTo(i); });
        dotsWrap.appendChild(d);
        return d;
      });
      root.appendChild(dotsWrap);
    }

    // Bande miniatures
    let thumbEls = [];
    if (opts.thumbnails && n > 1) {
      const strip = el('div', 'carrousel-strip');
      thumbEls = slides.map((slide, i) => {
        const thumb = el('div', i === 0 ? 'carrousel-thumb is-active' : 'carrousel-thumb');
        const tImg  = new Image();
        tImg.src = slide.src;
        tImg.alt = slide.alt;
        tImg.loading = 'lazy';
        thumb.appendChild(tImg);
        thumb.addEventListener('click', () => { stop(); goTo(i); });
        strip.appendChild(thumb);
        return thumb;
      });
      root.appendChild(strip);
    }

    /* ── Mise à jour de l'UI ─────────────────────────────── */
    function updateUI(from, to) {
      // direction pour la transition
      const dir = to > from ? 'right' : 'left';

      imgs[from].classList.add(dir === 'right' ? 'slide-in-left' : 'slide-in-right');
      imgs[from].classList.remove('is-active');
      requestAnimationFrame(() => imgs[from].classList.remove('slide-in-left', 'slide-in-right'));

      imgs[to].classList.add(dir === 'right' ? 'slide-in-right' : 'slide-in-left');
      requestAnimationFrame(() => {
        imgs[to].classList.add('is-active');
        imgs[to].classList.remove('slide-in-right', 'slide-in-left');
      });

      // caption
      caption.textContent = slides[to].caption;

      // counter
      if (counter) counter.textContent = `${to + 1} / ${n}`;

      // dots
      dotEls.forEach((d, i) => d.classList.toggle('is-active', i === to));

      // thumbs
      thumbEls.forEach((t, i) => {
          t.classList.toggle('is-active', i === to);

          if (i === to) {
              const strip = t.parentElement;

              strip.scrollTo({
                  left: t.offsetLeft - strip.offsetWidth / 2 + t.offsetWidth / 2,
                  behavior: 'smooth'
              });
          }
      });
    }

    /* ── Navigation ─────────────────────────────────────── */
    function goTo(idx) {
      if (idx === current) return;
      const prev = current;
      current = ((idx % n) + n) % n;
      updateUI(prev, current);
      if (opts.autoplay > 0) startProgress();
    }

    function next() { goTo(opts.loop ? (current + 1) % n : Math.min(current + 1, n - 1)); }
    function prev() { goTo(opts.loop ? (current - 1 + n) % n : Math.max(current - 1, 0)); }

    /* ── Auto-play ──────────────────────────────────────── */
    function play() {
      if (opts.autoplay <= 0 || n < 2) return;
      stop();
      autoTimer = setInterval(next, opts.autoplay);
      startProgress();
    }

    function stop() {
      clearInterval(autoTimer);
      clearTimeout(progTimer);
      autoTimer = null;
      progress.style.width = '0%';
      progress.classList.remove('running');
    }

    function startProgress() {
      progress.classList.remove('running');
      progress.style.width = '0%';
      // Force reflow
      void progress.offsetWidth;
      progress.classList.add('running');
      progress.style.transitionDuration = opts.autoplay + 'ms';
      progress.style.width = '100%';
    }

    /* ── Swipe tactile ──────────────────────────────────── */
    if (opts.swipe) {
      let sx = 0;
      stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 40) { stop(); dx < 0 ? next() : prev(); }
      }, { passive: true });
    }

    /* ── Clavier ────────────────────────────────────────── */
    function onKey(e) {
      if (e.key === 'ArrowRight') { stop(); next(); }
      if (e.key === 'ArrowLeft')  { stop(); prev(); }
    }
    if (opts.keyboard) document.addEventListener('keydown', onKey);

    /* ── Pause au survol ────────────────────────────────── */
    stage.addEventListener('mouseenter', () => { if (autoTimer) stop(); });
    stage.addEventListener('mouseleave', () => { if (opts.autoplay > 0) play(); });

    /* ── Init ───────────────────────────────────────────── */
    if (counter) counter.textContent = `1 / ${n}`;
    if (opts.autoplay > 0) play();

    /* ── destroy() ──────────────────────────────────────── */
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      if (opts.keyboard) document.removeEventListener('keydown', onKey);
      root.innerHTML = '';
      root.classList.remove('carrousel-wrapper');
    }

    /* ── API publique ───────────────────────────────────── */
    return { goTo, next, prev, play, stop, pause: stop, destroy };
  }

  /* ── Helpers DOM ────────────────────────────────────────── */
  function el(tag, className) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  function makeBtn(className, svgHTML, label) {
    const btn = el('button', className);
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.innerHTML = svgHTML;
    return btn;
  }

  /* ── Export ─────────────────────────────────────────────── */
  global.createCarrousel = createCarrousel;

}(typeof window !== 'undefined' ? window : this));
