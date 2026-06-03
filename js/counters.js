/* ============================================
   Fast CET — Counter Engine (counters.js)
   Animated number counting with easing
   ============================================ */

const CounterEngine = {

  _animated: false,

  /**
   * Animate all stat counters on the page
   * Uses requestAnimationFrame + easeOut interpolation
   */
  animateAll() {
    if (this._animated) return;
    this._animated = true;

    const counters = document.querySelectorAll('.stat__number[data-target]');
    if (!counters.length) return;

    counters.forEach((counter, index) => {
      const target = parseFloat(counter.getAttribute('data-target'));
      const suffix = counter.getAttribute('data-suffix') || '';
      const duration = 1000 + index * 300; // stagger durations
      const startTime = performance.now() + index * 150; // stagger start times

      const animate = (now) => {
        if (now < startTime) {
          requestAnimationFrame(animate);
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out quad: 1 - (1-t)^2
        const eased = 1 - Math.pow(1 - progress, 2);
        const current = Math.round(target * eased);

        counter.textContent = current + suffix;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Final value + bounce effect
          counter.textContent = target + suffix;
          this._bounceScale(counter);
        }
      };

      requestAnimationFrame(animate);
    });
  },

  /**
   * Bounce scale effect on completion
   */
  _bounceScale(el) {
    gsap.to(el, {
      scale: 1.08,
      duration: 0.2,
      ease: 'back.out(2)',
      onComplete: () => {
        gsap.to(el, {
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
      },
    });
  },

  /**
   * Reset counters for re-triggering
   */
  reset() {
    this._animated = false;
    document.querySelectorAll('.stat__number[data-target]').forEach(el => {
      el.textContent = '0' + (el.getAttribute('data-suffix') || '');
    });
  },
};