/* ============================================
   Fast CET — Main JS (main.js)
   Shared utilities, nav logic, GSAP bootstrap
   ============================================ */

/* ── GSAP + ScrollTrigger Registration ── */
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.defaults({
    toggleActions: 'play none none none',
    once: true,
    markers: false,
  });

  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
  });
}

/* ── Utility Functions ── */

/**
 * Debounce — delays fn execution until `ms` after last call
 */
function debounce(fn, ms = 100) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Throttle — limits fn execution to once per `ms`
 */
function throttle(fn, ms = 100) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Shorthand for querySelectorAll, returns a real Array
 */
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * Shorthand for querySelector
 */
function $(selector, context = document) {
  return context.querySelector(selector);
}

/* ── Easing Constants (shared across all animation modules) ── */
const EASE = {
  hero: 'power4.out',
  reveal: 'expo.out',
  card: 'power3.out',
  bounce: 'back.out(1.7)',
  elastic: 'elastic.out(1, 0.4)',
  smooth: 'power2.inOut',
  drift: 'sine.inOut',
};

/* ── Navigation Scroll Detection ── */
function initNavScroll() {
  const nav = $('#navbar');
  if (!nav) return;

  const onScroll = throttle(() => {
    if (window.scrollY > 50) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
  }, 50);

  window.addEventListener('scroll', onScroll, { passive: true });
  // Initial check
  onScroll();
}

/* ── Mobile Menu Toggle ── */
function initMobileMenu() {
  const toggle = $('.nav__toggle');
  const nav = $('#navbar');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    nav.classList.toggle('nav--open');
    document.body.style.overflow = nav.classList.contains('nav--open')
      ? 'hidden'
      : '';
  });

  // Close menu when clicking a mobile panel link
  $$('.nav__mobile-panel a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('nav--open');
      document.body.style.overflow = '';
    });
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('nav--open')) {
      nav.classList.remove('nav--open');
      document.body.style.overflow = '';
    }
  });
}

/* ── Shared Components Loader ── */
function loadSharedComponents() {
  const currentPath = window.location.pathname;
  const isInPages = currentPath.includes('/pages/');
  const prefix = isInPages ? '../' : '';

  /* ── Navigation HTML ── */
  const navHTML = `
    <nav class="nav" id="navbar">
      <div class="nav__inner container">
        <a href="${prefix}index.html" class="nav__logo">
          <img src="${prefix}assets/logo.svg" alt="Fast CET" width="32" height="32">
          <span>Fast CET</span>
        </a>
        <ul class="nav__links">
          <li><a href="${prefix}pages/zhenti.html">真题</a></li>
          <li><a href="${prefix}pages/moni.html">模拟题</a></li>
          <li><a href="${prefix}pages/listening.html">听力</a></li>
          <li><a href="${prefix}pages/reading.html">阅读</a></li>
          <li><a href="${prefix}pages/translation.html">翻译</a></li>
          <li><a href="${prefix}pages/writing.html">作文</a></li>
          <li><a href="${prefix}pages/vocabulary.html">词汇</a></li>
        </ul>
        <button class="nav__toggle" aria-label="菜单">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <div class="nav__mobile-panel">
        <a href="${prefix}index.html">首页</a>
        <a href="${prefix}pages/zhenti.html">真题</a>
        <a href="${prefix}pages/moni.html">模拟题</a>
        <a href="${prefix}pages/listening.html">听力</a>
        <a href="${prefix}pages/reading.html">阅读</a>
        <a href="${prefix}pages/translation.html">翻译</a>
        <a href="${prefix}pages/writing.html">作文</a>
        <a href="${prefix}pages/vocabulary.html">词汇</a>
      </div>
    </nav>
  `;

  /* ── Footer HTML ── */
  const footerHTML = `
    <footer class="footer">
      <div class="footer__inner container">
        <div class="footer__grid">
          <div class="footer__col footer__col--brand">
            <a href="${prefix}index.html" class="footer__logo">
              <img src="${prefix}assets/logo.svg" alt="Fast CET" width="28" height="28">
              <span>Fast CET</span>
            </a>
            <p class="footer__slogan">CET-4 一站式备考平台<br>用最高效的方式，一次通过四级</p>
          </div>
          <div class="footer__col">
            <h4 class="footer__heading">快速链接</h4>
            <ul class="footer__links">
              <li><a href="${prefix}index.html">首页</a></li>
              <li><a href="${prefix}pages/zhenti.html">历年真题</a></li>
              <li><a href="${prefix}pages/moni.html">模拟测试</a></li>
            </ul>
          </div>
          <div class="footer__col">
            <h4 class="footer__heading">考试模块</h4>
            <ul class="footer__links">
              <li><a href="${prefix}pages/listening.html">听力理解</a></li>
              <li><a href="${prefix}pages/reading.html">阅读理解</a></li>
              <li><a href="${prefix}pages/translation.html">翻译</a></li>
              <li><a href="${prefix}pages/writing.html">作文</a></li>
              <li><a href="${prefix}pages/vocabulary.html">核心词汇</a></li>
            </ul>
          </div>
          <div class="footer__col">
            <h4 class="footer__heading">关于</h4>
            <p class="footer__copyright">&copy; 2025 Fast CET<br>All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  `;

  // Inject nav at the start of body
  document.body.insertAdjacentHTML('afterbegin', navHTML);

  // Inject footer at the end of body
  document.body.insertAdjacentHTML('beforeend', footerHTML);

  // Set active nav link based on current page
  highlightCurrentNav();
}

/* ── Highlight current page in nav ── */
function highlightCurrentNav() {
  const path = window.location.pathname;
  $$('.nav__links a, .nav__mobile-panel a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && path.endsWith(href.replace(/^.*\//, ''))) {
      link.classList.add('active');
    }
  });
}

/* ── Footer Styles (injected dynamically since footer is JS-rendered) ── */
function injectFooterStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .footer {
      background: #2D1A14;
      color: #FFF8F5;
      padding: 64px 0 32px;
      margin-top: 80px;
    }
    .footer__grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 40px;
    }
    .footer__logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-en);
      font-size: 18px;
      font-weight: 700;
      color: #FFF;
      margin-bottom: 16px;
    }
    .footer__logo img {
      width: 28px;
      height: 28px;
    }
    .footer__slogan {
      font-size: 14px;
      color: rgba(255,248,245,0.6);
      line-height: 1.8;
    }
    .footer__heading {
      font-family: var(--font-en);
      font-size: 14px;
      font-weight: 600;
      color: var(--color-primary-light);
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .footer__links {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .footer__links a {
      font-size: 14px;
      color: rgba(255,248,245,0.7);
      transition: color 0.2s ease;
    }
    .footer__links a:hover {
      color: var(--color-primary-light);
    }
    .footer__copyright {
      font-size: 13px;
      color: rgba(255,248,245,0.5);
      line-height: 1.8;
    }
    @media (max-width: 768px) {
      .footer__grid {
        grid-template-columns: 1fr 1fr;
      }
      .footer__col--brand {
        grid-column: 1 / -1;
      }
    }
    @media (max-width: 480px) {
      .footer__grid {
        grid-template-columns: 1fr;
        gap: 32px;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ── Unified Initialization ── */
function initApp() {
  loadSharedComponents();
  injectFooterStyles();
  initNavScroll();
  initMobileMenu();
}

// Auto-init when DOM is ready (but allow manual initApp() for SPA-like pages)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}