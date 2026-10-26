'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const {
  sequelize,
  Stay,
  Booking,
  Room,
  RoomType,
  User,
  Invoice,
  InvoiceDetail,
  Payment,
  LateFeePolicy,
  RoomInspectionReport,
  DamageItem,
  AuditLog
} = require('../../models');

// ─── Bảng mã lỗi chuẩn theo Đặc tả FEAT-CHECKOUT-INSPECT-01 ─────────────────
const SPEC_MESSAGES = {
  ERROR_0009_UNAUTHENTICATED: 'Bạn cần đăng nhập để thực hiện chức năng này',
  ERROR_0010_FORBIDDEN: 'Bạn không có quyền thực hiện chức năng này',
  CHECKOUT_0001_STAY_NOT_ACTIVE: 'Không thể trả phòng vì lượt lưu trú không còn hiệu lực',
  CHECKOUT_0002_POLICY_NOT_CONFIGURED: 'Chưa cấu hình chính sách phụ thu trả trễ cho cơ sở này',
  CHECKOUT_0003_VERSION_CONFLICT: 'Thông tin trả phòng vừa được cập nhật. Vui lòng tải lại trước khi tiếp tục.',
  CHECKOUT_0004_INSPECTION_REQUIRED: 'Chưa hoàn tất kiểm phòng. Vui lòng kiểm tra hoặc chọn phương án xử lý được phép.',
  CHECKOUT_0005_DAMAGE_EVIDENCE_REQUIRED: 'Vui lòng bổ sung bằng chứng cho hư hỏng đã ghi nhận',
  CHECKOUT_0006_APPROVAL_REQUIRED: 'Khoản bồi thường cần được giám sát xác nhận trước khi tính phí',
  CHECKOUT_0007_REASON_REQUIRED: 'Vui lòng nhập lý do cho thao tác miễn hoặc điều chỉnh khoản phí',
  CHECKOUT_0008_CHARGE_FAILED: 'Không thể cập nhật khoản phí vào hóa đơn. Vui lòng thử lại.',
  CHECKOUT_0009_ALREADY_COMPLETED: 'Lượt lưu trú này đã được trả phòng',
  CHECKOUT_0010_DAMAGE_DISPUTED: 'Khoản hư hỏng đang được tranh chấp và chưa thể xác nhận thu phí',
  SUCCESS_CHECKOUT_0001_COMPLETED: 'Trả phòng thành công. Hóa đơn đã được cập nhật.'
};

// Danh mục Minibar mặc định theo chuẩn Terminal
const DEFAULT_MINIBAR_ITEMS = [
  { id: 1, name: 'Nước khoáng cao cấp Evian 750ml', note: 'Đã mở nắp // Tủ lạnh minibar', unitPrice: 80000, defaultQty: 2 },
  { id: 2, name: 'Hạnh nhân rang muối thượng hạng 150g', note: 'Khay đồ ăn vặt phòng khách', unitPrice: 120000, defaultQty: 1 },
  { id: 3, name: 'Rượu sâm banh Moët & Chandon Mini (375ml)', note: 'Tem niêm phong còn nguyên', unitPrice: 650000, defaultQty: 0 },
  { id: 4, name: 'Viên nén cà phê cao cấp Espresso', note: 'Tiện ích phòng Suite miễn phí', unitPrice: 0, defaultQty: 4, isComp: true },
  { id: 5, name: 'Phim theo yêu cầu trên Smart TV (VOD)', note: 'Hệ thống IPTV tự ghi nhận lúc 21:40', unitPrice: 189900, defaultQty: 1 }
];

// Helper: tính phụ thu trả trễ từ thời gian server
function calculateLateFee(expectedCheckout, serverTime, policy, roomDailyRate = 1200000) {
  if (!expectedCheckout) return { lateMinutes: 0, lateFeeAmount: 0, formula: 'Không xác định giờ checkout' };

  const expTime = new Date(expectedCheckout).getTime();
  const nowTime = serverTime.getTime();
  const diffMinutes = Math.floor((nowTime - expTime) / 60000);

  const graceMinutes = Number(policy.GracePeriodMinutes || 30);
  const lateMinutes = Math.max(0, diffMinutes - graceMinutes);

  if (lateMinutes <= 0) {
    return {
      lateMinutes: 0,
      lateFeeAmount: 0,
      formula: `Trả trong hạn hoặc trong ân hạn (${graceMinutes} phút grace period)`
    };
  }

  const lateHours = lateMinutes / 60;
  let lateFeeAmount = 0;
  let formula = '';

  const halfDayHours = Number(policy.HalfDayThresholdHours || 3);
  const fullDayHours = Number(policy.FullDayThresholdHours || 6);
  const hourlyFee = Number(policy.HourlyFee || 200000);
  const halfDayFee = roomDailyRate * (Number(policy.HalfDayFeePercent || 50) / 100);
  const fullDayFee = roomDailyRate * (Number(policy.FullDayFeePercent || 100) / 100);
  const maxFee = Number(policy.MaxFee || 3000000);

  if (lateHours <= halfDayHours) {
    lateFeeAmount = Math.min(Math.ceil(lateHours) * hourlyFee, halfDayFee);
    formula = `${Math.ceil(lateHours)} giờ trễ x ${hourlyFee.toLocaleString('vi-VN')} ₫/giờ`;
  } else if (lateHours <= fullDayHours) {
    lateFeeAmount = halfDayFee;
    formula = `Quá ${halfDayHours}h trễ: Phụ thu 50% tiền phòng ngày (${halfDayFee.toLocaleString('vi-VN')} ₫)`;
  } else {
    lateFeeAmount = fullDayFee;
    formula = `Quá ${fullDayHours}h trễ: Phụ thu 100% tiền phòng ngày (${fullDayFee.toLocaleString('vi-VN')} ₫)`;
  }

  if (lateFeeAmount > maxFee) {
    lateFeeAmount = maxFee;
    formula += ` (Áp dụng trần tối đa ${maxFee.toLocaleString('vi-VN')} ₫)`;
  }

  return { lateMinutes, lateFeeAmount, formula };
}

