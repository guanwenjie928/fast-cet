/* ============================================
   Fast CET — Animation Orchestrator (animations.js)
   All GSAP entrance animations, scroll triggers,
   text reveals, particles, and interactive effects
   ============================================ */

/* ── Text Reveal System ── */
const TextReveal = {
  /**
   * Split text into characters and animate each in
   * @param {string} selector - CSS selector for text elements
   * @param {object} options - { stagger, duration, ease, fromY }
   */
  charReveal(selector, options = {}) {
    const defaults = {
      stagger: 0.04,
      duration: 0.7,
      ease: EASE.hero,
      fromY: 40,
    };
    const opts = { ...defaults, ...options };

    const els = document.querySelectorAll(selector);
    els.forEach(el => {
      const text = el.textContent;
      el.textContent = '';

      // Split into characters, keep punctuation attached to previous char
      const chars = [];
      for (let i = 0; i < text.length; i++) {
        chars.push(text[i]);
      }

      chars.forEach(ch => {
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch;
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.transform = `translateY(${opts.fromY}px)`;
        el.appendChild(span);
      });

      gsap.to(el.querySelectorAll('.char'), {
        opacity: 1,
        y: 0,
        duration: opts.duration,
        stagger: opts.stagger,
        ease: opts.ease,
      });
    });
  },

  /**
   * Split text into words and animate each in
   */
  wordReveal(selector, options = {}) {
    const defaults = {
      stagger: 0.08,
      duration: 0.6,
      ease: 'expo.out',
      fromY: 60,
    };
    const opts = { ...defaults, ...options };

    const els = document.querySelectorAll(selector);
    els.forEach(el => {
      const words = el.textContent.split(/\s+/);
      el.textContent = '';

      words.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = word;
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.transform = `translateY(${opts.fromY}px)`;
        el.appendChild(span);

        // Add space after each word (except last)
        if (i < words.length - 1) {
          el.appendChild(document.createTextNode(' '));
        }
      });

      gsap.to(el.querySelectorAll('.word'), {
        opacity: 1,
        y: 0,
        duration: opts.duration,
        stagger: opts.stagger,
        ease: opts.ease,
      });
    });
  },

  /**
   * Clip-path line reveal (bottom-to-top)
   */
  lineReveal(selector, options = {}) {
    const defaults = {
      duration: 1.0,
      ease: 'power4.inOut',
      scrollStart: 'top 85%',
    };
    const opts = { ...defaults, ...options };

    gsap.fromTo(selector,
      { clipPath: 'inset(0 0 100% 0)' },
      {
        clipPath: 'inset(0 0 0% 0)',
        duration: opts.duration,
        ease: opts.ease,
        scrollTrigger: {
          trigger: selector,
          start: opts.scrollStart,
          once: true,
        },
      }
    );
  },
};

