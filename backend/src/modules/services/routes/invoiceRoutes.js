'use strict';

/**
 * modules/services/routes/invoiceRoutes.js
 * 👤 OWNER: Hà — Module C: Dịch Vụ & Thanh Toán
 * FEAT-INVOICE-02 (C7) & FEAT-INVOICE-03 (C8)
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../middlewares/authMiddleware');
const masterInvoiceController = require('../controllers/masterInvoiceController');
const invoicePdfController = require('../controllers/invoicePdfController');

// 1. C10: Danh sách sổ cái hoá đơn (List & Filters)
router.get('/', verifyToken, masterInvoiceController.getInvoices);

// 2. C7: Tạo hoá đơn tổng hợp (Master Invoice)
router.post('/master', verifyToken, masterInvoiceController.createMasterInvoice);

// 3. Tra cứu hoá đơn theo bookingId (cho Màn 25 Folio Screen)
router.get('/booking/:bookingId', verifyToken, masterInvoiceController.getInvoiceByBookingId);

// 4. C9: Quyết toán hoá đơn tại quầy (Multi-Tender Settlement)
router.post('/:invoiceId/pay', verifyToken, masterInvoiceController.payInvoice);

// 5. C10: Lịch sử giao dịch & kiểm toán của hoá đơn
router.get('/:invoiceId/transactions', verifyToken, masterInvoiceController.getInvoiceTransactions);

// 6. C8: Xuất hoá đơn PDF (Xem trực tiếp / Tải file)
router.get('/:invoiceId/pdf', verifyToken, invoicePdfController.getInvoicePdf);

// 7. C8: Kiểm tra trạng thái file PDF
router.get('/:invoiceId/pdf-info', verifyToken, invoicePdfController.getInvoicePdfInfo);

// 8. Chi tiết 1 hoá đơn (phải đặt sau các route con /:invoiceId/...)
router.get('/:invoiceId', verifyToken, masterInvoiceController.getInvoiceById);

module.exports = router;

