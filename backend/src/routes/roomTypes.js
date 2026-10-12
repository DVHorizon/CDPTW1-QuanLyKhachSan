const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const { trang_thai, tim } = req.query;
    let sql = "SELECT * FROM RoomTypes WHERE IsDeleted = 0";
    const params = [];
    if (trang_thai && trang_thai !== "all") {
      sql += " AND Status = ?";
      params.push(trang_thai === "active" ? "Active" : "Inactive");
    }
    if (tim) {
      sql += " AND (TypeName LIKE ? OR Description LIKE ?)";
      params.push(`%${tim}%`, `%${tim}%`);
    }
    const limit = req.query.limit ? parseInt(req.query.limit) : 200;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    sql += " ORDER BY RoomTypeId ASC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const [rows] = await pool.query(sql, params);
    const [[{ totalCount }]] = await pool.query("SELECT COUNT(*) AS totalCount FROM RoomTypes WHERE IsDeleted = 0");
    const result = rows.map((r) => ({
      id: r.RoomTypeId, ma_loai: "RT-" + r.RoomTypeId, ten_loai: r.TypeName,
      mo_ta: r.Description, gia_co_ban: parseFloat(r.BasePrice),
      toi_da_nguoi_lon: r.AdultCapacity, toi_da_tre_em: r.ChildCapacity,
      toi_da_tong: r.MaxOccupancy, hinh_anh: r.ImageUrl,
      trang_thai: r.Status === "Active" ? "active" : "inactive", tien_ich: [],
    }));
    res.json({ success: true, data: result, total: totalCount });
  } catch (err) {
    console.error("GET /loai-phong error:", err.message);
    res.status(500).json({ success: false, message: "Loi may chu: " + err.message });
  }
});

