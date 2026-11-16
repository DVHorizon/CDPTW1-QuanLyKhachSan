'use strict';

/**
 * runner.js - Master Test Runner for Grand Horizon E2E Services Track (C1-C14)
 * 
 * Usage:
 *   node backend/tests/e2e_services_c1_c14/runner.js
 *   node backend/tests/e2e_services_c1_c14/runner.js --tier=1
 *   node backend/tests/e2e_services_c1_c14/runner.js --feature=C1
 *   node backend/tests/e2e_services_c1_c14/runner.js --existing-only
 *   node backend/tests/e2e_services_c1_c14/runner.js --json
 */

const path = require('path');

// Parse CLI flags
const args = process.argv.slice(2);
const tierArg = args.find((a) => a.startsWith('--tier='))?.split('=')[1];
const featureArg = args.find((a) => a.startsWith('--feature='))?.split('=')[1]?.toUpperCase();
const existingOnly = args.includes('--existing-only') || args.includes('--target=existing');
const jsonOutput = args.includes('--json');

// Feature mappings
const TIER1_SUITES = [
  { feature: 'C1', file: './tier1_features/test_c01_service_crud.js', name: 'C1: Service CRUD' },
  { feature: 'C2', file: './tier1_features/test_c02_service_search.js', name: 'C2: Service Search' },
  { feature: 'C3', file: './tier1_features/test_c03_service_order.js', name: 'C3: Service Ordering' },
  { feature: 'C4', file: './tier1_features/test_c04_order_progress.js', name: 'C4: Order Progress & Kanban' },
  { feature: 'C5', file: './tier1_features/test_c05_core_payment.js', name: 'C5: Core Payment Module' },
  { feature: 'C6', file: './tier1_features/test_c06_folio_charges.js', name: 'C6: Folio Charges Aggregation' },
  { feature: 'C7', file: './tier1_features/test_c07_master_invoice.js', name: 'C7: Master Invoice Generation' },
  { feature: 'C8', file: './tier1_features/test_c08_invoice_pdf.js', name: 'C8: Invoice PDF Export' },
  { feature: 'C9', file: './tier1_features/test_c09_multi_tender.js', name: 'C9: Multi-Tender Settlement' },
  { feature: 'C10', file: './tier1_features/test_c10_invoice_ledger.js', name: 'C10: Invoice Ledger & History' },
  { feature: 'C11', file: './tier1_features/test_c11_revenue_dashboard.js', name: 'C11: Real-time Revenue Dashboard' },
  { feature: 'C12', file: './tier1_features/test_c12_occupancy_revpar.js', name: 'C12: Occupancy & RevPAR Statistics' },
  { feature: 'C13', file: './tier1_features/test_c13_ai_chatbot.js', name: 'C13: AI Concierge Chatbot' },
  { feature: 'C14', file: './tier1_features/test_c14_knowledge_base.js', name: 'C14: Knowledge Base Management' },
];

const TIER2_SUITES = [
  { feature: 'C1', file: './tier2_boundaries/test_c01_boundaries.js', name: 'C1: CRUD Boundaries' },
  { feature: 'C2', file: './tier2_boundaries/test_c02_boundaries.js', name: 'C2: Search & Filter Boundaries' },
  { feature: 'C3', file: './tier2_boundaries/test_c03_boundaries.js', name: 'C3: Ordering Boundaries' },
  { feature: 'C4', file: './tier2_boundaries/test_c04_boundaries.js', name: 'C4: State Machine Boundaries' },
  { feature: 'C5', file: './tier2_boundaries/test_c05_boundaries.js', name: 'C5: Payment Gateways Boundaries' },
  { feature: 'C6', file: './tier2_boundaries/test_c06_boundaries.js', name: 'C6: Folio Aggregation Boundaries' },
  { feature: 'C7', file: './tier2_boundaries/test_c07_boundaries.js', name: 'C7: Master Invoice Boundaries' },
  { feature: 'C8', file: './tier2_boundaries/test_c08_boundaries.js', name: 'C8: PDF Export Boundaries' },
  { feature: 'C9', file: './tier2_boundaries/test_c09_boundaries.js', name: 'C9: Multi-Tender Boundaries' },
  { feature: 'C10', file: './tier2_boundaries/test_c10_boundaries.js', name: 'C10: Ledger Query Boundaries' },
  { feature: 'C11', file: './tier2_boundaries/test_c11_boundaries.js', name: 'C11: Dashboard Range Boundaries' },
  { feature: 'C12', file: './tier2_boundaries/test_c12_boundaries.js', name: 'C12: RevPAR Statistics Boundaries' },
  { feature: 'C13', file: './tier2_boundaries/test_c13_boundaries.js', name: 'C13: Chatbot Guardrails & Boundaries' },
  { feature: 'C14', file: './tier2_boundaries/test_c14_boundaries.js', name: 'C14: Knowledge Base Boundaries' },
];

