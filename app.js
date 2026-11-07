'use strict';
const $ = id => document.getElementById(id);
const format = value => new Intl.NumberFormat('zh-CN').format(value);
const defaults = { rounds: 40, cities: 30, remaining: 200, spent: 200 };
const inputs = Object.keys(defaults);
let lastState = { ...defaults };
const parameters = new URLSearchParams(location.search);

function setTheme(theme) {
  if (!['field', 'paper', 'night'].includes(theme)) theme = 'field';
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
  });
  document.querySelector('meta[name="theme-color"]').content = { field: '#18231e', paper: '#f3f2ed', night: '#0b101b' }[theme];
  try { localStorage.setItem('wc4-score-theme', theme); } catch (_) { /* Themes work when storage is blocked. */ }
}

function chart(state) {
  const { rounds, cities, remaining, spent } = state;
  const merit = remaining + spent;
  const start = Math.max(1, Math.floor(rounds * .3));
  const end = Math.min(9999, Math.max(start + 1, Math.ceil(rounds * 2)));
  const values = Array.from({ length: 81 }, (_, i) => {
    const r = Math.round(start + (end - start) * i / 80);
    return { r, s: WC4Score.calculate(r, cities, merit).total };
  });
  const min = Math.max(0, Math.floor(Math.min(WC4Score.TARGET, values[80].s) * .85 / 5000) * 5000);
  const max = Math.ceil(Math.max(WC4Score.TARGET * 1.15, values[0].s) / 5000) * 5000;
  const x = r => 54 + (r - start) / (end - start) * 912;
  const y = s => 174 - (s - min) / (max - min) * 150;
  const current = WC4Score.calculate(rounds, cities, merit).total;
  const coords = values.map(v => `${x(v.r).toFixed(2)},${y(v.s).toFixed(2)}`);
  let grid = '';
  for (let i = 0; i < 4; i++) {
    const score = min + (max - min) * i / 3;
    grid += `<line class="grid-line" x1="54" y1="${y(score)}" x2="966" y2="${y(score)}"/><text x="42" y="${y(score) + 3}" text-anchor="end">${Math.round(score / 1000)}k</text>`;
  }
  for (let i = 0; i < 6; i++) {
    const r = Math.round(start + (end - start) * i / 5);
    grid += `<text x="${x(r)}" y="198" text-anchor="middle">${r} 回合</text>`;
  }
  const cx = x(rounds), cy = y(current), ty = y(WC4Score.TARGET);
  $('chart').innerHTML = `<svg viewBox="0 0 1000 216" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".13"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>${grid}<path d="M${coords.join(' L')} L966,174 L54,174 Z" fill="url(#chart-fill)" style="color:var(--chart)"/><line class="target-line" x1="54" y1="${ty}" x2="966" y2="${ty}"/><text class="target-label" x="964" y="${ty - 7}" text-anchor="end">S · 28,001</text><polyline class="score-line" points="${coords.join(' ')}"/><line class="current-line" x1="${cx}" y1="${cy}" x2="${cx}" y2="174"/><circle class="current-dot" cx="${cx}" cy="${cy}" r="4"/><text class="current-label" x="${cx + 10}" y="${cy - 10}">当前 ${rounds} 回合 · ${format(current)}</text></svg>`;
  $('chart').setAttribute('aria-label', `保持 ${cities} 座城市和 ${merit} 点功勋，${start} 至 ${end} 回合的预估评分曲线。当前总分 ${current}，S 门槛 28001。`);
}

