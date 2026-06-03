/* ============================================
   Fast CET — Parallax Engine (parallax.js)
   Multi-layer scroll parallax, mouse drift,
   3D card tilt, autonomous shape drift
   ============================================ */

const ParallaxEngine = {

  /* ── Depth presets ── */
  depths: {
    deep: 0.03,
    mid: 0.06,
    near: 0.12,
  },

  /* ── Active quickTo instances for cleanup ── */
  _quickToInstances: [],
  _driftAnimations: [],

  /**
   * Mouse drift — elements move away from cursor
   * @param {string} container - selector for the mouse tracking container
   * @param {string|NodeList} elements - selector or NodeList of elements to drift
   * @param {number} intensity - max pixel offset (default 20)
   */
  initMouseDrift(container, elements, intensity = 20) {
    const containerEl = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!containerEl) return;

    const els = typeof elements === 'string'
      ? document.querySelectorAll(elements)
      : elements;

    if (!els.length) return;

    // Build quickTo instances for each element
    const drifters = Array.from(els).map(el => ({
      el,
      quickX: gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power2.out' }),
      quickY: gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power2.out' }),
    }));

    this._quickToInstances.push(...drifters);

    const onMouseMove = (e) => {
      const rect = containerEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const offsetX = ((e.clientX - centerX) / (rect.width / 2)) * intensity;
      const offsetY = ((e.clientY - centerY) / (rect.height / 2)) * intensity;

      drifters.forEach(d => {
        d.quickX(-offsetX);
        d.quickY(-offsetY);
      });
    };

    containerEl.addEventListener('mousemove', onMouseMove, { passive: true });

    // Reset on mouse leave
    containerEl.addEventListener('mouseleave', () => {
      drifters.forEach(d => {
        d.quickX(0);
        d.quickY(0);
      });
    });

    // Store for cleanup
    this._onMouseMove = this._onMouseMove || [];
    this._onMouseMove.push({ container: containerEl, handler: onMouseMove });
  },

  /**
   * Scroll parallax — elements move at different speeds on scroll
   * @param {string} elements - selector for parallax elements
   * @param {number} depth - parallax depth factor
   */
  initScrollParallax(elements, depth = 0.06) {
    if (typeof ScrollTrigger === 'undefined') return;

    const els = document.querySelectorAll(elements);
    if (!els.length) return;

    els.forEach(el => {
      gsap.to(el, {
        y: () => window.innerHeight * depth,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });
  },

  /**
   * Autonomous drift — elements follow independent sin/cos oscillation
   * @param {string} elements - selector for shapes to animate
   */
  initAutonomousDrift(elements) {
    const els = document.querySelectorAll(elements);
    if (!els.length) return;

    const presets = [
      { xAmp: 25, xDur: 12, yAmp: 35, yDur: 15, rAmp: 8,  rDur: 25, sMin: 0.92, sMax: 1.08, sDur: 9  },
      { xAmp: 35, xDur: 10, yAmp: 25, yDur: 13, rAmp: 12, rDur: 20, sMin: 0.88, sMax: 1.12, sDur: 11 },
      { xAmp: 20, xDur: 8,  yAmp: 40, yDur: 18, rAmp: 6,  rDur: 30, sMin: 0.95, sMax: 1.05, sDur: 7  },
      { xAmp: 30, xDur: 14, yAmp: 20, yDur: 11, rAmp: 10, rDur: 22, sMin: 0.90, sMax: 1.10, sDur: 10 },
      { xAmp: 15, xDur: 9,  yAmp: 30, yDur: 16, rAmp: 15, rDur: 18, sMin: 0.85, sMax: 1.15, sDur: 8  },
      { xAmp: 28, xDur: 11, yAmp: 22, yDur: 14, rAmp: 9,  rDur: 28, sMin: 0.93, sMax: 1.07, sDur: 12 },
    ];

    els.forEach((el, i) => {
      const p = presets[i % presets.length];

      // X oscillation
      const xTween = gsap.to(el, {
        x: `random(-${p.xAmp}, ${p.xAmp})`,
        duration: p.xDur,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Y oscillation
      const yTween = gsap.to(el, {
        y: `random(-${p.yAmp}, ${p.yAmp})`,
        duration: p.yDur,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Rotation oscillation
      const rTween = gsap.to(el, {
        rotation: `random(-${p.rAmp}, ${p.rAmp})`,
        duration: p.rDur,
        repeat: -1,
        yoyo: true,
        ease: 'none',
      });

      // Scale breathing
      const sTween = gsap.to(el, {
        scale: p.sMax,
        duration: p.sDur,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      this._driftAnimations.push(xTween, yTween, rTween, sTween);
    });
  },

  /**
   * 3D card tilt — cards rotate towards cursor on hover
   * @param {string} selector - CSS selector for tiltable cards
   */
  initCardTilt(selector) {
    const cards = document.querySelectorAll(selector);
    if (!cards.length) return;

    cards.forEach(card => {
      const quickRotateX = gsap.quickTo(card, 'rotateX', { duration: 0.3, ease: 'power2.out' });
      const quickRotateY = gsap.quickTo(card, 'rotateY', { duration: 0.3, ease: 'power2.out' });

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const offsetX = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 ~ 0.5
        const offsetY = (e.clientY - rect.top) / rect.height - 0.5;  // -0.5 ~ 0.5

        quickRotateY(offsetX * 24);  // max ±12deg
        quickRotateX(-offsetY * 20); // max ±10deg, inverted
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.6,
          ease: 'power2.out',
        });
      });

      this._quickToInstances.push(
        { el: card, quickX: quickRotateX, quickY: quickRotateY }
      );
    });
  },

  /**
   * Card glow — glow follows cursor inside cards
   * @param {string} selector - CSS selector for cards with .bento-card__glow child
   */
  initCardGlow(selector) {
    const cards = document.querySelectorAll(selector);
    if (!cards.length) return;

    cards.forEach(card => {
      const glow = card.querySelector('.bento-card__glow');
      if (!glow) return;

      const quickX = gsap.quickTo(glow, 'x', { duration: 0.2, ease: 'power2.out' });
      const quickY = gsap.quickTo(glow, 'y', { duration: 0.2, ease: 'power2.out' });

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        quickX(e.clientX - rect.left);
        quickY(e.clientY - rect.top);
      });

      this._quickToInstances.push({ el: glow, quickX, quickY });
    });
  },

  /**
   * Cleanup all animations and event listeners
   */
  destroy() {
    this._driftAnimations.forEach(t => t.kill());
    this._driftAnimations = [];
    this._quickToInstances = [];
  },
};
