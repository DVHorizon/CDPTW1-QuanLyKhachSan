const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET /api/v1/roles - Danh mục 4 vai trò nội bộ cố định theo Spec 3
router.get('/', verifyToken, async (req, res) => {
  try {
    const [roles] = await pool.query(
      `SELECT RoleId as roleId, RoleName as roleName, Description as description
       FROM Roles
       WHERE IsDeleted = 0 AND RoleId IN (1, 2, 3, 4)
       ORDER BY RoleId ASC`
    );
    return res.json({ success: true, data: roles });
  } catch (err) {
    console.error('Lỗi GET /api/v1/roles:', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách vai trò: ' + err.message });
  }
});

module.exports = router;
