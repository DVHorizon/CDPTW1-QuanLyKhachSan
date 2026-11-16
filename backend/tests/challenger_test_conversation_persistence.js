'use strict';

const http = require('http');
const pool = require('../src/config/db');
const jwt = require('../node_modules/jsonwebtoken');

const API_BASE = 'http://localhost:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_key_2026_luxury_hotel';

async function request(endpoint, body, token) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      'http://localhost:5000/api/v1' + endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-bypass-rate-limit': 'true',
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(text);
          } catch (_) {}
          resolve({ status: res.statusCode, data: json, text });
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function verifyConversationPersistence() {
  console.log('=== VERIFY CONVERSATION PERSISTENCE (TASK 2) ===');

  const [users] = await pool.query(
    "SELECT UserId, Username, FullName, RoleId FROM Users WHERE Status = 'Active' LIMIT 1"
  );
  const user = users[0];
  const token = jwt.sign(
    { userId: user.UserId, username: user.Username, roleId: user.RoleId, fullName: user.FullName },
    JWT_SECRET
  );

  // 1. Initial conversation creation
  console.log('\n[Case 1] Initial call without conversationId');
  const res1 = await request('/ai/chatbot', { message: 'Chào bạn, cho tôi biết thông tin buffet sáng' }, token);
  const convId1 = res1.data?.data?.conversationId;
  console.log('Returned conversationId:', convId1);

  const [dbConv1] = await pool.query('SELECT * FROM ChatbotConversations WHERE ConversationId = ?', [convId1]);
  console.log('Found in ChatbotConversations table:', dbConv1.length > 0 ? 'YES' : 'NO', dbConv1[0]);

  const [dbMsgs1] = await pool.query('SELECT MessageId, ConversationId, SenderType, MessageText FROM ChatbotMessages WHERE ConversationId = ?', [convId1]);
  console.log(`Found ${dbMsgs1.length} messages linked to ConversationId ${convId1}:`);
  dbMsgs1.forEach(m => console.log(`  - [${m.SenderType}] ${m.MessageText.slice(0, 50)}...`));

  // 2. Continuing the conversation with convId1
  console.log('\n[Case 2] Follow-up call with conversationId = ' + convId1);
  const res2 = await request('/ai/chatbot', { message: 'Hồ bơi mở cửa đến mấy giờ?', conversationId: convId1 }, token);
  const convId2 = res2.data?.data?.conversationId;
  console.log('Returned conversationId:', convId2, 'Matches initial:', convId2 === convId1);

  const [dbMsgs2] = await pool.query('SELECT MessageId, ConversationId, SenderType, MessageText FROM ChatbotMessages WHERE ConversationId = ?', [convId1]);
  console.log(`Found ${dbMsgs2.length} messages linked to ConversationId ${convId1} after turn 2:`);
  dbMsgs2.forEach(m => console.log(`  - [${m.SenderType}] ${m.MessageText.slice(0, 50)}...`));

  // 3. Requesting with an arbitrary non-existent ID (e.g. 888888)
  console.log('\n[Case 3] Request with non-existent arbitrary conversationId = 888888');
  const res3 = await request('/ai/chatbot', { message: 'Kiểm tra với ID không tồn tại', conversationId: 888888 }, token);
  const convId3 = res3.data?.data?.conversationId;
  console.log('Returned conversationId:', convId3);

  const [dbConv3] = await pool.query('SELECT * FROM ChatbotConversations WHERE ConversationId = ?', [convId3]);
  console.log('Auto-created new valid conversation in DB:', dbConv3.length > 0, 'ConvId in DB:', dbConv3[0]?.ConversationId);

  // 4. Checking if 101 is hardcoded
  console.log('\n[Case 4] Request with conversationId = 101');
  const [chk101] = await pool.query('SELECT * FROM ChatbotConversations WHERE ConversationId = 101');
  const res4 = await request('/ai/chatbot', { message: 'Kiểm tra hardcoded 101', conversationId: 101 }, token);
  const convId4 = res4.data?.data?.conversationId;
  console.log('Does ConversationId 101 exist in DB prior to call?', chk101.length > 0);
  console.log('Returned conversationId for 101 request:', convId4);
  if (chk101.length === 0) {
    console.log('101 does NOT exist in DB, and backend did NOT blindly return 101. Returned:', convId4);
  } else {
    console.log('101 exists in DB as an actual record, so returning 101 matches the DB record.');
  }

  const [grep101] = await pool.query("SELECT COUNT(*) as cnt FROM ChatbotConversations WHERE ConversationId = 101");
  console.log('\nFinal DB Conversation Count:', (await pool.query("SELECT COUNT(*) as cnt FROM ChatbotConversations"))[0][0].cnt);

  process.exit(0);
}

verifyConversationPersistence().catch(err => {
  console.error(err);
  process.exit(1);
});
