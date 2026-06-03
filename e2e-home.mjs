import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const tab = await ctx.newPage();

const errors = [];
tab.on('pageerror', err => errors.push(err.message));

await tab.goto('https://guanwenjie928.github.io/fast-cet/', { waitUntil: 'load', timeout: 30000 });
await tab.waitForTimeout(3000);

const title = await tab.title();
console.log('标题:', title);

// Homepage-specific elements
const hero = await tab.$('.hero');
const bentoCards = await tab.$$('.bento-card');
const statCards = await tab.$$('.stat-card');
const nav = await tab.$('.nav');
const cta = await tab.$('.cta-section');
const marquee = await tab.$('.marquee');
const learningPath = await tab.$('.learning-path');

console.log('Hero:', hero ? '✅' : '❌');
console.log('Bento卡片:', bentoCards.length);
console.log('统计卡片:', statCards.length);
console.log('导航栏:', nav ? '✅' : '❌');
console.log('CTA区域:', cta ? '✅' : '❌');
console.log('跑马灯:', marquee ? '✅' : '❌');
console.log('学习路径:', learningPath ? '✅' : '❌');
console.log('JS错误:', errors.length, errors.length > 0 ? errors : '');

// Check if navigation links work
const navLinks = await tab.$$('.nav__links a');
console.log('导航链接数:', navLinks.length);

await ctx.close();
await browser.close();
