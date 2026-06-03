/* ============================================
   Fast CET — Content Page Animations (content-animations.js)
   Reusable entrance + interaction animations
   for all 6 content pages (AP-14)
   ============================================ */

const ContentAnimations = {
  /**
   * Initialize all content page animations
   * @param {object} options
   *   - filterContainerId: string (filter tags container)
   *   - cardSelector: string (cards to animate, default '.exam-card, .question-card')
   *   - enableCardTilt: boolean (default true on desktop)
   */
  init(options = {}) {
    this._options = options;

    this._animatePageEntrance();
    this._animateFilterTags(options.filterContainerId);
    this._animateCards(options.cardSelector || '.exam-card, .question-card');

    if (options.enableCardTilt !== false && window.innerWidth >= 1024) {
      this._initCardInteractions(options.cardSelector || '.exam-card, .question-card');
    }
  },

  // ── AP-14.1 Page Entrance ──────────────────────────────

  /** Breadcrumb slide-in + title char reveal + description fade-up */
  _animatePageEntrance() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Breadcrumb: slide in from left
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
      tl.fromTo(breadcrumb,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5 },
        0.1
      );
    }

    // Page title: char reveal (TextReveal from animations.js, fallback if not loaded)
    const title = document.querySelector('.page-header h1');
    if (title) {
      tl.add(() => {
        if (typeof TextReveal !== 'undefined') {
          TextReveal.charReveal(title, { stagger: 0.035, duration: 0.6, ease: 'power4.out' });
        } else {
          // Graceful fallback: simple fade-in without per-character split
          gsap.fromTo(title,
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' }
          );
        }
      }, '-=0.2');
    }

    // Description: fade up
    const desc = document.querySelector('.page-header p');
    if (desc) {
      tl.fromTo(desc,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
        '-=0.1'
      );
    }
  },

  // ── AP-14.2 Filter Tag Animations ──────────────────────

  /** Staggered entrance for filter tags */
  _animateFilterTags(containerId) {
    const container = containerId
      ? document.getElementById(containerId)
      : document.querySelector('.filter-tags');

    if (!container) return;

    const tags = container.querySelectorAll('.filter-tag');
    if (!tags.length) return;

    gsap.fromTo(tags,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        stagger: 0.05,
        ease: 'back.out(1.5)',
        scrollTrigger: {
          trigger: container,
          start: 'top 90%',
          once: true,
        },
      }
    );

    // Click interaction: elastic scale feedback
    tags.forEach(tag => {
      tag.addEventListener('click', () => {
        gsap.fromTo(tag,
          { scale: 0.9 },
          { scale: 1.05, duration: 0.2, ease: 'power2.inOut',
            onComplete: () => {
              gsap.to(tag, { scale: 1, duration: 0.2, ease: 'power2.out' });
            }
          }
        );
      });
    });
  },

  // ── AP-14.3 Card List Animations ───────────────────────

  /** Staggered card entrance + hover interactions */
  _animateCards(selector) {
    const cards = document.querySelectorAll(selector);
    if (!cards.length) return;

    // Staggered entrance
    gsap.fromTo(cards,
      { y: 60, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: cards[0].parentElement,
          start: 'top 85%',
          once: true,
        },
      }
    );
  },

  // ── AP-14.4 Card 3D Tilt + Glow ────────────────────────

  /** Mouse-driven 3D tilt + glow for cards */
  _initCardInteractions(selector) {
    const cards = document.querySelectorAll(selector);

    cards.forEach(card => {
      // Skip if card has no interactive purpose
      if (card.dataset.tilt === 'false') return;

      card.style.transformStyle = 'preserve-3d';
      card.style.perspective = '1000px';

      // Create glow element if not present
      let glow = card.querySelector('.card-glow');
      if (!glow) {
        glow = document.createElement('div');
        glow.className = 'card-glow';
        glow.style.cssText = `
          position: absolute; width: 200px; height: 200px;
          border-radius: 50%; pointer-events: none; z-index: 1;
          background: radial-gradient(circle, rgba(255,94,77,0.15), transparent 70%);
          transform: translate(-50%, -50%); opacity: 0;
          transition: opacity 0.3s;
        `;
        card.style.position = card.style.position || 'relative';
        card.style.overflow = 'hidden';
        card.appendChild(glow);
      }

      const quickTilt = {
        x: gsap.quickTo(card, 'rotateY', { duration: 0.3, ease: 'power2.out' }),
        y: gsap.quickTo(card, 'rotateX', { duration: 0.3, ease: 'power2.out' }),
      };
      const quickGlowX = gsap.quickTo(glow, 'left', { duration: 0.2 });
      const quickGlowY = gsap.quickTo(glow, 'top', { duration: 0.2 });

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        quickTilt.x(x * 12);
        quickTilt.y(-y * 10);
        quickGlowX(e.clientX - rect.left);
        quickGlowY(e.clientY - rect.top);
        glow.style.opacity = '1';
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power2.out',
        });
        glow.style.opacity = '0';
      });
    });
  },

  // ── AP-14.5 Answer Reveal ──────────────────────────────

  /**
   * Animate answer reveal panel
   * @param {HTMLElement} answerEl - the answer container element
   */
  revealAnswer(answerEl) {
    if (!answerEl) return;

    // Set initial state
    gsap.set(answerEl, { height: 0, opacity: 0, overflow: 'hidden' });

    // Measure target height
    const targetHeight = answerEl.scrollHeight;

    gsap.to(answerEl, {
      height: targetHeight,
      opacity: 1,
      duration: 0.5,
      ease: 'power3.out',
      onComplete: () => {
        answerEl.style.height = 'auto';
        answerEl.style.overflow = 'visible';
      },
    });

    // Animate child paragraphs with stagger
    const children = answerEl.querySelectorAll('p, li, .explanation-item');
    gsap.fromTo(children,
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.08, ease: 'power2.out', delay: 0.2 }
    );

    // Highlight correct answer option
    const correctOption = answerEl.querySelector('.option--correct');
    if (correctOption) {
      gsap.to(correctOption, {
        backgroundColor: 'rgba(255,94,77,0.12)',
        duration: 0.4,
        delay: 0.4,
      });
    }
  },

  // ── AP-14.6 Filter Animation Hooks ─────────────────────

  /**
   * Animate items when filter changes (called by Filter component)
   * @param {HTMLElement} item - the item to show/hide
   * @param {boolean} visible - whether the item should be visible
   */
  animateFilterItem(item, visible) {
    if (visible) {
      item.style.display = '';
      gsap.fromTo(item,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)', overwrite: 'auto' }
      );
    } else {
      gsap.to(item, {
        opacity: 0,
        scale: 0.9,
        duration: 0.3,
        ease: 'power2.in',
        overwrite: 'auto',
        onComplete: () => {
          item.style.display = 'none';
        },
      });
    }
  },

  // ── AP-14.7 Audio Player Entrance ──────────────────────

  /** Animate audio player entrance */
  animatePlayerEntrance(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const player = container.querySelector('.audio-player');
    if (!player) return;

    gsap.fromTo(player,
      { y: -30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
    );
  },
};
