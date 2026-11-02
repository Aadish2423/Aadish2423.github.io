(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const isTouch = matchMedia('(hover: none)').matches;

  /* ---------- smooth scroll ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  let lenis = null;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (!reduced && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollToEl = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.4, ...opts });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    else document.querySelector(target)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 && id !== '#') return;
    e.preventDefault();
    scrollToEl(id === '#top' || id === '#' ? 0 : id);
  }));

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const pill = $('.nav-pill');
  const ind = $('.nav-indicator');
  const links = $$('.nav-pill a');
  const moveInd = a => {
    if (!a) { ind.style.opacity = 0; return; }
    const r = a.getBoundingClientRect(), p = pill.getBoundingClientRect();
    ind.style.width = r.width + 'px';
    ind.style.transform = `translateX(${r.left - p.left}px)`;
    ind.style.opacity = 1;
  };
  let activeLink = null;
  links.forEach(a => {
    a.addEventListener('mouseenter', () => moveInd(a));
  });
  pill.addEventListener('mouseleave', () => moveInd(activeLink));
  const sections = links.map(a => $(a.getAttribute('href')));
  const onScrollNav = () => {
    nav.classList.toggle('scrolled', scrollY > 40);
    const mid = innerHeight * 0.45;
    let cur = null;
    sections.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) cur = links[i]; });
    if (cur !== activeLink) { activeLink = cur; if (!pill.matches(':hover')) moveInd(cur); }
  };
  addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- hero intro ---------- */
  if (hasGsap && !reduced) {
    gsap.from('.hero-title .reveal', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.12, delay: 0.15 });
    gsap.from('.reveal-up', { y: 24, opacity: 0, filter: 'blur(8px)', duration: 1.2, ease: 'expo.out', stagger: 0.1, delay: 0.5 });
    gsap.from('.portrait', { y: 80, opacity: 0, duration: 1.6, ease: 'expo.out', delay: 0.3 });
    gsap.from('.float-card, .hero-foot, .badge', { y: 30, opacity: 0, filter: 'blur(10px)', duration: 1.3, ease: 'expo.out', stagger: 0.08, delay: 0.8 });
    gsap.from('.hero-lines path', { strokeDasharray: 800, strokeDashoffset: 800, duration: 2, ease: 'power2.out', delay: 1 });
  }

  /* ---------- portrait fallback ---------- */
  const portrait = $('#portrait');
  portrait.addEventListener('error', () => {
    portrait.src = 'assets/trek.webp';
    portrait.classList.add('framed');
  }, { once: true });

  /* ---------- hero orbit (glass cards circling the portrait) ---------- */
  const visual = $('#heroVisual');
  const orbCards = $$('.orb-card');
  const hero = $('#hero');
  let heroP = 0;               // 0..1 scroll progress through hero
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  if (!isTouch) addEventListener('pointermove', e => {
    tmx = (e.clientX / innerWidth - 0.5) * 2;
    tmy = (e.clientY / innerHeight - 0.5) * 2;
  });
  const floatCards = $$('.float-card');
  let orbitT = 0, last = performance.now(), heroVisible = true;
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; }).observe(hero);

  function renderOrbit(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!heroVisible) return;
    if (!reduced) orbitT += dt * 0.16;
    mx = lerp(mx, tmx, 0.06); my = lerp(my, tmy, 0.06);
    const w = visual.clientWidth, h = visual.clientHeight;
    const n = orbCards.length;
    const spread = 1 + heroP * 1.4;
    const Rx = w * (innerWidth < 760 ? 0.4 : 0.37) * spread;
    const Ry = h * 0.2 * (1 + heroP * 0.6);
    const tilt = -0.09 + my * 0.04;
    orbCards.forEach((c, i) => {
      const a = orbitT + (i / n) * Math.PI * 2 + mx * 0.25;
      const z = Math.cos(a);                 // 1 = front, -1 = back
      const x = Math.sin(a) * Rx;
      const y = z * Ry + x * tilt - heroP * h * 0.25;
      const s = (0.74 + 0.26 * (z + 1) / 2) * (1 + heroP * 0.25);
      const blur = Math.max(0, -z) * 2.2 + heroP * 10;
      const op = (0.3 + 0.7 * (z + 1) / 2) * (1 - heroP * 0.9);
      c.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) perspective(700px) rotateY(${(Math.sin(a) * 38).toFixed(1)}deg) scale(${s.toFixed(3)})`;
      c.style.zIndex = z > 0 ? 20 : 5;
      c.style.opacity = op.toFixed(3);
      c.style.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none';
    });
    floatCards.forEach(c => {
      const d = +c.dataset.depth;
      c.style.translate = `${(mx * d).toFixed(1)}px ${(my * d - heroP * d * 6).toFixed(1)}px`;
      c.style.filter = heroP > 0.02 ? `blur(${(heroP * 8).toFixed(1)}px)` : 'none';
      c.style.opacity = (1 - heroP * 1.2).toFixed(3);
    });
    portrait.style.transform = `translateX(-50%) translate(${(mx * -6).toFixed(1)}px, ${(heroP * 60).toFixed(1)}px) scale(${(1 - heroP * 0.08).toFixed(3)})`;
  }

  if (hasGsap) {
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top',
      onUpdate: self => { heroP = self.progress; }
    });
    if (!reduced) gsap.to('.hero-copy', {
      yPercent: -30, opacity: 0, filter: 'blur(10px)', ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: '70% top', scrub: true }
    });
  }

  /* ---------- 3D tile tunnel (canvas) ---------- */
  class Tunnel {
    constructor(canvas, { images = [], count = 40, outline = false, speed = 0.12, clear = 0.32, color = '0,0,0' } = {}) {
      this.c = canvas; this.ctx = canvas.getContext('2d');
      this.outline = outline; this.speed = speed; this.boost = 0; this.clear = clear; this.color = color;
      this.imgs = images.map(src => { const im = new Image(); im.src = src; return im; });
      this.tiles = Array.from({ length: count }, () => this.spawn(Math.random()));
      this.visible = false; this.last = 0;
      this.resize(); addEventListener('resize', () => this.resize());
      new IntersectionObserver(([en]) => { this.visible = en.isIntersecting; }).observe(canvas);
    }
    spawn(z = 1) {
      const ang = Math.random() * Math.PI * 2;
      const r = this.clear + Math.random() * (1.25 - this.clear);
      return {
        x: Math.cos(ang) * r * 1.35, y: Math.sin(ang) * r, z,
        rot: (Math.random() - 0.5) * 0.7, spin: (Math.random() - 0.5) * 0.3,
        ar: [1, 1, 1.33, 0.75, 1.5][Math.floor(Math.random() * 5)],
        img: this.imgs.length ? this.imgs[Math.floor(Math.random() * this.imgs.length)] : null,
        size: 0.6 + Math.random() * 0.6
      };
    }
    resize() {
      const dpr = Math.min(2, devicePixelRatio || 1);
      const r = this.c.getBoundingClientRect();
      this.w = r.width; this.h = r.height;
      this.c.width = Math.round(r.width * dpr); this.c.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    frame(now) {
      const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
      if (!this.visible) return;
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      const v = reduced ? 0 : (this.speed + this.boost);
      this.boost *= 0.94;
      const spread = Math.min(w, h) * 0.42;
      const base = Math.min(w, h) * 0.075;
      this.tiles.forEach(t => {
        t.z -= v * dt; t.rot += t.spin * dt * (reduced ? 0 : 1);
        if (t.z <= 0.04) Object.assign(t, this.spawn(1));
      });
      this.tiles.sort((a, b) => b.z - a.z);
      for (const t of this.tiles) {
        const px = w / 2 + (t.x * spread) / t.z;
        const py = h / 2 + (t.y * spread) / t.z;
        const s = (base * t.size) / t.z;
        const tw = s * Math.sqrt(t.ar), th = s / Math.sqrt(t.ar);
        if (px + tw < -50 || px - tw > w + 50 || py + th < -50 || py - th > h + 50) continue;
        let a = clamp((1 - t.z) * 2.5, 0, 1);
        if (t.z < 0.18) a *= t.z / 0.18;
        if (a <= 0.01) continue;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(px, py); ctx.rotate(t.rot);
        const rr = Math.min(tw, th) * 0.12;
        ctx.beginPath(); ctx.roundRect(-tw / 2, -th / 2, tw, th, rr);
        if (this.outline || !t.img || !t.img.complete || !t.img.naturalWidth) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${this.color},.22)`;
          ctx.fillStyle = `rgba(255,255,255,${this.outline ? 0.35 : 0.06})`;
          ctx.fill(); ctx.stroke();
        } else {
          ctx.clip();
          const im = t.img, iar = im.naturalWidth / im.naturalHeight, tar = tw / th;
          let sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0;
          if (iar > tar) { sw = sh * tar; sx = (im.naturalWidth - sw) / 2; } else { sh = sw / tar; sy = (im.naturalHeight - sh) / 2; }
          ctx.drawImage(im, sx, sy, sw, sh, -tw / 2, -th / 2, tw, th);
          // depth haze
          ctx.fillStyle = `rgba(11,11,12,${clamp(t.z * 0.7, 0, 0.6)})`;
          ctx.fillRect(-tw / 2, -th / 2, tw, th);
        }
        ctx.restore();
      }
    }
  }

  const heroField = new Tunnel($('#heroField'), { count: 34, outline: true, speed: 0.05, clear: 0.55, color: '15,15,16' });
  const lifeTunnel = new Tunnel($('#tunnel'), {
    count: 46, speed: 0.11, clear: 0.42,
    images: ['assets/liberty.webp', 'assets/niagara.webp', 'assets/celebration.webp', 'assets/trek.webp', 'assets/sports.webp', 'assets/portrait.webp', 'assets/zoom-trader.webp', 'assets/rai.webp', 'assets/ai-assistant.webp']
  });
  if (hasGsap) ScrollTrigger.create({
    trigger: '#life', start: 'top bottom', end: 'bottom top',
    onUpdate: self => { lifeTunnel.boost = Math.min(1.2, lifeTunnel.boost + Math.abs(self.getVelocity()) / 9000); }
  });

  const loop = now => {
    renderOrbit(now);
    heroField.frame(now);
    lifeTunnel.frame(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  /* ---------- about: word reveal, counters, photo fan ---------- */
  const st = $('#statement');
  const wrapWords = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1) wrapWords(ch);
    });
  };
  wrapWords(st);
  const words = $$('.w', st);
  if (hasGsap && !reduced) {
    ScrollTrigger.create({
      trigger: st, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: self => {
        const k = self.progress * words.length;
        words.forEach((w, i) => { w.style.opacity = i < k ? 1 : 0.14; });
      }
    });
  } else words.forEach(w => (w.style.opacity = 1));

  $$('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count), suf = el.dataset.suffix || '';
    const dec = el.dataset.count.includes('.') ? 1 : 0;
    const fmt = v => (target >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec)) + suf;
    if (!hasGsap || reduced) { el.textContent = fmt(target); return; }
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = fmt(o.v))
    });
  });

  const fan = $('#photoFan');
  if (!reduced) {
    fan.classList.add('stacked');
    new IntersectionObserver(([en], ob) => {
      if (en.isIntersecting) { setTimeout(() => fan.classList.remove('stacked'), 150); ob.disconnect(); }
    }, { threshold: 0.35 }).observe(fan);
  }

  /* ---------- work wheel ---------- */
  const wheel = $('#wheel');
  const N = PROJECTS.length;
  const pad = n => String(n).padStart(2, '0');
  $('#workCount').textContent = `(${pad(N)})`;
  $('#workTotal').textContent = pad(N);

  const coverHTML = (p, big) => {
    const c = p.cover;
    const inner = c.art ? ART[c.art] : `<img src="${c.img}" alt="" class="${c.fit === 'contain' ? 'contain' : ''}" loading="lazy">`;
    return `<div class="${big ? '' : 'cover'}" style="background:${c.bg};${big ? 'position:absolute;inset:0' : ''}">${inner}</div>`;
  };
  const cards = PROJECTS.map((p, i) => {
    const b = document.createElement('button');
    b.className = 'w-card';
    b.type = 'button';
    b.setAttribute('aria-label', `${p.title}: open case study`);
    b.innerHTML = `${coverHTML(p)}<div class="meta"><span>${p.title}</span><small>${pad(i + 1)}</small></div>`;
    b.addEventListener('click', () => {
      if (i === active) openDrawer(i);
      else goTo(i);
    });
    wheel.appendChild(b);
    return b;
  });

  const info = $('#workInfo');
  let active = -1, wheelF = 0, workST = null;
  const setActive = i => {
    if (i === active) return;
    active = i;
    const p = PROJECTS[i];
    $('#wiKicker').textContent = p.kicker;
    $('#wiTitle').textContent = p.title;
    $('#wiDesc').textContent = p.short;
    $('#wiTags').innerHTML = p.tags.map(t => `<span>${t}</span>`).join('');
    $('#workIndex').textContent = pad(i + 1);
    info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
  };
  const renderWheel = () => {
    const step = innerWidth < 760 ? 21 : 15;
    const R = parseFloat(getComputedStyle(wheel).getPropertyValue('--R'));
    cards.forEach((c, i) => {
      const d = i - wheelF;
      const ang = d * step;
      const near = Math.max(0, 1 - Math.abs(d));
      const s = 0.86 + near * 0.24;
      c.style.transform = `rotate(${ang.toFixed(2)}deg) translateY(${-R}px) scale(${s.toFixed(3)})`;
      c.style.zIndex = 100 - Math.round(Math.abs(d) * 10);
      c.style.opacity = clamp(1.4 - Math.abs(ang) / 55, 0, 1).toFixed(3);
      c.style.filter = Math.abs(d) > 0.6 ? `saturate(${(1 - Math.min(0.6, Math.abs(d) * 0.15)).toFixed(2)})` : 'none';
    });
    $('#workBar').style.transform = `scaleX(${(N > 1 ? wheelF / (N - 1) : 1).toFixed(3)})`;
  };
  const goTo = i => {
    if (workST) {
      const y = workST.start + (workST.end - workST.start) * (i / (N - 1)) + 1;
      scrollToEl(y, { duration: 1.1 });
    } else { wheelF = i; setActive(i); renderWheel(); }
  };
  setActive(0); renderWheel();
  if (hasGsap) {
    workST = ScrollTrigger.create({
      trigger: '#workStage', start: 'top top', end: () => `+=${innerHeight * (N - 1) * 0.55}`,
      pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      snap: reduced ? false : { snapTo: 1 / (N - 1), duration: { min: 0.2, max: 0.6 }, delay: 0.08, ease: 'power2.inOut' },
      onUpdate: self => {
        wheelF = self.progress * (N - 1);
        setActive(clamp(Math.round(wheelF), 0, N - 1));
        renderWheel();
      }
    });
  }
  addEventListener('resize', renderWheel);
  $('#wiOpen').addEventListener('click', () => openDrawer(active));

  /* ---------- case study drawer ---------- */
  const drawer = $('#drawer');
  const panel = $('.drawer-panel');
  let drawerIdx = 0, lastFocus = null;
  function fillDrawer(i) {
    const p = PROJECTS[i];
    drawerIdx = i;
    $('#dCover').innerHTML = coverHTML(p, true).replace('class=""', '');
    const img = $('#dCover img'); if (img && p.cover.fit === 'contain') img.classList.add('contain');
    $('#dKicker').textContent = `${pad(i + 1)} / ${pad(N)} · ${p.kicker}`;
    $('#dTitle').textContent = p.title;
    $('#dLead').textContent = p.lead;
    $('#dMetrics').innerHTML = p.metrics.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
    $('#dBuilt').innerHTML = p.built.map(x => `<li>${x}</li>`).join('');
    $('#dFlow').innerHTML = p.flow.map(x => `<span>${x}</span>`).join('<i>→</i>');
    $('#dNote').textContent = p.note;
    $('#dStack').innerHTML = p.stack.map(x => `<span>${x}</span>`).join('');
    $('#dActions').innerHTML = `<a class="btn btn-dark" href="${p.repo}" target="_blank" rel="noopener">View on GitHub <span class="arrow-ne">↗</span></a>`;
    $('#drawerScroll').scrollTop = 0;
  }
  function openDrawer(i) {
    lastFocus = document.activeElement;
    fillDrawer(i);
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    lenis?.stop();
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => panel.focus(), 50);
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    lenis?.start();
    document.documentElement.style.overflow = '';
    lastFocus?.focus?.({ preventScroll: true });
  }
  $$('[data-close]', drawer).forEach(el => el.addEventListener('click', closeDrawer));
  $('#dPrev').addEventListener('click', () => fillDrawer((drawerIdx - 1 + N) % N));
  $('#dNext').addEventListener('click', () => fillDrawer((drawerIdx + 1) % N));
  addEventListener('keydown', e => {
    if (!drawer.classList.contains('open')) return;
    if (e.key === 'Escape') closeDrawer();
    if (e.key === 'ArrowRight') fillDrawer((drawerIdx + 1) % N);
    if (e.key === 'ArrowLeft') fillDrawer((drawerIdx - 1 + N) % N);
    if (e.key === 'Tab') {
      const f = $$('button, a[href]', panel).filter(el => el.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- experience reveal ---------- */
  if (hasGsap && !reduced) {
    $$('.xp').forEach(x => gsap.from(x, {
      y: 40, opacity: 0, filter: 'blur(8px)', duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: x, start: 'top 88%' }
    }));
    gsap.from('.contact-title', {
      y: 60, opacity: 0, filter: 'blur(12px)', duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: '.contact-title', start: 'top 85%' }
    });
  }

  /* ---------- copy email ---------- */
  const toast = $('#toast');
  const showToast = msg => {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove('show'), 2200);
  };
  $('#copyEmail').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('aadishbane23022005@gmail.com'); showToast('Email copied'); }
    catch { showToast('aadishbane23022005@gmail.com'); }
  });

  /* ---------- magnetic buttons ---------- */
  if (!isTouch && !reduced) $$('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  addEventListener('load', () => hasGsap && ScrollTrigger.refresh());
})();
