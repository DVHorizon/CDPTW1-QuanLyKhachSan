'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C14 - Knowledge Base Boundaries')) {
  const { adminToken, recToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const recHeaders = { Authorization: `Bearer ${recToken}` };

  // TC_B14_01: Without token -> 401
  const unauthContract = { endpoint: 'POST /ai/knowledge-base', expectedStatus: 401 };
  const res1 = await request('/ai/knowledge-base', {
    method: 'POST',
    body: { category: 'Services', question: 'Q?', answer: 'A!' },
  });
  probeOrAssert(tracker, 'TC_B14_01', 'Knowledge item creation without token returns 401 ERROR_0009_UNAUTHENTICATED', res1, 401, unauthContract);

  // TC_B14_02: Non-admin role -> 403
  const forbiddenContract = { endpoint: 'POST /ai/knowledge-base', expectedStatus: 403 };
  const res2 = await request('/ai/knowledge-base', {
    method: 'POST',
    headers: recHeaders,
    body: { category: 'Services', question: 'Q?', answer: 'A!' },
  });
  probeOrAssert(tracker, 'TC_B14_02', 'Non-admin role attempting knowledge write returns 403 ERROR_0010_FORBIDDEN', res2, 403, forbiddenContract);

  // TC_B14_03: Empty question or answer -> 400
  const emptyFieldsContract = {
    endpoint: 'POST /ai/knowledge-base',
    body: { category: 'Services', question: '', answer: '' },
    expectedStatus: 400,
    expectedCode: 'ERROR_0001_REQUIRED',
  };
  const res3 = await request('/ai/knowledge-base', {
    method: 'POST',
    headers: adminHeaders,
    body: emptyFieldsContract.body,
  });
  probeOrAssert(tracker, 'TC_B14_03', 'Empty question or answer rejected with 400 ERROR_0001_REQUIRED', res3, 400, emptyFieldsContract);

  // TC_B14_04: Invalid category (not in 7 valid categories)
  const invalidCatContract = {
    endpoint: 'POST /ai/knowledge-base',
    body: { category: 'InvalidCategoryName', question: 'Q?', answer: 'A!' },
    expectedStatus: 400,
  };
  const res4 = await request('/ai/knowledge-base', {
    method: 'POST',
    headers: adminHeaders,
    body: invalidCatContract.body,
  });
  probeOrAssert(tracker, 'TC_B14_04', 'Invalid knowledge category rejected with 400 validation error', res4, 400, invalidCatContract);

  // TC_B14_05: Non-existent knowledgeId update -> 404
  const notFoundContract = { endpoint: 'PUT /ai/knowledge-base/999999', expectedStatus: 404 };
  const res5 = await request('/ai/knowledge-base/999999', {
    method: 'PUT',
    headers: adminHeaders,
    body: { answer: 'Updated answer' },
  });
  probeOrAssert(tracker, 'TC_B14_05', 'Updating non-existent knowledgeId returns 404 ERROR_0011_NOT_FOUND', res5, 404, notFoundContract);

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exitCode = s.failed > 0 ? 1 : 0;
  });
}

module.exports = { run };
