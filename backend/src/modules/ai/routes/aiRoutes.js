'use strict';

const express = require('express');
const router = express.Router();

const {
  verifyToken,
  optionalVerifyToken,
} = require('../../../middlewares/authMiddleware');

const chatbotController = require('../controllers/chatbotController');
const knowledgeBaseController = require('../controllers/knowledgeBaseController');

// ─── C13: CHATBOT AI CONCIERGE & HANDOVER ENDPOINTS ──────────────────────────
router.post('/chatbot', optionalVerifyToken, chatbotController.chatWithConcierge);
router.post('/ai/chatbot', optionalVerifyToken, chatbotController.chatWithConcierge);

router.get('/conversations', verifyToken, chatbotController.listConversations);
router.get('/ai/conversations', verifyToken, chatbotController.listConversations);

router.get('/conversations/:conversationId', verifyToken, chatbotController.getConversationById);
router.get('/ai/conversations/:conversationId', verifyToken, chatbotController.getConversationById);
router.get('/conversations/:id', verifyToken, chatbotController.getConversationById);
router.get('/ai/conversations/:id', verifyToken, chatbotController.getConversationById);

router.post('/conversations/:conversationId/handover', verifyToken, chatbotController.claimHandover);
router.post('/ai/conversations/:conversationId/handover', verifyToken, chatbotController.claimHandover);
router.patch('/conversations/:conversationId/handover', verifyToken, chatbotController.claimHandover);
router.patch('/ai/conversations/:conversationId/handover', verifyToken, chatbotController.claimHandover);
router.post('/conversations/:id/handover', verifyToken, chatbotController.claimHandover);
router.post('/ai/conversations/:id/handover', verifyToken, chatbotController.claimHandover);
router.patch('/conversations/:id/handover', verifyToken, chatbotController.claimHandover);
router.patch('/ai/conversations/:id/handover', verifyToken, chatbotController.claimHandover);

router.post('/conversations/:conversationId/messages', verifyToken, chatbotController.sendStaffMessage);
router.post('/ai/conversations/:conversationId/messages', verifyToken, chatbotController.sendStaffMessage);
router.post('/conversations/:id/messages', verifyToken, chatbotController.sendStaffMessage);
router.post('/ai/conversations/:id/messages', verifyToken, chatbotController.sendStaffMessage);

router.patch('/conversations/:conversationId/resolve', verifyToken, chatbotController.resolveConversation);
router.patch('/ai/conversations/:conversationId/resolve', verifyToken, chatbotController.resolveConversation);
router.patch('/conversations/:id/resolve', verifyToken, chatbotController.resolveConversation);
router.patch('/ai/conversations/:id/resolve', verifyToken, chatbotController.resolveConversation);

// ─── C14: QUẢN TRỊ & HUẤN LUYỆN KNOWLEDGE BASE ENDPOINTS ─────────────────────
// Lưu ý: Đặt route /test trước /:id để tránh xung đột tham số động
router.get('/knowledge-base/test', verifyToken, knowledgeBaseController.testKnowledgeRelevance);
router.get('/ai/knowledge-base/test', verifyToken, knowledgeBaseController.testKnowledgeRelevance);

router.get('/knowledge-base', verifyToken, knowledgeBaseController.listKnowledgeBase);
router.get('/ai/knowledge-base', verifyToken, knowledgeBaseController.listKnowledgeBase);

router.post('/knowledge-base', verifyToken, knowledgeBaseController.createKnowledgeItem);
router.post('/ai/knowledge-base', verifyToken, knowledgeBaseController.createKnowledgeItem);

router.put('/knowledge-base/:id', verifyToken, knowledgeBaseController.updateKnowledgeItem);
router.put('/ai/knowledge-base/:id', verifyToken, knowledgeBaseController.updateKnowledgeItem);

router.patch('/knowledge-base/:id/status', verifyToken, knowledgeBaseController.toggleKnowledgeStatus);
router.patch('/ai/knowledge-base/:id/status', verifyToken, knowledgeBaseController.toggleKnowledgeStatus);

router.delete('/knowledge-base/:id', verifyToken, knowledgeBaseController.deleteKnowledgeItem);
router.delete('/ai/knowledge-base/:id', verifyToken, knowledgeBaseController.deleteKnowledgeItem);

module.exports = router;