router.get("/thong-ke", async (req, res) => {
  try {
    const [[stats]] = await pool.query(
      "SELECT COUNT(*) AS tong_danh_muc, AVG(BasePrice) AS gia_trung_binh, SUM(CASE WHEN Status = 'Active' THEN 1 ELSE 0 END) AS dang_hoat_dong, SUM(CASE WHEN Status = 'Inactive' THEN 1 ELSE 0 END) AS tam_dung FROM RoomTypes WHERE IsDeleted = 0"
    );
    res.json({ success: true, data: stats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM RoomTypes WHERE RoomTypeId = ? AND IsDeleted = 0", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Khong tim thay loai phong" });
    const r = rows[0];
    res.json({ success: true, data: { id: r.RoomTypeId, ma_loai: "RT-" + r.RoomTypeId, ten_loai: r.TypeName, mo_ta: r.Description, gia_co_ban: parseFloat(r.BasePrice), toi_da_nguoi_lon: r.AdultCapacity, toi_da_tre_em: r.ChildCapacity, toi_da_tong: r.MaxOccupancy, hinh_anh: r.ImageUrl, trang_thai: r.Status === "Active" ? "active" : "inactive", tien_ich: [] } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { ten_loai, mo_ta, hinh_anh, gia_co_ban, toi_da_nguoi_lon, toi_da_tre_em, trang_thai } = req.body;
    if (!ten_loai) return res.status(400).json({ success: false, message: "Ten loai phong khong duoc de trong" });
    if (!gia_co_ban || Number(gia_co_ban) <= 0) return res.status(400).json({ success: false, message: "Gia co ban phai la so duong" });
    const [result] = await pool.query(
      "INSERT INTO RoomTypes (TypeName, Description, BasePrice, MaxOccupancy, AdultCapacity, ChildCapacity, ImageUrl, Status, IsDeleted, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())",
      [String(ten_loai).trim(), mo_ta || null, Number(gia_co_ban), (toi_da_nguoi_lon || 2) + (toi_da_tre_em || 1), toi_da_nguoi_lon || 2, toi_da_tre_em || 1, hinh_anh || null, trang_thai === "inactive" ? "Inactive" : "Active"]
    );
    const [newRows] = await pool.query("SELECT * FROM RoomTypes WHERE RoomTypeId = ?", [result.insertId]);
    const r = newRows[0];
    res.status(201).json({ success: true, message: "Da tao loai phong thanh cong", data: { id: r.RoomTypeId, ma_loai: "RT-" + r.RoomTypeId, ten_loai: r.TypeName, mo_ta: r.Description, gia_co_ban: parseFloat(r.BasePrice), toi_da_nguoi_lon: r.AdultCapacity, toi_da_tre_em: r.ChildCapacity, hinh_anh: r.ImageUrl, trang_thai: r.Status === "Active" ? "active" : "inactive", tien_ich: [] } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query("SELECT RoomTypeId FROM RoomTypes WHERE RoomTypeId = ? AND IsDeleted = 0", [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: "Loai phong khong ton tai" });
    const { ten_loai, mo_ta, hinh_anh, gia_co_ban, toi_da_nguoi_lon, toi_da_tre_em, trang_thai } = req.body;
    if (!ten_loai) return res.status(400).json({ success: false, message: "Ten loai phong khong duoc de trong" });
    if (!gia_co_ban || Number(gia_co_ban) <= 0) return res.status(400).json({ success: false, message: "Gia co ban phai la so duong" });
    await pool.query(
      "UPDATE RoomTypes SET TypeName=?, Description=?, BasePrice=?, MaxOccupancy=?, AdultCapacity=?, ChildCapacity=?, ImageUrl=?, Status=?, UpdatedAt=NOW() WHERE RoomTypeId=?",
      [String(ten_loai).trim(), mo_ta || null, Number(gia_co_ban), (toi_da_nguoi_lon || 2) + (toi_da_tre_em || 1), toi_da_nguoi_lon || 2, toi_da_tre_em || 1, hinh_anh || null, trang_thai === "inactive" ? "Inactive" : "Active", id]
    );
    const [rows] = await pool.query("SELECT * FROM RoomTypes WHERE RoomTypeId = ?", [id]);
    const r = rows[0];
    res.json({ success: true, message: "Đã cập nhật loại phòng thành công", data: { id: r.RoomTypeId, ma_loai: "RT-" + r.RoomTypeId, ten_loai: r.TypeName, mo_ta: r.Description, gia_co_ban: parseFloat(r.BasePrice), toi_da_nguoi_lon: r.AdultCapacity, toi_da_tre_em: r.ChildCapacity, hinh_anh: r.ImageUrl, trang_thai: r.Status === "Active" ? "active" : "inactive", tien_ich: [] } });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu RoomTypes không tồn tại hoặc đã bị xóa khỏi cơ sở dữ liệu!" });
    }
    res.status(500).json({ success: false, message: "Lỗi cơ sở dữ liệu: " + err.message });
  }
});

router.patch("/:id/trang-thai", async (req, res) => {
  try {
    const { id } = req.params; const { trang_thai } = req.body;
    if (!["active", "inactive"].includes(trang_thai)) return res.status(400).json({ success: false, message: "Trạng thái phải là active hoặc inactive" });
    const [existing] = await pool.query("SELECT RoomTypeId FROM RoomTypes WHERE RoomTypeId = ? AND IsDeleted = 0", [id]);
    if (!existing.length) return res.status(404).json({ success: false, isRecordDeleted: true, message: "Loại phòng không tồn tại hoặc đã bị xóa khỏi cơ sở dữ liệu" });
    await pool.query("UPDATE RoomTypes SET Status=?, UpdatedAt=NOW() WHERE RoomTypeId=?", [trang_thai === "active" ? "Active" : "Inactive", id]);
    res.json({ success: true, message: "Đã cập nhật trạng thái thành công" });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu RoomTypes không tồn tại hoặc đã bị xóa khỏi cơ sở dữ liệu!" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query("SELECT RoomTypeId, TypeName FROM RoomTypes WHERE RoomTypeId = ? AND IsDeleted = 0", [id]);
    if (!existing.length) return res.status(404).json({ success: false, isRecordDeleted: true, message: "Loại phòng không tồn tại hoặc đã bị xóa khỏi cơ sở dữ liệu" });
    await pool.query("UPDATE RoomTypes SET IsDeleted=1, UpdatedAt=NOW() WHERE RoomTypeId=?", [id]);
    res.json({ success: true, message: "Đã xóa loại phòng thành công" });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu RoomTypes không tồn tại hoặc đã bị xóa khỏi cơ sở dữ liệu!" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

