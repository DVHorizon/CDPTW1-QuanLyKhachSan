const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// ═══════════════════════════════════════════════════════════════════════════
// API PHÒNG VẬT LÝ  →  /api/phong
// Bảng: physical_rooms (tự tạo khi server khởi động nếu chưa có)
//   buong_phong: clean | dirty | ooo      (trạng thái buồng phòng)
//   luu_tru:     vacant | inhouse         (trạng thái lưu trú)
// ═══════════════════════════════════════════════════════════════════════════

const BUONG_PHONG = ["clean", "dirty", "ooo"];
const LUU_TRU = ["vacant", "inhouse"];
const ACTIONS = ["clean", "dirty", "checkin", "checkout", "ooo", "restore"];
const MSG_INVALID = "Thao tác không hợp lệ với trạng thái hiện tại.";

// ─── Tự tạo bảng + dữ liệu mẫu lần đầu ─────────────────────────────────────
async function ensureTable() {
  try {
    const [exists] = await pool.query("SHOW TABLES LIKE 'physical_rooms'");
    const isNewTable = exists.length === 0;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS physical_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        so_phong VARCHAR(10) NOT NULL,
        tang INT NOT NULL,
        khu VARCHAR(5) NOT NULL DEFAULT 'A',
        ma_loai VARCHAR(20) NOT NULL,
        ma_khoa VARCHAR(50) NOT NULL,
        phong_lien_thong VARCHAR(10) NULL,
        ghi_chu VARCHAR(500) NULL,
        buong_phong ENUM('clean','dirty','ooo') NOT NULL DEFAULT 'clean',
        luu_tru ENUM('vacant','inhouse') NOT NULL DEFAULT 'vacant',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_so_phong (so_phong),
        UNIQUE KEY uq_ma_khoa (ma_khoa),
        KEY idx_tang (tang),
        KEY idx_ma_loai (ma_loai)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Chỉ nạp dữ liệu mẫu khi bảng vừa được tạo mới và đã có loại phòng
    if (isNewTable) {
      const [types] = await pool.query("SELECT ma_loai FROM room_types ORDER BY id ASC");
      if (types.length > 0) {
        const codes = types.map((t) => t.ma_loai);
        const rows = [];
        for (let floor = 1; floor <= 12; floor++) {
          for (let n = 1; n <= 12; n++) {
            const num = `${floor}${String(n).padStart(2, "0")}`;
            const roll = (floor * 7 + n * 3) % 10;
            let hk = "clean";
            let occ = "vacant";
            if (roll <= 5) occ = "inhouse";
            else if (roll === 6 || roll === 7) hk = "dirty";
            else if (roll === 9 && n % 4 === 0) hk = "ooo";
            rows.push([
              num,
              floor,
              floor <= 4 ? "A" : floor <= 8 ? "B" : "C",
              codes[n % codes.length],
              `RFID-${num}`,
              null,
              null,
              hk,
              occ,
            ]);
          }
        }
        await pool.query(
          `INSERT INTO physical_rooms
           (so_phong,tang,khu,ma_loai,ma_khoa,phong_lien_thong,ghi_chu,buong_phong,luu_tru)
           VALUES ?`,
          [rows]
        );
        console.log("physical_rooms: đã nạp 144 phòng mẫu");
      }
    }
  } catch (err) {
    console.error("ensureTable physical_rooms error:", err.message);
  }
}
ensureTable();

// ─── Quy tắc chuyển trạng thái (giống giao diện) ───────────────────────────
function applyAction(room, action) {
  const hk = room.buong_phong;
  const occ = room.luu_tru;
  switch (action) {
    case "clean":
      return hk === "dirty" ? { buong_phong: "clean", luu_tru: occ } : null;
    case "dirty":
      return hk === "clean" ? { buong_phong: "dirty", luu_tru: occ } : null;
    case "checkin":
      return hk === "clean" && occ === "vacant" ? { buong_phong: hk, luu_tru: "inhouse" } : null;
    case "checkout":
      return occ === "inhouse" && hk !== "ooo" ? { buong_phong: "dirty", luu_tru: "vacant" } : null;
    case "ooo":
      return hk !== "ooo" && occ === "vacant" ? { buong_phong: "ooo", luu_tru: occ } : null;
    case "restore":
      return hk === "ooo" ? { buong_phong: "dirty", luu_tru: occ } : null;
    default:
      return null;
  }
}

