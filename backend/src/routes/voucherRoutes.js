'use strict';

const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');

// Validate mã voucher theo thời gian thực (FEAT-GUEST-07)
router.post('/validate', voucherController.validateVoucher);
router.post('/apply', voucherController.validateVoucher);

// Lấy danh sách voucher khuyến mãi gợi ý
router.get('/available', voucherController.getAvailableVouchers);

module.exports = router;
