/**
 * Fast CET — Service Worker
 * 离线优先缓存策略
 *
 * 缓存策略:
 *   - Static assets (CSS/JS/fonts):  Cache-First (预缓存, 永久可用)
 *   - Vocabulary/Questions (JSON):  Cache-First (离线刷题核心)
 *   - Audio (听力 MP3):            Network-First (音频文件大, 有网才加载)
 *   - Pages (HTML):                Stale-While-Revalidate (先给缓存, 后台更新)
 *   - Analytics:                   Background-Sync (有网时后台上报)
 *
 * 版本: 每次 SW 更新时递增 CACHE_VERSION, 自动清理旧缓存
 */

const CACHE_VERSION = 'fastcet-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;

// ── 预缓存资源清单 ──────────────────────────────────

const PRECACHE_URLS = [
  // 首页
  '/',
  '/index.html',

  // CSS
  '/css/reset.css',
  '/css/variables.css',
  '/css/global.css',
  '/css/nav.css',
  '/css/hero.css',
  '/css/cards.css',
  '/css/content.css',
  '/css/responsive.css',

  // JS
  '/js/main.js',
  '/js/animations.js',
  '/js/parallax.js',
  '/js/data-loader.js',
  '/js/exam-renderer.js',
  '/js/audio-player.js',
  '/js/filter.js',
  '/js/counters.js',
  '/js/content-animations.js',

  // 核心内容页
  '/pages/vocabulary.html',
  '/pages/games.html',

  // 离线回退页
  '/offline.html',
];