// ─── Kiểm tra dữ liệu đầu vào ──────────────────────────────────────────────
async function validateRoomInput(body) {
  const { so_phong, tang, khu, ma_loai, ma_khoa, phong_lien_thong, ghi_chu, buong_phong, luu_tru } = body;

  if (!so_phong || !String(so_phong).trim()) return "Số phòng không được để trống";
  if (!/^[A-Za-z0-9-]{1,10}$/.test(String(so_phong).trim()))
    return "Số phòng chỉ gồm chữ, số, gạch ngang (tối đa 10 ký tự)";

  const floor = Number(tang);
  if (!Number.isInteger(floor) || floor < 1 || floor > 99) return "Tầng phải là số nguyên từ 1 đến 99";

  if (khu !== undefined && !/^[A-Za-z0-9]{1,5}$/.test(String(khu).trim())) return "Khu không hợp lệ";

  if (!ma_loai || !String(ma_loai).trim()) return "Vui lòng chọn loại phòng";
  const [types] = await pool.query("SELECT id FROM room_types WHERE ma_loai = ?", [String(ma_loai).trim()]);
  if (!types.length) return `Loại phòng "${ma_loai}" không tồn tại`;

  if (!ma_khoa || !String(ma_khoa).trim()) return "Mã đầu đọc khóa không được để trống";
  if (String(ma_khoa).trim().length > 50) return "Mã đầu đọc khóa tối đa 50 ký tự";

  if (phong_lien_thong && String(phong_lien_thong).trim().length > 10) return "Phòng liên thông tối đa 10 ký tự";
  if (ghi_chu && String(ghi_chu).length > 500) return "Ghi chú tối đa 500 ký tự";
  if (buong_phong !== undefined && !BUONG_PHONG.includes(buong_phong)) return "Trạng thái buồng phòng không hợp lệ";
  if (luu_tru !== undefined && !LUU_TRU.includes(luu_tru)) return "Trạng thái lưu trú không hợp lệ";
  return null;
}

function handleDup(err, res) {
  if (err.code === "ER_DUP_ENTRY") {
    const msg = String(err.message);
    if (msg.includes("uq_ma_khoa"))
      return res.status(409).json({ success: false, message: "Mã đầu đọc khóa đã được dùng cho phòng khác" });
    return res.status(409).json({ success: false, message: "Số phòng đã tồn tại" });
  }
  return null;
}

// ─── GET danh sách phòng ───────────────────────────────────────────────────
// GET /api/phong?tang=4&khu=A&ma_loai=DLX-OCN&tim=101
router.get("/", async (req, res) => {
  try {
    const { tang, khu, ma_loai, tim } = req.query;
    let sql = "SELECT * FROM physical_rooms WHERE 1=1";
    const params = [];
    if (tang) { sql += " AND tang = ?"; params.push(Number(tang)); }
    if (khu) { sql += " AND khu = ?"; params.push(khu); }
    if (ma_loai) { sql += " AND ma_loai = ?"; params.push(ma_loai); }
    if (tim) {
      sql += " AND (so_phong LIKE ? OR ma_khoa LIKE ?)";
      params.push(`%${tim}%`, `%${tim}%`);
    }
    sql += " ORDER BY tang ASC, so_phong ASC";
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    console.error("GET /phong error:", err.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + err.message });
  }
});