function update() {
  const state = {};
  let error = '';
  for (const id of inputs) {
    const input = $(id);
    const raw = input.value.trim();
    const value = Number(raw);
    const valid = raw !== '' && Number.isSafeInteger(value) && value >= Number(input.min) && value <= Number(input.max);
    input.setAttribute('aria-invalid', String(!valid));
    if (!valid && !error) error = `${input.labels[0].childNodes[0].textContent}请输入 ${input.min}–${format(Number(input.max))} 的整数。`;
    state[id] = value;
  }
  $('input-error').textContent = error;
  $('share').disabled = Boolean(error);
  $('result-title').textContent = error ? '请先完善战局数据' : '战斗评分预估';
  if (error) return;
  lastState = state;
  const { rounds, cities, remaining, spent } = state;
  const merit = remaining + spent;
  const result = WC4Score.calculate(rounds, cities, merit);
  const target = WC4Score.TARGET;
  $('round-slider').value = Math.min(rounds, 150);
  $('merit-total').textContent = format(merit);
  $('total-score').textContent = format(result.total);
  $('grade-letter').textContent = result.grade;
  $('score-message').textContent = result.total >= target ? `已达到 S 评级，领先门槛 ${format(result.total - target)} 分。` : `距离 S 评级还差 ${format(target - result.total)} 分。`;
  const progress = Math.min(100, result.total / target * 100);
  $('progress-label').textContent = `${progress.toFixed(progress >= 100 ? 0 : 1)}%`;
  $('progress-fill').style.width = `${progress}%`;
  ['round', 'city', 'merit'].forEach(key => {
    $(key + '-score').textContent = format(result[key]);
    $(key + '-bar').style.width = `${result.total ? result[key] / result.total * 100 : 0}%`;
  });
  document.querySelectorAll('[data-grade]').forEach(item => item.classList.toggle('current-grade', item.dataset.grade === result.grade));
  const needed = WC4Score.requiredMerit(rounds, cities);
  $('needed-merit').textContent = needed === null ? '超出范围' : format(needed);
  $('merit-plan').textContent = needed === null ? '在本工具的功勋输入范围内暂时无法达到 S。' : `保持 ${rounds} 回合、${cities} 座城市，累计至少需要 ${format(needed)} 点。`;
  $('merit-plan-foot').textContent = needed === null ? '尝试更早通关或增加城市' : merit >= needed ? '当前已满足' : `还需累计 ${format(needed - merit)} 点功勋`;
  const latest = WC4Score.latestRound(cities, merit);
  $('latest-round').textContent = latest === 0 ? '暂不可达' : latest === 9999 ? '≥ 9,999' : format(latest);
  $('latest-unit').textContent = latest === 0 ? '' : '回合';
  $('round-plan').textContent = `保持 ${cities} 座城市、${format(merit)} 点功勋，${latest === 0 ? '需要增加功勋或城市才能拿到 S。' : '计算最晚通关时间。'}`;
  $('round-plan-foot').textContent = latest === 9999 ? '已达到计算回合上限' : latest === 0 ? '调整输入查看新的目标' : rounds <= latest ? `当前还可用 ${format(latest - rounds)} 回合` : `需提前 ${format(rounds - latest)} 回合通关`;
  chart(state);
}

inputs.forEach(id => {
  if (parameters.has(id)) $(id).value = parameters.get(id);
  $(id).addEventListener('input', update);
});
$('calculator').addEventListener('submit', event => event.preventDefault());
$('round-slider').addEventListener('input', event => { $('rounds').value = event.target.value; update(); });
$('reset').addEventListener('click', () => { inputs.forEach(id => { $(id).value = defaults[id]; }); update(); });
document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.themeChoice)));
$('share').addEventListener('click', async () => {
  const url = new URL(location.href);
  url.search = new URLSearchParams({ ...lastState, theme: document.documentElement.dataset.theme }).toString();
  try {
    await navigator.clipboard.writeText(url.href);
    $('share').textContent = '战局链接已复制 ✓';
    $('share-status').textContent = '战局链接已复制，可分享给朋友。';
  } catch (_) {
    $('share-status').textContent = '浏览器未允许复制，请手动复制下方链接。';
    window.prompt('复制战局链接', url.href);
  }
});
let savedTheme;
try { savedTheme = localStorage.getItem('wc4-score-theme'); } catch (_) { /* Storage is optional. */ }
setTheme(parameters.get('theme') || savedTheme || 'field');
update();
