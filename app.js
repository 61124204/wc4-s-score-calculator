'use strict';
const $ = id => document.getElementById(id);
const format = value => new Intl.NumberFormat('zh-CN').format(value);
const defaults = { rounds: 40, cities: 30, remaining: 200, spent: 200 };
const inputs = Object.keys(defaults);
let lastState = { ...defaults };
const parameters = new URLSearchParams(location.search);

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
  $('merit-total').textContent = format(merit);
  $('total-score').textContent = format(result.total);
  $('grade-letter').textContent = result.grade;
  $('score-message').textContent = result.total >= target ? `已达到 S 评级，领先门槛 ${format(result.total - target)} 分。` : `距离 S 评级还差 ${format(target - result.total)} 分。`;
  ['round', 'city', 'merit'].forEach(key => { $(key + '-score').textContent = format(result[key]); });
  const needed = WC4Score.requiredMerit(rounds, cities);
  $('needed-merit').textContent = needed === null ? '超出范围' : format(needed);
  $('merit-plan').textContent = needed === null ? '在本工具的功勋输入范围内暂时无法达到 S。' : `保持 ${rounds} 回合、${cities} 座城市，累计至少需要 ${format(needed)} 点。`;
  $('merit-plan-foot').textContent = needed === null ? '尝试更早通关或增加城市' : merit >= needed ? '当前已满足' : `还需累计 ${format(needed - merit)} 点功勋`;
  const latest = WC4Score.latestRound(cities, merit);
  $('latest-round').textContent = latest === 0 ? '暂不可达' : latest === 9999 ? '≥ 9,999' : format(latest);
  $('latest-unit').textContent = latest === 0 ? '' : '回合';
  $('round-plan').textContent = `保持 ${cities} 座城市、${format(merit)} 点功勋，${latest === 0 ? '需要增加功勋或城市才能拿到 S。' : '计算最晚通关时间。'}`;
  $('round-plan-foot').textContent = latest === 9999 ? '已达到计算回合上限' : latest === 0 ? '调整输入查看新的目标' : rounds <= latest ? `当前还可用 ${format(latest - rounds)} 回合` : `需提前 ${format(rounds - latest)} 回合通关`;
}

inputs.forEach(id => {
  if (parameters.has(id)) $(id).value = parameters.get(id);
  $(id).addEventListener('input', update);
});
$('calculator').addEventListener('submit', event => event.preventDefault());
$('reset').addEventListener('click', () => { inputs.forEach(id => { $(id).value = defaults[id]; }); update(); });
$('share').addEventListener('click', async () => {
  const url = new URL(location.href);
  url.search = new URLSearchParams(lastState).toString();
  try {
    await navigator.clipboard.writeText(url.href);
    $('share').textContent = '战局链接已复制 ✓';
    $('share-status').textContent = '战局链接已复制，可分享给朋友。';
  } catch (_) {
    $('share-status').textContent = '浏览器未允许复制，请手动复制下方链接。';
    window.prompt('复制战局链接', url.href);
  }
});
update();
