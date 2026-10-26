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

// Hàm kiểm tra hợp lệ dữ liệu loại phòng (Test Cases & Input Bounds)
function validateRoomTypeInput(body) {
  const {
    ma_loai, ten_loai, gia_co_ban, dien_tich, so_phong_ton_kho,
    toi_da_nguoi_lon, toi_da_tre_em, thoi_gian_don_phong, he_so_cuoi_tuan
  } = body;

  if (!ma_loai || !String(ma_loai).trim()) {
    return "Mã loại phòng không được để trống";
  }
  if (String(ma_loai).trim().length > 20) {
    return "Mã loại phòng tối đa 20 ký tự";
  }
  if (!ten_loai || !String(ten_loai).trim()) {
    return "Tên loại phòng không được để trống";
  }
  if (String(ten_loai).trim().length > 200) {
    return "Tên loại phòng tối đa 200 ký tự";
  }

  const numGia = Number(gia_co_ban);
  if (isNaN(numGia) || numGia <= 0) {
    return "Giá cơ bản phải là số dương lớn hơn 0";
  }
  if (numGia > 9999999999) {
    return "Giá cơ bản không được vượt quá 9,999,999,999 VNĐ/$";
  }

  if (dien_tich !== undefined && dien_tich !== null && dien_tich !== '') {
    const numDT = Number(dien_tich);
    if (isNaN(numDT) || numDT <= 0 || numDT > 99999) {
      return "Diện tích phải từ 1 đến 99,999 m²";
    }
  }

  if (so_phong_ton_kho !== undefined && so_phong_ton_kho !== null && so_phong_ton_kho !== '') {
    const numKeys = Number(so_phong_ton_kho);
    if (isNaN(numKeys) || numKeys < 0 || numKeys > 99999) {
      return "Số phòng tồn kho phải từ 0 đến 99,999";
    }
  }

  if (toi_da_nguoi_lon !== undefined) {
    const adults = Number(toi_da_nguoi_lon);
    if (isNaN(adults) || adults < 1 || adults > 50) {
      return "Số lượng người lớn tối đa từ 1 đến 50";
    }
  }

  if (toi_da_tre_em !== undefined) {
    const children = Number(toi_da_tre_em);
    if (isNaN(children) || children < 0 || children > 50) {
      return "Số lượng trẻ em tối đa từ 0 đến 50";
    }
  }

  if (thoi_gian_don_phong !== undefined) {
    const turnover = Number(thoi_gian_don_phong);
    if (isNaN(turnover) || turnover < 1 || turnover > 1440) {
      return "Thời gian dọn phòng từ 1 đến 1,440 phút";
    }
  }

  if (he_so_cuoi_tuan !== undefined) {
    const yieldM = Number(he_so_cuoi_tuan);
    if (isNaN(yieldM) || yieldM < 1.0 || yieldM > 10.0) {
      return "Hệ số cuối tuần phải từ 1.0 đến 10.0";
    }
  }

  return null;
}

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

    const validationError = validateRoomTypeInput(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const tienIchJson = JSON.stringify(Array.isArray(tien_ich) ? tien_ich : []);

    const [result] = await pool.query(
      `INSERT INTO room_types
       (ma_loai,ten_loai,mo_ta,hinh_anh,dien_tich,so_phong_ton_kho,gia_co_ban,
        loai_giuong,huong_view,tang_vi_tri,toi_da_nguoi_lon,toi_da_tre_em,
        thoi_gian_don_phong,he_so_cuoi_tuan,tien_ich,trang_thai)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        String(ma_loai).trim().toUpperCase(), String(ten_loai).trim(), mo_ta || null, hinh_anh || null,
        dien_tich || null, so_phong_ton_kho || 0, Number(gia_co_ban),
        loai_giuong || "1 Giường King", huong_view || "Hướng Biển (Ocean View)",
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
    const { id } = req.params;

    // Kiểm tra bản ghi có còn tồn tại trong Database không (Xử lý khi đã bị xóa trong CSDL)
    const [existing] = await pool.query("SELECT id FROM room_types WHERE id = ?", [id]);
    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Lỗi đồng bộ: Loại phòng này không còn tồn tại trong cơ sở dữ liệu (có thể đã bị xóa bởi người khác hoặc quản trị viên)!"
      });
    }

    const validationError = validateRoomTypeInput(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const {
      ma_loai, ten_loai, mo_ta, hinh_anh, dien_tich, so_phong_ton_kho,
      gia_co_ban, loai_giuong, huong_view, tang_vi_tri,
      toi_da_nguoi_lon, toi_da_tre_em, thoi_gian_don_phong,
      he_so_cuoi_tuan, tien_ich, trang_thai,
    } = req.body;

    const tienIchJson = JSON.stringify(Array.isArray(tien_ich) ? tien_ich : []);

    const [updateResult] = await pool.query(
      `UPDATE room_types SET
       ma_loai=?, ten_loai=?, mo_ta=?, hinh_anh=?, dien_tich=?, so_phong_ton_kho=?,
       gia_co_ban=?, loai_giuong=?, huong_view=?, tang_vi_tri=?, toi_da_nguoi_lon=?,
       toi_da_tre_em=?, thoi_gian_don_phong=?, he_so_cuoi_tuan=?, tien_ich=?, trang_thai=?
       WHERE id=?`,
      [
        String(ma_loai).trim().toUpperCase(), String(ten_loai).trim(), mo_ta, hinh_anh, dien_tich, so_phong_ton_kho,
        Number(gia_co_ban), loai_giuong, huong_view, tang_vi_tri, toi_da_nguoi_lon,
        toi_da_tre_em, thoi_gian_don_phong, he_so_cuoi_tuan, tienIchJson,
        trang_thai, id,
      ]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Lỗi đồng bộ: Loại phòng không còn tồn tại trong cơ sở dữ liệu (có thể đã bị xóa bởi người khác)!"
      });
    }

    const [rows] = await pool.query("SELECT * FROM room_types WHERE id = ?", [id]);
    const r = rows[0];
    r.tien_ich = JSON.parse(r.tien_ich || "[]");

    res.json({ success: true, message: "Đã cập nhật loại phòng thành công", data: r });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Mã loại phòng đã tồn tại ở bản ghi khác!" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH thay đổi trạng thái ──────────────────────────────────────────────
// PATCH /api/loai-phong/:id/trang-thai
router.patch("/:id/trang-thai", async (req, res) => {
  try {
    const { id } = req.params;
    const { trang_thai } = req.body;
    if (!["active", "inactive"].includes(trang_thai)) {
      return res.status(400).json({ success: false, message: "Trạng thái phải là 'active' hoặc 'inactive'" });
    }

    // Kiểm tra tồn tại trong CSDL
    const [existing] = await pool.query("SELECT id FROM room_types WHERE id = ?", [id]);
    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Lỗi đồng bộ: Loại phòng này không còn tồn tại trong cơ sở dữ liệu (có thể đã bị xóa)!"
      });
    }

    await pool.query("UPDATE room_types SET trang_thai=? WHERE id=?", [trang_thai, id]);
    res.json({ success: true, message: `Đã ${trang_thai === "active" ? "kích hoạt" : "tạm dừng"} loại phòng thành công` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE xóa loại phòng ──────────────────────────────────────────────────
// DELETE /api/loai-phong/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra tồn tại trong CSDL trước khi xóa
    const [existing] = await pool.query("SELECT id, ma_loai, ten_loai FROM room_types WHERE id = ?", [id]);
    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Lỗi đồng bộ: Loại phòng này không còn tồn tại hoặc đã bị xóa trước đó khỏi cơ sở dữ liệu!"
      });
    }

    // Kiểm tra xem có phòng thực tế nào đang thuộc loại phòng này không
    try {
      const [linkedRooms] = await pool.query("SELECT id FROM physical_rooms WHERE ma_loai = ? LIMIT 1", [existing[0].ma_loai]);
      if (linkedRooms && linkedRooms.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Không thể xóa loại phòng "${existing[0].ten_loai}" vì đang có phòng trực thuộc liên kết trong hệ thống!`
        });
      }
    } catch (_) {
      // Nếu bảng Rooms chưa có hoặc không query được thì bỏ qua kiểm tra này
    }

    const [result] = await pool.query("DELETE FROM room_types WHERE id=?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Loại phòng không tìm thấy để xóa" });
    }
    res.json({ success: true, message: `Đã xóa loại phòng "${existing[0].ten_loai}" thành công` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

