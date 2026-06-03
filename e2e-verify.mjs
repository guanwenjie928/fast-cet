import { chromium } from 'playwright';

const BASE = 'https://guanwenjie928.github.io/fast-cet';

const pages = [
  { name: '首页', url: `${BASE}/` },
  { name: '真题', url: `${BASE}/pages/zhenti.html` },
  { name: '模拟题', url: `${BASE}/pages/moni.html` },
  { name: '听力', url: `${BASE}/pages/listening.html` },
  { name: '阅读', url: `${BASE}/pages/reading.html` },
  { name: '翻译', url: `${BASE}/pages/translation.html` },
  { name: '作文', url: `${BASE}/pages/writing.html` },
];

const results = [];
const browser = await chromium.launch({ headless: true });

for (const page of pages) {
  console.log(`\n=== 测试: ${page.name} (${page.url}) ===`);
  const ctx = await browser.newContext();
  const tab = await ctx.newPage();

  const errors = [];
  tab.on('pageerror', err => errors.push(err.message));

  try {
    await tab.goto(page.url, { waitUntil: 'load', timeout: 30000 });
    await tab.waitForTimeout(2000);

    // Check for skeleton placeholders still visible (data not loaded)
    const skeletons = await tab.$$('.skeleton');
    let skeletonVisible = 0;
    for (const sk of skeletons) {
      const visible = await sk.isVisible();
      if (visible) skeletonVisible++;
    }

    // Check for question/exam cards (content pages) or homepage-specific elements
    const isHomepage = page.name === '首页';
    const examCards = await tab.$$('.exam-card');
    const questionCards = await tab.$$('.question-card');
    const filterItems = await tab.$$('.filter-item');
    // Homepage uses different selectors
    const bentoCards = isHomepage ? await tab.$$('.bento-card') : [];
    const statCards = isHomepage ? await tab.$$('.stat-card') : [];
    const hero = isHomepage ? await tab.$('.hero') : null;

    // Check for empty-state text
    const emptyState = await tab.$('.empty-state');
    const emptyText = emptyState ? await emptyState.textContent() : null;

    // Check page title
    const title = await tab.title();

    const result = {
      name: page.name,
      title,
      errors: errors.length,
      errorMessages: errors.slice(0, 3),
      examCards: examCards.length,
      questionCards: questionCards.length,
      filterItems: filterItems.length,
      bentoCards: bentoCards.length,
      statCards: statCards.length,
      hero: !!hero,
      skeletonVisible,
      emptyText,
      status: 'UNKNOWN'
    };

    if (errors.length > 0) {
      result.status = 'ERRORS';
    } else if (emptyText && (examCards.length === 0 && questionCards.length === 0)) {
      result.status = 'NO_DATA';
    } else if (skeletonVisible > 0 && examCards.length === 0 && questionCards.length === 0 && !isHomepage) {
      result.status = 'SKELETON_ONLY';
    } else if (examCards.length > 0 || questionCards.length > 0 || filterItems.length > 0) {
      result.status = 'OK';
    } else if (isHomepage && (bentoCards.length > 0 || statCards.length > 0 || hero)) {
      result.status = 'OK';
    } else {
      result.status = 'CHECK_MANUALLY';
    }

    console.log(`  标题: ${title}`);
    if (isHomepage) {
      console.log(`  Hero: ${hero ? '✅' : '❌'}, Bento卡片: ${bentoCards.length}, 统计卡片: ${statCards.length}`);
    } else {
      console.log(`  试卷卡片: ${examCards.length}, 题目卡片: ${questionCards.length}, 筛选条目: ${filterItems.length}`);
    }
    console.log(`  Skeleton残留: ${skeletonVisible}, 空状态: ${emptyText || '无'}`);
    console.log(`  JS错误: ${errors.length} ${errors.length > 0 ? errors.slice(0, 3) : ''}`);
    console.log(`  >>> 状态: ${result.status}`);

    results.push(result);
  } catch (e) {
    console.log(`  ❌ 页面加载失败: ${e.message}`);
    results.push({ name: page.name, status: 'LOAD_FAILED', error: e.message });
  }

  await ctx.close();
}

await browser.close();

// Summary
console.log('\n\n========== 总结 ==========');
const pass = results.filter(r => r.status === 'OK');
const fail = results.filter(r => r.status !== 'OK');

console.log(`通过: ${pass.length}/${results.length}`);
pass.forEach(r => console.log(`  ✅ ${r.name}: ${r.examCards || r.questionCards || r.bentoCards || r.statCards || 0} 个卡片`));

if (fail.length > 0) {
  console.log(`失败: ${fail.length}/${results.length}`);
  fail.forEach(r => console.log(`  ❌ ${r.name}: ${r.status} — ${r.error || r.errorMessages?.join(', ') || ''}`));
}

// Exit code
process.exit(fail.length > 0 ? 1 : 0);
