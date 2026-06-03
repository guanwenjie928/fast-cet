/**
 * Fast CET — ModeManager
 * 统一场景感知与模式切换系统
 *
 * 职责:
 *   1. 自动检测当前最佳场景模式 (metro/stealth/focus/night/cram/micro)
 *   2. 将模式应用到 DOM (document.documentElement.setAttribute('data-mode', ...))
 *   3. localStorage 持久化用户手动选择
 *   4. 派发自定义事件供其他模块 (boss-key, 阿速, etc.) 响应
 *   5. 离线状态解耦: 离线是能力标记 (data-offline), 不是模式
 *
 * 修复项 (vs 计划书伪代码):
 *   - FIX: 离线 ≠ 通勤 (离线是能力标记, 用 data-offline 属性独立表达)
 *   - FIX: navigator.connection 仅 Chrome 支持, 已加 Firefox/Safari 降级
 *   - FIX: 增加 applyMode() 实际写入 DOM + localStorage + 派发事件
 *   - FIX: 增加 resize/online/offline 监听自动重检测
 */

const ModeManager = (() => {
  // ── 常量 ───────────────────────────────────────────
  const STORAGE_KEY = 'fastcet_mode';
  const STORAGE_KEY_AUTO = 'fastcet_mode_auto';

  // 有效模式列表
  const MODES = ['metro', 'stealth', 'focus', 'night', 'cram', 'micro'];

  // ── 状态 ───────────────────────────────────────────
  let currentMode = null;     // 当前生效的模式
  let isAutoMode = true;      // 是否自动检测模式 (false = 用户手动锁定)
  let manualMode = null;      // 用户手动指定的模式

  // ── 工具函数 ───────────────────────────────────────

  /**
   * 安全获取网络连接类型 (Chrome only API, 其他浏览器降级)
   */
  function getConnectionType() {
    const conn = navigator.connection
      || navigator.mozConnection
      || navigator.webkitConnection;
    return conn?.effectiveType ?? 'unknown';
  }

  /**
   * 是否为低带宽
   */
  function isLowBandwidth() {
    const type = getConnectionType();
    return type === 'slow-2g' || type === '2g';
  }

  /**
   * 是否为移动设备
   */
  function isMobileDevice() {
    return window.innerWidth < 768;
  }

  /**
   * 是否为暗色主题
   */
  function prefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // ── 核心: 自动检测 ─────────────────────────────────

  /**
   * 自动检测当前最佳场景模式
   *
   * 决策树 (修正版 — 离线≠模式):
   *   1. 深夜 (22:00-05:00) + 手机 → night
   *   2. 深夜 (22:00-05:00) + 桌面 → 仍可能 night, 但倾向 focus
   *   3. 白天 + 手机 + 碎片时段 → micro (课间碎片)
   *   4. 白天 + 手机 + 通勤时段 (7-9, 17-20) → metro
   *   5. 桌面 + 白天 → focus
   *   6. 默认 → focus
   *
   * 注意: 离线状态不改变模式判定, 而是通过 data-offline 属性独立表达
   */
  function detect() {
    const hour = new Date().getHours();
    const isMobile = isMobileDevice();
    const isDark = prefersDark();
    const isOffline = !navigator.onLine;

    // 深夜: 自动夜间模式
    if (hour >= 22 || hour <= 5) {
      return isMobile ? 'night' : 'focus';
    }

    // 手机 + 通勤时段 (早7-9, 晚17-20)
    if (isMobile && ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20))) {
      return 'metro';
    }

    // 手机 + 课间碎片时段 (9-12, 14-18)
    if (isMobile && ((hour >= 9 && hour <= 12) || (hour >= 14 && hour <= 18))) {
      return 'micro';
    }

    // 桌面 + 白天 = 专注模式
    if (!isMobile && hour >= 6 && hour <= 21) {
      return 'focus';
    }

    // 其余情况默认
    return 'focus';
  }

  // ── 核心: 应用模式 ─────────────────────────────────

  /**
   * 将模式写入 DOM, localStorage, 并派发事件
   *
   * @param {string} mode - 模式代号 (metro|stealth|focus|night|cram|micro)
   * @param {object}  options
   * @param {boolean} options.manual - 是否为用户手动选择 (影响持久化策略)
   * @param {boolean} options.silent - 是否跳过事件派发
   */
  function applyMode(mode, options = {}) {
    const { manual = false, silent = false } = options;

    // 校验模式名
    if (!MODES.includes(mode)) {
      console.warn(`[ModeManager] 未知模式: "${mode}", 回退为 focus`);
      mode = 'focus';
    }

    const previousMode = currentMode;
    currentMode = mode;

    // 1. 写入 DOM (CSS 通过 [data-mode] 选择器响应)
    document.documentElement.setAttribute('data-mode', mode);

    // 2. 独立处理离线标记 (能力标记, 不是模式)
    if (!navigator.onLine) {
      document.documentElement.setAttribute('data-offline', '');
    } else {
      document.documentElement.removeAttribute('data-offline');
    }

    // 3. 低带宽标记
    if (isLowBandwidth()) {
      document.documentElement.setAttribute('data-low-bandwidth', '');
    } else {
      document.documentElement.removeAttribute('data-low-bandwidth');
    }

    // 4. localStorage 持久化
    if (manual) {
      localStorage.setItem(STORAGE_KEY, mode);
      localStorage.setItem(STORAGE_KEY_AUTO, 'false');
    } else {
      localStorage.setItem(STORAGE_KEY_AUTO, 'true');
      // 自动模式下也存当前模式, 供页面恢复时参考
      localStorage.setItem(STORAGE_KEY, mode);
    }

    // 5. 派发自定义事件 (其他模块监听)
    if (!silent && previousMode !== mode) {
      window.dispatchEvent(new CustomEvent('modechange', {
        detail: {
          previous: previousMode,
          current: mode,
          manual,
          isOffline: !navigator.onLine,
          isLowBandwidth: isLowBandwidth(),
        },
      }));
    }
  }

  // ── 公开 API ──────────────────────────────────────

  /**
   * 初始化: 自动检测并应用模式, 绑定环境监听
   */
  function init() {
    // 从 localStorage 恢复用户偏好
    const savedAuto = localStorage.getItem(STORAGE_KEY_AUTO);
    const savedMode = localStorage.getItem(STORAGE_KEY);

    if (savedAuto === 'false' && savedMode && MODES.includes(savedMode)) {
      // 用户之前手动锁定了模式
      isAutoMode = false;
      manualMode = savedMode;
      applyMode(savedMode, { manual: false, silent: true }); // 恢复但不触发事件
    } else {
      // 自动检测
      isAutoMode = true;
      const detected = detect();
      applyMode(detected, { manual: false, silent: true });
    }

    // 绑定环境变化监听
    bindListeners();

    // 派发初始模式事件 (让其他模块有机会初始化)
    window.dispatchEvent(new CustomEvent('modechange', {
      detail: {
        previous: null,
        current: currentMode,
        manual: !isAutoMode,
        isOffline: !navigator.onLine,
        isLowBandwidth: isLowBandwidth(),
      },
    }));

    console.log(
      `[ModeManager] 初始化完成: ${currentMode}` +
      ` (${isAutoMode ? '自动检测' : '手动锁定'})` +
      `${!navigator.onLine ? ' [离线]' : ''}` +
      `${isLowBandwidth() ? ' [低带宽]' : ''}`
    );
  }

  /**
   * 用户手动切换到指定模式 (锁定, 不再自动检测)
   * @param {string} mode
   */
  function setMode(mode) {
    if (!MODES.includes(mode)) {
      console.warn(`[ModeManager] 无效模式: "${mode}"`);
      return;
    }
    isAutoMode = false;
    manualMode = mode;
    applyMode(mode, { manual: true });
  }

  /**
   * 恢复自动检测模式
   */
  function setAuto() {
    isAutoMode = true;
    manualMode = null;
    localStorage.setItem(STORAGE_KEY_AUTO, 'true');
    const detected = detect();
    applyMode(detected, { manual: false });
  }

  /**
   * 获取当前模式
   */
  function getMode() {
    return currentMode;
  }

  /**
   * 是否处于自动模式
   */
  function isAuto() {
    return isAutoMode;
  }

  /**
   * 强制重新检测 (窗口大小变化、网络恢复等场景)
   */
  function refresh() {
    if (!isAutoMode) return; // 手动模式不自动切换
    const detected = detect();
    if (detected !== currentMode) {
      applyMode(detected, { manual: false });
    }
  }

  // ── 环境监听 ──────────────────────────────────────

  function bindListeners() {
    // 窗口大小变化 (设备切换: 手机横屏/平板/外接显示器)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => refresh(), 500);
    });

    // 网络恢复/断开
    window.addEventListener('online', () => {
      document.documentElement.removeAttribute('data-offline');
      window.dispatchEvent(new CustomEvent('onlinechange', {
        detail: { isOffline: false },
      }));
      refresh();
    });

    window.addEventListener('offline', () => {
      document.documentElement.setAttribute('data-offline', '');
      window.dispatchEvent(new CustomEvent('onlinechange', {
        detail: { isOffline: true },
      }));
      refresh();
    });

    // 暗色主题切换
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      refresh();
    });

    // 连接类型变化 (Chrome only)
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      conn.addEventListener('change', () => {
        if (isLowBandwidth()) {
          document.documentElement.setAttribute('data-low-bandwidth', '');
        } else {
          document.documentElement.removeAttribute('data-low-bandwidth');
        }
        window.dispatchEvent(new CustomEvent('bandwidthchange', {
          detail: { effectiveType: getConnectionType(), isLowBandwidth: isLowBandwidth() },
        }));
      });
    }

    // 页面卸载前保存状态
    window.addEventListener('beforeunload', () => {
      localStorage.setItem(STORAGE_KEY, currentMode);
      localStorage.setItem(STORAGE_KEY_AUTO, isAutoMode ? 'true' : 'false');
    });
  }

  // ── 公开导出 ──────────────────────────────────────
  return {
    init,
    detect,
    setMode,
    setAuto,
    getMode,
    isAuto,
    refresh,
    applyMode,
    MODES,
  };
})();

// ── 自动初始化 ──────────────────────────────────────
// 当 DOM 就绪后自动启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ModeManager.init());
} else {
  ModeManager.init();
}