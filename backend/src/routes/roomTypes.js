const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// ─── GET tất cả loại phòng ──────────────────────────────────────────────────
// GET /api/loai-phong?trang_thai=active&tim=ocean
router.get("/", async (req, res) => {
  try {
    const { trang_thai, tim } = req.query;
    let sql = "SELECT * FROM room_types WHERE 1=1";
    const params = [];

    if (trang_thai && trang_thai !== "all") {
      sql += " AND trang_thai = ?";
      params.push(trang_thai);
    }
    if (tim) {
      sql += " AND (ten_loai LIKE ? OR ma_loai LIKE ? OR mo_ta LIKE ?)";
      params.push(`%${tim}%`, `%${tim}%`, `%${tim}%`);
    }
    sql += " ORDER BY id ASC";

    const [rows] = await pool.query(sql, params);

    // Parse tien_ich JSON string -> array
    const result = rows.map((r) => ({
      ...r,
      tien_ich: typeof r.tien_ich === "string" ? JSON.parse(r.tien_ich) : (r.tien_ich || []),
    }));

    res.json({ success: true, data: result, total: result.length });
  } catch (err) {
    console.error("GET /loai-phong error:", err.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + err.message });
  }
});

// ─── GET thống kê tổng quan ─────────────────────────────────────────────────
// GET /api/loai-phong/thong-ke
router.get("/thong-ke", async (req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        COUNT(*) AS tong_danh_muc,
        SUM(so_phong_ton_kho) AS tong_phong,
        AVG(gia_co_ban) AS gia_trung_binh,
        SUM(CASE WHEN trang_thai = 'active' THEN 1 ELSE 0 END) AS dang_hoat_dong,
        SUM(CASE WHEN trang_thai = 'inactive' THEN 1 ELSE 0 END) AS tam_dung
      FROM room_types
    `);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET một loại phòng theo ID ─────────────────────────────────────────────
// GET /api/loai-phong/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM room_types WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Không tìm thấy loại phòng" });
    const r = rows[0];
    r.tien_ich = typeof r.tien_ich === "string" ? JSON.parse(r.tien_ich) : (r.tien_ich || []);
    res.json({ success: true, data: r });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST tạo loại phòng mới ────────────────────────────────────────────────
// POST /api/loai-phong
router.post("/", async (req, res) => {
  try {
    const {
      ma_loai, ten_loai, mo_ta, hinh_anh, dien_tich, so_phong_ton_kho,
      gia_co_ban, loai_giuong, huong_view, tang_vi_tri,
      toi_da_nguoi_lon, toi_da_tre_em, thoi_gian_don_phong,
      he_so_cuoi_tuan, tien_ich, trang_thai,
    } = req.body;

    if (!ma_loai || !ten_loai || !gia_co_ban) {
      return res.status(400).json({ success: false, message: "Thiếu trường bắt buộc: ma_loai, ten_loai, gia_co_ban" });
    }

    const tienIchJson = JSON.stringify(Array.isArray(tien_ich) ? tien_ich : []);

    const [result] = await pool.query(
      `INSERT INTO room_types
       (ma_loai,ten_loai,mo_ta,hinh_anh,dien_tich,so_phong_ton_kho,gia_co_ban,
        loai_giuong,huong_view,tang_vi_tri,toi_da_nguoi_lon,toi_da_tre_em,
        thoi_gian_don_phong,he_so_cuoi_tuan,tien_ich,trang_thai)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ma_loai.toUpperCase(), ten_loai, mo_ta || null, hinh_anh || null,
        dien_tich || null, so_phong_ton_kho || 0, gia_co_ban,
        loai_giuong || "1 King Bed", huong_view || "Ocean View",
        tang_vi_tri || null, toi_da_nguoi_lon || 2, toi_da_tre_em || 1,
        thoi_gian_don_phong || 30, he_so_cuoi_tuan || 1.00,
        tienIchJson, trang_thai || "active",
      ]
    );

    const [newRows] = await pool.query("SELECT * FROM room_types WHERE id = ?", [result.insertId]);
    const r = newRows[0];
    r.tien_ich = JSON.parse(r.tien_ich || "[]");

    res.status(201).json({ success: true, message: "Đã tạo loại phòng thành công", data: r });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Mã loại phòng đã tồn tại: " + req.body.ma_loai });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT cập nhật toàn bộ loại phòng ───────────────────────────────────────
// PUT /api/loai-phong/:id
router.put("/:id", async (req, res) => {
  try {
    const {
      ma_loai, ten_loai, mo_ta, hinh_anh, dien_tich, so_phong_ton_kho,
      gia_co_ban, loai_giuong, huong_view, tang_vi_tri,
      toi_da_nguoi_lon, toi_da_tre_em, thoi_gian_don_phong,
      he_so_cuoi_tuan, tien_ich, trang_thai,
    } = req.body;

    const tienIchJson = JSON.stringify(Array.isArray(tien_ich) ? tien_ich : []);

    await pool.query(
      `UPDATE room_types SET
       ma_loai=?, ten_loai=?, mo_ta=?, hinh_anh=?, dien_tich=?, so_phong_ton_kho=?,
       gia_co_ban=?, loai_giuong=?, huong_view=?, tang_vi_tri=?, toi_da_nguoi_lon=?,
       toi_da_tre_em=?, thoi_gian_don_phong=?, he_so_cuoi_tuan=?, tien_ich=?, trang_thai=?
       WHERE id=?`,
      [
        ma_loai?.toUpperCase(), ten_loai, mo_ta, hinh_anh, dien_tich, so_phong_ton_kho,
        gia_co_ban, loai_giuong, huong_view, tang_vi_tri, toi_da_nguoi_lon,
        toi_da_tre_em, thoi_gian_don_phong, he_so_cuoi_tuan, tienIchJson,
        trang_thai, req.params.id,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM room_types WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Không tìm thấy" });
    const r = rows[0];
    r.tien_ich = JSON.parse(r.tien_ich || "[]");

    res.json({ success: true, message: "Đã cập nhật loại phòng", data: r });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH thay đổi trạng thái ──────────────────────────────────────────────
// PATCH /api/loai-phong/:id/trang-thai
router.patch("/:id/trang-thai", async (req, res) => {
  try {
    const { trang_thai } = req.body;
    if (!["active", "inactive"].includes(trang_thai)) {
      return res.status(400).json({ success: false, message: "trang_thai phải là active hoặc inactive" });
    }
    await pool.query("UPDATE room_types SET trang_thai=? WHERE id=?", [trang_thai, req.params.id]);
    res.json({ success: true, message: `Đã ${trang_thai === "active" ? "kích hoạt" : "tạm dừng"} loại phòng` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE xóa loại phòng ──────────────────────────────────────────────────
// DELETE /api/loai-phong/:id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM room_types WHERE id=?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy" });
    res.json({ success: true, message: "Đã xóa loại phòng" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
