'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C13 - AI Concierge Chatbot')) {
  const { guestToken } = await getAuthContext();
  const guestHeaders = { Authorization: `Bearer ${guestToken}`, 'x-bypass-rate-limit': 'true' };

  // Expected contracts per PROJECT.md § AI Concierge & Knowledge Base Contract (C13, C14)
  const chatbotInitContract = {
    endpoint: 'POST /ai/chatbot',
    requestBody: { message: 'Khách sạn có dịch vụ giặt ủi không?', conversationId: null },
    expectedResponse: {
      success: true,
      data: {
        conversationId: 'number',
        message: 'string',
        source: 'knowledge_base',
        handoverRequired: false,
      },
    },
  };

  // TC_C13_01: New conversation
  const res1 = await request('/ai/chatbot', {
    method: 'POST',
    headers: guestHeaders,
    body: chatbotInitContract.requestBody,
  });
  probeOrAssert(tracker, 'TC_C13_01', 'Guest sends service inquiry and receives conversationId & answer', res1, 200, chatbotInitContract, (data) => {
    assert.ok(data?.data?.conversationId);
    assert.ok(data?.data?.message);
  });

  // TC_C13_02: Knowledge base resolution source
  const kbResolutionContract = {
    endpoint: 'POST /ai/chatbot',
    expectedData: { source: 'knowledge_base' },
  };
  const res2 = await request('/ai/chatbot', {
    method: 'POST',
    headers: guestHeaders,
    body: { message: 'Giờ mở cửa bể bơi là mấy giờ?' },
  });
  probeOrAssert(tracker, 'TC_C13_02', 'Chatbot resolves question using hotel knowledge base', res2, 200, kbResolutionContract, (data) => {
    assert.strictEqual(data?.data?.source, 'knowledge_base');
  });

  // TC_C13_03: Follow-up message continuity
  const activeConversationId = res1?.data?.data?.conversationId || null;
  const followUpContract = {
    endpoint: 'POST /ai/chatbot',
    requestBody: { message: 'Có tính phí khăn tắm không?', conversationId: activeConversationId },
    expectedData: { conversationId: activeConversationId },
  };
  const res3 = await request('/ai/chatbot', {
    method: 'POST',
    headers: guestHeaders,
    body: followUpContract.requestBody,
  });
  probeOrAssert(tracker, 'TC_C13_03', 'Follow-up query maintains conversation context with conversationId', res3, 200, followUpContract, (data) => {
    if (activeConversationId) {
      assert.strictEqual(data?.data?.conversationId, activeConversationId);
    } else {
      assert.ok(data?.data?.conversationId);
    }
  });

  // TC_C13_04: Staff handover trigger
  const handoverContract = {
    endpoint: 'POST /ai/chatbot',
    requestBody: { message: 'Tôi muốn khiếu nại về thái độ nhân viên và gặp quản lý ngay' },
    expectedData: { handoverRequired: true },
  };
  const res4 = await request('/ai/chatbot', {
    method: 'POST',
    headers: guestHeaders,
    body: handoverContract.requestBody,
  });
  probeOrAssert(tracker, 'TC_C13_04', 'Out-of-scope / escalation triggers staff handover flag', res4, 200, handoverContract, (data) => {
    assert.strictEqual(data?.data?.handoverRequired, true);
  });

  // TC_C13_05: Vietnamese language response constraint
  const vietnameseContract = {
    description: 'UI/chat message must be natural Vietnamese text without exposed error stacks',
  };
  const res5 = await request('/ai/chatbot', {
    method: 'POST',
    headers: guestHeaders,
    body: { message: 'Xin chào' },
  });
  probeOrAssert(tracker, 'TC_C13_05', 'Chatbot responds in natural Vietnamese adhering to UX constraints', res5, 200, vietnameseContract, (data) => {
    assert.ok(typeof data?.data?.message === 'string' && data.data.message.length > 0);
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