const TIER3_SUITES = [
  { file: './tier3_cross_feature/test_tier3_workflows.js', name: 'Tier 3: Cross-Feature Workflows (WF 3.1 - 3.5)' },
];

const TIER4_SUITES = [
  { file: './tier4_scenarios/test_tier4_lifecycle.js', name: 'Tier 4: Real-World Scenarios (SC 4.1 & 4.2)' },
];

async function main() {
  const startTime = Date.now();
  const summaryReport = {
    startedAt: new Date().toISOString(),
    tiers: {},
    totals: { total: 0, passed: 0, failed: 0, pending: 0, skipped: 0 },
    suites: [],
  };

  console.log('================================================================================');
  console.log('🏛️  GRAND HORIZON PMS — E2E TEST RUNNER (SERVICES C1 TO C14)');
  console.log('================================================================================');
  if (tierArg) console.log(`🎯 Target Tier: Tier ${tierArg}`);
  if (featureArg) console.log(`🔍 Target Feature: ${featureArg}`);
  if (existingOnly) console.log('🛡️ Scope: Existing endpoints only (C1-C8)');
  console.log('--------------------------------------------------------------------------------\n');

  // Filter suite list
  const runSuite = async (suiteDef, tierNum) => {
    if (tierArg && String(tierArg) !== String(tierNum)) return;
    if (featureArg && suiteDef.feature && suiteDef.feature !== featureArg) return;
    if (existingOnly && suiteDef.pending) return;

    console.log(`\n▶️  [Tier ${tierNum}] ${suiteDef.name}`);
    try {
      const suiteModule = require(suiteDef.file);
      const res = await suiteModule.run();
      summaryReport.suites.push({ ...res, tier: tierNum, feature: suiteDef.feature });
      summaryReport.totals.total += res.total;
      summaryReport.totals.passed += res.passed;
      summaryReport.totals.failed += res.failed;
      summaryReport.totals.pending += res.pending;
      summaryReport.totals.skipped += res.skipped;
    } catch (err) {
      console.error(`💥 Execution error in ${suiteDef.file}:`, err.message);
      summaryReport.totals.failed++;
    }
  };

  // Run Tiers
  for (const s of TIER1_SUITES) await runSuite(s, 1);
  for (const s of TIER2_SUITES) await runSuite(s, 2);
  for (const s of TIER3_SUITES) await runSuite(s, 3);
  for (const s of TIER4_SUITES) await runSuite(s, 4);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  summaryReport.durationSeconds = durationSec;

  if (jsonOutput) {
    console.log('\n--- JSON SUMMARY REPORT ---');
    console.log(JSON.stringify(summaryReport, null, 2));
  } else {
    console.log('\n================================================================================');
    console.log('📊 FINAL E2E TEST EXECUTION SUMMARY');
    console.log('================================================================================');
    console.log(`⏱️  Duration: ${durationSec}s`);
    console.log(`📋 Total Test Cases: ${summaryReport.totals.total}`);
    console.log(`✅ Passed:           ${summaryReport.totals.passed}`);
    console.log(`⏳ Pending (M3-M5):  ${summaryReport.totals.pending}`);
    console.log(`❌ Failed:           ${summaryReport.totals.failed}`);
    console.log(`⏩ Skipped:          ${summaryReport.totals.skipped}`);
    console.log('--------------------------------------------------------------------------------');

    if (summaryReport.totals.failed === 0) {
      console.log('🎉 ALL EXECUTABLE TEST CASES PASSED 100%!');
      console.log('📌 Pending endpoints for M3-M5 cleanly documented & contract-validated.');
    } else {
      console.log('⚠️ TEST FAILURES DETECTED. Review errors above.');
    }
    console.log('================================================================================\n');
  }

  process.exitCode = summaryReport.totals.failed > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('Fatal Runner Error:', err);
  process.exitCode = 1;
});
