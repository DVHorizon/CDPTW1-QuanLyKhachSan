'use strict';

/**
 * Hiển thị progress bar đơn giản cho console
 */
function start(message) {
  process.stdout.write(`\n${message}\n`);
  return { lastPercent: -1 };
}

function update(state, current, total, label = '') {
  const percent = Math.floor((current / total) * 100);
  if (percent === state.lastPercent) return;
  state.lastPercent = percent;

  const barLen = 25;
  const filled = Math.floor((barLen * current) / total);
  const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barLen - filled));

  process.stdout.write(
    `\r   ${bar} ${percent}% (${current.toLocaleString()}/${total.toLocaleString()}) ${label}`
  );
}

function finish(message) {
  console.log(`\n✅ ${message}\n`);
}

module.exports = { start, update, finish };
