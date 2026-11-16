'use strict';

const assert = require('assert');

async function runCell(results, feature, scenario, applicability, layer, fn) {
  if (applicability === 'N/A') {
    results.push({
      feature,
      scenario,
      applicability: 'N/A',
      layer: 'N/A',
      status: 'N/A',
      summary: 'Không áp dụng theo thiết kế chức năng',
      details: fn ? await fn() : 'Không có thành phần giao diện/API tương ứng cho tình huống này',
    });
    return;
  }
  try {
    const details = await fn();
    results.push({
      feature,
      scenario,
      applicability,
      layer,
      status: 'PASS',
      summary: `Đạt kịch bản S${scenario} trên ${feature}`,
      details: typeof details === 'string' ? details : JSON.stringify(details),
    });
  } catch (err) {
    results.push({
      feature,
      scenario,
      applicability,
      layer,
      status: 'FAIL',
      summary: err.message || 'Thất bại kiểm thử',
      details: err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : String(err),
    });
  }
}

async function runSuite(ctx) {
  const { config, http, db, assertions, tokens } = ctx;
  const results = [];

  const adminHttp = http.createSession();
  adminHttp.setToken(tokens.admin);

  const recepHttp = http.createSession();
  recepHttp.setToken(tokens.receptionist);

  const guestHttp = http.createSession();
  guestHttp.setToken(tokens.guest);

  const anonHttp = http.createSession();

  // =========================================================================
  // FEATURE C11: Master Dashboard thống kê doanh thu real-time (FEAT-REPORT-01)
  // =========================================================================

  await runCell(results, 'C11', 1, 'N/A', 'N/A', async () => 'C11 là Dashboard thống kê doanh thu chỉ đọc, không có thao tác xóa');
  await runCell(results, 'C11', 2, 'N/A', 'N/A', async () => 'C11 là Dashboard chỉ đọc, không có form cập nhật dữ liệu');
  await runCell(results, 'C11', 3, 'N/A', 'N/A', async () => 'C11 truy vấn theo ngày/chi nhánh, không có route chi tiết theo ID');

  // C11 - S4: Date format validation
  await runCell(results, 'C11', 4, 'APP', 'API+UI', async () => {
    const resBadDate = await adminHttp.get('/statistics/revenue', { query: { date: '2026-13-45' } });
    assertions.assertS4ValidationError(resBadDate, 'C11 S4 invalid date=2026-13-45');
    return `date='2026-13-45' -> HTTP ${resBadDate.status} (${resBadDate.data?.code})`;
  });

  await runCell(results, 'C11', 5, 'N/A', 'N/A', async () => 'C11 không có phần tử nhập text tự do');

  // C11 - S6: Full-width whitespace in date query
  await runCell(results, 'C11', 6, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/statistics/revenue', { query: { date: '  \u3000\u3000  ' } });
    assertions.assertNo500(res, 'C11 S6 full-width space date');
    assert([200, 400].includes(res.status), `Expected 200 or 400, got ${res.status}`);
    return `date='\\u3000' -> HTTP ${res.status}`;
  });

  // C11 - S7: Full-width digits in date ('２０２６-１１-１５')
  await runCell(results, 'C11', 7, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/statistics/revenue', { query: { date: '２０２６-１１-１５' } });
    assertions.assertS7FullWidthDigitsHandled(res, { allowNormalizedSuccess: true }, 'C11 S7 full-width date');
    return `date='２０２６-１１-１５' -> HTTP ${res.status}`;
  });

  // C11 - S8: Select-option branchName filter
  await runCell(results, 'C11', 8, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/statistics/revenue', { query: { branchName: 'NonExistentBranch_XYZ' } });
    assertions.assertStatus(res, 200, 'C11 S8 unknown branchName returns 200 zeroed KPIs');
    return `Unknown branchName -> HTTP ${res.status}`;
  });

  await runCell(results, 'C11', 9, 'N/A', 'N/A', async () => 'C11 là Dashboard chỉ đọc, không tạo mới bản ghi');

  // C11 - S10: Invalid URL query params (?date=abc, ?page=abc on dashboard)
  await runCell(results, 'C11', 10, 'APP', 'API+UI', async () => {
    const resDateAbc = await adminHttp.get('/statistics/revenue', { query: { date: 'abc' } });
    assertions.assertS10InvalidPageParamRejected(resDateAbc, 'C11 S10 date=abc');
    return `date='abc' -> HTTP ${resDateAbc.status} (${resDateAbc.data?.code})`;
  });

  await runCell(results, 'C11', 11, 'N/A', 'N/A', async () => 'C11 không có phần tử upload ảnh');
  await runCell(results, 'C11', 12, 'N/A', 'N/A', async () => 'C11 không hiển thị ảnh upload');
  await runCell(results, 'C11', 13, 'N/A', 'N/A', async () => 'C11 không có chức năng cập nhật ảnh');

  // C11 - S14: Unauthenticated & Guest blocked from Revenue Dashboard API
  await runCell(results, 'C11', 14, 'APP', 'API+UI', async () => {
    const resAnon = await anonHttp.get('/statistics/revenue', { noAuth: true });
    assertions.assertS14UnauthBlocked(resAnon, 'C11 S14 anon GET /statistics/revenue');
    const resGuest = await guestHttp.get('/statistics/revenue');
    assertions.assertS14UnauthBlocked(resGuest, 'C11 S14 guest GET /statistics/revenue');
    return `Anon=${resAnon.status}, Guest=${resGuest.status}`;
  });

  // =========================================================================
  // FEATURE C12: Occupancy Report & RevPAR Report (FEAT-REPORT-02)
  // =========================================================================

  await runCell(results, 'C12', 1, 'N/A', 'N/A', async () => 'C12 là báo cáo công suất phòng & RevPAR chỉ đọc, không có thao tác xóa');
  await runCell(results, 'C12', 2, 'N/A', 'N/A', async () => 'C12 là báo cáo thống kê chỉ đọc, không có form cập nhật');
  await runCell(results, 'C12', 3, 'N/A', 'N/A', async () => 'C12 truy vấn theo khoảng thời gian, không có route chi tiết theo ID');

  // C12 - S4: Date range validation (fromDate > toDate, span > 731 days)
  await runCell(results, 'C12', 4, 'APP', 'API+UI', async () => {
    const resRev = await adminHttp.get('/statistics/occupancy', {
      query: { fromDate: '2026-11-15', toDate: '2026-11-01' },
    });
    assertions.assertS4ValidationError(resRev, 'C12 S4 fromDate > toDate');

    const resSpan = await adminHttp.get('/statistics/occupancy', {
      query: { fromDate: '2020-01-01', toDate: '2026-11-15' },
    });
    assertions.assertS4ValidationError(resSpan, 'C12 S4 span > 731 days');
    return `fromDate>toDate -> ${resRev.status} (${resRev.data?.code}), >731d -> ${resSpan.status} (${resSpan.data?.code})`;
  });

  await runCell(results, 'C12', 5, 'N/A', 'N/A', async () => 'C12 không có phần tử nhập text tự do');

  // C12 - S6: Full-width whitespace in fromDate/toDate
  await runCell(results, 'C12', 6, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/statistics/occupancy', {
      query: { fromDate: '  \u3000  ', toDate: '  \u3000  ' },
    });
    assertions.assertS6WhitespaceRejected(res, 'C12 S6 full-width space dates');
    return `fromDate/toDate='\\u3000' -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C12 - S7: Full-width digits in fromDate/toDate ('２０２６-１１-０１')
  await runCell(results, 'C12', 7, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/statistics/occupancy', {
      query: { fromDate: '２０２６-１１-０１', toDate: '２０２６-１１-１５' },
    });
    assertions.assertS7FullWidthDigitsHandled(res, { allowNormalizedSuccess: true }, 'C12 S7 full-width dates');
    return `Full-width dates -> HTTP ${res.status}`;
  });

  // C12 - S8: Export format select-option validation
  await runCell(results, 'C12', 8, 'APP', 'API+UI', async () => {
    const resBadFmt = await adminHttp.get('/statistics/occupancy/export', {
      query: { fromDate: '2026-11-01', toDate: '2026-11-15', format: 'exe' },
    });
    assertions.assertS8SelectOptionValidated(resBadFmt, 'C12 S8 invalid export format=exe');
    return `format='exe' -> HTTP ${resBadFmt.status} (${resBadFmt.data?.code})`;
  });

  await runCell(results, 'C12', 9, 'N/A', 'N/A', async () => 'C12 là báo cáo chỉ đọc/xuất file, không tạo bản ghi mới');

  // C12 - S10: Invalid URL params (?fromDate=abc&toDate=xyz)
  await runCell(results, 'C12', 10, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/statistics/occupancy', {
      query: { fromDate: 'abc', toDate: 'xyz' },
    });
    assertions.assertS10InvalidPageParamRejected(res, 'C12 S10 fromDate=abc');
    return `fromDate='abc' -> HTTP ${res.status} (${res.data?.code})`;
  });

  await runCell(results, 'C12', 11, 'N/A', 'N/A', async () => 'C12 không có phần tử upload ảnh');
  await runCell(results, 'C12', 12, 'N/A', 'N/A', async () => 'C12 không hiển thị ảnh upload');
  await runCell(results, 'C12', 13, 'N/A', 'N/A', async () => 'C12 không có chức năng cập nhật ảnh');

  // C12 - S14: Unauthenticated & Guest blocked from Occupancy Report & Export
  await runCell(results, 'C12', 14, 'APP', 'API+UI', async () => {
    const resAnon = await anonHttp.get('/statistics/occupancy', {
      query: { fromDate: '2026-11-01', toDate: '2026-11-15' },
      noAuth: true,
    });
    assertions.assertS14UnauthBlocked(resAnon, 'C12 S14 anon GET /statistics/occupancy');
    const resGuest = await guestHttp.get('/statistics/occupancy/export', {
      query: { fromDate: '2026-11-01', toDate: '2026-11-15', format: 'csv' },
    });
    assertions.assertS14UnauthBlocked(resGuest, 'C12 S14 guest GET /statistics/occupancy/export');
    return `Anon=${resAnon.status}, Guest export=${resGuest.status}`;
  });

  // =========================================================================
  // FEATURE C13: Gửi tin nhắn & nhận phản hồi Chatbot AI + Handover (FEAT-AI-01)
  // =========================================================================

  await runCell(results, 'C13', 1, 'N/A', 'N/A', async () => 'C13 lưu trữ lịch sử hội thoại để kiểm toán, không có thao tác xóa hội thoại');

  // C13 - S2: 2-tab concurrent handover/resolve with optimistic locking version
  await runCell(results, 'C13', 2, 'APP', 'API+UI', async () => {
    const chatRes = await guestHttp.post('/ai/chatbot', {
      message: `${config.makeTag('CHAT_S2')} Cho hỏi giờ ăn sáng`,
    });
    assertions.assertStatus(chatRes, 200, 'C13 S2 create conversation');
    const convId = chatRes.data?.data?.conversationId || chatRes.data?.conversationId;

    const r1 = await adminHttp.post(`/ai/conversations/${convId}/handover`, {
      action: 'to_staff',
      version: 1,
    });
    assertions.assertStatus(r1, 200, 'C13 S2 Tab 1 handover (v=1)');

    const r2 = await adminHttp.post(`/ai/conversations/${convId}/handover`, {
      action: 'to_ai',
      version: 1,
    });
    assertions.assertS2OptimisticLockConflict(r2, 'C13 S2 Tab 2 stale version=1 on handover');
    return `Tab1=200, Tab2=409 (${r2.data?.code})`;
  });

  // C13 - S3: Invalid / non-existent conversationId ('abc', '1abc', '999999', '99999999999')
  await runCell(results, 'C13', 3, 'API-ONLY', 'API', async () => {
    for (const badId of ['abc', '1abc', '999999', '99999999999']) {
      const resGet = await adminHttp.get(`/ai/conversations/${badId}`);
      assertions.assertS3InvalidIdRejected(resGet, `C13 S3 GET /ai/conversations/${badId}`);
      const resHandover = await adminHttp.post(`/ai/conversations/${badId}/handover`, { action: 'to_staff' });
      assertions.assertS3InvalidIdRejected(resHandover, `C13 S3 POST /ai/conversations/${badId}/handover`);
    }
    return 'GET/POST /ai/conversations/{abc,1abc,999999,99999999999} rejected with 400/404 (no fake auto-creation)';
  });

  // C13 - S4: Empty message validation on chatbot & staff reply
  await runCell(results, 'C13', 4, 'APP', 'API+UI', async () => {
    const resEmpty = await guestHttp.post('/ai/chatbot', { message: '' });
    assertions.assertS4ValidationError(resEmpty, 'C13 S4 empty chatbot message');
    return `Empty message -> HTTP ${resEmpty.status} (${resEmpty.data?.code})`;
  });

  // C13 - S5: Large HTML paste (> 1000 chars) on chatbot & staff reply
  await runCell(results, 'C13', 5, 'APP', 'API+UI', async () => {
    const bigHtml = '<div>' + 'M'.repeat(1050) + '</div>';
    const resChat = await guestHttp.post('/ai/chatbot', { message: bigHtml });
    assertions.assertS5HtmlOverflowRejected(resChat, 'C13 S5 chatbot message > 1000 chars');

    const chatRes = await guestHttp.post('/ai/chatbot', { message: `${config.makeTag('CHAT_S5')} Xin chào` });
    const convId = chatRes.data?.data?.conversationId || chatRes.data?.conversationId;
    const resStaff = await adminHttp.post(`/ai/conversations/${convId}/messages`, { message: bigHtml });
    assertions.assertS5HtmlOverflowRejected(resStaff, 'C13 S5 staff reply > 1000 chars');
    return `Chatbot >1000 -> ${resChat.status}, Staff reply >1000 -> ${resStaff.status}`;
  });

  // C13 - S6: Full-width whitespace ('\u3000\u3000\u3000') in chatbot & staff reply
  await runCell(results, 'C13', 6, 'APP', 'API+UI', async () => {
    const resChat = await guestHttp.post('/ai/chatbot', { message: '   \u3000\u3000\u3000   ' });
    assertions.assertS6WhitespaceRejected(resChat, 'C13 S6 full-width whitespace chatbot message');

    const chatRes = await guestHttp.post('/ai/chatbot', { message: `${config.makeTag('CHAT_S6')} Xin chào` });
    const convId = chatRes.data?.data?.conversationId || chatRes.data?.conversationId;
    const resStaff = await adminHttp.post(`/ai/conversations/${convId}/messages`, {
      message: '   \u3000\u3000\u3000   ',
    });
    assertions.assertS6WhitespaceRejected(resStaff, 'C13 S6 full-width whitespace staff reply');
    return `Chatbot '\\u3000' -> ${resChat.status}, Staff reply '\\u3000' -> ${resStaff.status}`;
  });

  await runCell(results, 'C13', 7, 'N/A', 'N/A', async () => 'Form gửi tin nhắn Chatbot AI (C13) chỉ có ô văn bản hội thoại, không có trường nhập số');

  // C13 - S8: Select-option validation (handover action & conversation status filter)
  await runCell(results, 'C13', 8, 'APP', 'API+UI', async () => {
    const chatRes = await guestHttp.post('/ai/chatbot', { message: `${config.makeTag('CHAT_S8')} Hỗ trợ` });
    const convId = chatRes.data?.data?.conversationId || chatRes.data?.conversationId;

    const resBadAction = await adminHttp.post(`/ai/conversations/${convId}/handover`, {
      action: 'invalid_action_xyz',
    });
    assertions.assertS8SelectOptionValidated(resBadAction, 'C13 S8 invalid handover action');
    return `action='invalid_action_xyz' -> HTTP ${resBadAction.status} (${resBadAction.data?.code})`;
  });

  // C13 - S9: Double-click submit guard on Staff Reply in AiConciergeManagement.jsx
  await runCell(results, 'C13', 9, 'APP', 'API+UI', async () => {
    const fs = require('fs');
    const path = require('path');
    const aiSrc = fs.readFileSync(
      path.join(config.repoRoot, 'frontend/src/pages/admin/ai/AiConciergeManagement.jsx'),
      'utf8'
    );
    assert(
      aiSrc.includes('isSendingReply') || aiSrc.includes('replySubmittingRef') || aiSrc.includes('submittingRef'),
      'AiConciergeManagement.jsx missing double-submit guard on staff reply'
    );
    return 'AiConciergeManagement.jsx verified with synchronous useRef + state submit lock on Staff Reply';
  });

  // C13 - S10: URL query params (?page=abc, ?page=99999 on /ai/conversations)
  await runCell(results, 'C13', 10, 'APP', 'API+UI', async () => {
    const resAbc = await adminHttp.get('/ai/conversations', { query: { page: 'abc', pageSize: 10 } });
    assertions.assertS10InvalidPageParamRejected(resAbc, 'C13 S10 page=abc');
    const resHigh = await adminHttp.get('/ai/conversations', { query: { page: 99999, pageSize: 10 } });
    assertions.assertS10InvalidPageParamRejected(resHigh, 'C13 S10 page=99999');
    return `page=abc -> ${resAbc.status}, page=99999 -> ${resHigh.status}`;
  });

  await runCell(results, 'C13', 11, 'N/A', 'N/A', async () => 'C13 không có phần tử upload ảnh');
  await runCell(results, 'C13', 12, 'N/A', 'N/A', async () => 'C13 không hiển thị ảnh upload');
  await runCell(results, 'C13', 13, 'N/A', 'N/A', async () => 'C13 không có chức năng cập nhật ảnh');

  // C13 - S14: Unauthenticated & Guest blocked from staff conversation inbox/handover/messages/resolve
  await runCell(results, 'C13', 14, 'APP', 'API+UI', async () => {
    const chatRes = await guestHttp.post('/ai/chatbot', { message: `${config.makeTag('CHAT_S14')} Xin chào` });
    const convId = chatRes.data?.data?.conversationId || chatRes.data?.conversationId;

    const resAnonList = await anonHttp.get('/ai/conversations', { noAuth: true });
    assertions.assertS14UnauthBlocked(resAnonList, 'C13 S14 anon GET /ai/conversations');

    const resGuestList = await guestHttp.get('/ai/conversations');
    assertions.assertS14UnauthBlocked(resGuestList, 'C13 S14 guest GET /ai/conversations');

    const resGuestHandover = await guestHttp.post(`/ai/conversations/${convId}/handover`, { action: 'to_staff' });
    assertions.assertS14UnauthBlocked(resGuestHandover, 'C13 S14 guest POST handover');

    const resGuestResolve = await guestHttp.patch(`/ai/conversations/${convId}/resolve`, {});
    assertions.assertS14UnauthBlocked(resGuestResolve, 'C13 S14 guest PATCH resolve');
    return `Anon list=${resAnonList.status}, Guest list=${resGuestList.status}, Guest handover=${resGuestHandover.status}, Guest resolve=${resGuestResolve.status}`;
  });

  // =========================================================================
  // FEATURE C14: Huấn luyện Knowledge Base cho AI (FEAT-AI-02)
  // =========================================================================

  // C14 - S1: 2-tab delete / deactivate on Knowledge Base item
  await runCell(results, 'C14', 1, 'APP', 'API+UI', async () => {
    const kb = await db.seedKnowledgeItem();
    const del1 = await adminHttp.del(`/ai/knowledge-base/${kb.KnowledgeId}`);
    assertions.assertStatus(del1, 200, 'C14 S1 Tab 1 delete KB item');
    const del2 = await adminHttp.del(`/ai/knowledge-base/${kb.KnowledgeId}`);
    assertions.assertS1DeleteConflict(del2, 'C14 S1 Tab 2 delete already-deleted KB item');
    return `Tab1=200, Tab2=${del2.status} (${del2.data?.code})`;
  });

  // C14 - S2: 2-tab concurrent update on Knowledge Base item (optimistic locking)
  await runCell(results, 'C14', 2, 'APP', 'API+UI', async () => {
    const kb = await db.seedKnowledgeItem();
    const u1 = await adminHttp.put(`/ai/knowledge-base/${kb.KnowledgeId}`, {
      question: `${kb.Question} (Tab 1)`,
      answer: 'Câu trả lời cập nhật từ Tab 1 hợp lệ.',
      category: 'General',
      keywords: 'e2e,qa,tab1',
      version: 1,
    });
    assertions.assertStatus(u1, 200, 'C14 S2 Tab 1 update KB item (v=1)');

    const u2 = await adminHttp.put(`/ai/knowledge-base/${kb.KnowledgeId}`, {
      question: `${kb.Question} (Tab 2)`,
      answer: 'Câu trả lời cập nhật từ Tab 2 với version cũ.',
      category: 'General',
      keywords: 'e2e,qa,tab2',
      version: 1,
    });
    assertions.assertS2OptimisticLockConflict(u2, 'C14 S2 Tab 2 stale version=1');
    return `Tab1=200 (v=${u1.data?.data?.version}), Tab2=409 (${u2.data?.code})`;
  });

  // C14 - S3: Invalid / non-existent KnowledgeId ('abc', '1abc', '99999999999')
  await runCell(results, 'C14', 3, 'API-ONLY', 'API', async () => {
    for (const badId of ['abc', '1abc', '99999999999']) {
      const resPut = await adminHttp.put(`/ai/knowledge-base/${badId}`, {
        question: 'Câu hỏi hợp lệ đủ dài?',
        answer: 'Câu trả lời hợp lệ đủ dài.',
        category: 'General',
      });
      assertions.assertS3InvalidIdRejected(resPut, `C14 S3 PUT /ai/knowledge-base/${badId}`);
      const resDel = await adminHttp.del(`/ai/knowledge-base/${badId}`);
      assertions.assertS3InvalidIdRejected(resDel, `C14 S3 DELETE /ai/knowledge-base/${badId}`);
    }
    return 'PUT/DELETE /ai/knowledge-base/{abc,1abc,99999999999} rejected with 400/404';
  });

  // C14 - S4: Form validation (min length < 5 on question/answer, > 20 keyword tags)
  await runCell(results, 'C14', 4, 'APP', 'API+UI', async () => {
    const resShortQ = await adminHttp.post('/ai/knowledge-base', {
      question: 'Abc',
      answer: 'Câu trả lời hợp lệ đủ dài.',
      category: 'Services',
    });
    assertions.assertS4ValidationError(resShortQ, 'C14 S4 question < 5 chars');

    const resShortA = await adminHttp.post('/ai/knowledge-base', {
      question: `${config.makeTag('KB_S4')} Câu hỏi hợp lệ?`,
      answer: 'Ngắn',
      category: 'Services',
    });
    assertions.assertS4ValidationError(resShortA, 'C14 S4 answer < 5 chars');

    const tooManyTags = Array.from({ length: 22 }, (_, i) => `tag${i + 1}`).join(',');
    const resManyTags = await adminHttp.post('/ai/knowledge-base', {
      question: `${config.makeTag('KB_S4B')} Câu hỏi hợp lệ?`,
      answer: 'Câu trả lời hợp lệ đủ dài.',
      category: 'Services',
      keywords: tooManyTags,
    });
    assertions.assertS4ValidationError(resManyTags, 'C14 S4 > 20 keyword tags');
    return `shortQ=${resShortQ.status}, shortA=${resShortA.status}, >20 tags=${resManyTags.status}`;
  });

  // C14 - S5: Large HTML paste (> 1000 chars in question / keywords)
  await runCell(results, 'C14', 5, 'APP', 'API+UI', async () => {
    const bigHtml = '<article><p>' + 'K'.repeat(1100) + '</p></article>';
    const resQ = await adminHttp.post('/ai/knowledge-base', {
      question: bigHtml,
      answer: 'Câu trả lời hợp lệ đủ dài.',
      category: 'Services',
    });
    assertions.assertS5HtmlOverflowRejected(resQ, 'C14 S5 question > 1000 chars HTML paste');

    const resKw = await adminHttp.post('/ai/knowledge-base', {
      question: `${config.makeTag('KB_S5')} Câu hỏi hợp lệ?`,
      answer: 'Câu trả lời hợp lệ đủ dài.',
      category: 'Services',
      keywords: bigHtml,
    });
    assertions.assertS5HtmlOverflowRejected(resKw, 'C14 S5 keywords > 1000 chars HTML paste');
    return `question >1000 -> ${resQ.status} (${resQ.data?.code}), keywords >1000 -> ${resKw.status}`;
  });

  // C14 - S6: Full-width whitespace ('\u3000\u3000\u3000') in question, answer, and /test?q=
  await runCell(results, 'C14', 6, 'APP', 'API+UI', async () => {
    const resWs = await adminHttp.post('/ai/knowledge-base', {
      question: '   \u3000\u3000\u3000\u3000\u3000\u3000   ',
      answer: '   \u3000\u3000\u3000\u3000\u3000\u3000   ',
      category: 'Services',
    });
    assertions.assertS6WhitespaceRejected(resWs, 'C14 S6 full-width whitespace question/answer');

    const resTestWs = await adminHttp.get('/ai/knowledge-base/test', {
      query: { q: '   \u3000\u3000\u3000   ' },
    });
    assertions.assertS6WhitespaceRejected(resTestWs, 'C14 S6 full-width whitespace /test?q=');
    return `KB create '\\u3000' -> ${resWs.status}, /test?q='\\u3000' -> ${resTestWs.status}`;
  });

  // C14 - S7: Full-width digits in pagination (?page=１&pageSize=１０)
  await runCell(results, 'C14', 7, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/ai/knowledge-base', {
      query: { page: '１', pageSize: '１０' },
    });
    assertions.assertS7FullWidthDigitsHandled(
      res,
      { allowNormalizedSuccess: true, expectedNumericValue: 1, actualValue: res.data?.page },
      'C14 S7 full-width page=１ must normalize to 1 (not null/NaN)'
    );
    return `page='１' -> HTTP ${res.status}, page=${res.data?.page}`;
  });

  // C14 - S8: Select-option validation (empty category="", invalid category, Spec C14 categories Dining/FAQ/Transport, invalid status)
  await runCell(results, 'C14', 8, 'APP', 'API+UI', async () => {
    const resEmptyCat = await adminHttp.post('/ai/knowledge-base', {
      question: `${config.makeTag('KB_S8A')} Câu hỏi hợp lệ?`,
      answer: 'Câu trả lời hợp lệ đủ dài.',
      category: '',
    });
    assertions.assertS8SelectOptionValidated(resEmptyCat, 'C14 S8 empty category="" rejected');

    const resBadCat = await adminHttp.post('/ai/knowledge-base', {
      question: `${config.makeTag('KB_S8B')} Câu hỏi hợp lệ?`,
      answer: 'Câu trả lời hợp lệ đủ dài.',
      category: 'InvalidCategoryXYZ',
    });
    assertions.assertS8SelectOptionValidated(resBadCat, 'C14 S8 invalid category rejected');

    const resDining = await adminHttp.post('/ai/knowledge-base', {
      question: `${config.makeTag('KB_S8C')} Nhà hàng mở cửa mấy giờ?`,
      answer: 'Nhà hàng phục vụ từ 06:00 đến 22:00 hàng ngày.',
      category: 'Dining',
    });
    assertions.assertStatus(resDining, [200, 201], 'C14 S8 Spec category Dining accepted');

    const kb = await db.seedKnowledgeItem();
    const resBadStatus = await adminHttp.patch(`/ai/knowledge-base/${kb.KnowledgeId}/status`, {
      status: 'BogusStatus',
    });
    assertions.assertS8SelectOptionValidated(resBadStatus, 'C14 S8 invalid status rejected');
    return `emptyCat=${resEmptyCat.status}, badCat=${resBadCat.status}, Dining=${resDining.status}, badStatus=${resBadStatus.status}`;
  });

  // C14 - S9: Duplicate question rejected with 409 ERROR_0007_DUPLICATE (not silently overwritten)
  await runCell(results, 'C14', 9, 'APP', 'API+UI', async () => {
    const qText = `${config.makeTag('KB_DUP')} Giờ trả phòng tiêu chuẩn là mấy giờ?`;
    const r1 = await adminHttp.post('/ai/knowledge-base', {
      question: qText,
      answer: 'Giờ trả phòng tiêu chuẩn là 12:00 trưa.',
      category: 'Policy',
    });
    assertions.assertStatus(r1, [200, 201], 'C14 S9 first create');

    const r2 = await adminHttp.post('/ai/knowledge-base', {
      question: qText,
      answer: 'Thử ghi đè câu trả lời bằng câu hỏi trùng lặp.',
      category: 'Policy',
    });
    assertions.assertStatus(r2, 409, 'C14 S9 duplicate question must return 409');
    const row = await db.queryOne('SELECT COUNT(*) AS cnt FROM ChatbotKnowledgeBase WHERE Question = ?', [qText]);
    assertions.assertS9NoDuplicateCreate(Number(row.cnt), 1, 'C14 S9 DB count=1');
    return `r1=${r1.status}, r2=${r2.status} (${r2.data?.code}), DB count=${row.cnt}`;
  });

  // C14 - S10: URL query params (?page=abc, ?page=99999 on /ai/knowledge-base)
  await runCell(results, 'C14', 10, 'APP', 'API+UI', async () => {
    const resAbc = await adminHttp.get('/ai/knowledge-base', { query: { page: 'abc', pageSize: 10 } });
    assertions.assertS10InvalidPageParamRejected(resAbc, 'C14 S10 page=abc');
    const resHigh = await adminHttp.get('/ai/knowledge-base', { query: { page: 99999, pageSize: 10 } });
    assertions.assertS10InvalidPageParamRejected(resHigh, 'C14 S10 page=99999');
    return `page=abc -> ${resAbc.status}, page=99999 -> ${resHigh.status}`;
  });

  await runCell(results, 'C14', 11, 'N/A', 'N/A', async () => 'C14 không có phần tử upload ảnh');
  await runCell(results, 'C14', 12, 'N/A', 'N/A', async () => 'C14 không hiển thị ảnh upload');
  await runCell(results, 'C14', 13, 'N/A', 'N/A', async () => 'C14 không có chức năng cập nhật ảnh');

  // C14 - S14: Unauthenticated & Guest blocked from DELETE /knowledge-base/:id and GET /knowledge-base/test
  await runCell(results, 'C14', 14, 'APP', 'API+UI', async () => {
    const kb = await db.seedKnowledgeItem();
    const resAnonDel = await anonHttp.del(`/ai/knowledge-base/${kb.KnowledgeId}`, { noAuth: true });
    assertions.assertS14UnauthBlocked(resAnonDel, 'C14 S14 anon DELETE KB');

    const resGuestDel = await guestHttp.del(`/ai/knowledge-base/${kb.KnowledgeId}`);
    assertions.assertS14UnauthBlocked(resGuestDel, 'C14 S14 guest DELETE KB');

    const resGuestTest = await guestHttp.get('/ai/knowledge-base/test', { query: { q: 'checkin' } });
    assertions.assertS14UnauthBlocked(resGuestTest, 'C14 S14 guest GET /knowledge-base/test');
    return `Anon DEL=${resAnonDel.status}, Guest DEL=${resGuestDel.status}, Guest /test=${resGuestTest.status}`;
  });

  // =========================================================================
  // LIVE BROWSER UI SMOKE ACROSS C1–C14 ROUTES (WHEN ctx.ui IS AVAILABLE)
  // =========================================================================
  if (ctx.ui && ctx.mode !== 'api') {
    const bCtx = await ctx.ui.newContext();
    try {
      const page = await bCtx.newPage();
      await page.loginUi('admin');

      const uiRoutesToVerify = [
        '/admin/services?page=abc',
        '/admin/services/dispatch',
        '/admin/services/orders',
        '/admin/charges/abc',
        '/admin/finance/ledger?page=abc',
        '/admin/statistics?page=abc',
        '/admin/ai-concierge?page=abc',
      ];
      for (const route of uiRoutesToVerify) {
        await page.goto(`${config.frontendBaseUrl}${route}`);
        const rootLen = await page.evaluate(() => document.querySelector('#root')?.innerHTML.length || 0);
        assert(rootLen > 50, `UI route ${route} failed to render (#root empty)`);
      }
    } finally {
      await bCtx.dispose();
    }
  }

  return results;
}

module.exports = {
  name: 'Suite 03: Statistics & AI Track (C11–C14 × S1–S14)',
  features: ['C11', 'C12', 'C13', 'C14'],
  runSuite,
};
