'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C14 - Knowledge Base Management')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const testKbId = 1;

  // Expected contracts per PROJECT.md § AI Concierge & Knowledge Base Contract (C13, C14)
  const listContract = {
    endpoint: 'GET /ai/knowledge-base?category=Services&status=Active',
    expectedResponse: { success: true, data: 'array of knowledge items' },
  };

  // TC_C14_01: Query knowledge list
  const res1 = await request('/ai/knowledge-base?category=Services&status=Active', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C14_01', 'Staff queries knowledge base list with category filter', res1, 200, listContract, (data) => {
    assert.ok(data?.success);
    assert.ok(Array.isArray(data?.data));
  });

  // TC_C14_02: Create QA knowledge item
  const createContract = {
    endpoint: 'POST /ai/knowledge-base',
    requestBody: {
      category: 'Services',
      question: 'Khách sạn có dịch vụ đưa đón sân bay không?',
      answer: 'Dạ khách sạn có xe đưa đón sân bay 24/7 theo yêu cầu.',
      keywords: 'san bay, dua don, xe dua don',
      status: 'Active',
    },
    expectedResponse: { success: true, code: 'SUCCESS_0001_CREATED' },
  };
  const res2 = await request('/ai/knowledge-base', {
    method: 'POST',
    headers: adminHeaders,
    body: createContract.requestBody,
  });
  probeOrAssert(tracker, 'TC_C14_02', 'Admin creates new QA knowledge pair (201 Created)', res2, 201, createContract, (data) => {
    assert.ok(data?.data?.id || data?.data?.knowledgeId);
  });

  // TC_C14_03: Update QA item
  const updateContract = {
    endpoint: 'PUT /ai/knowledge-base/:id',
    requestBody: {
      answer: 'Dạ khách sạn có xe đưa đón sân bay 4 chỗ và 7 chỗ 24/7.',
    },
    expectedResponse: { success: true },
  };
  const res3 = await request(`/ai/knowledge-base/${testKbId}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: updateContract.requestBody,
  });
  probeOrAssert(tracker, 'TC_C14_03', 'Admin updates existing knowledge QA pair (200 OK)', res3, 200, updateContract);

  // TC_C14_04: Toggle status Active <-> Inactive
  const toggleStatusContract = {
    endpoint: 'PATCH /ai/knowledge-base/:id/status',
    requestBody: { status: 'Inactive' },
    expectedResponse: { success: true, data: { status: 'Inactive' } },
  };
  const res4 = await request(`/ai/knowledge-base/${testKbId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: toggleStatusContract.requestBody,
  });
  probeOrAssert(tracker, 'TC_C14_04', 'Admin toggles knowledge item status Active/Inactive', res4, 200, toggleStatusContract);

  // Khôi phục trạng thái Active sau khi kiểm thử chuyển trạng thái để bảo toàn fixture cho các bài test tiếp theo
  await request(`/ai/knowledge-base/${testKbId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { status: 'Active' },
  });

  // TC_C14_05: Semantic relevance test query
  const testQueryContract = {
    endpoint: 'GET /ai/knowledge-base/test?query=xe dua don',
    expectedResponse: { success: true, data: { matchedItem: 'object', relevanceScore: 'number' } },
  };
  const res5 = await request('/ai/knowledge-base/test?query=xe%20dua%20don', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C14_05', 'Relevance test endpoint evaluates match confidence against Knowledge Base', res5, 200, testQueryContract);

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exit(s.failed > 0 ? 1 : 0);
  });
}

module.exports = { run };
