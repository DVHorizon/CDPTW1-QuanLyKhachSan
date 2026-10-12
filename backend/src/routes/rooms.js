const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// ═══════════════════════════════════════════════════════════════════════════
// API PHÒNG VẬT LÝ  →  /api/phong
// Bảng: physical_rooms
//   buong_phong: clean | dirty | ooo      (trạng thái buồng phòng)
//   luu_tru:     vacant | inhouse         (trạng thái lưu trú)
// ═══════════════════════════════════════════════════════════════════════════

const BUONG_PHONG = ["clean", "dirty", "ooo"];
const LUU_TRU = ["vacant", "inhouse"];
const ACTIONS = ["clean", "dirty", "checkin", "checkout", "ooo", "restore"];
const MSG_INVALID = "Thao tác không hợp lệ với trạng thái hiện tại.";

// ─── Tự tạo bảng nếu chưa có ───────────────────────────────────────────────
async function ensureTable() {
  try {
    const [exists] = await pool.query("SHOW TABLES LIKE 'physical_rooms'");
    const isNewTable = exists.length === 0;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS physical_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        so_phong VARCHAR(20) NOT NULL,
        tang INT NOT NULL,
        khu VARCHAR(20) NOT NULL DEFAULT 'A',
        ma_loai VARCHAR(50) NOT NULL,
        ma_khoa VARCHAR(50) NOT NULL,
        phong_lien_thong VARCHAR(20) NULL,
        ghi_chu VARCHAR(500) NULL,
        buong_phong ENUM('clean','dirty','ooo') NOT NULL DEFAULT 'clean',
        luu_tru ENUM('vacant','inhouse') NOT NULL DEFAULT 'vacant',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_so_phong (so_phong),
        UNIQUE KEY uq_ma_khoa (ma_khoa),
        KEY idx_tang (tang),
        KEY idx_ma_loai (ma_loai)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Chỉ nạp dữ liệu mẫu khi bảng vừa được tạo mới hoàn toàn
    if (isNewTable) {
      let codes = [];
      try {
        const [types] = await pool.query("SELECT RoomTypeId FROM RoomTypes WHERE IsDeleted = 0 ORDER BY RoomTypeId ASC");
        if (types.length > 0) {
          codes = types.map((t) => `RT-${t.RoomTypeId}`);
        }
      } catch (_) {}

      if (codes.length === 0) {
        codes = ["RT-1", "RT-2", "RT-3", "RT-4"];
      }

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
        `INSERT IGNORE INTO physical_rooms
         (so_phong,tang,khu,ma_loai,ma_khoa,phong_lien_thong,ghi_chu,buong_phong,luu_tru)
         VALUES ?`,
        [rows]
      );
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

// ─── Kiểm tra dữ liệu đầu vào (Hỗ trợ Unicode tiếng Việt & ký tự hợp lệ) ───
async function validateRoomInput(body) {
  const { so_phong, tang, khu, ma_loai, ma_khoa, phong_lien_thong, ghi_chu, buong_phong, luu_tru } = body;

  if (!so_phong || !String(so_phong).trim()) return "Số phòng không được để trống";
  const trimmedNumber = String(so_phong).trim();
  // Hỗ trợ chữ cái Unicode (tiếng Việt có dấu), chữ số, dấu gạch ngang, gạch dưới, chấm, khoảng trắng, gạch chéo
  if (!/^[\p{L}0-9._\-\/\s]{1,30}$/u.test(trimmedNumber)) {
    return "Số phòng chỉ gồm chữ cái, chữ số, dấu gạch ngang (-), gạch dưới (_), chấm (.), gạch chéo (/), khoảng trắng (tối đa 30 ký tự)";
  }

  const floor = Number(tang);
  if (!Number.isInteger(floor) || floor < 1 || floor > 99) return "Tầng phải là số nguyên từ 1 đến 99";

  if (khu !== undefined && String(khu).trim().length > 30) return "Tên khu tối đa 30 ký tự";

  if (!ma_loai || !String(ma_loai).trim()) return "Vui lòng chọn loại phòng";
  const trimmedType = String(ma_loai).trim();

  // Kiểm tra loại phòng có tồn tại trong CSDL RoomTypes
  try {
    let typeFound = false;
    const matchId = trimmedType.match(/^RT-(\d+)$/i);
    const numericId = matchId ? parseInt(matchId[1], 10) : (Number.isInteger(Number(trimmedType)) ? parseInt(trimmedType, 10) : null);
    if (numericId) {
      const [byNum] = await pool.query("SELECT RoomTypeId FROM RoomTypes WHERE RoomTypeId = ? AND IsDeleted = 0", [numericId]);
      if (byNum.length > 0) typeFound = true;
    }
    if (!typeFound) {
      const [byName] = await pool.query("SELECT RoomTypeId FROM RoomTypes WHERE TypeName = ? AND IsDeleted = 0", [trimmedType]);
      if (byName.length > 0) typeFound = true;
    }
    if (!typeFound) {
      // Cho phép mã nếu bảng RoomTypes rỗng hoặc mã hợp lệ
      const [allTypes] = await pool.query("SELECT RoomTypeId FROM RoomTypes WHERE IsDeleted = 0 LIMIT 1");
      if (allTypes.length === 0) {
        typeFound = true;
      }
    }
    if (!typeFound) {
      return `Loại phòng "${trimmedType}" không tồn tại trong cơ sở dữ liệu`;
    }
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      // Bỏ qua nếu bảng RoomTypes chưa có
    } else {
      console.error("Lỗi kiểm tra loại phòng:", err.message);
    }
  }

  if (!ma_khoa || !String(ma_khoa).trim()) return "Mã đầu đọc khóa không được để trống";
  const trimmedKey = String(ma_khoa).trim();
  if (trimmedKey.length > 50) return "Mã đầu đọc khóa tối đa 50 ký tự";

  if (phong_lien_thong && String(phong_lien_thong).trim().length > 30) return "Phòng liên thông tối đa 30 ký tự";
  if (ghi_chu && String(ghi_chu).length > 500) return "Ghi chú tối đa 500 ký tự";
  if (buong_phong !== undefined && !BUONG_PHONG.includes(buong_phong)) return "Trạng thái buồng phòng không hợp lệ";
  if (luu_tru !== undefined && !LUU_TRU.includes(luu_tru)) return "Trạng thái lưu trú không hợp lệ";
  return null;
}

function handleDup(err, res) {
  if (err.code === "ER_DUP_ENTRY") {
    const msg = String(err.message);
    if (msg.includes("uq_ma_khoa") || msg.toLowerCase().includes("ma_khoa"))
      return res.status(409).json({ success: false, message: "Mã đầu đọc khóa đã được dùng cho phòng khác" });
    return res.status(409).json({ success: false, message: "Số phòng đã tồn tại trong hệ thống" });
  }
  return null;
}

// ─── GET danh sách phòng & Sơ đồ phòng trực quan ───────────────────────────
// GET /api/phong?tang=4&khu=A&ma_loai=DLX-OCN&tim=101&limit=50
router.get("/", async (req, res) => {
  try {
    const { tang, khu, ma_loai, tim, limit, cat_bot_du_thua } = req.query;

    // Nếu người dùng yêu cầu cắt bớt dư thừa hoặc DB vượt quá 50, kiểm tra và chỉ lấy đúng 50 phòng
    const [[{ countAll }]] = await pool.query("SELECT COUNT(*) as countAll FROM physical_rooms");
    if ((cat_bot_du_thua === "true" || cat_bot_du_thua === "1") && countAll > 50) {
      await pool.query(
        "DELETE FROM physical_rooms WHERE id NOT IN (SELECT id FROM (SELECT id FROM physical_rooms ORDER BY tang ASC, so_phong ASC LIMIT 50) as sub)"
      );
    }

    // Giới hạn tối đa 50 bản ghi thật theo yêu cầu của hệ thống
    const maxLimit = 50;
    const queryLimit = Math.min(parseInt(limit) || maxLimit, maxLimit);

    let sql = "SELECT * FROM physical_rooms WHERE 1=1";
    const params = [];
    if (tang && tang !== "all") { sql += " AND tang = ?"; params.push(Number(tang)); }
    if (khu && khu !== "all") { sql += " AND khu = ?"; params.push(khu); }
    if (ma_loai && ma_loai !== "all") { sql += " AND ma_loai = ?"; params.push(ma_loai); }
    if (tim) {
      sql += " AND (so_phong LIKE ? OR ma_khoa LIKE ? OR ghi_chu LIKE ?)";
      params.push(`%${tim}%`, `%${tim}%`, `%${tim}%`);
    }
    sql += " ORDER BY tang ASC, so_phong ASC";
    sql += ` LIMIT ${queryLimit}`;
    const [rows] = await pool.query(sql, params);

    // Tính toán KPI 4 trạng thái trực tiếp từ 50 phòng
    let kpi = {
      total: rows.length,
      clean: 0,      // Trống sạch (vacant + clean)
      inhouse: 0,    // Đang ở (inhouse)
      dirty: 0,      // Chờ dọn dẹp (vacant + dirty)
      ooo: 0,        // Đang bảo trì (ooo)
      occupancyRate: 0
    };

    rows.forEach(r => {
      if (r.buong_phong === "ooo") {
        kpi.ooo++;
      } else if (r.luu_tru === "inhouse") {
        kpi.inhouse++;
      } else if (r.buong_phong === "dirty") {
        kpi.dirty++;
      } else {
        kpi.clean++;
      }
    });

    if (kpi.total > 0) {
      kpi.occupancyRate = Number(((kpi.inhouse / kpi.total) * 100).toFixed(1));
    }

    res.json({
      success: true,
      data: rows,
      total: rows.length,
      totalInDb: countAll,
      kpi,
      databaseSource: "MySQL (physical_rooms)"
    });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu physical_rooms không tồn tại trong cơ sở dữ liệu!" });
    }
    console.error("GET /phong error:", err.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + err.message });
  }
});

