'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C12 - Occupancy & RevPAR Reports')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Expected contracts per PROJECT.md § Occupancy & RevPAR Statistics Contract (C12)
  const occupancyContract = {
    endpoint: 'GET /statistics/occupancy?fromDate=2026-10-01&toDate=2026-10-31',
    expectedResponse: {
      success: true,
      data: {
        summary: {
          totalRooms: 'number',
          roomNightsAvailable: 'number',
          roomNightsSold: 'number',
          occupancyRate: 'number',
          totalRoomRevenue: 'number',
          adr: 'number',
          revPar: 'number',
        },
        monthlyBreakdown: 'array',
        compareLastYear: 'object',
      },
    },
  };

  // TC_C12_01: Summary metrics
  const res1 = await request('/statistics/occupancy?fromDate=2026-10-01&toDate=2026-10-31', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C12_01', 'GET /statistics/occupancy returns occupancy summary metrics', res1, 200, occupancyContract, (data) => {
    assert.ok(data?.data?.summary);
    assert.strictEqual(typeof data.data.summary.occupancyRate, 'number');
    assert.strictEqual(typeof data.data.summary.revPar, 'number');
  });

  // TC_C12_02: RevPAR mathematical formula
  const revparFormulaContract = {
    formula: 'revPar = adr * (occupancyRate / 100)',
    description: 'Verifies RevPAR formula consistency within rounding precision',
  };
  const res2 = await request('/statistics/occupancy?fromDate=2026-10-01&toDate=2026-10-31', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C12_02', 'RevPAR and ADR mathematical formula consistency verified', res2, 200, revparFormulaContract, (data) => {
    const s = data?.data?.summary;
    if (s && s.adr && s.occupancyRate) {
      const expectedRevPar = Math.round(s.adr * (s.occupancyRate / 100));
      assert.ok(Math.abs(s.revPar - expectedRevPar) <= 2, 'RevPAR calculation must match ADR * Occupancy');
    }
  });

  // TC_C12_03: Monthly breakdown
  const monthlyContract = {
    endpoint: 'GET /statistics/occupancy',
    expectedData: { monthlyBreakdown: 'array of monthly metrics' },
  };
  const res3 = await request('/statistics/occupancy?fromDate=2026-10-01&toDate=2026-10-31', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C12_03', 'GET /statistics/occupancy includes monthly breakdown array', res3, 200, monthlyContract, (data) => {
    assert.ok(Array.isArray(data?.data?.monthlyBreakdown));
  });

  // TC_C12_04: Year-over-year comparison
  const compareContract = {
    endpoint: 'GET /statistics/occupancy',
    expectedData: { compareLastYear: { occupancyChange: 'number', revParChange: 'number' } },
  };
  const res4 = await request('/statistics/occupancy?fromDate=2026-10-01&toDate=2026-10-31', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C12_04', 'GET /statistics/occupancy includes compareLastYear metrics', res4, 200, compareContract, (data) => {
    assert.ok(data?.data?.compareLastYear);
  });

  // TC_C12_05: Export Excel XLSX
  const exportContract = {
    endpoint: 'GET /statistics/occupancy/export?format=xlsx&fromDate=2026-10-01&toDate=2026-10-31',
    expectedContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  const res5 = await request('/statistics/occupancy/export?format=xlsx&fromDate=2026-10-01&toDate=2026-10-31', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C12_05', 'GET /statistics/occupancy/export returns Excel XLSX binary stream', res5, 200, exportContract, (data) => {
    assert.ok(res5.contentType.includes('spreadsheetml'));
    assert.ok(res5.rawBuffer?.length > 1000);
  });

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exit(s.failed > 0 ? 1 : 0);
  });
}

module.exports = { run };