// ─── POST thao tác hàng loạt ───────────────────────────────────────────────
// POST /api/phong/hang-loat  { ids: [1,2,3], action: "clean" }
router.post("/hang-loat", async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: "Chưa chọn phòng nào để áp dụng." });
    if (!ACTIONS.includes(action))
      return res.status(400).json({ success: false, message: MSG_INVALID });

    const [rooms] = await pool.query("SELECT * FROM physical_rooms WHERE id IN (?)", [ids.map(Number)]);
    const updated = [];
    let skipped = 0;
    for (const room of rooms) {
      const next = applyAction(room, action);
      if (!next) { skipped++; continue; }
      await pool.query("UPDATE physical_rooms SET buong_phong=?, luu_tru=? WHERE id=?", [
        next.buong_phong, next.luu_tru, room.id,
      ]);
      updated.push({ ...room, ...next });
    }
    if (updated.length === 0)
      return res.status(400).json({ success: false, message: MSG_INVALID });

    res.json({ success: true, data: { updated, ok: updated.length, skipped } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST khóa cả tầng ─────────────────────────────────────────────────────
// POST /api/phong/khoa-tang  { ids: [..] }  → khóa mọi phòng trống của các tầng có phòng được chọn
router.post("/khoa-tang", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất một phòng." });

    const [picked] = await pool.query("SELECT DISTINCT tang FROM physical_rooms WHERE id IN (?)", [ids.map(Number)]);
    const floors = picked.map((p) => p.tang);
    if (!floors.length)
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng đã chọn" });

    const [rooms] = await pool.query("SELECT * FROM physical_rooms WHERE tang IN (?)", [floors]);
    const updated = [];
    let skipped = 0;
    for (const room of rooms) {
      const next = applyAction(room, "ooo");
      if (!next) { if (room.buong_phong !== "ooo") skipped++; continue; }
      await pool.query("UPDATE physical_rooms SET buong_phong=?, luu_tru=? WHERE id=?", [
        next.buong_phong, next.luu_tru, room.id,
      ]);
      updated.push({ ...room, ...next });
    }
    if (updated.length === 0)
      return res.status(400).json({ success: false, message: MSG_INVALID });

    res.json({ success: true, data: { updated, ok: updated.length, skipped, floors } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST tạo phòng mới ────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const err = await validateRoomInput(req.body);
    if (err) return res.status(400).json({ success: false, message: err });

    const b = req.body;
    const [result] = await pool.query(
      `INSERT INTO physical_rooms
       (so_phong,tang,khu,ma_loai,ma_khoa,phong_lien_thong,ghi_chu,buong_phong,luu_tru)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        String(b.so_phong).trim(), Number(b.tang), String(b.khu || "A").trim(),
        String(b.ma_loai).trim(), String(b.ma_khoa).trim(),
        b.phong_lien_thong ? String(b.phong_lien_thong).trim() : null,
        b.ghi_chu ? String(b.ghi_chu).trim() : null,
        b.buong_phong || "clean", b.luu_tru || "vacant",
      ]
    );
    const [rows] = await pool.query("SELECT * FROM physical_rooms WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, message: "Đã thêm phòng thành công", data: rows[0] });
  } catch (err) {
    if (handleDup(err, res)) return;
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT cập nhật phòng ────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query("SELECT id FROM physical_rooms WHERE id = ?", [id]);
    if (!existing.length)
      return res.status(404).json({ success: false, message: "Lỗi đồng bộ: Phòng này không còn tồn tại trong cơ sở dữ liệu!" });

    const err = await validateRoomInput(req.body);
    if (err) return res.status(400).json({ success: false, message: err });

    const b = req.body;
    await pool.query(
      `UPDATE physical_rooms SET
       so_phong=?, tang=?, khu=?, ma_loai=?, ma_khoa=?, phong_lien_thong=?, ghi_chu=?, buong_phong=?, luu_tru=?
       WHERE id=?`,
      [
        String(b.so_phong).trim(), Number(b.tang), String(b.khu || "A").trim(),
        String(b.ma_loai).trim(), String(b.ma_khoa).trim(),
        b.phong_lien_thong ? String(b.phong_lien_thong).trim() : null,
        b.ghi_chu ? String(b.ghi_chu).trim() : null,
        b.buong_phong || "clean", b.luu_tru || "vacant", id,
      ]
    );
    const [rows] = await pool.query("SELECT * FROM physical_rooms WHERE id = ?", [id]);
    res.json({ success: true, message: "Đã cập nhật phòng thành công", data: rows[0] });
  } catch (err) {
    if (handleDup(err, res)) return;
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH đổi trạng thái một phòng ────────────────────────────────────────
// PATCH /api/phong/:id/thao-tac  { action: "checkin" }
router.patch("/:id/thao-tac", async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const [rows] = await pool.query("SELECT * FROM physical_rooms WHERE id = ?", [id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Lỗi đồng bộ: Phòng này không còn tồn tại trong cơ sở dữ liệu!" });

    const next = ACTIONS.includes(action) ? applyAction(rows[0], action) : null;
    if (!next) return res.status(400).json({ success: false, message: MSG_INVALID });

    await pool.query("UPDATE physical_rooms SET buong_phong=?, luu_tru=? WHERE id=?", [
      next.buong_phong, next.luu_tru, id,
    ]);
    res.json({ success: true, data: { ...rows[0], ...next } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE xóa phòng ──────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM physical_rooms WHERE id = ?", [id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Lỗi đồng bộ: Phòng này không còn tồn tại hoặc đã bị xóa trước đó!" });
    if (rows[0].luu_tru === "inhouse")
      return res.status(400).json({ success: false, message: MSG_INVALID });

    await pool.query("DELETE FROM physical_rooms WHERE id = ?", [id]);
    res.json({ success: true, message: `Đã xóa phòng ${rows[0].so_phong} thành công` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
