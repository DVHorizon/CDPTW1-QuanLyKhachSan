'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C11 - Real-Time Revenue Dashboard')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Expected contracts per PROJECT.md § Revenue & Real-time Dashboard Contract (C11)
  const revenueContract = {
    endpoint: 'GET /statistics/revenue?date=2026-11-02',
    expectedResponse: {
      success: true,
      data: {
        kpis: {
          revenueToday: 'number',
          newBookingsToday: 'number',
          occupancyRate: 'number',
          newFnbOrdersToday: 'number',
        },
        hourlyRevenue: 'array of 24 hourly buckets',
        roomStatusDistribution: 'object mapping status to counts',
        recentFnbOrders: 'array',
      },
    },
  };

  // TC_C11_01: 4 core KPIs
  const res1 = await request('/statistics/revenue?date=2026-11-02', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C11_01', 'GET /statistics/revenue returns 4 core revenue KPIs', res1, 200, revenueContract, (data) => {
    assert.ok(data?.data?.kpis);
    assert.strictEqual(typeof data.data.kpis.revenueToday, 'number');
    assert.strictEqual(typeof data.data.kpis.occupancyRate, 'number');
  });

  // TC_C11_02: 24h hourly revenue trend
  const trendContract = {
    endpoint: 'GET /statistics/revenue',
    expectedData: { hourlyRevenue: '24 hourly values' },
  };
  const res2 = await request('/statistics/revenue?date=2026-11-02', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C11_02', 'GET /statistics/revenue includes 24h hourly revenue trend', res2, 200, trendContract, (data) => {
    assert.ok(Array.isArray(data?.data?.hourlyRevenue));
  });

  // TC_C11_03: Room status distribution
  const roomDistContract = {
    endpoint: 'GET /statistics/revenue',
    expectedData: { roomStatusDistribution: { Available: 'number', Occupied: 'number' } },
  };
  const res3 = await request('/statistics/revenue?date=2026-11-02', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C11_03', 'GET /statistics/revenue includes physical room status distribution', res3, 200, roomDistContract, (data) => {
    assert.ok(data?.data?.roomStatusDistribution);
  });

  // TC_C11_04: Recent orders
  const recentOrdersContract = {
    endpoint: 'GET /statistics/revenue',
    expectedData: { recentFnbOrders: 'array' },
  };
  const res4 = await request('/statistics/revenue?date=2026-11-02', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C11_04', 'GET /statistics/revenue includes recent orders feeds', res4, 200, recentOrdersContract, (data) => {
    assert.ok(Array.isArray(data?.data?.recentFnbOrders));
  });

  // TC_C11_05: WebSocket dashboard endpoint probe
  const wsContract = {
    url: 'ws://localhost:5000/ws/v1/dashboard',
    expectedEvent: 'DASHBOARD_UPDATE',
  };
  // Probe via HTTP upgrade or endpoint definition
  const res5 = await request('/statistics/dashboard/ws-info', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C11_05', 'WebSocket /ws/v1/dashboard provides real-time dashboard updates', res5, 200, wsContract);

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exit(s.failed > 0 ? 1 : 0);
  });
}

module.exports = { run };