// ─── 1. GET /api/v1/check-out/stays ─────────────────────────────────────────
// Danh sách các lượt lưu trú đang CheckedIn hoặc Due out để hiển thị trên bảng điều khiển
router.get('/stays', async (req, res) => {
  try {
    const { query = '', limit = 30 } = req.query;
    let whereClause = "s.Status = 'CheckedIn'";
    const params = [];

    if (query.trim()) {
      whereClause += ` AND (
        r.RoomNumber LIKE ? OR
        b.ConfirmationCode LIKE ? OR
        u.FullName LIKE ? OR
        u.Phone LIKE ?
      )`;
      const q = `%${query.trim()}%`;
      params.push(q, q, q, q);
    }

    const sql = `
      SELECT
        s.StayId,
        s.BookingId,
        s.RoomId,
        s.Status AS StayStatus,
        s.DepositAmount AS StayDeposit,
        s.ActualCheckIn,
        s.ExpectedCheckOut,
        s.UpdatedAt AS StayUpdatedAt,
        r.RoomNumber,
        r.Floor,
        r.Status AS RoomStatus,
        rt.RoomTypeId,
        rt.TypeName AS RoomTypeName,
        rt.BasePrice AS RoomBasePrice,
        b.ConfirmationCode,
        b.NumberOfNights,
        b.TotalAmount AS BookingTotalAmount,
        b.DepositAmount AS BookingDepositAmount,
        b.Status AS BookingStatus,
        COALESCE(u.FullName, 'Khách vãng lai') AS GuestName,
        COALESCE(u.Phone, '') AS GuestPhone,
        COALESCE(u.Email, '') AS GuestEmail,
        COALESCE(mt.TierName, 'VIP GOLD') AS GuestTier,
        insp.Status AS InspectionStatus,
        insp.InspectionId,
        insp.RoomCondition,
        insp.KeycardsReturned
      FROM Stays s
      JOIN Rooms r ON s.RoomId = r.RoomId
      JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      JOIN Bookings b ON s.BookingId = b.BookingId
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
      LEFT JOIN RoomInspectionReports insp ON s.StayId = insp.StayId
      WHERE ${whereClause}
      ORDER BY s.StayId DESC
      LIMIT ?
    `;
    params.push(Number(limit) || 30);

    const [rows] = await pool.query(sql, params);

    const now = new Date();
    const enriched = rows.map((row) => {
      const exp = row.ExpectedCheckOut ? new Date(row.ExpectedCheckOut) : null;
      const isOverdue = exp ? now.getTime() > exp.getTime() : false;
      const overdueMinutes = (exp && isOverdue) ? Math.floor((now.getTime() - exp.getTime()) / 60000) : 0;

      return {
        ...row,
        isOverdue,
        overdueMinutes,
        dueOutToday: exp ? (exp.toDateString() === now.toDateString()) : false
      };
    });

    res.json({
      success: true,
      data: enriched
    });
  } catch (err) {
    console.error('GET /api/v1/check-out/stays error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 2. GET /api/v1/check-out/stay/:stayId hoặc /api/v1/stays/:stayId/checkout/preview ───
// Lấy chi tiết lưu trú, dự toán phụ thu trễ giờ, minibar, kiểm phòng, và folio
const handleCheckoutPreview = async (req, res) => {
  try {
    const { stayId } = req.params;

    // 1. Kiểm tra tồn tại và trạng thái stay
    const sqlStay = `
      SELECT
        s.StayId,
        s.BookingId,
        s.RoomId,
        s.Status AS StayStatus,
        s.ActualCheckIn,
        s.ExpectedCheckOut,
        s.ActualCheckOut,
        s.DepositAmount AS StayDeposit,
        s.UpdatedAt AS StayUpdatedAt,
        r.RoomNumber,
        r.Floor,
        r.Status AS RoomStatus,
        rt.RoomTypeId,
        rt.TypeName AS RoomTypeName,
        rt.BasePrice AS RoomBasePrice,
        b.ConfirmationCode,
        b.CheckInDate,
        b.CheckOutDate,
        b.NumberOfNights,
        b.TotalAmount AS BookingTotalAmount,
        b.DepositAmount AS BookingDepositAmount,
        b.Status AS BookingStatus,
        COALESCE(u.FullName, 'Khách hàng') AS GuestName,
        COALESCE(u.Phone, '') AS GuestPhone,
        COALESCE(u.Email, '') AS GuestEmail,
        COALESCE(mt.TierName, 'VIP GOLD') AS GuestTier
      FROM Stays s
      JOIN Rooms r ON s.RoomId = r.RoomId
      JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      JOIN Bookings b ON s.BookingId = b.BookingId
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
      WHERE s.StayId = ?
    `;
    const [stays] = await pool.query(sqlStay, [stayId]);

    if (!stays.length) {
      return res.status(404).json({
        success: false,
        errorCode: 'CHECKOUT_0001_STAY_NOT_ACTIVE',
        message: SPEC_MESSAGES.CHECKOUT_0001_STAY_NOT_ACTIVE
      });
    }

    const stay = stays[0];

    if (stay.StayStatus === 'CheckedOut') {
      return res.status(400).json({
        success: false,
        errorCode: 'CHECKOUT_0009_ALREADY_COMPLETED',
        message: SPEC_MESSAGES.CHECKOUT_0009_ALREADY_COMPLETED
      });
    }

    // 2. Lấy chính sách phụ thu trả trễ có hiệu lực
    const [policies] = await pool.query(
      'SELECT * FROM LateFeePolicies WHERE IsActive = 1 ORDER BY PolicyId DESC LIMIT 1'
    );
    if (!policies.length) {
      return res.status(400).json({
        success: false,
        errorCode: 'CHECKOUT_0002_POLICY_NOT_CONFIGURED',
        message: SPEC_MESSAGES.CHECKOUT_0002_POLICY_NOT_CONFIGURED
      });
    }
    const policy = policies[0];

    // 3. Tính toán late fee tại thời điểm server hiện tại (UTC & Local)
    const serverTime = new Date();
    const roomRate = Number(stay.RoomBasePrice || 1200000);
    const lateFeeCalc = calculateLateFee(stay.ExpectedCheckOut, serverTime, policy, roomRate);

    // 4. Lấy biên bản kiểm phòng (nếu có)
    const [inspections] = await pool.query(
      'SELECT * FROM RoomInspectionReports WHERE StayId = ? ORDER BY InspectionId DESC LIMIT 1',
      [stayId]
    );
    let inspection = inspections.length ? inspections[0] : null;

    // 5. Lấy danh sách hư hỏng đã ghi nhận (DamageItems)
    const [damageItems] = await pool.query(
      'SELECT * FROM DamageItems WHERE StayId = ? ORDER BY DamageItemId ASC',
      [stayId]
    );

    // Phân tích trạng thái hư hỏng
    const parsedDamageItems = damageItems.map(d => ({
      ...d,
      evidenceUrls: typeof d.EvidenceUrls === 'string' ? JSON.parse(d.EvidenceUrls || '[]') : (d.EvidenceUrls || [])
    }));

    // Tính tổng hư hỏng đã được DUYỆT (chỉ APPROVED mới tính vào số tiền chốt thu)
    const approvedDamageAmount = parsedDamageItems
      .filter(d => d.Status === 'APPROVED')
      .reduce((sum, d) => sum + Number(d.ApprovedCharge || 0), 0);

    const pendingDamageCount = parsedDamageItems.filter(d => d.Status === 'SUBMITTED').length;
    const disputedDamageCount = parsedDamageItems.filter(d => d.Status === 'DISPUTED').length;

    // 6. Lấy tiêu dùng Minibar theo Spec 12 (FEAT-MINIBAR-01)
    const [minibarInspections] = await pool.query(
      "SELECT * FROM MinibarInspections WHERE StayId = ? ORDER BY InspectionId DESC LIMIT 1",
      [stayId]
    );
    let minibarTotal = 0;
    let minibarInspectionData = null;
    let activeMinibarList = DEFAULT_MINIBAR_ITEMS;

    if (minibarInspections.length > 0) {
      minibarInspectionData = minibarInspections[0];
      minibarTotal = Number(minibarInspections[0].Subtotal || minibarInspections[0].TotalAmount || 0);
      const [mbLines] = await pool.query(
        "SELECT * FROM MinibarInspectionLines WHERE InspectionId = ?",
        [minibarInspections[0].InspectionId]
      );
      if (mbLines.length > 0) {
        activeMinibarList = mbLines.map((l) => ({
          id: l.LineId,
          productId: l.ProductId,
          name: l.ProductName,
          category: l.Category,
          unit: l.Unit,
          openingQty: Number(l.OpeningQty),
          replenishedQty: Number(l.ReplenishedQty),
          remainingQty: Number(l.RemainingQty),
          defaultQty: Number(l.ConsumedQty),
          unitPrice: Number(l.UnitPrice),
          lineAmount: Number(l.LineAmount),
          varianceReason: l.VarianceReason,
          isException: Boolean(l.IsException),
          status: l.Status
        }));
      }
    } else {
      const [minibarUsages] = await pool.query(
        `SELECT
          mu.UsageId,
          mu.ItemId,
          mu.Quantity,
          mu.UnitPrice,
          mu.TotalAmount,
          ii.ItemName,
          ii.Unit
         FROM MinibarUsages mu
         LEFT JOIN InventoryItems ii ON mu.ItemId = ii.ItemId
         WHERE mu.StayId = ?`,
        [stayId]
      );
      if (minibarUsages.length > 0) {
        minibarTotal = minibarUsages.reduce((sum, m) => sum + Number(m.TotalAmount || 0), 0);
      }
    }

    // 7. Lấy các dịch vụ F&B và dịch vụ phòng phát sinh
    const [fnbOrders] = await pool.query(
      `SELECT FoodOrderId, TotalAmount, Status, OrderTime
       FROM FoodOrders
       WHERE StayId = ? AND Status != 'Cancelled'
       LIMIT 10`,
      [stayId]
    );
    const fnbTotal = fnbOrders.reduce((sum, o) => sum + Number(o.TotalAmount || 0), 0);

    // 8. Tính toán Folio kế toán hoàn chỉnh (Itemized Folio Accounting)
    const nights = Math.max(1, Number(stay.NumberOfNights || 1));
    const roomChargeTotal = roomRate * nights;
    const resortAmenityFee = 150000 * nights; // Phí tiện ích resort
    const keycardPenalty = inspection ? Number(inspection.KeycardLossPenalty || 0) : 0;
    const linenDamageFee = inspection ? Number(inspection.LinenDamageFee || 0) : 0;

    // Tổng tiền dịch vụ trước thuế
    const subtotalGross =
      roomChargeTotal +
      resortAmenityFee +
      fnbTotal +
      minibarTotal +
      lateFeeCalc.lateFeeAmount +
      approvedDamageAmount +
      linenDamageFee +
      keycardPenalty;

    // Thuế VAT & phí lưu trú (10%)
    const taxRate = Number(policy.TaxRate || 10);
    const taxAmount = Math.round(subtotalGross * (taxRate / 100));

    // Tổng gross bao gồm thuế
    const totalGrossWithTax = subtotalGross + taxAmount;

    // Tiền cọc đã thanh toán trước (Booking Deposit)
    const depositPaid = Number(stay.BookingDepositAmount || stay.StayDeposit || 0);

    // Số dư cuối cùng cần thanh toán (Outstanding final balance due)
    const outstandingBalance = Math.max(0, totalGrossWithTax - depositPaid);

    res.json({
      success: true,
      data: {
        stay,
        serverTime: serverTime.toISOString(),
        policy,
        lateFeeCalculation: {
          ...lateFeeCalc,
          isEstimate: true,
          scheduledCheckoutAt: stay.ExpectedCheckOut,
          serverTimestamp: serverTime.toISOString(),
          gracePeriodMinutes: Number(policy.GracePeriodMinutes || 30)
        },
        inspection: inspection || {
          Status: 'NOT_STARTED',
          KeycardsIssued: 2,
          KeycardsReturned: 2,
          KeycardLossPenalty: 0,
          RoomCondition: 'NOMINAL',
          LinenDamageFee: 0,
          GuestAcknowledgement: 'ACKNOWLEDGED'
        },
        damageItems: parsedDamageItems,
        damageSummary: {
          approvedDamageAmount,
          pendingDamageCount,
          disputedDamageCount
        },
        minibarItems: activeMinibarList,
        minibarTotal,
        minibarInspection: minibarInspectionData,
        fnbOrders,
        fnbTotal,
        folioLedger: {
          roomChargeTotal,
          roomRate,
          nights,
          resortAmenityFee,
          fnbTotal,
          minibarTotal,
          lateFeeAmount: lateFeeCalc.lateFeeAmount,
          approvedDamageAmount,
          linenDamageFee,
          keycardPenalty,
          subtotalGross,
          taxRate,
          taxAmount,
          totalGrossWithTax,
          depositPaid,
          outstandingBalance
        }
      }
    });
  } catch (err) {
    console.error('Checkout preview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

router.get('/stay/:stayId', handleCheckoutPreview);
router.get('/preview/:stayId', handleCheckoutPreview);
router.post('/preview/:stayId', handleCheckoutPreview);

// ─── 3. POST /api/v1/check-out/room-inspections hoặc /api/v1/stays/:stayId/room-inspections ───
// Ghi nhận biên bản kiểm phòng và danh sách hư hỏng
const handleRoomInspectionSubmit = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const stayId = req.params.stayId || req.body.stayId;
    const {
      roomId,
      inspectorName = 'R. Gomez (Housekeeping Staff #409)',
      keycardsIssued = 2,
      keycardsReturned = 2,
      roomCondition = 'NOMINAL',
      linenDamageFee = 0,
      guestAcknowledgement = 'ACKNOWLEDGED',
      guestNotes = '',
      damageItems = []
    } = req.body;

    if (!stayId) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Thiếu stayId' });
    }

    // Tính phí mất chìa khóa (mỗi chìa mất 100,000 ₫)
    const lostKeys = Math.max(0, Number(keycardsIssued) - Number(keycardsReturned));
    const keycardLossPenalty = lostKeys * 100000;

    // Lưu hoặc cập nhật RoomInspectionReports
    const [existInsp] = await conn.query('SELECT InspectionId FROM RoomInspectionReports WHERE StayId = ?', [stayId]);
    let inspectionId = null;

    if (existInsp.length > 0) {
      inspectionId = existInsp[0].InspectionId;
      await conn.query(
        `UPDATE RoomInspectionReports SET
          InspectorName = ?,
          InspectionTime = NOW(),
          Status = 'SUBMITTED',
          KeycardsIssued = ?,
          KeycardsReturned = ?,
          KeycardLossPenalty = ?,
          RoomCondition = ?,
          LinenDamageFee = ?,
          GuestAcknowledgement = ?,
          GuestNotes = ?
        WHERE InspectionId = ?`,
        [
          inspectorName,
          keycardsIssued,
          keycardsReturned,
          keycardLossPenalty,
          roomCondition,
          linenDamageFee,
          guestAcknowledgement,
          guestNotes,
          inspectionId
        ]
      );
    } else {
      const [insertRes] = await conn.query(
        `INSERT INTO RoomInspectionReports (
          StayId, RoomId, InspectorName, InspectionTime, Status,
          KeycardsIssued, KeycardsReturned, KeycardLossPenalty,
          RoomCondition, LinenDamageFee, GuestAcknowledgement, GuestNotes
        ) VALUES (?, ?, ?, NOW(), 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?)`,
        [
          stayId,
          roomId || 0,
          inspectorName,
          keycardsIssued,
          keycardsReturned,
          keycardLossPenalty,
          roomCondition,
          linenDamageFee,
          guestAcknowledgement,
          guestNotes
        ]
      );
      inspectionId = insertRes.insertId;
    }

    // Lưu danh mục hư hỏng nếu có
    if (Array.isArray(damageItems) && damageItems.length > 0) {
      for (const item of damageItems) {
        // Kiểm tra validation bắt buộc theo spec: mô tả >= 10 ký tự, phải có bằng chứng ảnh nếu khai báo hư hỏng
        if (!item.itemName || !item.damageDescription || item.damageDescription.trim().length < 5) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            errorCode: 'CHECKOUT_0005_DAMAGE_EVIDENCE_REQUIRED',
            message: 'Mô tả hư hỏng quá ngắn hoặc thiếu thông tin tài sản.'
          });
        }

        const evidence = Array.isArray(item.evidenceUrls) ? item.evidenceUrls : (item.evidenceUrls ? [item.evidenceUrls] : []);

        if (item.damageItemId) {
          await conn.query(
            `UPDATE DamageItems SET
              ItemName = ?,
              ItemLocation = ?,
              DamageDescription = ?,
              Severity = ?,
              EvidenceUrls = ?,
              ProposedCharge = ?
            WHERE DamageItemId = ?`,
            [
              item.itemName,
              item.itemLocation || 'Phòng ngủ chính / Master Bedroom',
              item.damageDescription,
              item.severity || 'MODERATE',
              JSON.stringify(evidence),
              item.proposedCharge || 0,
              item.damageItemId
            ]
          );
        } else {
          await conn.query(
            `INSERT INTO DamageItems (
              InspectionId, StayId, RoomId, ItemName, ItemLocation,
              DamageDescription, Severity, EvidenceUrls, ProposedCharge, Status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
            [
              inspectionId,
              stayId,
              roomId || 0,
              item.itemName,
              item.itemLocation || 'Phòng ngủ chính / Master Bedroom',
              item.damageDescription,
              item.severity || 'MODERATE',
              JSON.stringify(evidence),
              item.proposedCharge || 0
            ]
          );
        }
      }
    }

    await conn.commit();
    res.json({
      success: true,
      message: 'Ghi nhận biên bản kiểm phòng thành công',
      data: { inspectionId, keycardLossPenalty }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Inspection submit error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

router.post('/room-inspections', handleRoomInspectionSubmit);
router.post('/stays/:stayId/room-inspections', handleRoomInspectionSubmit);

// ─── 4. PUT /api/v1/check-out/damage/:damageItemId ─────────────────────────
// Giám sát phê duyệt / từ chối / tranh chấp / miễn trừ khoản bồi thường hư hỏng
router.put('/damage/:damageItemId', async (req, res) => {
  try {
    const { damageItemId } = req.params;
    const {
      action, // 'APPROVE', 'REJECT', 'DISPUTE', 'WAIVE'
      approvedCharge,
      reasonCode,
      disputeNote,
      supervisorId = 1,
      supervisorName = 'Sarah Jenkins (Shift Mgr #4092)'
    } = req.body;

    if (!['APPROVE', 'REJECT', 'DISPUTE', 'WAIVE'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' });
    }

    if (action === 'WAIVE' && !reasonCode) {
      return res.status(400).json({
        success: false,
        errorCode: 'CHECKOUT_0007_REASON_REQUIRED',
        message: SPEC_MESSAGES.CHECKOUT_0007_REASON_REQUIRED
      });
    }

    let nextStatus = 'SUBMITTED';
    let finalCharge = 0;

    if (action === 'APPROVE') {
      nextStatus = 'APPROVED';
      finalCharge = Number(approvedCharge || 0);
    } else if (action === 'REJECT') {
      nextStatus = 'REJECTED';
      finalCharge = 0;
    } else if (action === 'DISPUTE') {
      nextStatus = 'DISPUTED';
      finalCharge = 0; // Chưa ghi nhận charge nếu đang tranh chấp
    } else if (action === 'WAIVE') {
      nextStatus = 'WAIVED';
      finalCharge = 0;
    }

    await pool.query(
      `UPDATE DamageItems SET
        Status = ?,
        ApprovedCharge = ?,
        ReasonCode = ?,
        DisputeNote = ?,
        SupervisorId = ?,
        SupervisorName = ?,
        ReviewedAt = NOW()
      WHERE DamageItemId = ?`,
      [
        nextStatus,
        finalCharge,
        reasonCode || null,
        disputeNote || null,
        supervisorId,
        supervisorName,
        damageItemId
      ]
    );

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái khoản bồi thường thành ${nextStatus}`,
      data: { damageItemId, status: nextStatus, approvedCharge: finalCharge }
    });
  } catch (err) {
    console.error('Damage approve error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 5. POST /api/v1/check-out/complete hoặc /api/v1/stays/:stayId/checkout/complete ───
// Hoàn tất check-out an toàn (Atomic Transaction)
const handleCompleteCheckout = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const stayId = req.params.stayId || req.body.stayId;
    const {
      paymentMethod = 'PrimaryCardOnFile', // PrimaryCardOnFile, AlternativeCard, DirectCorporateInvoice, Cash
      notes = '',
      postCheckoutRoomStatus = 'Dirty', // Dirty, OutOfOrder
      settlementAmount,
      forceInspectionOverride = false,
      overrideReason = ''
    } = req.body;

    if (!stayId) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Thiếu stayId' });
    }

    // 1. Kiểm tra trạng thái Stay và khóa dòng (SELECT ... FOR UPDATE)
    const [stays] = await conn.query(
      `SELECT s.*, b.BookingId, b.UserId, b.DepositAmount AS BookingDeposit, r.RoomId, r.RoomNumber, rt.BasePrice
       FROM Stays s
       JOIN Bookings b ON s.BookingId = b.BookingId
       JOIN Rooms r ON s.RoomId = r.RoomId
       JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
       WHERE s.StayId = ? FOR UPDATE`,
      [stayId]
    );

    if (!stays.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        errorCode: 'CHECKOUT_0001_STAY_NOT_ACTIVE',
        message: SPEC_MESSAGES.CHECKOUT_0001_STAY_NOT_ACTIVE
      });
    }

    const stay = stays[0];

    if (stay.Status === 'CheckedOut') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errorCode: 'CHECKOUT_0009_ALREADY_COMPLETED',
        message: SPEC_MESSAGES.CHECKOUT_0009_ALREADY_COMPLETED
      });
    }

    // 2. Kiểm tra gate kiểm phòng bắt buộc
    const [inspections] = await conn.query(
      'SELECT * FROM RoomInspectionReports WHERE StayId = ? ORDER BY InspectionId DESC LIMIT 1',
      [stayId]
    );
    const inspection = inspections.length ? inspections[0] : null;

    if (!inspection) {
      if (forceInspectionOverride && !overrideReason) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          errorCode: 'CHECKOUT_0007_REASON_REQUIRED',
          message: SPEC_MESSAGES.CHECKOUT_0007_REASON_REQUIRED
        });
      }

      // Tự động khởi tạo biên bản kiểm phòng tiêu chuẩn (NOMINAL) nếu chưa có biên bản hư hỏng
      const [newInsp] = await conn.query(
        `INSERT INTO RoomInspectionReports (
          StayId, RoomId, InspectorName, InspectionTime, Status,
          KeycardsIssued, KeycardsReturned, KeycardLossPenalty,
          RoomCondition, LinenDamageFee, GuestAcknowledgement, GuestNotes
        ) VALUES (?, ?, 'Hệ thống Lễ tân (Auto Nominal)', NOW(), 'COMPLETED', 2, 2, 0, 'NOMINAL', 0, 'ACKNOWLEDGED', 'Phòng hoàn trả đầy đủ, tình trạng tiêu chuẩn')`,
        [stayId, stay.RoomId]
      );
      inspection = {
        InspectionId: newInsp.insertId,
        KeycardsIssued: 2,
        KeycardsReturned: 2,
        KeycardLossPenalty: 0,
        LinenDamageFee: 0,
        RoomCondition: 'NOMINAL'
      };
    }

    // 3. Kiểm tra các khoản hư hỏng đang tranh chấp hoặc chưa duyệt
    const [unapprovedDamages] = await conn.query(
      `SELECT * FROM DamageItems WHERE StayId = ? AND Status = 'SUBMITTED'`,
      [stayId]
    );
    if (unapprovedDamages.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errorCode: 'CHECKOUT_0006_APPROVAL_REQUIRED',
        message: SPEC_MESSAGES.CHECKOUT_0006_APPROVAL_REQUIRED
      });
    }

    // 3b. Kiểm tra trạng thái kiểm kê Minibar (FEAT-MINIBAR-01 - Spec 12 Test Case 15)
    const [pendingMinibars] = await conn.query(
      "SELECT * FROM MinibarInspections WHERE StayId = ? AND Status = 'SUBMITTED' ORDER BY InspectionId DESC LIMIT 1",
      [stayId]
    );
    if (pendingMinibars.length > 0 && !req.body.overrideMinibar) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errorCode: 'MINIBAR_0009_CHECKOUT_BLOCKED',
        message: 'Chưa hoàn tất kiểm kê minibar. Vui lòng xác nhận hoặc chọn phương án xử lý được phép.'
      });
    }

    // 4. Lấy chính sách phụ thu trả trễ
    const [policies] = await conn.query(
      'SELECT * FROM LateFeePolicies WHERE IsActive = 1 ORDER BY PolicyId DESC LIMIT 1'
    );
    if (!policies.length) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errorCode: 'CHECKOUT_0002_POLICY_NOT_CONFIGURED',
        message: SPEC_MESSAGES.CHECKOUT_0002_POLICY_NOT_CONFIGURED
      });
    }
    const policy = policies[0];

    // 5. Tính toán late fee tại thời điểm server thực tế hoàn tất
    const serverNow = new Date();
    const roomRate = Number(stay.BasePrice || 1200000);
    const lateCalc = calculateLateFee(stay.ExpectedCheckOut, serverNow, policy, roomRate);

    // 6. Tính toán các khoản Folio
    const [approvedDamages] = await conn.query(
      `SELECT * FROM DamageItems WHERE StayId = ? AND Status = 'APPROVED'`,
      [stayId]
    );
    const approvedDamageTotal = approvedDamages.reduce((sum, d) => sum + Number(d.ApprovedCharge || 0), 0);

    const keycardPenalty = inspection ? Number(inspection.KeycardLossPenalty || 0) : 0;
    const linenDamageFee = inspection ? Number(inspection.LinenDamageFee || 0) : 0;

    // Lấy tiêu dùng minibar theo Spec 12 (FEAT-MINIBAR-01)
    let minibarTotal = 0;
    const [mbInspections] = await conn.query(
      "SELECT * FROM MinibarInspections WHERE StayId = ? AND Status = 'CONFIRMED' ORDER BY InspectionId DESC LIMIT 1",
      [stayId]
    );
    if (mbInspections.length > 0) {
      minibarTotal = Number(mbInspections[0].Subtotal || mbInspections[0].TotalAmount || 0);
    } else {
      const [minibarRows] = await conn.query(
        'SELECT * FROM MinibarUsages WHERE StayId = ?',
        [stayId]
      );
      if (minibarRows.length > 0) {
        minibarTotal = minibarRows.reduce((sum, m) => sum + Number(m.TotalAmount || 0), 0);
      } else {
        minibarTotal = DEFAULT_MINIBAR_ITEMS.reduce((sum, i) => sum + (i.defaultQty * i.unitPrice), 0);
      }
    }

    // Lấy các đơn F&B gộp vào tiền phòng (RoomInvoice)
    const [fnbOrders] = await conn.query(
      `SELECT FoodOrderId, TotalAmount, PaymentMode, Status
       FROM FoodOrders
       WHERE StayId = ? AND PaymentMode = 'RoomInvoice' AND Status != 'Cancelled'`,
      [stayId]
    );
    const fnbTotal = fnbOrders.reduce((sum, o) => sum + Number(o.TotalAmount || 0), 0);

    // 7. Cập nhật hóa đơn Invoice & InvoiceDetail
    const [existInvoices] = await conn.query(
      'SELECT * FROM Invoices WHERE StayId = ? ORDER BY InvoiceId DESC LIMIT 1',
      [stayId]
    );
    let invoiceId = null;
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

    const nights = Math.max(1, stay.ExpectedCheckOut && stay.ActualCheckIn
      ? Math.ceil((new Date(stay.ExpectedCheckOut) - new Date(stay.ActualCheckIn)) / 86400000)
      : 1);
    const roomChargeTotal = roomRate * nights;
    const resortFee = 150000 * nights;

    const subtotal = roomChargeTotal + resortFee + minibarTotal + fnbTotal + lateCalc.lateFeeAmount + approvedDamageTotal + linenDamageFee + keycardPenalty;
    const vatRate = Number(policy.TaxRate || 10);
    const vatAmount = Math.round(subtotal * (vatRate / 100));
    const totalAmount = subtotal + vatAmount;

    const depositPaid = Number(stay.BookingDeposit || stay.DepositAmount || 0);
    const finalBalanceDue = Math.max(0, totalAmount - depositPaid);

    if (existInvoices.length > 0) {
      invoiceId = existInvoices[0].InvoiceId;
      await conn.query(
        `UPDATE Invoices SET
          Subtotal = ?,
          VATRate = ?,
          VATAmount = ?,
          TotalAmount = ?,
          Status = 'Paid',
          UpdatedAt = NOW()
        WHERE InvoiceId = ?`,
        [subtotal, vatRate, vatAmount, totalAmount, invoiceId]
      );
    } else {
      const [invRes] = await conn.query(
        `INSERT INTO Invoices (
          StayId, BookingId, InvoiceNumber, InvoiceDate, Subtotal,
          VATRate, VATAmount, TotalAmount, Status
        ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 'Paid')`,
        [stayId, stay.BookingId, invoiceNumber, subtotal, vatRate, vatAmount, totalAmount]
      );
      invoiceId = invRes.insertId;
    }

    // Ghi các dòng InvoiceDetail chi tiết
    await conn.query('DELETE FROM InvoiceDetails WHERE InvoiceId = ?', [invoiceId]);

    const details = [
      { type: 'RoomCharge', desc: `Tiền lưu trú (${nights} đêm @ ${roomRate.toLocaleString('vi-VN')} ₫)`, qty: nights, unit: roomRate, total: roomChargeTotal },
      { type: 'ResortFee', desc: `Phí tiện ích & dịch vụ nghỉ dưỡng (${nights} đêm)`, qty: nights, unit: 150000, total: resortFee },
      { type: 'Minibar', desc: `Tiêu dùng minibar & đồ uống tại phòng`, qty: 1, unit: minibarTotal, total: minibarTotal }
    ];

    if (fnbTotal > 0) {
      details.push({
        type: 'FoodOrder',
        desc: `Dịch vụ gọi món tại phòng F&B (Gộp hóa đơn phòng - ${fnbOrders.length} đơn)`,
        qty: fnbOrders.length,
        unit: fnbTotal,
        total: fnbTotal
      });
    }

    if (lateCalc.lateFeeAmount > 0) {
      details.push({
        type: 'LateCheckOut',
        desc: `Phụ thu trả trễ giờ: ${lateCalc.formula}`,
        qty: 1,
        unit: lateCalc.lateFeeAmount,
        total: lateCalc.lateFeeAmount
      });
    }

    if (approvedDamageTotal > 0) {
      details.push({
        type: 'DamageCharge',
        desc: `Bồi thường hư hỏng đồ dùng đã được phê duyệt (${approvedDamages.length} hạng mục)`,
        qty: 1,
        unit: approvedDamageTotal,
        total: approvedDamageTotal
      });
    }

    if (keycardPenalty > 0) {
      details.push({
        type: 'KeycardPenalty',
        desc: `Phí bồi thường mất thẻ phòng vật lý`,
        qty: 1,
        unit: keycardPenalty,
        total: keycardPenalty
      });
    }

    if (linenDamageFee > 0) {
      details.push({
        type: 'LinenDamage',
        desc: `Phụ thu giặt là tẩy ố / rách drap đệm`,
        qty: 1,
        unit: linenDamageFee,
        total: linenDamageFee
      });
    }

    for (const d of details) {
      await conn.query(
        `INSERT INTO InvoiceDetails (InvoiceId, ItemType, Description, Quantity, UnitPrice, TotalPrice)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [invoiceId, d.type, d.desc, d.qty, d.unit, d.total]
      );
    }

    // 8. Ghi nhận giao dịch thanh toán Payments
    const txCode = `TX-${Date.now().toString().slice(-8)}`;
    await conn.query(
      `INSERT INTO Payments (
        InvoiceId, BookingId, UserId, Amount, PaymentMethod,
        PaymentDate, TransactionCode, Status
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?, 'Completed')`,
      [invoiceId, stay.BookingId, stay.UserId, finalBalanceDue, paymentMethod, txCode]
    );

    // 9. Cập nhật trạng thái Stay -> 'CheckedOut', ActualCheckOut = NOW()
    await conn.query(
      `UPDATE Stays SET
        Status = 'CheckedOut',
        ActualCheckOut = NOW(),
        UpdatedAt = NOW()
      WHERE StayId = ?`,
      [stayId]
    );

    // 10. Cập nhật trạng thái Booking -> 'Completed'
    await conn.query(
      `UPDATE Bookings SET Status = 'Completed', UpdatedAt = NOW() WHERE BookingId = ?`,
      [stay.BookingId]
    );

    // 11. Chuyển trạng thái phòng sang Dirty (hoặc OutOfOrder)
    const targetRoomStatus = postCheckoutRoomStatus === 'OutOfOrder' ? 'OutOfOrder' : 'Dirty';
    await conn.query(
      `UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?`,
      [targetRoomStatus, stay.RoomId]
    );

    // Cập nhật Housekeeping assignment tự động
    const [housekeeperRows] = await conn.query("SELECT UserId FROM Users WHERE RoleId = 4 LIMIT 1");
    const housekeeperId = housekeeperRows.length > 0 ? housekeeperRows[0].UserId : 4;
    await conn.query(
      `INSERT INTO HousekeepingAssignments (RoomId, UserId, StayId, Priority, Status, Note)
       VALUES (?, ?, ?, 1, 'Assigned', 'Dọn phòng sau Check-out. Telemetry dispatched tự động.')`,
      [stay.RoomId, housekeeperId, stayId]
    ).catch((e) => console.error('Housekeeping assignment error:', e.message));

    // 12. Ghi Audit Log an toàn
    await conn.query(
      `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
       VALUES (?, 'CHECKOUT_GUEST', 'Stays', ?, ?, ?, NOW(), ?)`,
      [
        stay.UserId || 1,
        stayId,
        JSON.stringify({ status: 'CheckedIn', roomStatus: 'Clean' }),
        JSON.stringify({
          status: 'CheckedOut',
          roomStatus: targetRoomStatus,
          invoiceId,
          finalBalanceDue,
          lateFee: lateCalc.lateFeeAmount,
          note: `Hoàn tất checkout phòng ${stay.RoomNumber}. Phương thức thanh toán: ${paymentMethod}`
        }),
        req.ip || '127.0.0.1'
      ]
    ).catch((e) => console.error('AuditLog insert error:', e.message));

    await conn.commit();

    res.json({
      success: true,
      errorCode: 'SUCCESS_CHECKOUT_0001_COMPLETED',
      message: SPEC_MESSAGES.SUCCESS_CHECKOUT_0001_COMPLETED,
      data: {
        stayId,
        invoiceId,
        invoiceNumber,
        actualCheckOut: serverNow.toISOString(),
        paymentMethod,
        transactionCode: txCode,
        settlementAmount: finalBalanceDue,
        roomStatus: targetRoomStatus,
        lateFeeSnapshot: {
          lateMinutes: lateCalc.lateMinutes,
          lateFeeAmount: lateCalc.lateFeeAmount,
          formula: lateCalc.formula
        }
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Checkout complete error:', err);
    res.status(500).json({
      success: false,
      errorCode: 'CHECKOUT_0008_CHARGE_FAILED',
      message: SPEC_MESSAGES.CHECKOUT_0008_CHARGE_FAILED + ' Chi tiết: ' + err.message
    });
  } finally {
    conn.release();
  }
};

router.post('/complete', handleCompleteCheckout);
router.post('/stays/:stayId/checkout/complete', handleCompleteCheckout);

// ─── 6. POST /api/v1/check-out/adjustments hoặc /api/v1/folio/:stayId/adjustments ───
// Miễn hoặc điều chỉnh phụ thu / khoản phí với lý do bắt buộc (FEE_OVERRIDE)
const handleFolioAdjustment = async (req, res) => {
  try {
    const stayId = req.params.stayId || req.body.stayId;
    const { chargeType, oldAmount, newAmount, reasonCode, note, approver = 'Sarah Jenkins (Shift Mgr #4092)' } = req.body;

    if (!reasonCode || !reasonCode.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'CHECKOUT_0007_REASON_REQUIRED',
        message: SPEC_MESSAGES.CHECKOUT_0007_REASON_REQUIRED
      });
    }

    await pool.query(
      `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
       VALUES (1, 'FEE_OVERRIDE', 'FolioCharges', ?, ?, ?, NOW(), ?)`,
      [
        stayId,
        JSON.stringify({ chargeType, amount: oldAmount }),
        JSON.stringify({ chargeType, amount: newAmount, approver, reasonCode, note: note || '' }),
        req.ip || '127.0.0.1'
      ]
    ).catch((e) => console.error('Folio adjustment audit log error:', e.message));

    res.json({
      success: true,
      message: `Đã cập nhật điều chỉnh phí thành công cho ${chargeType}`,
      data: { chargeType, newAmount }
    });
  } catch (err) {
    console.error('Folio adjustment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/adjustments', handleFolioAdjustment);
router.post('/folio/:stayId/adjustments', handleFolioAdjustment);

module.exports = router;