// ── 安装: 预缓存静态资源 ────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] 预缓存静态资源...');
        // 逐个添加, 单个失败不影响整体
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] 预缓存失败: ${url}`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] 预缓存完成, 跳过等待');
        return self.skipWaiting();
      })
  );
});

// ── 激活: 清理旧版本缓存 ────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');

  const validCaches = [STATIC_CACHE, DATA_CACHE, PAGE_CACHE, AUDIO_CACHE];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // 清理不属于当前版本的缓存
              return name.startsWith('fastcet-') && !validCaches.includes(name);
            })
            .map((name) => {
              console.log('[SW] 清理旧缓存:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] 激活完成, 接管所有页面');
        return self.clients.claim();
      })
  );
});

// ── 请求拦截: 路由分发 ──────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== self.location.origin) {
    return;
  }

  // 跳过 Chrome DevTools 请求
  if (request.url.includes('chrome-extension://')) {
    return;
  }

  // 跳过 analytics 上报 (由 Background Sync 处理)
  if (url.pathname.startsWith('/analytics/')) {
    return;
  }

  // ── 路由策略分发 ──────────────────────────────

  // 1. JSON 数据 (词汇/题目) → Cache-First
  if (url.pathname.startsWith('/data/') || url.pathname.endsWith('.json')) {
    event.respondWith(cacheFirst(request, DATA_CACHE));
    return;
  }

  // 2. 音频文件 → Network-First
  if (url.pathname.startsWith('/assets/audio/') || url.pathname.endsWith('.mp3')) {
    event.respondWith(networkFirst(request, AUDIO_CACHE));
    return;
  }

  // 3. 静态资源 (CSS/JS/字体/图片) → Cache-First
  if (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 4. HTML 页面 → Stale-While-Revalidate
  if (
    request.mode === 'navigate' ||
    request.headers.get('Accept')?.includes('text/html')
  ) {
    event.respondWith(staleWhileRevalidate(request, PAGE_CACHE));
    return;
  }

  // 5. 其他请求 → Network-First (兜底)
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ── 缓存策略实现 ───────────────────────────────────

/**
 * Cache-First: 优先返回缓存, 缓存未命中时走网络并缓存
 * 适用: 静态资源、JSON 数据 (内容不常变)
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Cache-First 失败:', request.url, err);
    // 返回离线回退
    return offlineFallback(request);
  }
}

/**
 * Network-First: 优先走网络, 网络失败时回退到缓存
 * 适用: 音频文件 (文件大, 有网才合理加载)
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Network-First 降级到缓存:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return offlineFallback(request);
  }
}

/**
 * Stale-While-Revalidate: 立即返回缓存, 后台更新缓存
 * 适用: HTML 页面 (快速响应 + 保持最新)
 */
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  // 后台更新 (不阻塞响应)
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, response.clone());
        });
      }
    })
    .catch((err) => {
      console.warn('[SW] Stale-While-Revalidate 后台更新失败:', request.url, err);
    });

  // 有缓存就直接返回, 不等网络
  if (cached) {
    return cached;
  }

  // 无缓存, 等网络
  try {
    return await fetchPromise;
  } catch (err) {
    return offlineFallback(request);
  }
}

/**
 * 离线回退
 * 对于页面请求, 返回 offline.html
 * 对于数据请求, 返回空 JSON
 * 对于其他请求, 返回 503
 */
function offlineFallback(request) {
  const acceptHeader = request.headers.get('Accept') || '';

  // 页面请求 → 离线回退页
  if (acceptHeader.includes('text/html') || request.mode === 'navigate') {
    return caches.match('/offline.html').then((cached) => {
      return cached || new Response(
        '<html><body><h1>离线</h1><p>请检查网络连接</p></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html' } }
      );
    });
  }

  // JSON 请求 → 空数据
  if (acceptHeader.includes('application/json')) {
    return new Response(
      JSON.stringify({ error: 'offline', message: '当前处于离线状态' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 图片/音频 → 占位
  if (acceptHeader.includes('image/')) {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#eee" width="100" height="100"/><text fill="#999" x="50" y="55" text-anchor="middle" font-size="12">离线</text></svg>',
      { status: 503, headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }

  return new Response('Service Unavailable', { status: 503 });
}

// ── Background Sync (后台同步) ──────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  } else if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

/**
 * 后台同步学习统计数据
 */
async function syncAnalytics() {
  console.log('[SW] 后台同步 analytics...');
  try {
    // 从 IndexedDB 读取待同步数据 (需要页面先写入)
    // 此处为预留接口, 实际实现需配合页面端的 analytics 模块
    const requests = await getPendingAnalytics();
    await Promise.allSettled(
      requests.map((data) =>
        fetch('/api/v1/analytics/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      )
    );
    await clearPendingAnalytics();
    console.log('[SW] Analytics 同步完成');
  } catch (err) {
    console.warn('[SW] Analytics 同步失败:', err);
  }
}

/**
 * 后台同步学习进度
 */
async function syncProgress() {
  console.log('[SW] 后台同步学习进度...');
  try {
    const sessions = await getPendingSessions();
    await Promise.allSettled(
      sessions.map((data) =>
        fetch('/api/v1/exam-sessions/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      )
    );
    await clearPendingSessions();
    console.log('[SW] 学习进度同步完成');
  } catch (err) {
    console.warn('[SW] 学习进度同步失败:', err);
  }
}

// ── IndexedDB 辅助 (预留) ───────────────────────────

function getPendingAnalytics() {
  // 预留: 从 IndexedDB 读取待同步的 analytics 数据
  return Promise.resolve([]);
}

function clearPendingAnalytics() {
  return Promise.resolve();
}

function getPendingSessions() {
  // 预留: 从 IndexedDB 读取待同步的学习进度
  return Promise.resolve([]);
}

function clearPendingSessions() {
  return Promise.resolve();
}

// ── 消息通信 (页面 ↔ SW) ────────────────────────────

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_NOW':
      // 页面请求立即缓存某个 URL
      if (payload && payload.url) {
        caches.open(STATIC_CACHE).then((cache) => {
          cache.add(payload.url).catch((err) => {
            console.warn('[SW] 手动缓存失败:', payload.url, err);
          });
        });
      }
      break;

    case 'CLEAR_CACHE':
      // 清除所有缓存
      caches.keys().then((names) => {
        return Promise.all(names.map((n) => caches.delete(n)));
      }).then(() => {
        console.log('[SW] 所有缓存已清除');
      });
      break;

    case 'GET_CACHE_STATS':
      // 返回缓存统计
      getCacheStats().then((stats) => {
        event.ports[0]?.postMessage(stats);
      });
      break;

    default:
      console.log('[SW] 未知消息类型:', type);
  }
});

/**
 * 获取缓存统计信息
 */
async function getCacheStats() {
  const stats = {};
  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    stats[name] = keys.length;
  }
  return stats;
}

// ── 推送通知 (预留) ─────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'Fast CET', body: '学习提醒' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // 如果有已打开的窗口, 聚焦并导航
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // 否则打开新窗口
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

console.log('[SW] Service Worker 已加载, 等待激活...');