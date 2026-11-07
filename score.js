(function (root) {
  'use strict';
  const f = Math.fround;
  const TARGET = 28001;
  const thresholds = [1, 10001, 15001, 20001, 24001, 28001];
  const grades = ['E', 'D', 'C', 'B', 'A', 'S'];

  function calculate(rounds, cities, merit) {
    if (!Number.isSafeInteger(rounds) || rounds < 1 || rounds > 9999 ||
        !Number.isSafeInteger(cities) || cities < 0 || cities > 10000 ||
        !Number.isSafeInteger(merit) || merit < 0 || merit > 1000999) {
      throw new RangeError('请输入范围内的非负整数，通关回合至少为 1。');
    }
    const ratio = f(f(100) / f(rounds));
    const rootRatio = f(Math.sqrt(ratio));
    const round = Math.trunc(f(rootRatio * f(10000)));
    const meritBase = f(f(Math.sqrt(f(merit))) * f(400));
    const meritScore = Math.trunc(f(meritBase * f(Math.sqrt(rootRatio))));
    const city = cities * 100;
    const total = round + meritScore + city;
    let grade = 'E';
    thresholds.forEach((threshold, index) => { if (total >= threshold) grade = grades[index]; });
    return { round, city, merit: meritScore, total, grade };
  }

  // Search the actual rounded formula so integer thresholds agree with the displayed score.
  function requiredMerit(rounds, cities) {
    if (calculate(rounds, cities, 0).total >= TARGET) return 0;
    if (calculate(rounds, cities, 1000999).total < TARGET) return null;
    let low = 0, high = 1000999;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (calculate(rounds, cities, middle).total >= TARGET) high = middle;
      else low = middle + 1;
    }
    return low;
  }

  function latestRound(cities, merit) {
    if (calculate(1, cities, merit).total < TARGET) return 0;
    let low = 1, high = 9999;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (calculate(middle, cities, merit).total >= TARGET) low = middle;
      else high = middle - 1;
    }
    return low;
  }

  const api = { calculate, requiredMerit, latestRound, TARGET, thresholds, grades };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WC4Score = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
