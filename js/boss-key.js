/**
 * Fast CET — BossKey
 * 老板键 + CSS 叠加层伪装 + 光标抖动检测 + 纯键盘操作
 *
 * 核心设计:
 *   1. CSS 叠加层方案 — 在真实内容之上覆盖伪装层, 而非销毁 DOM
 *      所有 JS 状态、事件监听、GSAP 动画、计时器在叠加层下方完整保留
 *   2. 多重触发路径: Esc / Ctrl+` / 光标抖动 / 鼠标中键
 *   3. 6 套伪装主题, 一键切换
 *   4. vim 风格纯键盘操作 (j/k/1-4/Space/f/s/r/h)
 *
 * 依赖: ModeManager (mode-manager.js, 需先加载)
 */

const BossKey = (() => {
  // ── 常量 ───────────────────────────────────────────
  const OVERLAY_ID = 'stealth-overlay';
  const PANIC_KEY = 'Escape';
  const PANIC_KEY_ALT = '`';       // Ctrl+`
  const STORAGE_DISGUISE = 'fastcet_disguise';

  // 伪装主题定义
  const DISGUISES = {
    excel: {
      name: 'Excel',
      icon: '📊',
      title: 'Q3项目进度表.xlsx',
      favicon: '📊',
    },
    word: {
      name: 'Word',
      icon: '📝',
      title: '周报-第24周工作总结.docx',
      favicon: '📝',
    },
    vscode: {
      name: 'VSCode',
      icon: '💻',
      title: 'main.ts — fastcet',
      favicon: '💻',
    },
    wechat: {
      name: '微信',
      icon: '💬',
      title: '微信 — 项目群聊',
      favicon: '💬',
    },
    wiki: {
      name: '百科',
      icon: '📚',
      title: 'CET-4 大学英语四级考试 — 百度百科',
      favicon: '📚',
    },
    terminal: {
      name: '终端',
      icon: '⬛',
      title: 'Terminal — zsh',
      favicon: '⬛',
    },
  };

  // 键盘快捷键映射
  const KEYMAP = {
    'j': 'next',           // 下一题
    'k': 'prev',           // 上一题
    'ArrowDown': 'next',
    'ArrowUp': 'prev',
    '1': 'option-a',
    '2': 'option-b',
    '3': 'option-c',
    '4': 'option-d',
    ' ': 'submit',         // Space = 提交
    'f': 'flag',           // 标记复习
    's': 'skip',           // 跳过
    'r': 'review',         // 答题卡
    'h': 'cycle-theme',    // 切换伪装主题
    'Escape': 'panic',     // 触发 Boss Key
  };

  // ── 状态 ───────────────────────────────────────────
  let isHidden = false;           // 当前是否处于伪装状态
  let currentDisguise = 'excel';  // 当前伪装主题
  let originalTitle = '';         // 原始页面标题
  let originalFaviconHref = '';   // 原始 favicon href
  let panicCount = 0;             // 今日触发次数 (幽默统计)
  let overlayEl = null;           // 叠加层 DOM 引用
  let faviconLink = null;         // favicon <link> DOM 引用

  // 光标抖动检测状态
  let shakeState = {
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    magnitude: 0,
    decayRate: 0.3,       // 每秒衰减量
  };

  // ── 构建伪装叠加层 ─────────────────────────────────

  /**
   * 创建叠加层 DOM (首次调用时)
   */
  function createOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;

    overlayEl = document.createElement('div');
    overlayEl.id = OVERLAY_ID;
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.innerHTML = renderDisguiseContent(currentDisguise);
    overlayEl.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
      overflow: auto;
    `;
    document.body.appendChild(overlayEl);
  }

  /**
   * 渲染伪装主题的 HTML 内容
   */
  function renderDisguiseContent(disguiseKey) {
    const d = DISGUISES[disguiseKey];

    switch (disguiseKey) {
      case 'excel':
        return renderExcelDisguise();
      case 'word':
        return renderWordDisguise();
      case 'vscode':
        return renderVSCodeDisguise();
      case 'wechat':
        return renderWechatDisguise();
      case 'wiki':
        return renderWikiDisguise();
      case 'terminal':
        return renderTerminalDisguise();
      default:
        return renderExcelDisguise();
    }
  }

  /**
   * Excel 伪装 — 灰色网格 + Calibri + 假数据表格
   */
  function renderExcelDisguise() {
    const rows = [
      ['', 'A', 'B', 'C', 'D', 'E'],
      ['1', '产品线', 'Q1', 'Q2', 'Q3(Fcst)', 'YoY%'],
      ['2', '华东区', '2,450', '2,680', '2,910', '+8.6%'],
      ['3', '华南区', '1,890', '2,010', '2,150', '+5.9%'],
      ['4', '华北区', '3,120', '3,340', '3,510', '+4.8%'],
      ['5', '西南区', '980', '1,050', '1,130', '+15.2%'],
      ['6', '海外', '4,560', '4,780', '5,020', '+5.1%'],
      ['7', '', '', '', '', ''],
      ['8', '合计', '13,000', '13,860', '14,720', '+6.3%'],
    ];

    const headerCells = rows[0].map((h, i) =>
      `<th style="border:1px solid #c0c0c0;padding:4px 12px;background:#f0f0f0;font-weight:400;color:#444;font-size:12px">${h}</th>`
    ).join('');

    const dataRows = rows.slice(1).map((row, ri) => {
      const cells = row.map((cell, ci) => {
        const isHeader = ci === 0;
        const style = isHeader
          ? 'border:1px solid #c0c0c0;padding:4px 12px;background:#f0f0f0;color:#888;font-size:11px;text-align:center'
          : `border:1px solid #d9d9d9;padding:4px 12px;font-size:12px;${ri === rows.length - 2 ? 'font-weight:700;background:#fafafa' : ''}`;
        return `<td style="${style}">${cell}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <div style="font-family:Calibri,'Microsoft YaHei',sans-serif;background:#fff;min-height:100vh;color:#333">
        <!-- 顶部工具栏 -->
        <div style="background:#f0f0f0;border-bottom:1px solid #d0d0d0;padding:6px 12px;display:flex;align-items:center;gap:12px;font-size:12px;color:#555">
          <span>📁 文件</span><span>🏠 开始</span><span>📥 插入</span><span>📄 页面布局</span><span>📊 公式</span><span>📋 数据</span><span>👁 审阅</span><span>📖 视图</span>
        </div>
        <!-- 公式栏 -->
        <div style="display:flex;align-items:center;border-bottom:1px solid #d0d0d0;padding:4px 12px;gap:8px;font-size:11px">
          <span style="background:#fff;border:1px solid #c0c0c0;padding:2px 8px;min-width:40px;text-align:center">B9</span>
          <span style="color:#888">fx</span>
          <span style="color:#333">=SUM(B2:B6)</span>
        </div>
        <!-- 表格 -->
        <table style="border-collapse:collapse;margin:0;font-size:12px">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${dataRows}</tbody>
        </table>
        <!-- 底部状态栏 -->
        <div style="position:fixed;bottom:0;left:0;right:0;background:#f0f0f0;border-top:1px solid #d0d0d0;padding:4px 12px;display:flex;justify-content:space-between;font-size:11px;color:#666">
          <span>就绪</span>
          <span>Sheet1  ⬆️  ⬇️  求和:14,720  📊  100%</span>
        </div>
      </div>
    `;
  }

  /**
   * Word 伪装 — 白色文档 + 段落格式 + 周报外观
   */
  function renderWordDisguise() {
    return `
      <div style="font-family:'Times New Roman','Microsoft YaHei',serif;background:#e8e8e8;min-height:100vh;display:flex;justify-content:center;padding-top:20px">
        <div style="width:210mm;background:#fff;min-height:280mm;box-shadow:0 2px 12px rgba(0,0,0,0.15);padding:25mm 20mm;color:#333">
          <!-- 工具栏模拟 -->
          <div style="background:#f5f5f5;border-bottom:1px solid #ddd;padding:8px 16px;margin:-25mm -20mm 20px;position:sticky;top:0;font-size:12px;color:#666;display:flex;gap:16px">
            <span>📁 文件</span><span>🏠 开始</span><span>📥 插入</span><span>🎨 设计</span><span>📄 布局</span><span>📖 引用</span><span>📧 邮件</span><span>👁 审阅</span><span>📋 视图</span>
          </div>
          <h2 style="text-align:center;font-size:16pt;margin-bottom:20px;font-family:'SimHei','Microsoft YaHei',sans-serif">第24周工作总结与下周计划</h2>
          <p style="text-indent:2em;line-height:1.8;font-size:12pt;margin-bottom:8px"><strong>一、本周工作完成情况</strong></p>
          <p style="text-indent:2em;line-height:1.8;font-size:12pt;margin-bottom:8px">本周完成了Q3项目第二阶段的数据迁移工作，共计处理数据表42张，迁移记录约380万条，系统运行平稳，未出现数据丢失或服务中断情况。</p>
          <p style="text-indent:2em;line-height:1.8;font-size:12pt;margin-bottom:8px">完成了前端Dashboard页面的重构工作，将原有的jQuery组件全部替换为Vue3组件，页面加载速度提升约35%。</p>
          <p style="text-indent:2em;line-height:1.8;font-size:12pt;margin-bottom:8px"><strong>二、下周工作计划</strong></p>
          <p style="text-indent:2em;line-height:1.8;font-size:12pt;margin-bottom:8px">1. 启动Q3项目第三阶段的测试环境搭建；2. 配合运维团队完成服务器扩容评估；3. 编写数据迁移流程文档。</p>
          <p style="text-indent:2em;line-height:1.8;font-size:12pt;margin-top:30px;text-align:right">汇报人：__________</p>
          <p style="text-indent:2em;line-height:1.8;font-size:12pt;text-align:right">日期：2026年6月3日</p>
        </div>
      </div>
    `;
  }

  /**
   * VSCode 伪装 — 暗色编辑器 + 代码字体
   */
  function renderVSCodeDisguise() {
    const codeLines = [
      { num: 1, text: 'import { defineConfig } from \'vite\';' },
      { num: 2, text: 'import vue from \'@vitejs/plugin-vue\';' },
      { num: 3, text: '' },
      { num: 4, text: 'export default defineConfig({' },
      { num: 5, text: '  plugins: [vue()],' },
      { num: 6, text: '  server: {' },
      { num: 7, text: '    port: 5173,' },
      { num: 8, text: '    proxy: {' },
      { num: 9, text: '      \'/api\': {' },
      { num: 10, text: '        target: \'http://localhost:8000\',' },
      { num: 11, text: '        changeOrigin: true,' },
      { num: 12, text: '      },' },
      { num: 13, text: '    },' },
      { num: 14, text: '  },' },
      { num: 15, text: '  build: {' },
      { num: 16, text: '    outDir: \'dist\',' },
      { num: 17, text: '    sourcemap: true,' },
      { num: 18, text: '  },' },
      { num: 19, text: '});' },
    ];

    const linesHTML = codeLines.map(l => {
      const escaped = l.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      // 简易语法高亮
      const highlighted = escaped
        .replace(/(import|export|from|default|const|let|true|false)/g, '<span style="color:#569cd6">$1</span>')
        .replace(/('[^']*')/g, '<span style="color:#ce9178">$1</span>')
        .replace(/(\{|\}|\[|\]|\(|\))/g, '<span style="color:#ffd700">$1</span>');
      return `<div style="display:flex;line-height:1.6;font-size:13px">
        <span style="color:#858585;min-width:48px;text-align:right;padding-right:16px;user-select:none">${l.num}</span>
        <span>${highlighted || '&nbsp;'}</span>
      </div>`;
    }).join('');

    return `
      <div style="font-family:'Consolas','Courier New','Microsoft YaHei',monospace;background:#1e1e1e;min-height:100vh;color:#d4d4d4">
        <!-- 标题栏 -->
        <div style="background:#323233;padding:4px 12px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#ccc">
          <span style="display:flex;align-items:center;gap:8px">
            <span>📄 vite.config.ts — fastcet</span>
            <span style="background:#e5c07b;color:#282c34;border-radius:50%;width:8px;height:8px;display:inline-block"></span>
          </span>
          <span style="display:flex;gap:12px">─ □ ✕</span>
        </div>
        <!-- 侧边栏模拟 -->
        <div style="display:flex;">
          <div style="width:48px;background:#333;min-height:calc(100vh-28px);display:flex;flex-direction:column;align-items:center;padding-top:8px;gap:12px;font-size:16px">
            <span title="资源管理器">📁</span><span title="搜索">🔍</span><span title="Git">⎇</span><span title="调试">🐛</span><span title="扩展">🧩</span>
          </div>
          <!-- 编辑器区域 -->
          <div style="flex:1;padding:16px 0;overflow:hidden">
            ${linesHTML}
          </div>
        </div>
        <!-- 底部状态栏 -->
        <div style="position:fixed;bottom:0;left:0;right:0;background:#007acc;padding:2px 12px;display:flex;justify-content:space-between;font-size:11px;color:#fff">
          <span>main ⬆️ TypeScript 4.9</span>
          <span>Ln 10, Col 16 ⚠️ 0 ⚠️ 0 UTF-8 LF</span>
        </div>
      </div>
    `;
  }

  /**
   * 微信伪装 — 聊天界面 + 学习内容藏在对话中
   */
  function renderWechatDisguise() {
    const messages = [
      { side: 'left', avatar: '👤', name: '老王(项目经理)', text: '大家注意一下，Q3的进度需要再抓抓紧', time: '14:30' },
      { side: 'right', avatar: '🙂', name: '', text: '收到，我这边数据迁移已经做完了', time: '14:32' },
      { side: 'left', avatar: '👤', name: '老王(项目经理)', text: '好的，明天下午3点开个进度同步会', time: '14:33' },
      { side: 'right', avatar: '🙂', name: '', text: 'OK，我把这周的周报也更新一下', time: '14:35' },
      { side: 'left', avatar: '👩', name: '小李-前端', text: 'Dashboard重构完成了，性能提升了35%', time: '14:36' },
      { side: 'right', avatar: '🙂', name: '', text: '赞👍 我这边测试环境也快搭好了', time: '14:38' },
      { side: 'left', avatar: '👤', name: '老王(项目经理)', text: '大家辛苦了，这周末争取不用加班', time: '14:40' },
      { side: 'right', avatar: '🙂', name: '', text: '太好了，那我提前把文档整理出来', time: '14:41' },
    ];

    const messagesHTML = messages.map(m =>
      m.side === 'left'
        ? `<div style="display:flex;gap:10px;margin-bottom:16px;align-items:flex-start">
            <div style="width:36px;height:36px;border-radius:4px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${m.avatar}</div>
            <div>
              <div style="font-size:12px;color:#999;margin-bottom:2px">${m.name}</div>
              <div style="background:#fff;padding:10px 14px;border-radius:4px;max-width:280px;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,0.05)">${m.text}</div>
            </div>
          </div>`
        : `<div style="display:flex;gap:10px;margin-bottom:16px;align-items:flex-start;justify-content:flex-end">
            <div style="text-align:right">
              <div style="background:#95ec69;padding:10px 14px;border-radius:4px;max-width:280px;line-height:1.5">${m.text}</div>
            </div>
            <div style="width:36px;height:36px;border-radius:4px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${m.avatar}</div>
          </div>`
    ).join('');

    return `
      <div style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#ededed;min-height:100vh">
        <!-- 顶部导航 -->
        <div style="background:#ededed;padding:8px 16px;text-align:center;font-size:16px;font-weight:600;color:#333;border-bottom:1px solid #d9d9d9;position:sticky;top:0;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:20px">←</span>
          <span>项目群聊 (8)</span>
          <span style="font-size:20px">⋯</span>
        </div>
        <!-- 消息区 -->
        <div style="padding:16px;max-width:600px;margin:0 auto">
          ${messagesHTML}
        </div>
        <!-- 底部输入框 -->
        <div style="position:fixed;bottom:0;left:0;right:0;background:#f7f7f7;border-top:1px solid #d9d9d9;padding:8px 16px;display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">🎤</span>
          <input type="text" disabled placeholder="按住说话" style="flex:1;background:#fff;border:1px solid #ddd;border-radius:4px;padding:8px 12px;font-size:14px;color:#999">
          <span style="font-size:20px">😊</span>
          <span style="font-size:20px">➕</span>
        </div>
      </div>
    `;
  }

  /**
   * 百科伪装 — 学术风格 + 知识卡片
   */
  function renderWikiDisguise() {
    return `
      <div style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#f8f9fa;min-height:100vh;color:#333">
        <!-- 顶部 -->
        <div style="background:#fff;border-bottom:1px solid #e0e0e0;padding:8px 16px;display:flex;align-items:center;gap:16px;font-size:13px">
          <span style="font-size:20px">📚</span>
          <span style="color:#0645ad">百科</span>
          <input type="text" disabled value="CET-4 大学英语四级考试" style="flex:1;border:1px solid #ddd;border-radius:2px;padding:4px 8px;font-size:13px;max-width:400px">
          <span style="color:#555">🔍 搜索</span>
        </div>
        <!-- 内容 -->
        <div style="max-width:800px;margin:0 auto;padding:24px 32px;background:#fff;min-height:calc(100vh-42px);box-shadow:0 1px 4px rgba(0,0,0,0.05)">
          <h1 style="font-size:24px;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:16px">大学英语四级考试</h1>
          <p style="font-size:12px;color:#888;margin-bottom:20px">本词条由"科普中国"科学百科词条编写与应用工作项目审核。</p>
          <div style="background:#f8f9fa;border:1px solid #e0e0e0;padding:12px 16px;margin-bottom:20px;font-size:13px;line-height:1.8">
            <p>大学英语四级考试（College English Test Band 4，简称CET-4）是由中华人民共和国教育部高等教育司主办的全国性英语考试。</p>
            <p>考试对象为修完大学英语相应阶段课程的在校大学生。考试时间为每年6月和12月。</p>
          </div>
          <h3 style="font-size:16px;border-left:3px solid #0645ad;padding-left:8px;margin:20px 0 12px">考试结构</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
            <tr style="background:#f0f0f0"><th style="border:1px solid #ddd;padding:8px;text-align:left">部分</th><th style="border:1px solid #ddd;padding:8px">时间(分钟)</th><th style="border:1px solid #ddd;padding:8px">分数</th></tr>
            <tr><td style="border:1px solid #ddd;padding:8px">写作</td><td style="border:1px solid #ddd;padding:8px;text-align:center">30</td><td style="border:1px solid #ddd;padding:8px;text-align:center">106.5</td></tr>
            <tr><td style="border:1px solid #ddd;padding:8px">听力理解</td><td style="border:1px solid #ddd;padding:8px;text-align:center">25</td><td style="border:1px solid #ddd;padding:8px;text-align:center">248.5</td></tr>
            <tr><td style="border:1px solid #ddd;padding:8px">阅读理解</td><td style="border:1px solid #ddd;padding:8px;text-align:center">40</td><td style="border:1px solid #ddd;padding:8px;text-align:center">248.5</td></tr>
            <tr><td style="border:1px solid #ddd;padding:8px">翻译</td><td style="border:1px solid #ddd;padding:8px;text-align:center">30</td><td style="border:1px solid #ddd;padding:8px;text-align:center">106.5</td></tr>
          </table>
          <p style="font-size:13px;color:#888;margin-top:30px;text-align:center">最后编辑于 2026-05-15 · 贡献者 127 人</p>
        </div>
      </div>
    `;
  }

  /**
   * 终端伪装 — 黑色终端 + 绿色等宽字体
   */
  function renderTerminalDisguise() {
    const lines = [
      '$ cd /projects/fastcet && git log --oneline -10',
      'a1b2c3d (HEAD -> main) feat: add dashboard report module',
      'e4f5g6h refactor: migrate jQuery to Vue3 components',
      'i7j8k9l fix: resolve data migration edge case',
      'm0n1o2p chore: update dependencies',
      'q3r4s5t feat: add Q3 progress tracking',
      'u6v7w8x docs: update API documentation',
      'y9z0a1b perf: optimize database queries',
      '',
      '$ npm run build',
      '✓ 1542 modules transformed.',
      '✓ built in 12.34s',
      '',
      '$ docker-compose up -d',
      'Creating fastcet-db ... done',
      'Creating fastcet-api ... done',
      'Creating fastcet-nginx ... done',
      '',
      '$ _',
    ];

    const linesHTML = lines.map(l =>
      `<div style="line-height:1.6;font-size:13px;${l.startsWith('$') ? 'color:#4ec9b0' : ''}">${l || '&nbsp;'}</div>`
    ).join('');

    return `
      <div style="font-family:'Consolas','Courier New',monospace;background:#0c0c0c;min-height:100vh;color:#cccccc;padding:16px">
        <!-- 标题栏 -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:11px;color:#888">
          <span style="background:#ff5f57;width:12px;height:12px;border-radius:50%"></span>
          <span style="background:#ffbd2e;width:12px;height:12px;border-radius:50%"></span>
          <span style="background:#28ca41;width:12px;height:12px;border-radius:50%"></span>
          <span style="margin-left:12px">Terminal — zsh — 80×24</span>
        </div>
        ${linesHTML}
      </div>
    `;
  }

  // ── 显示/隐藏逻辑 ─────────────────────────────────

  /**
   * 触发伪装 (隐藏真实内容)
   */
  function hide() {
    if (isHidden) return;

    if (!overlayEl) createOverlay();

    // 更新伪装内容为当前主题
    overlayEl.innerHTML = renderDisguiseContent(currentDisguise);

    // 保存原始状态
    originalTitle = document.title;
    const faviconEl = document.querySelector('link[rel="icon"]');
    if (faviconEl) {
      originalFaviconHref = faviconEl.href;
      faviconLink = faviconEl;
    }

    // 冻结 GSAP 全局时间线 (如果 GSAP 可用)
    if (typeof gsap !== 'undefined' && gsap.globalTimeline) {
      gsap.globalTimeline.pause();
    }

    // 显示叠加层
    overlayEl.style.opacity = '1';
    overlayEl.style.pointerEvents = 'auto';

    // 修改标题和图标
    const d = DISGUISES[currentDisguise];
    document.title = d.title;
    updateFavicon(d.favicon);

    isHidden = true;
    panicCount++;

    window.dispatchEvent(new CustomEvent('bosskey:hide', {
      detail: { disguise: currentDisguise, panicCount },
    }));
  }

  /**
   * 取消伪装 (恢复真实内容)
   */
  function show() {
    if (!isHidden) return;

    // 隐藏叠加层
    overlayEl.style.opacity = '0';
    overlayEl.style.pointerEvents = 'none';

    // 恢复 GSAP
    if (typeof gsap !== 'undefined' && gsap.globalTimeline) {
      gsap.globalTimeline.resume();
    }

    // 恢复标题和图标
    document.title = originalTitle;
    if (faviconLink) {
      faviconLink.href = originalFaviconHref;
    }

    isHidden = false;

    window.dispatchEvent(new CustomEvent('bosskey:show', {
      detail: { disguise: currentDisguise },
    }));
  }

  /**
   * 切换伪装状态
   */
  function toggle() {
    isHidden ? show() : hide();
  }

  // ── 伪装主题切换 ──────────────────────────────────

  /**
   * 切换伪装主题
   */
  function setDisguise(key) {
    if (!DISGUISES[key]) return;
    currentDisguise = key;
    localStorage.setItem(STORAGE_DISGUISE, key);

    // 如果当前处于伪装状态, 更新内容
    if (isHidden && overlayEl) {
      overlayEl.innerHTML = renderDisguiseContent(key);
      document.title = DISGUISES[key].title;
      updateFavicon(DISGUISES[key].favicon);
    }

    window.dispatchEvent(new CustomEvent('bosskey:disguisechange', {
      detail: { disguise: key },
    }));
  }

  /**
   * 循环切换伪装主题
   */
  function cycleDisguise() {
    const keys = Object.keys(DISGUISES);
    const idx = keys.indexOf(currentDisguise);
    const next = keys[(idx + 1) % keys.length];
    setDisguise(next);
  }

  // ── Favicon 更新 ──────────────────────────────────

  /**
   * 用 emoji 动态生成 favicon
   */
  function updateFavicon(emoji) {
    // 查找或创建 favicon link
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
      faviconLink = link;
    }

    // 用 canvas 将 emoji 渲染为 favicon
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 16, 16);

    link.href = canvas.toDataURL('image/png');
  }

  // ── 键盘快捷键 ───────────────────────────────────

  /**
   * 键盘事件处理
   */
  function handleKeydown(e) {
    // 在输入框中不拦截键盘事件 (用户可以正常打字)
    const tag = document.activeElement?.tagName?.toLowerCase();
    const isEditable = document.activeElement?.isContentEditable;
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || isEditable) {
      return;
    }

    const key = e.key;

    // Boss Key 触发 (最高优先级)
    if (key === PANIC_KEY && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      toggle();
      return;
    }

    // Ctrl+` 备用键
    if (key === PANIC_KEY_ALT && e.ctrlKey) {
      e.preventDefault();
      toggle();
      return;
    }

    // 伪装状态下: 只响应 Boss Key (取消伪装) 和 h (切换主题)
    if (isHidden) {
      if (key === 'h' || key === 'H') {
        e.preventDefault();
        cycleDisguise();
      }
      return;
    }

    // 仅在 stealth 模式下处理快捷键
    const currentMode = document.documentElement.getAttribute('data-mode');
    if (currentMode !== 'stealth') return;

    const action = KEYMAP[key];
    if (!action) return;

    e.preventDefault();

    // 派发键盘操作事件 (由页面具体逻辑处理)
    window.dispatchEvent(new CustomEvent('bosskey:action', {
      detail: { action, key, timestamp: Date.now() },
    }));

    switch (action) {
      case 'panic':
        toggle();
        break;
      case 'cycle-theme':
        cycleDisguise();
        // 显示当前主题提示
        showDisguiseToast();
        break;
      case 'next':
      case 'prev':
      case 'option-a':
      case 'option-b':
      case 'option-c':
      case 'option-d':
      case 'submit':
      case 'flag':
      case 'skip':
      case 'review':
        // 这些由 bosskey:action 事件处理, 此处仅做日志
        break;
    }
  }

  /**
   * 显示伪装主题切换的小提示
   */
  function showDisguiseToast() {
    const toast = document.createElement('div');
    toast.textContent = `伪装主题: ${DISGUISES[currentDisguise].name} ${DISGUISES[currentDisguise].icon}`;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: #fff;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 13px;
      z-index: 999999;
      pointer-events: none;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  }

  // ── 光标抖动检测 ─────────────────────────────────

  /**
   * 鼠标移动抖动检测
   * 阈值: 累积幅度 > 50px 且 在 300ms 内 → 触发 Boss Key
   * 衰减: 每秒衰减 0.3 (自然衰减避免误触发)
   */
  function handleMouseMove(e) {
    const now = performance.now();
    const dt = (now - shakeState.lastTime) / 1000; // 秒

    if (shakeState.lastTime > 0 && dt > 0) {
      // 计算位移
      const dx = Math.abs(e.clientX - shakeState.lastX);
      const dy = Math.abs(e.clientY - shakeState.lastY);
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 时间衰减
      shakeState.magnitude = Math.max(0,
        shakeState.magnitude * Math.pow(1 - shakeState.decayRate, dt)
      );

      // 累加新的位移
      shakeState.magnitude += distance;

      // 触发阈值: 累积幅度 > 50
      if (shakeState.magnitude > 50 && !isHidden) {
        hide();
        shakeState.magnitude = 0; // 重置防止连续触发
      }
    }

    shakeState.lastX = e.clientX;
    shakeState.lastY = e.clientY;
    shakeState.lastTime = now;
  }

  // ── 鼠标中键最小化 ───────────────────────────────

  /**
   * 鼠标中键 → 缩小窗口至 400×300 (模拟最小化到角落)
   * 仅在 stealth 模式下生效
   */
  function handleMouseDown(e) {
    if (e.button !== 1) return; // 仅中键
    const currentMode = document.documentElement.getAttribute('data-mode');
    if (currentMode !== 'stealth') return;

    e.preventDefault();
    // 派发事件, 由页面实现窗口缩放
    window.dispatchEvent(new CustomEvent('bosskey:minimize', {
      detail: { width: 400, height: 300 },
    }));
  }

  // ── 公开 API ─────────────────────────────────────

  /**
   * 获取当前伪装状态
   */
  function getState() {
    return {
      isHidden,
      disguise: currentDisguise,
      panicCount,
    };
  }

  /**
   * 获取键盘快捷键映射 (供页面展示快捷键帮助)
   */
  function getKeymap() {
    return { ...KEYMAP };
  }

  /**
   * 获取可用伪装主题列表
   */
  function getDisguises() {
    return Object.keys(DISGUISES).map(k => ({
      key: k,
      name: DISGUISES[k].name,
      icon: DISGUISES[k].icon,
    }));
  }

  // ── 初始化 ───────────────────────────────────────

  function init() {
    // 恢复用户偏好的伪装主题
    const saved = localStorage.getItem(STORAGE_DISGUISE);
    if (saved && DISGUISES[saved]) {
      currentDisguise = saved;
    }

    // 预创建叠加层 (但不显示)
    createOverlay();

    // 绑定全局事件
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mousedown', handleMouseDown);

    // 监听模式切换: 仅在 stealth 模式下启用特定功能
    window.addEventListener('modechange', (e) => {
      const { current } = e.detail;
      // 离开 stealth 模式时, 自动取消伪装
      if (current !== 'stealth' && isHidden) {
        show();
      }
    });

    console.log(
      `[BossKey] 初始化完成 — ${currentDisguise} 伪装就绪` +
      `${isHidden ? ' [已隐藏]' : ''}`
    );
  }

  // ── 导出 ─────────────────────────────────────────
  return {
    init,
    toggle,
    hide,
    show,
    setDisguise,
    cycleDisguise,
    getState,
    getKeymap,
    getDisguises,
    DISGUISES,
  };
})();

// ── 自动初始化 ──────────────────────────────────────
// 依赖 ModeManager, 在 mode-manager.js 之后加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化, 确保 ModeManager 已完成
    setTimeout(() => BossKey.init(), 100);
  });
} else {
  setTimeout(() => BossKey.init(), 100);
}
