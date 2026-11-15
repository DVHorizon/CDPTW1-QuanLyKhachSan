'use strict';

/**
 * challenger_m1_model_stress.js
 * Empirical Challenger Test Harness for Milestone 1:
 * - Verifies Sequelize model exports (Voucher, ChatbotKnowledgeBase, ChatbotConversation, ChatbotMessage)
 * - Verifies Database Schema & HandledBy column on ChatbotConversations
 * - Tests Complex Queries & Nested Association Joins
 * - Tests Foreign Key integrity and Edge Cases in Transactions
 */

const assert = require('assert');
const { Op } = require('sequelize');
const models = require('../src/models');
const {
  sequelize,
  Voucher,
  ChatbotKnowledgeBase,
  ChatbotConversation,
  ChatbotMessage,
  User,
  Booking
} = models;

async function runModelTests() {
  console.log('================================================================');
  console.log('🔥 EMPIRICAL CHALLENGER: SEQUELIZE MODELS & SCHEMA INTEGRITY TEST');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(desc) {
    passed++;
    console.log(`  ✅ [PASS] ${desc}`);
  }

  function recordFail(desc, err) {
    failed++;
    console.error(`  ❌ [FAIL] ${desc}:`, err.message || err);
  }

  // TEST 1: Model Export Verification
  console.log('👉 [1] Kiểm tra export các model trong backend/src/models/index.js...');
  try {
    assert(Voucher, 'Model Voucher phải tồn tại và được export');
    assert(ChatbotKnowledgeBase, 'Model ChatbotKnowledgeBase phải tồn tại và được export');
    assert(ChatbotConversation, 'Model ChatbotConversation phải tồn tại và được export');
    assert(ChatbotMessage, 'Model ChatbotMessage phải tồn tại và được export');
    recordPass('Tất cả 4 models (Voucher, ChatbotKnowledgeBase, ChatbotConversation, ChatbotMessage) được export đầy đủ');
  } catch (err) {
    recordFail('Export models', err);
  }

  // TEST 2: Database Schema & Column Verification
  console.log('\n👉 [2] Kiểm tra cấu trúc CSDL thực tế của bảng ChatbotConversations...');
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('ChatbotConversations');
    
    assert(tableInfo.ConversationId, 'Cột ConversationId phải tồn tại');
    assert(tableInfo.UserId, 'Cột UserId phải tồn tại');
    assert(tableInfo.HandledBy, 'Cột HandledBy PHẢI tồn tại trên ChatbotConversations');
    assert.strictEqual(tableInfo.HandledBy.allowNull, true, 'HandledBy phải cho phép NULL (khi chưa có nhân viên nhận chat)');
    
    // Kiểm tra type của HandledBy (INTEGER)
    const typeStr = String(tableInfo.HandledBy.type).toUpperCase();
    assert(typeStr.includes('INT'), `HandledBy phải có kiểu số nguyên INTEGER (thực tế: ${typeStr})`);
    recordPass(`Cột HandledBy tồn tại trên ChatbotConversations: type=${typeStr}, allowNull=${tableInfo.HandledBy.allowNull}`);
  } catch (err) {
    recordFail('Kiểm tra schema HandledBy', err);
  }

  // TEST 3: Querying Models Individually
  console.log('\n👉 [3] Truy vấn đơn lẻ từng model từ CSDL...');
  try {
    const voucherCount = await Voucher.count();
    recordPass(`Voucher.count() thực hiện thành công: ${voucherCount} bản ghi`);

    const kbCount = await ChatbotKnowledgeBase.count();
    recordPass(`ChatbotKnowledgeBase.count() thực hiện thành công: ${kbCount} bản ghi`);

    const convCount = await ChatbotConversation.count();
    recordPass(`ChatbotConversation.count() thực hiện thành công: ${convCount} bản ghi`);

    const msgCount = await ChatbotMessage.count();
    recordPass(`ChatbotMessage.count() thực hiện thành công: ${msgCount} bản ghi`);
  } catch (err) {
    recordFail('Truy vấn đơn lẻ models', err);
  }

  // TEST 4: Association & Join Verification
  console.log('\n👉 [4] Kiểm tra các quan hệ (Associations) và thực hiện JOIN queries...');
  try {
    // 4.1 Join User -> ChatbotConversation & ChatbotConversation -> User
    const userWithConvs = await User.findOne({
      include: [
        { model: ChatbotConversation, as: 'chatbotConversations' },
        { model: ChatbotConversation, as: 'handledConversations' }
      ]
    });
    assert(userWithConvs, 'User phải query được cùng chatbotConversations và handledConversations');
    recordPass('JOIN User ↔ ChatbotConversation (as chatbotConversations & handledConversations) thành công');

    // 4.2 Join ChatbotConversation -> User (user & handledByStaff)
    const convWithUsers = await ChatbotConversation.findOne({
      include: [
        { model: User, as: 'user' },
        { model: User, as: 'handledByStaff' }
      ]
    });
    recordPass('JOIN ChatbotConversation ↔ User (as user & handledByStaff) cú pháp hợp lệ');

    // 4.3 Join ChatbotConversation -> ChatbotMessage -> ChatbotKnowledgeBase
    const convDeepJoin = await ChatbotConversation.findAll({
      limit: 1,
      include: [
        {
          model: ChatbotMessage,
          as: 'messages',
          include: [
            { model: ChatbotKnowledgeBase, as: 'knowledgeBase' }
          ]
        }
      ]
    });
    recordPass('JOIN ChatbotConversation ↔ ChatbotMessage ↔ ChatbotKnowledgeBase thành công');

    // 4.4 Join ChatbotKnowledgeBase -> ChatbotMessage
    const kbWithMsgs = await ChatbotKnowledgeBase.findOne({
      include: [{ model: ChatbotMessage, as: 'messages' }]
    });
    recordPass('JOIN ChatbotKnowledgeBase ↔ ChatbotMessage (as messages) thành công');

    // 4.5 Join Voucher -> Booking & Booking -> Voucher
    const voucherWithBookings = await Voucher.findOne({
      include: [{ model: Booking, as: 'bookings' }]
    });
    recordPass('JOIN Voucher ↔ Booking (as bookings) thành công');

    const bookingWithVoucher = await Booking.findOne({
      where: { VoucherId: { [Op.ne]: null } },
      include: [{ model: Voucher, as: 'voucher' }]
    });
    recordPass('JOIN Booking ↔ Voucher (as voucher) thành công');
  } catch (err) {
    recordFail('Association JOIN queries', err);
  }

  // TEST 5: Transactional Stress Test (Create, Update, Handover, Message Chain & Rollback)
  console.log('\n👉 [5] Stress test nghiệp vụ Chatbot trong DB Transaction...');
  const t = await sequelize.transaction();
  try {
    // Tìm hoặc lấy 1 user khách và 1 user nhân viên
    const guestUser = await User.findOne({ where: { RoleId: 2 }, transaction: t }) || 
                      await User.findOne({ transaction: t });
    const staffUser = await User.findOne({ where: { RoleId: 1 }, transaction: t }) || 
                      await User.findOne({ transaction: t });

    assert(guestUser, 'Phải có ít nhất 1 User trong DB để test');
    assert(staffUser, 'Phải có ít nhất 1 Staff trong DB để test');

    // 5.1 Tạo KnowledgeBase item
    const kbItem = await ChatbotKnowledgeBase.create({
      Question: 'Khách sạn có dịch vụ giặt là không?',
      Answer: 'Dạ khách sạn có dịch vụ giặt là hoạt động 24/7.',
      Category: 'Services',
      Keywords: 'giặt là, laundry, ủi đồ',
      Status: 'Active'
    }, { transaction: t });
    assert(kbItem.KnowledgeId, 'KnowledgeBase item phải được tạo thành công');
    recordPass(`Tạo ChatbotKnowledgeBase item ID=${kbItem.KnowledgeId} thành công`);

    // 5.2 Tạo Conversation mới ở trạng thái Open, HandledBy = null (AI Bot đang xử lý)
    const conv = await ChatbotConversation.create({
      UserId: guestUser.UserId,
      Status: 'Open',
      HandledBy: null
    }, { transaction: t });
    assert.strictEqual(conv.HandledBy, null, 'HandledBy ban đầu phải là null');
    recordPass(`Tạo ChatbotConversation ID=${conv.ConversationId} với HandledBy=null thành công`);

    // 5.3 Tạo tin nhắn Guest gửi và AI Bot trả lời (liên kết KB)
    const msg1 = await ChatbotMessage.create({
      ConversationId: conv.ConversationId,
      SenderType: 'Guest',
      MessageText: 'Cho mình hỏi về dịch vụ giặt là?'
    }, { transaction: t });

    const msg2 = await ChatbotMessage.create({
      ConversationId: conv.ConversationId,
      SenderType: 'AI',
      KnowledgeId: kbItem.KnowledgeId,
      MessageText: kbItem.Answer
    }, { transaction: t });
    recordPass(`Tạo ChatbotMessage chuỗi Guest (ID=${msg1.MessageId}) & AI (ID=${msg2.MessageId}) liên kết KB thành công`);

    // 5.4 Chuyển giao hội thoại cho Nhân viên tiếp quản (Handover: HandledBy = staffUser.UserId)
    await conv.update({
      HandledBy: staffUser.UserId,
      Status: 'InProgress'
    }, { transaction: t });
    assert.strictEqual(conv.HandledBy, staffUser.UserId, 'HandledBy phải được cập nhật sang staff UserId');
    recordPass(`Cập nhật bàn giao hội thoại: HandledBy=${staffUser.UserId}, Status='InProgress' thành công`);

    // 5.5 Nhân viên gửi tin nhắn
    const msg3 = await ChatbotMessage.create({
      ConversationId: conv.ConversationId,
      SenderType: 'Staff',
      MessageText: 'Chào anh/chị, em là nhân viên hỗ trợ. Em có thể lấy đồ giặt lúc nào ạ?'
    }, { transaction: t });
    recordPass(`Nhân viên gửi tin nhắn (ID=${msg3.MessageId}, SenderType='Staff') thành công`);

    // 5.6 Truy vấn toàn bộ cấu trúc với Eager Loading
    const fullConv = await ChatbotConversation.findByPk(conv.ConversationId, {
      include: [
        { model: User, as: 'user', attributes: ['UserId', 'Username', 'Email'] },
        { model: User, as: 'handledByStaff', attributes: ['UserId', 'Username', 'Email'] },
        {
          model: ChatbotMessage,
          as: 'messages',
          include: [{ model: ChatbotKnowledgeBase, as: 'knowledgeBase' }]
        }
      ],
      transaction: t
    });

    assert.strictEqual(fullConv.messages.length, 3, 'Phải có đủ 3 tin nhắn trong hội thoại');
    assert.strictEqual(fullConv.handledByStaff.UserId, staffUser.UserId, 'handledByStaff phải trỏ đúng staff user');
    assert.strictEqual(fullConv.messages[1].knowledgeBase.KnowledgeId, kbItem.KnowledgeId, 'KnowledgeBase liên kết phải đúng');
    recordPass('Eager Loading đầy đủ Conversation + User + HandledByStaff + Messages + KnowledgeBase thành công');

    // 5.7 Thử chèn HandledBy với UserId không tồn tại để kiểm tra Foreign Key Constraint
    let fkBlocked = false;
    try {
      await ChatbotConversation.create({
        UserId: guestUser.UserId,
        Status: 'Open',
        HandledBy: 99999999 // Non-existent user
      }, { transaction: t });
    } catch (fkErr) {
      fkBlocked = true;
      recordPass(`FK constraint chặn thành công HandledBy không hợp lệ (UserId 99999999): ${fkErr.name}`);
    }
    assert(fkBlocked, 'Ràng buộc khoá ngoại Foreign Key của HandledBy phải chặn UserId không tồn tại');

    // Rollback sạch sẽ dữ liệu test
    await t.rollback();
    recordPass('Transaction rollback thành công, không để lại dữ liệu rác trong CSDL');
  } catch (err) {
    await t.rollback();
    recordFail('Stress test transaction Chatbot', err);
  }

  console.log('\n================================================================');
  console.log(`🏁 TỔNG KẾT: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runModelTests()
  .then(() => {
    console.log('✅ Model stress tests completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Fatal error running model stress tests:', err);
    process.exit(1);
  });