/* ── Particle System ── */
function createParticles(count = 20) {
  const container = document.getElementById('heroParticles');
  if (!container) return;

  const colors = ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-accent)'];
  const sizes = [3, 4, 5, 6];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const animDuration = 6 + Math.random() * 6; // 6-12s
    const animDelay = Math.random() * 5;         // 0-5s
    const animType = (i % 3) + 1;                 // 3 keyframe variants

    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${left}%;
      top: ${top}%;
      animation: particle-float-${animType} ${animDuration}s ease-in-out infinite;
      animation-delay: ${animDelay}s;
    `;

    container.appendChild(particle);
  }
}

/* ── CTA Sparkles ── */
function createSparkles(selector, count = 5) {
  const container = document.querySelector(selector);
  if (!container) return;

  for (let i = 0; i < count; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'cta-sparkle';
    sparkle.style.cssText = `
      top: ${20 + Math.random() * 60}%;
      left: ${10 + Math.random() * 80}%;
      animation-delay: ${Math.random() * 1.5}s;
      animation-duration: ${1.5 + Math.random() * 1.5}s;
    `;
    container.appendChild(sparkle);
  }
}

/* ── Cursor Glow ── */
function initCursorGlow() {
  const glow = document.getElementById('heroGlow');
  const hero = document.getElementById('hero');
  if (!glow || !hero) return;

  const quickX = gsap.quickTo(glow, 'x', { duration: 0.15, ease: 'power2.out' });
  const quickY = gsap.quickTo(glow, 'y', { duration: 0.15, ease: 'power2.out' });

  hero.addEventListener('mousemove', (e) => {
    quickX(e.clientX);
    quickY(e.clientY);
    glow.classList.add('is-visible');
  });

  hero.addEventListener('mouseleave', () => {
    glow.classList.remove('is-visible');
  });
}

/* ── ========== 1. Hero Entrance Timeline ========== ── */
function initHeroAnimations() {
  const tl = gsap.timeline({ defaults: { ease: EASE.hero } });

  // 1.1 Floating shapes entrance
  tl.fromTo('.hero__shape',
    { opacity: 0, scale: 0.5, rotation: -30 },
    { opacity: '', scale: 1, rotation: 0, duration: 1.5, stagger: 0.1, ease: 'power4.out' }
  );

  // 1.2 Start autonomous drift
  tl.add(() => {
    if (typeof ParallaxEngine !== 'undefined') {
      ParallaxEngine.initAutonomousDrift('.hero__shape');
    }
  }, '-=0.8');

  // 1.3 Title reveals
  tl.add(() => {
    TextReveal.charReveal('.hero__title-line:first-child', { stagger: 0.04, duration: 0.7 });
  }, '-=0.5');

  tl.add(() => {
    TextReveal.wordReveal('.hero__title-line:last-child', { stagger: 0.08, duration: 0.6 });
  }, '-=0.3');

  // 1.4 Subtitle fade-up
  tl.fromTo('.hero__subtitle',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.8 },
    '-=0.4'
  );

  // 1.5 CTA buttons bounce in
  tl.fromTo('.hero__cta .btn-primary',
    { opacity: 0, y: 40, scale: 0.8 },
    { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: EASE.bounce },
    '-=0.2'
  );

  tl.fromTo('.hero__cta .btn-outline',
    { opacity: 0, y: 40, scale: 0.8 },
    { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: EASE.bounce },
    '-=0.6'
  );

  // 1.6 Scroll indicator
  tl.fromTo('.hero__scroll-indicator',
    { opacity: 0 },
    { opacity: 1, duration: 0.6 },
    '-=0.2'
  );

  // 1.7 Create particles
  tl.add(() => createParticles(), '-=0.3');

  // 1.8 Init cursor glow
  tl.add(() => initCursorGlow());
}

/* ── ========== 2. Hero Scroll Parallax (Scrub) ========== ── */
function initHeroParallax() {
  if (typeof ScrollTrigger === 'undefined') return;

  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
    onUpdate: (self) => {
      const progress = self.progress;
      gsap.to('.hero__content', {
        y: progress * -80,
        opacity: 1 - progress * 0.6,
        scale: 1 - progress * 0.05,
        duration: 0,
        overwrite: 'auto',
      });
      // Floating shapes move at different rates
      gsap.to('.hero__shape--1', { y: progress * 100, duration: 0, overwrite: 'auto' });
      gsap.to('.hero__shape--2', { y: progress * -80, duration: 0, overwrite: 'auto' });
      gsap.to('.hero__shape--3', { y: progress * 150, duration: 0, overwrite: 'auto' });
      gsap.to('.hero__shape--4', { y: progress * -60, duration: 0, overwrite: 'auto' });
      gsap.to('.hero__shape--5', { y: progress * 120, duration: 0, overwrite: 'auto' });
      gsap.to('.hero__shape--6', { y: progress * -100, duration: 0, overwrite: 'auto' });
    },
  });
}

/* ── ========== 3. Stats Section ========== ── */
function initStatsAnimations() {
  if (typeof ScrollTrigger === 'undefined') return;

  // Trigger counters on enter
  ScrollTrigger.create({
    trigger: '#stats',
    start: 'top 80%',
    onEnter: () => {
      if (typeof CounterEngine !== 'undefined') {
        CounterEngine.animateAll();
      }
    },
  });

  // Clip-path reveal: center → edges
  gsap.fromTo('#stats',
    { clipPath: 'inset(0 50% 0 50%)' },
    {
      clipPath: 'inset(0 0% 0 0%)',
      duration: 1,
      ease: EASE.reveal,
      scrollTrigger: {
        trigger: '#stats',
        start: 'top 80%',
        once: true,
      },
    }
  );

  // Cards staggered entrance
  gsap.fromTo('.stat-card',
    { y: 60, opacity: 0, scale: 0.9 },
    {
      y: 0, opacity: 1, scale: 1,
      duration: 0.7, stagger: 0.15, ease: EASE.card,
      scrollTrigger: {
        trigger: '#stats',
        start: 'top 75%',
        once: true,
      },
    }
  );
}

/* ── ========== 4. Bento Grid ========== ── */
function initBentoAnimations() {
  if (typeof ScrollTrigger === 'undefined') return;

  const bentoTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.bento-grid',
      start: 'top 75%',
      once: true,
    },
  });

  // 4.1 Card staggered entrance (with 3D rotation)
  bentoTl.fromTo('.bento-card',
    { y: 80, opacity: 0, scale: 0.85, rotateY: 15, rotateX: -10 },
    {
      y: 0, opacity: 1, scale: 1, rotateY: 0, rotateX: 0,
      duration: 0.8, stagger: 0.12, ease: EASE.card,
    }
  );

  // 4.2 Card titles fade in
  bentoTl.fromTo('.bento-card__title',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
    '-=0.4'
  );

  // 4.3 Init 3D tilt + glow for bento cards
  if (typeof ParallaxEngine !== 'undefined') {
    ParallaxEngine.initCardTilt('.bento-card');
    ParallaxEngine.initCardGlow('.bento-card');
  }

  // 4.4 Pin the bento grid briefly
  ScrollTrigger.create({
    trigger: '.bento-grid',
    start: 'top center',
    end: '+=300',
    pin: true,
    pinSpacing: true,
  });
}

/* ── ========== 5. Learning Path Timeline ========== ── */
function initTimelineAnimations() {
  if (typeof ScrollTrigger === 'undefined') return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.learning-path',
      start: 'top 70%',
      once: true,
    },
  });

  // 5.1 Connecting line extends from left
  tl.fromTo('.learning-path__line',
    { scaleY: 0, transformOrigin: 'top center' },
    { scaleY: 1, duration: 1, ease: EASE.reveal }
  );

  // 5.2 Step nodes bounce in
  tl.fromTo('.learning-path__step',
    { x: -60, opacity: 0, scale: 0.5 },
    { x: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.25, ease: EASE.bounce },
    '-=0.3'
  );

  // 5.3 Node pulse rings (infinite)
  tl.add(() => {
    document.querySelectorAll('.learning-path__step').forEach((step, i) => {
      const ring = step.querySelector('.step__ring');
      if (!ring) return;
      gsap.to(ring, {
        scale: 1.5,
        opacity: 0,
        duration: 1.5,
        repeat: -1,
        delay: i * 0.25 + 1.5,
        ease: 'power2.out',
      });
    });
  });
}

/* ── ========== 6. Marquee ========== ── */
function initMarquee() {
  const marqueeEl = document.querySelector('.marquee');
  if (!marqueeEl) return;

  const track = marqueeEl.querySelector('.marquee__track');
  if (!track) return;

  // Clone items for seamless loop
  const items = track.querySelectorAll('.marquee__item');
  items.forEach(item => {
    const clone = item.cloneNode(true);
    track.appendChild(clone);
  });

  // GSAP infinite marquee
  gsap.to(track, {
    xPercent: -50,
    repeat: -1,
    duration: 30,
    ease: 'none',
  });

  // Slow down on hover
  const marqueeTween = gsap.getTweensOf(track)[0];
  marqueeEl.addEventListener('mouseenter', () => {
    if (marqueeTween) gsap.to(marqueeTween, { timeScale: 0.3, duration: 0.5 });
  });
  marqueeEl.addEventListener('mouseleave', () => {
    if (marqueeTween) gsap.to(marqueeTween, { timeScale: 1, duration: 0.5 });
  });
}

/* ── ========== 7. CTA Section ========== ── */
function initCTAAnimations() {
  if (typeof ScrollTrigger === 'undefined') return;

  // 7.1 Section bounce in
  gsap.fromTo('.cta-section',
    { scale: 0.85, opacity: 0 },
    {
      scale: 1, opacity: 1,
      duration: 1, ease: EASE.bounce,
      scrollTrigger: {
        trigger: '.cta-section',
        start: 'top 80%',
        once: true,
      },
    }
  );

  // 7.2 Title char reveal on enter
  ScrollTrigger.create({
    trigger: '.cta-section',
    start: 'top 80%',
    once: true,
    onEnter: () => {
      TextReveal.charReveal('.cta-section h2', { stagger: 0.03, duration: 0.5 });
    },
  });

  // 7.3 Create sparkles
  createSparkles('.cta-section', 5);
}

/* ── ========== 8. Section Reveals (global) ========== ── */
function initSectionReveals() {
  if (typeof ScrollTrigger === 'undefined') return;

  document.querySelectorAll('section:not(#hero):not(#stats):not(.bento-section):not(.cta-section)').forEach(section => {
    gsap.fromTo(section,
      { clipPath: 'inset(0 0 100% 0)' },
      {
        clipPath: 'inset(0 0 0% 0)',
        duration: 1.2,
        ease: 'power4.inOut',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          once: true,
        },
      }
    );
  });
}

/* ── ========== 9. Magnetic Buttons ========== ── */
function initMagneticButtons() {
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: 'power2.out' });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: EASE.elastic });
    });
  });
}

/* ── ========== Firefox @property Fallback ========== ── */
function initBorderAnimationFallback() {
  if (typeof CSS !== 'undefined' && CSS.registerProperty) return;

  // Fallback: JS-driven --border-angle for Firefox
  let angle = 0;
  setInterval(() => {
    angle = (angle + 1) % 360;
    document.querySelectorAll('.bento-card__border').forEach(el => {
      el.style.setProperty('--border-angle', angle + 'deg');
    });
  }, 16); // ~60fps
}

/* ── ========== Mobile Degradation ========== ── */
function applyMobileDegradation() {
  const mm = gsap.matchMedia();

  mm.add('(max-width: 640px)', () => {
    // Reduce particle count
    const particles = document.querySelectorAll('.particle');
    particles.forEach((p, i) => {
      if (i >= 10) p.remove();
    });

    // Disable cursor glow
    const glow = document.getElementById('heroGlow');
    if (glow) glow.style.display = 'none';

    // Hide some hero shapes
    document.querySelectorAll('.hero__shape--4, .hero__shape--6').forEach(el => {
      el.style.display = 'none';
    });

    // Faster stagger for cards
    return () => {}; // Cleanup handled by matchMedia
  });
}

/* ── ========== Main Init ========== ── */
function initHomePage() {
  initBorderAnimationFallback();
  applyMobileDegradation();
  initHeroAnimations();
  initHeroParallax();
  initStatsAnimations();
  initBentoAnimations();
  initTimelineAnimations();
  initMarquee();
  initCTAAnimations();
  initSectionReveals();
  initMagneticButtons();

  // 3D tilt + glow for stat cards (not covered by initBentoAnimations)
  if (typeof ParallaxEngine !== 'undefined') {
    ParallaxEngine.initCardTilt('.stat-card');
    ParallaxEngine.initCardGlow('.stat-card');
  }
}

// Auto-init if on homepage
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.hero')) {
      initHomePage();
    }
  });
} else {
  if (document.querySelector('.hero')) {
    initHomePage();
  }
}
