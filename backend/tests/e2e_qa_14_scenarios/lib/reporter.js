'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');

function buildSummaryCounts(results) {
  const counts = {
    total: results.length,
    pass: 0,
    fail: 0,
    na: 0,
    skip: 0,
    byApplicability: {
      APP: { pass: 0, fail: 0, skip: 0 },
      'API-ONLY': { pass: 0, fail: 0, skip: 0 },
      'N/A': { na: 0 },
    },
  };

  for (const r of results) {
    if (r.status === 'PASS') counts.pass++;
    else if (r.status === 'FAIL') counts.fail++;
    else if (r.status === 'N/A') counts.na++;
    else counts.skip++;

    const app = r.applicability || 'APP';
    if (!counts.byApplicability[app]) counts.byApplicability[app] = {};
    const key = r.status === 'PASS' ? 'pass' : r.status === 'FAIL' ? 'fail' : r.status === 'N/A' ? 'na' : 'skip';
    counts.byApplicability[app][key] = (counts.byApplicability[app][key] || 0) + 1;
  }

  return counts;
}

function formatMatrixMarkdown(results) {
  const cellMap = new Map();
  for (const r of results) {
    cellMap.set(`${r.feature}:S${r.scenario}`, r);
  }

  const lines = [];
  lines.push('| Feature | ' + config.scenarios.map((s) => `S${s}`).join(' | ') + ' |');
  lines.push('| :--- | ' + config.scenarios.map(() => ':---:').join(' | ') + ' |');

  for (const f of config.features) {
    const cells = config.scenarios.map((s) => {
      const r = cellMap.get(`${f}:S${s}`);
      if (!r) return '—';
      if (r.status === 'N/A') return 'N/A';
      if (r.status === 'PASS') return r.applicability === 'API-ONLY' ? 'PASS (API)' : 'PASS';
      if (r.status === 'FAIL') return r.applicability === 'API-ONLY' ? 'FAIL (API)' : 'FAIL';
      return r.status;
    });
    lines.push(`| **${f}** | ${cells.join(' | ')} |`);
  }

  return lines.join('\n');
}

function writeReport(outDir, reportPayload) {
  fs.mkdirSync(outDir, { recursive: true });

  const results = Array.isArray(reportPayload.results) ? reportPayload.results : [];
  const counts = buildSummaryCounts(results);

  const jsonPayload = {
    generatedAt: new Date().toISOString(),
    mode: reportPayload.mode || 'all',
    tier: reportPayload.tier || 'all',
    smoke: reportPayload.smoke || null,
    counts,
    results,
  };

  const jsonPath = path.join(outDir, 'results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), 'utf8');

  const md = [];
  md.push('# E2E QA 14-Scenario Verification Summary');
  md.push('');
  md.push(`- **Generated**: ${jsonPayload.generatedAt}`);
  md.push(`- **Mode**: \`${jsonPayload.mode}\` | **Tier**: \`${jsonPayload.tier}\``);
  md.push(`- **Results**: PASS=${counts.pass}, FAIL=${counts.fail}, N/A=${counts.na}, SKIP=${counts.skip} (Total=${counts.total})`);
  md.push('');

  if (reportPayload.smoke) {
    md.push('## Smoke Infrastructure Checks');
    md.push('');
    md.push('| Check | Status | Details |');
    md.push('| :--- | :---: | :--- |');
    for (const chk of reportPayload.smoke.checks || []) {
      md.push(`| ${chk.name} | **${chk.status}** | ${String(chk.details || '').replace(/\|/g, '\\|')} |`);
    }
    md.push('');
  }

  if (results.length > 0) {
    md.push('## 14×14 Matrix (C1–C14 × S1–S14)');
    md.push('');
    md.push(formatMatrixMarkdown(results));
    md.push('');

    const failures = results.filter((r) => r.status === 'FAIL');
    if (failures.length > 0) {
      md.push('## Failures');
      md.push('');
      for (const f of failures) {
        md.push(`- **${f.feature} S${f.scenario}** (${f.applicability}, ${f.layer}): ${f.summary}${f.details ? ' — ' + f.details : ''}`);
      }
      md.push('');
    }
  }

  const mdPath = path.join(outDir, 'SUMMARY.md');
  fs.writeFileSync(mdPath, md.join('\n'), 'utf8');

  return { jsonPath, mdPath, counts };
}

module.exports = {
  buildSummaryCounts,
  formatMatrixMarkdown,
  writeReport,
};