// ─── POST Đồng bộ & Cắt bớt giữ đúng 50 phòng chuẩn ─────────────────────────
router.post("/dong-bo-50", async (req, res) => {
  try {
    const [[{ total }]] = await pool.query("SELECT COUNT(*) as total FROM physical_rooms");
    if (total > 50) {
      await pool.query(
        "DELETE FROM physical_rooms WHERE id NOT IN (SELECT id FROM (SELECT id FROM physical_rooms ORDER BY tang ASC, so_phong ASC LIMIT 50) as sub)"
      );
    }
    const [rows] = await pool.query("SELECT * FROM physical_rooms ORDER BY tang ASC, so_phong ASC LIMIT 50");
    res.json({
      success: true,
      message: `Đã đồng bộ cơ sở dữ liệu: hiện có ${rows.length} phòng hoạt động.`,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi đồng bộ: " + err.message });
  }
});

// ─── PATCH Chuyển Đổi Trạng Thái Phòng Tự Động (Trống sạch, Đang ở, Chờ dọn, Bảo trì) ───
// PATCH /api/phong/:id/chuyen-trang-thai { targetStatus: "clean"|"inhouse"|"dirty"|"ooo", prevUpdatedAt?: string }
router.patch("/:id/chuyen-trang-thai", async (req, res) => {
  try {
    const { id } = req.params;
    const { targetStatus, prevUpdatedAt, note } = req.body;

    // Kiểm tra phòng có tồn tại không (phòng người khác đã xóa)
    const [rooms] = await pool.query("SELECT * FROM physical_rooms WHERE id = ?", [id]);
    if (!rooms.length) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: "Lỗi đồng bộ: Phòng này không còn tồn tại trong cơ sở dữ liệu (có thể đã bị xóa bởi nhân viên khác hoặc quản trị viên)!"
      });
    }

    const room = rooms[0];

    // Kiểm tra xung đột sửa đồng thời (Optimistic Lock)
    if (prevUpdatedAt && room.updated_at) {
      const prevTime = new Date(prevUpdatedAt).getTime();
      const currTime = new Date(room.updated_at).getTime();
      if (Math.abs(currTime - prevTime) > 1000) {
        return res.status(409).json({
          success: false,
          isConflict: true,
          message: `Lỗi xung đột: Phòng ${room.so_phong} vừa được chỉnh sửa bởi một người khác! Vui lòng làm mới dữ liệu để xem trạng thái mới nhất.`,
          currentRoom: room
        });
      }
    }

    // Quy tắc chuyển trạng thái tự động 4 nhóm chuẩn PMS
    let buong_phong = room.buong_phong;
    let luu_tru = room.luu_tru;

    switch (targetStatus) {
      case "clean": // Trống sạch (Ready to check-in)
        buong_phong = "clean";
        luu_tru = "vacant";
        break;
      case "inhouse": // Nhận phòng (Check-in -> Đang ở)
        if (room.buong_phong === "ooo") {
          return res.status(400).json({
            success: false,
            message: `Phòng ${room.so_phong} đang khóa bảo trì (OOO), không thể nhận khách lưu trú!`
          });
        }
        luu_tru = "inhouse";
        break;
      case "dirty": // Trả phòng (Check-out -> Chờ dọn dẹp)
        buong_phong = "dirty";
        luu_tru = "vacant";
        break;
      case "ooo": // Đưa vào bảo trì (Out of Order)
        if (room.luu_tru === "inhouse") {
          return res.status(400).json({
            success: false,
            message: `Phòng ${room.so_phong} đang có khách lưu trú! Vui lòng chuyển phòng hoặc trả phòng cho khách trước khi khóa bảo trì.`
          });
        }
        buong_phong = "ooo";
        luu_tru = "vacant";
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Trạng thái đích không hợp lệ! Chỉ chấp nhận: clean (Trống sạch), inhouse (Đang ở), dirty (Chờ dọn dẹp), ooo (Đang bảo trì)."
        });
    }

    const newNote = note !== undefined ? String(note).trim() : room.ghi_chu;

    await pool.query(
      "UPDATE physical_rooms SET buong_phong = ?, luu_tru = ?, ghi_chu = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [buong_phong, luu_tru, newNote, id]
    );

    const [updated] = await pool.query("SELECT * FROM physical_rooms WHERE id = ?", [id]);
    res.json({
      success: true,
      message: `Đã tự động cập nhật trạng thái phòng ${room.so_phong} thành công!`,
      data: updated[0]
    });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu physical_rooms không tồn tại!" });
    }
    console.error("PATCH /chuyen-trang-thai error:", err.message);
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
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu physical_rooms không tồn tại!" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST khóa cả tầng ─────────────────────────────────────────────────────
// POST /api/phong/khoa-tang  { ids: [..] }
router.post("/khoa-tang", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất một phòng." });

    const [picked] = await pool.query("SELECT DISTINCT tang FROM physical_rooms WHERE id IN (?)", [ids.map(Number)]);
    const floors = picked.map((p) => p.tang);
    if (!floors.length)
      return res.status(404).json({ success: false, isRecordDeleted: true, message: "Không tìm thấy phòng đã chọn trong cơ sở dữ liệu!" });

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
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu physical_rooms không tồn tại!" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST tạo phòng mới ────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const err = await validateRoomInput(req.body);
    if (err) return res.status(400).json({ success: false, message: err });

    const b = req.body;
    const soPhong = String(b.so_phong).trim();
    const maKhoa = String(b.ma_khoa).trim();

    // Kiểm tra trùng lặp số phòng
    const [existNum] = await pool.query("SELECT id FROM physical_rooms WHERE LOWER(so_phong) = LOWER(?)", [soPhong]);
    if (existNum.length > 0) {
      return res.status(409).json({ success: false, message: `Số phòng "${soPhong}" đã tồn tại trong hệ thống!` });
    }

    // Kiểm tra trùng lặp mã khóa
    const [existKey] = await pool.query("SELECT id FROM physical_rooms WHERE LOWER(ma_khoa) = LOWER(?)", [maKhoa]);
    if (existKey.length > 0) {
      return res.status(409).json({ success: false, message: `Mã đầu đọc khóa "${maKhoa}" đã được dùng cho phòng khác!` });
    }

    const [result] = await pool.query(
      `INSERT INTO physical_rooms
       (so_phong,tang,khu,ma_loai,ma_khoa,phong_lien_thong,ghi_chu,buong_phong,luu_tru)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        soPhong,
        Number(b.tang),
        String(b.khu || "A").trim(),
        String(b.ma_loai).trim(),
        maKhoa,
        b.phong_lien_thong ? String(b.phong_lien_thong).trim() : null,
        b.ghi_chu ? String(b.ghi_chu).trim() : null,
        b.buong_phong || "clean",
        b.luu_tru || "vacant",
      ]
    );
    const [rows] = await pool.query("SELECT * FROM physical_rooms WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, message: `Đã thêm phòng ${soPhong} thành công`, data: rows[0] });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu physical_rooms không còn tồn tại trong cơ sở dữ liệu!" });
    }
    if (handleDup(err, res)) return;
    res.status(500).json({ success: false, message: "Lỗi cơ sở dữ liệu: " + err.message });
  }
});

// ─── PUT cập nhật phòng ────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query("SELECT id, so_phong FROM physical_rooms WHERE id = ?", [id]);
    if (!existing.length) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: "Lỗi đồng bộ: Phòng này không còn tồn tại trong cơ sở dữ liệu (có thể đã bị xóa bởi người khác hoặc quản trị viên)!"
      });
    }

    const err = await validateRoomInput(req.body);
    if (err) return res.status(400).json({ success: false, message: err });

    const b = req.body;
    const soPhong = String(b.so_phong).trim();
    const maKhoa = String(b.ma_khoa).trim();

    // Kiểm tra trùng số phòng với các phòng khác
    const [dupNum] = await pool.query("SELECT id FROM physical_rooms WHERE LOWER(so_phong) = LOWER(?) AND id != ?", [soPhong, id]);
    if (dupNum.length > 0) {
      return res.status(409).json({ success: false, message: `Số phòng "${soPhong}" đã tồn tại trong hệ thống!` });
    }

    // Kiểm tra trùng mã khóa với các phòng khác
    const [dupKey] = await pool.query("SELECT id FROM physical_rooms WHERE LOWER(ma_khoa) = LOWER(?) AND id != ?", [maKhoa, id]);
    if (dupKey.length > 0) {
      return res.status(409).json({ success: false, message: `Mã đầu đọc khóa "${maKhoa}" đã được dùng cho phòng khác!` });
    }

    await pool.query(
      `UPDATE physical_rooms SET
       so_phong=?, tang=?, khu=?, ma_loai=?, ma_khoa=?, phong_lien_thong=?, ghi_chu=?, buong_phong=?, luu_tru=?
       WHERE id=?`,
      [
        soPhong,
        Number(b.tang),
        String(b.khu || "A").trim(),
        String(b.ma_loai).trim(),
        maKhoa,
        b.phong_lien_thong ? String(b.phong_lien_thong).trim() : null,
        b.ghi_chu ? String(b.ghi_chu).trim() : null,
        b.buong_phong || "clean",
        b.luu_tru || "vacant",
        id,
      ]
    );
    const [rows] = await pool.query("SELECT * FROM physical_rooms WHERE id = ?", [id]);
    res.json({ success: true, message: `Đã cập nhật phòng ${soPhong} thành công`, data: rows[0] });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu physical_rooms không còn tồn tại trong cơ sở dữ liệu!" });
    }
    if (handleDup(err, res)) return;
    res.status(500).json({ success: false, message: "Lỗi cơ sở dữ liệu: " + err.message });
  }
});

// ─── PATCH đổi trạng thái một phòng ────────────────────────────────────────
// PATCH /api/phong/:id/thao-tac  { action: "checkin" }
router.patch("/:id/thao-tac", async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const [rows] = await pool.query("SELECT * FROM physical_rooms WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: "Lỗi đồng bộ: Phòng này không còn tồn tại trong cơ sở dữ liệu (có thể đã bị xóa bởi người khác)!"
      });
    }

    const next = ACTIONS.includes(action) ? applyAction(rows[0], action) : null;
    if (!next) return res.status(400).json({ success: false, message: MSG_INVALID });

    await pool.query("UPDATE physical_rooms SET buong_phong=?, luu_tru=? WHERE id=?", [
      next.buong_phong, next.luu_tru, id,
    ]);
    res.json({ success: true, data: { ...rows[0], ...next } });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu physical_rooms không tồn tại!" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE xóa phòng ──────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM physical_rooms WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: "Lỗi đồng bộ: Phòng này không còn tồn tại hoặc đã bị xóa trước đó khỏi cơ sở dữ liệu!"
      });
    }
    if (rows[0].luu_tru === "inhouse") {
      return res.status(400).json({ success: false, message: "Không thể xóa phòng đang có khách lưu trú!" });
    }

    await pool.query("DELETE FROM physical_rooms WHERE id = ?", [id]);
    res.json({ success: true, message: `Đã xóa phòng ${rows[0].so_phong} thành công` });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ success: false, isTableMissing: true, message: "Bảng dữ liệu physical_rooms không tồn tại!" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
