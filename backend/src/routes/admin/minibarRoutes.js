'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const {
  sequelize,
  Stay,
  Room,
  RoomType,
  Booking,
  User,
  Invoice,
  InvoiceDetail,
  MinibarProduct,
  MinibarInspection,
  MinibarInspectionLine,
  MinibarInspectionEvent
} = require('../../models');

// ─── Bảng mã lỗi chuẩn theo Đặc tả Spec 12 (BẮT BUỘC DÙNG ĐÚNG NGUYÊN VĂN) ───
const SPEC_MESSAGES = {
  ERROR_0009_UNAUTHENTICATED: 'Bạn cần đăng nhập để thực hiện chức năng này',
  ERROR_0010_FORBIDDEN: 'Bạn không có quyền thực hiện chức năng này',
  MINIBAR_0001_STAY_NOT_ACTIVE: 'Không thể kiểm kê minibar vì lượt lưu trú không còn hiệu lực',
  MINIBAR_0002_INVALID_QUANTITY: 'Số lượng còn lại phải là số hợp lệ và không được âm',
  MINIBAR_0003_QUANTITY_MISMATCH: 'Số lượng kiểm kê không khớp. Vui lòng kiểm tra lại số lượng nạp và số lượng còn lại.',
  MINIBAR_0004_PRICE_NOT_FOUND: 'Không tìm thấy đơn giá hợp lệ cho sản phẩm minibar',
  MINIBAR_0005_ALREADY_CONFIRMED: 'Kiểm kê minibar đã được xác nhận và không thể sửa trực tiếp',
  MINIBAR_0006_VERSION_CONFLICT: 'Dữ liệu kiểm kê vừa được cập nhật. Vui lòng tải lại trước khi tiếp tục.',
  MINIBAR_0007_REASON_REQUIRED: 'Vui lòng chọn lý do cho số lượng chênh lệch',
  MINIBAR_0008_APPROVAL_REQUIRED: 'Kiểm kê minibar cần được giám sát xác nhận trước khi tính phí',
  MINIBAR_0009_CHECKOUT_BLOCKED: 'Chưa hoàn tất kiểm kê minibar. Vui lòng xác nhận hoặc chọn phương án xử lý được phép.',
  MINIBAR_0010_CHARGE_FAILED: 'Không thể ghi khoản phí minibar. Vui lòng thử lại.',
  SUCCESS_MINIBAR_0001_CONFIRMED: 'Đã xác nhận kiểm kê minibar và cập nhật khoản phí vào hóa đơn'
};

// ─── 1. GET /api/v1/minibar/products ────────────────────────────────────────
// Danh mục sản phẩm minibar tiêu chuẩn
router.get('/products', async (req, res) => {
  try {
    let products = [];
    try {
      const [rows] = await pool.query(
        'SELECT * FROM MinibarProducts WHERE IsActive = 1 ORDER BY Category ASC, UnitPrice ASC'
      );
      products = rows;
    } catch (_) {
      const [invRows] = await pool.query(`
        SELECT 
          ItemId AS ProductId, 
          ItemCode AS ProductCode, 
          ItemName AS ProductName, 
          COALESCE(Category, 'Beverage') AS Category, 
          Unit, 
          COALESCE(UnitPrice, UnitCost, 0) AS UnitPrice, 
          COALESCE(DefaultOpeningQty, 2) AS DefaultOpeningQty, 
          COALESCE(IsComplimentary, 0) AS IsComplimentary, 
          1 AS IsActive 
        FROM InventoryItems 
        WHERE ItemType = 'Minibar' OR ItemCode LIKE 'MB-%'
        ORDER BY Category ASC, UnitPrice ASC
      `);
      products = invRows;
    }
    res.json({ success: true, data: products });
  } catch (err) {
    console.error('GET /minibar/products error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 2. GET /api/v1/minibar/stays ───────────────────────────────────────────
// Danh sách phòng cần kiểm kê minibar (cho nhân viên buồng phòng & lễ tân)
router.get('/stays', async (req, res) => {
  try {
    const { query = '', status = 'ALL', limit = 50 } = req.query;
    let whereClause = "s.Status = 'CheckedIn'";
    const params = [];

    if (query.trim()) {
      whereClause += ` AND (r.RoomNumber LIKE ? OR b.ConfirmationCode LIKE ? OR u.FullName LIKE ?)`;
      const q = `%${query.trim()}%`;
      params.push(q, q, q);
    }

    const sql = `
      SELECT
        s.StayId,
        s.RoomId,
        s.BookingId,
        s.Status AS StayStatus,
        s.ActualCheckIn,
        s.ExpectedCheckOut,
        r.RoomNumber,
        r.Floor,
        r.Status AS RoomStatus,
        rt.TypeName AS RoomTypeName,
        b.ConfirmationCode,
        COALESCE(u.FullName, 'Khách lưu trú') AS GuestName,
        mi.InspectionId,
        COALESCE(mi.Status, 'NOT_INSPECTED') AS MinibarInspectionStatus,
        mi.TotalConsumedQty,
        mi.TotalAmount AS MinibarTotalAmount,
        mi.CheckedByName,
        mi.CheckedAt,
        mi.ConfirmedByName,
        mi.ConfirmedAt,
        mi.Version
      FROM Stays s
      JOIN Rooms r ON s.RoomId = r.RoomId
      JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      JOIN Bookings b ON s.BookingId = b.BookingId
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN (
        SELECT mi1.*
        FROM MinibarInspections mi1
        INNER JOIN (
          SELECT StayId, MAX(InspectionId) as MaxId
          FROM MinibarInspections
          GROUP BY StayId
        ) mi2 ON mi1.InspectionId = mi2.MaxId
      ) mi ON s.StayId = mi.StayId
      WHERE ${whereClause}
      ORDER BY s.StayId DESC
      LIMIT ?
    `;
    params.push(Number(limit) || 50);

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /minibar/stays error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 3. GET /api/v1/minibar/stays/:stayId ────────────────────────────────────
// Lấy chi tiết phiên kiểm kê minibar của stay kèm danh sách sản phẩm snapshot
router.get('/stays/:stayId', async (req, res) => {
  try {
    const { stayId } = req.params;

    // 1. Kiểm tra Stay
    const [stays] = await pool.query(
      `SELECT
        s.StayId, s.RoomId, s.BookingId, s.Status AS StayStatus,
        s.ActualCheckIn, s.ExpectedCheckOut, s.DepositAmount,
        r.RoomNumber, r.Floor, r.Status AS RoomStatus,
        rt.TypeName AS RoomTypeName,
        b.ConfirmationCode,
        COALESCE(u.FullName, 'Khách lưu trú') AS GuestName,
        COALESCE(u.Phone, '') AS GuestPhone
       FROM Stays s
       JOIN Rooms r ON s.RoomId = r.RoomId
       JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
       JOIN Bookings b ON s.BookingId = b.BookingId
       LEFT JOIN Users u ON b.UserId = u.UserId
       WHERE s.StayId = ?`,
      [stayId]
    );

    if (!stays.length) {
      return res.status(404).json({
        success: false,
        errorCode: 'MINIBAR_0001_STAY_NOT_ACTIVE',
        message: SPEC_MESSAGES.MINIBAR_0001_STAY_NOT_ACTIVE
      });
    }

    const stay = stays[0];

    // 2. Lấy phiên kiểm kê mới nhất (nếu có)
    const [inspections] = await pool.query(
      `SELECT * FROM MinibarInspections WHERE StayId = ? ORDER BY InspectionId DESC LIMIT 1`,
      [stayId]
    );

    let inspection = inspections.length ? inspections[0] : null;
    let lines = [];

    if (inspection) {
      const [lineRows] = await pool.query(
        `SELECT * FROM MinibarInspectionLines WHERE InspectionId = ? ORDER BY LineId ASC`,
        [inspection.InspectionId]
      );
      lines = lineRows;
    } else {
      // Nếu chưa có phiên kiểm kê, nạp danh mục cấu hình mặc định từ MinibarProducts
      let products = [];
      try {
        const [pRows] = await pool.query(
          'SELECT * FROM MinibarProducts WHERE IsActive = 1 ORDER BY Category ASC, UnitPrice ASC'
        );
        products = pRows;
      } catch (_) {
        const [invRows] = await pool.query(`
          SELECT 
            ItemId AS ProductId, 
            ItemCode AS ProductCode, 
            ItemName AS ProductName, 
            COALESCE(Category, 'Beverage') AS Category, 
            Unit, 
            COALESCE(UnitPrice, UnitCost, 0) AS UnitPrice, 
            COALESCE(DefaultOpeningQty, 2) AS DefaultOpeningQty, 
            COALESCE(IsComplimentary, 0) AS IsComplimentary
          FROM InventoryItems 
          WHERE ItemType = 'Minibar' OR ItemCode LIKE 'MB-%'
          ORDER BY Category ASC, UnitPrice ASC
        `);
        products = invRows;
      }
      lines = products.map((p) => {
        const opening = Number(p.DefaultOpeningQty || 2);
        return {
          ProductId: p.ProductId,
          ProductName: p.ProductName,
          Category: p.Category,
          Unit: p.Unit,
          OpeningQty: opening,
          ReplenishedQty: 0,
          RemainingQty: opening,
          ComplimentaryQty: p.IsComplimentary ? opening : 0,
          ConsumedQty: 0,
          BillableQty: 0,
          UnitPrice: Number(p.UnitPrice || 0),
          LineAmount: 0,
          VarianceReason: 'GUEST_CONSUMED',
          IsException: false,
          Status: 'DRAFT',
          Notes: ''
        };
      });
    }

    // 3. Lấy lịch sử sự kiện kiểm kê (Audit Events)
    let events = [];
    if (inspection) {
      const [eventRows] = await pool.query(
        `SELECT * FROM MinibarInspectionEvents WHERE InspectionId = ? ORDER BY EventId DESC`,
        [inspection.InspectionId]
      );
      events = eventRows;
    }

    res.json({
      success: true,
      data: {
        stay,
        inspection: inspection || {
          InspectionId: null,
          StayId: stay.StayId,
          RoomId: stay.RoomId,
          Status: 'NOT_INSPECTED',
          Version: 1,
          TotalConsumedQty: 0,
          Subtotal: 0,
          TaxRate: 10,
          TaxAmount: 0,
          TotalAmount: 0,
          Notes: ''
        },
        lines,
        events
      }
    });
  } catch (err) {
    console.error('GET /minibar/stays/:stayId error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 4. POST /api/v1/minibar/stays/:stayId/inspections ──────────────────────
// Lưu DRAFT hoặc Gửi SUBMITTED biên bản kiểm kê minibar
router.post('/stays/:stayId/inspections', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { stayId } = req.params;
    const {
      inspectionId,
      status = 'DRAFT', // 'DRAFT' hoặc 'SUBMITTED'
      version = 1,
      lines = [],
      notes = '',
      inspectorId = 4,
      inspectorName = 'Tổ Trưởng Buồng Phòng'
    } = req.body;

    // 1. Kiểm tra trạng thái stay
    const [stays] = await conn.query('SELECT * FROM Stays WHERE StayId = ?', [stayId]);
    if (!stays.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        errorCode: 'MINIBAR_0001_STAY_NOT_ACTIVE',
        message: SPEC_MESSAGES.MINIBAR_0001_STAY_NOT_ACTIVE
      });
    }
    const stay = stays[0];
    if (stay.Status !== 'CheckedIn' && status !== 'DRAFT') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errorCode: 'MINIBAR_0001_STAY_NOT_ACTIVE',
        message: SPEC_MESSAGES.MINIBAR_0001_STAY_NOT_ACTIVE
      });
    }

    // 2. Kiểm tra phiên kiểm kê hiện tại nếu đã có
    let currentInspection = null;
    if (inspectionId) {
      const [existing] = await conn.query(
        'SELECT * FROM MinibarInspections WHERE InspectionId = ? FOR UPDATE',
        [inspectionId]
      );
      if (existing.length) {
        currentInspection = existing[0];
        // Không cho sửa trực tiếp phiên đã CONFIRMED
        if (currentInspection.Status === 'CONFIRMED') {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            errorCode: 'MINIBAR_0005_ALREADY_CONFIRMED',
            message: SPEC_MESSAGES.MINIBAR_0005_ALREADY_CONFIRMED
          });
        }
        // Kiểm tra Optimistic Concurrency Version Lock
        if (version !== undefined && Number(version) !== Number(currentInspection.Version)) {
          await conn.rollback();
          return res.status(409).json({
            success: false,
            errorCode: 'MINIBAR_0006_VERSION_CONFLICT',
            message: SPEC_MESSAGES.MINIBAR_0006_VERSION_CONFLICT
          });
        }
      }
    }

    // 3. Validate và tính toán các dòng sản phẩm
    let totalConsumedQty = 0;
    let subtotal = 0;
    const computedLines = [];

    for (const item of lines) {
      const remainingQty = Number(item.remainingQty ?? item.RemainingQty);
      if (isNaN(remainingQty) || remainingQty < 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          errorCode: 'MINIBAR_0002_INVALID_QUANTITY',
          message: SPEC_MESSAGES.MINIBAR_0002_INVALID_QUANTITY,
          field: item.productName || item.ProductName
        });
      }

      const openingQty = Number(item.openingQty ?? item.OpeningQty ?? 0);
      const replenishedQty = Number(item.replenishedQty ?? item.ReplenishedQty ?? 0);
      const complimentaryQty = Number(item.complimentaryQty ?? item.ComplimentaryQty ?? 0);
      const availableQty = openingQty + replenishedQty;

      // Tính số lượng khách đã dùng
      const consumedQty = Math.max(0, availableQty - remainingQty - complimentaryQty);

      if (availableQty < remainingQty) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          errorCode: 'MINIBAR_0003_QUANTITY_MISMATCH',
          message: SPEC_MESSAGES.MINIBAR_0003_QUANTITY_MISMATCH,
          field: item.productName || item.ProductName
        });
      }

      // Kiểm tra lý do khi có chênh lệch tiêu thụ hoặc tồn kho
      const hasVariance = consumedQty > 0 || remainingQty !== availableQty;
      const varianceReason = item.varianceReason || item.VarianceReason || (hasVariance ? 'GUEST_CONSUMED' : 'NO_VARIANCE');
      if (hasVariance && (!varianceReason || varianceReason === 'NO_VARIANCE')) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          errorCode: 'MINIBAR_0007_REASON_REQUIRED',
          message: SPEC_MESSAGES.MINIBAR_0007_REASON_REQUIRED,
          field: item.productName || item.ProductName
        });
      }

      // Đơn giá snapshot
      const unitPrice = Number(item.unitPrice ?? item.UnitPrice ?? 0);
      if (consumedQty > 0 && unitPrice === 0 && !item.isComplimentary && !item.IsComplimentary) {
        // Nếu không có giá snapshot, thử tra cứu lại từ MinibarProducts
        const [prodRows] = await conn.query(
          'SELECT UnitPrice FROM MinibarProducts WHERE ProductId = ?',
          [item.productId || item.ProductId]
        );
        if (!prodRows.length || Number(prodRows[0].UnitPrice) <= 0) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            errorCode: 'MINIBAR_0004_PRICE_NOT_FOUND',
            message: SPEC_MESSAGES.MINIBAR_0004_PRICE_NOT_FOUND,
            field: item.productName || item.ProductName
          });
        }
      }

      // Số lượng tính phí billable
      const isWaived = item.status === 'WAIVED' || varianceReason === 'DAMAGED_EXPIRED' || varianceReason === 'COMPLIMENTARY';
      const billableQty = isWaived ? 0 : consumedQty;
      const lineAmount = billableQty * unitPrice;

      totalConsumedQty += consumedQty;
      subtotal += lineAmount;

      computedLines.push({
        productId: item.productId || item.ProductId || null,
        productName: item.productName || item.ProductName,
        category: item.category || item.Category || 'Beverage',
        unit: item.unit || item.Unit || 'Lon',
        openingQty,
        replenishedQty,
        remainingQty,
        complimentaryQty,
        consumedQty,
        billableQty,
        unitPrice,
        lineAmount,
        varianceReason,
        isException: Boolean(item.isException || item.IsException),
        status: status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
        notes: item.notes || item.Notes || ''
      });
    }

    const taxRate = 10.0;
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const totalAmount = subtotal + taxAmount;

    let targetInspectionId = currentInspection?.InspectionId;
    let nextVersion = (currentInspection?.Version || 0) + 1;

    if (currentInspection) {
      await conn.query(
        `UPDATE MinibarInspections SET
          Status = ?,
          Version = ?,
          CheckedBy = ?,
          CheckedByName = ?,
          CheckedAt = NOW(),
          TotalConsumedQty = ?,
          Subtotal = ?,
          TaxRate = ?,
          TaxAmount = ?,
          TotalAmount = ?,
          Notes = ?,
          UpdatedAt = NOW()
        WHERE InspectionId = ?`,
        [
          status,
          nextVersion,
          inspectorId,
          inspectorName,
          totalConsumedQty,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          notes,
          targetInspectionId
        ]
      );

      // Xóa các dòng cũ và ghi lại dòng mới
      await conn.query('DELETE FROM MinibarInspectionLines WHERE InspectionId = ?', [targetInspectionId]);
    } else {
      const [insRes] = await conn.query(
        `INSERT INTO MinibarInspections (
          StayId, RoomId, Status, Version,
          CheckedBy, CheckedByName, CheckedAt,
          TotalConsumedQty, Subtotal, TaxRate, TaxAmount, TotalAmount, Notes
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
        [
          stayId,
          stay.RoomId,
          status,
          nextVersion,
          inspectorId,
          inspectorName,
          totalConsumedQty,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          notes
        ]
      );
      targetInspectionId = insRes.insertId;
    }

    // Ghi các dòng MinibarInspectionLines
    for (const l of computedLines) {
      await conn.query(
        `INSERT INTO MinibarInspectionLines (
          InspectionId, ProductId, ProductName, Category, Unit,
          OpeningQty, ReplenishedQty, RemainingQty, ComplimentaryQty,
          ConsumedQty, BillableQty, UnitPrice, LineAmount,
          VarianceReason, IsException, Status, Notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetInspectionId,
          l.productId,
          l.productName,
          l.category,
          l.unit,
          l.openingQty,
          l.replenishedQty,
          l.remainingQty,
          l.complimentaryQty,
          l.consumedQty,
          l.billableQty,
          l.unitPrice,
          l.lineAmount,
          l.varianceReason,
          l.isException ? 1 : 0,
          l.status,
          l.notes
        ]
      );
    }

    // Ghi Audit Event
    const actionType = status === 'SUBMITTED' ? 'MINIBAR_SUBMIT' : 'MINIBAR_CREATE_DRAFT';
    await conn.query(
      `INSERT INTO MinibarInspectionEvents (
        InspectionId, StayId, ActionType, UserId, UserName, NewValues, Reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        targetInspectionId,
        stayId,
        actionType,
        inspectorId,
        inspectorName,
        JSON.stringify({ status, totalConsumedQty, subtotal, totalAmount, linesCount: computedLines.length }),
        status === 'SUBMITTED' ? 'Nhân viên buồng phòng gửi kiểm kê minibar' : 'Lưu bản nháp kiểm kê'
      ]
    );

    await conn.commit();

    res.json({
      success: true,
      message: status === 'SUBMITTED' ? 'Đã gửi biên bản kiểm kê minibar chờ xác nhận' : 'Đã lưu bản nháp kiểm kê minibar',
      data: {
        inspectionId: targetInspectionId,
        status,
        version: nextVersion,
        totalConsumedQty,
        subtotal,
        taxAmount,
        totalAmount,
        lines: computedLines
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /minibar/inspections error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ─── 5. POST /api/v1/minibar/stays/:stayId/inspections/:id/confirm ──────────
// Xác nhận kiểm kê (CONFIRMED) và tạo khoản phí vào Folio & Hóa đơn
router.post('/stays/:stayId/inspections/:id/confirm', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { stayId, id: inspectionId } = req.params;
    const {
      confirmedBy = 1,
      confirmedByName = 'Sarah Jenkins (Shift Mgr #4092)',
      idempotencyKey = `MINIBAR-CONFIRM-${stayId}-${inspectionId}`
    } = req.body;

    // 1. Kiểm tra inspection
    const [inspections] = await conn.query(
      'SELECT * FROM MinibarInspections WHERE InspectionId = ? AND StayId = ? FOR UPDATE',
      [inspectionId, stayId]
    );

    if (!inspections.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        errorCode: 'MINIBAR_0001_STAY_NOT_ACTIVE',
        message: SPEC_MESSAGES.MINIBAR_0001_STAY_NOT_ACTIVE
      });
    }

    const inspection = inspections[0];

    // Idempotency: Nếu đã CONFIRMED rồi thì trả kết quả thành công ngay, tránh tính phí lặp lại
    if (inspection.Status === 'CONFIRMED') {
      await conn.commit();
      return res.json({
        success: true,
        errorCode: 'SUCCESS_MINIBAR_0001_CONFIRMED',
        message: SPEC_MESSAGES.SUCCESS_MINIBAR_0001_CONFIRMED,
        data: {
          inspectionId: inspection.InspectionId,
          status: 'CONFIRMED',
          totalAmount: inspection.TotalAmount,
          idempotent: true
        }
      });
    }

    // Kiểm tra dòng ngoại lệ có cần giám sát duyệt độc lập
    const [lines] = await conn.query(
      'SELECT * FROM MinibarInspectionLines WHERE InspectionId = ?',
      [inspectionId]
    );

    const hasUnapprovedException = lines.some((l) => l.IsException && l.Status !== 'CONFIRMED' && !confirmedBy);
    if (hasUnapprovedException) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errorCode: 'MINIBAR_0008_APPROVAL_REQUIRED',
        message: SPEC_MESSAGES.MINIBAR_0008_APPROVAL_REQUIRED
      });
    }

    // 2. Lấy thông tin stay
    const [stays] = await conn.query('SELECT * FROM Stays WHERE StayId = ?', [stayId]);
    const stay = stays[0];

    // 3. Cập nhật trạng thái inspection -> CONFIRMED
    const nextVersion = Number(inspection.Version || 1) + 1;
    await conn.query(
      `UPDATE MinibarInspections SET
        Status = 'CONFIRMED',
        Version = ?,
        ConfirmedBy = ?,
        ConfirmedByName = ?,
        ConfirmedAt = NOW(),
        IdempotencyKey = ?,
        UpdatedAt = NOW()
      WHERE InspectionId = ?`,
      [nextVersion, confirmedBy, confirmedByName, idempotencyKey, inspectionId]
    );

    await conn.query(
      `UPDATE MinibarInspectionLines SET Status = 'CONFIRMED', UpdatedAt = NOW() WHERE InspectionId = ?`,
      [inspectionId]
    );

    // 4. Đồng bộ tiêu dùng vào bảng MinibarUsages (cho tương thích báo cáo cũ)
    for (const l of lines) {
      if (Number(l.ConsumedQty) > 0) {
        await conn.query(
          `INSERT INTO MinibarUsages (StayId, ItemId, RecordedBy, Quantity, UsageDate, UnitPrice, TotalAmount)
           VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
          [stayId, l.ProductId || 1, confirmedBy, l.ConsumedQty, l.UnitPrice, l.LineAmount]
        ).catch(() => {});
      }
    }

    // 5. Cập nhật hoặc tạo dòng InvoiceDetail tương ứng trong hóa đơn của Stay
    if (Number(inspection.TotalAmount) > 0) {
      const [existInvoices] = await conn.query(
        'SELECT InvoiceId, Subtotal, TotalAmount FROM Invoices WHERE StayId = ? ORDER BY InvoiceId DESC LIMIT 1',
        [stayId]
      );

      let invoiceId = null;
      if (existInvoices.length > 0) {
        invoiceId = existInvoices[0].InvoiceId;
        // Xóa dòng Minibar cũ nếu có
        await conn.query(
          `DELETE FROM InvoiceDetails WHERE InvoiceId = ? AND ItemType = 'Minibar'`,
          [invoiceId]
        );
      } else {
        const invNum = `INV-${Date.now().toString().slice(-8)}`;
        const [invRes] = await conn.query(
          `INSERT INTO Invoices (StayId, BookingId, InvoiceNumber, InvoiceDate, Subtotal, VATRate, VATAmount, TotalAmount, Status)
           VALUES (?, ?, ?, NOW(), ?, 10.00, ?, ?, 'Unpaid')`,
          [stayId, stay.BookingId, invNum, inspection.Subtotal, inspection.TaxAmount, inspection.TotalAmount]
        );
        invoiceId = invRes.insertId;
      }

      await conn.query(
        `INSERT INTO InvoiceDetails (InvoiceId, ItemType, Description, Quantity, UnitPrice, TotalPrice)
         VALUES (?, 'Minibar', ?, 1, ?, ?)`,
        [
          invoiceId,
          `Tiêu dùng Minibar phòng (Biên bản #${inspectionId} - ${inspection.TotalConsumedQty} món)`,
          inspection.Subtotal,
          inspection.Subtotal
        ]
      );

      // Cập nhật lại tổng tiền trên Invoice cha để đồng bộ sổ sách kế toán
      const [sumRows] = await conn.query(
        'SELECT SUM(TotalPrice) as totalSub FROM InvoiceDetails WHERE InvoiceId = ?',
        [invoiceId]
      );
      const newSubtotal = Number(sumRows[0]?.totalSub || 0);
      const newVat = Math.round(newSubtotal * 0.1);
      const newTotal = newSubtotal + newVat;
      await conn.query(
        'UPDATE Invoices SET Subtotal = ?, VATAmount = ?, TotalAmount = ?, UpdatedAt = NOW() WHERE InvoiceId = ?',
        [newSubtotal, newVat, newTotal, invoiceId]
      );
    }

    // 6. Ghi Audit Log & Event
    await conn.query(
      `INSERT INTO MinibarInspectionEvents (
        InspectionId, StayId, ActionType, UserId, UserName, NewValues, Reason
      ) VALUES (?, ?, 'MINIBAR_CONFIRM', ?, ?, ?, ?)`,
      [
        inspectionId,
        stayId,
        confirmedBy,
        confirmedByName,
        JSON.stringify({ status: 'CONFIRMED', totalAmount: inspection.TotalAmount, idempotencyKey }),
        'Xác nhận kiểm kê minibar và ghi nhận khoản phí vào hóa đơn lưu trú'
      ]
    );

    await conn.query(
      `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, NewValues, ActionTime, IpAddress)
       VALUES (?, 'MINIBAR_CONFIRM', 'MinibarInspections', ?, ?, NOW(), ?)`,
      [
        confirmedBy,
        inspectionId,
        JSON.stringify({ stayId, totalAmount: inspection.TotalAmount, confirmedByName }),
        req.ip || '127.0.0.1'
      ]
    ).catch(() => {});

    await conn.commit();

    res.json({
      success: true,
      errorCode: 'SUCCESS_MINIBAR_0001_CONFIRMED',
      message: SPEC_MESSAGES.SUCCESS_MINIBAR_0001_CONFIRMED,
      data: {
        inspectionId,
        status: 'CONFIRMED',
        version: nextVersion,
        totalConsumedQty: inspection.TotalConsumedQty,
        subtotal: inspection.Subtotal,
        taxAmount: inspection.TaxAmount,
        totalAmount: inspection.TotalAmount,
        confirmedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /minibar confirm error:', err);
    res.status(500).json({
      success: false,
      errorCode: 'MINIBAR_0010_CHARGE_FAILED',
      message: SPEC_MESSAGES.MINIBAR_0010_CHARGE_FAILED + ' Chi tiết: ' + err.message
    });
  } finally {
    conn.release();
  }
});

// ─── 6. POST /api/v1/minibar/stays/:stayId/inspections/:id/adjust ───────────
// Điều chỉnh phí hoặc đảo phí sau khi đã xác nhận (MINIBAR_ADJUST)
router.post('/stays/:stayId/inspections/:id/adjust', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { stayId, id: inspectionId } = req.params;
    const {
      lineId,
      adjustedQty,
      adjustedAmount,
      reasonCode,
      note,
      adjustedBy = 1,
      adjustedByName = 'Giám Sát Ca Trực'
    } = req.body;

    if (!reasonCode || !reasonCode.trim()) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errorCode: 'MINIBAR_0007_REASON_REQUIRED',
        message: SPEC_MESSAGES.MINIBAR_0007_REASON_REQUIRED
      });
    }

    const [lines] = await conn.query(
      'SELECT * FROM MinibarInspectionLines WHERE LineId = ? AND InspectionId = ?',
      [lineId, inspectionId]
    );

    if (!lines.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy dòng sản phẩm để điều chỉnh' });
    }

    const oldLine = lines[0];
    const newQty = adjustedQty !== undefined ? Number(adjustedQty) : oldLine.ConsumedQty;
    const newAmount = adjustedAmount !== undefined ? Number(adjustedAmount) : (newQty * Number(oldLine.UnitPrice));

    await conn.query(
      `UPDATE MinibarInspectionLines SET
        ConsumedQty = ?,
        BillableQty = ?,
        LineAmount = ?,
        VarianceReason = ?,
        Notes = CONCAT(COALESCE(Notes, ''), ' // Điều chỉnh: ', ?),
        UpdatedAt = NOW()
      WHERE LineId = ?`,
      [newQty, newQty, newAmount, reasonCode, note || reasonCode, lineId]
    );

    // Tính lại tổng inspection
    const [allLines] = await conn.query(
      'SELECT SUM(ConsumedQty) as totalQty, SUM(LineAmount) as totalSub FROM MinibarInspectionLines WHERE InspectionId = ?',
      [inspectionId]
    );
    const subtotal = Number(allLines[0].totalSub || 0);
    const totalConsumedQty = Number(allLines[0].totalQty || 0);
    const taxAmount = Math.round(subtotal * 0.1);
    const totalAmount = subtotal + taxAmount;

    await conn.query(
      `UPDATE MinibarInspections SET
        TotalConsumedQty = ?,
        Subtotal = ?,
        TaxAmount = ?,
        TotalAmount = ?,
        UpdatedAt = NOW()
      WHERE InspectionId = ?`,
      [totalConsumedQty, subtotal, taxAmount, totalAmount, inspectionId]
    );

    // Ghi Audit Event
    await conn.query(
      `INSERT INTO MinibarInspectionEvents (
        InspectionId, StayId, ActionType, UserId, UserName, OldValues, NewValues, Reason
      ) VALUES (?, ?, 'MINIBAR_ADJUST', ?, ?, ?, ?, ?)`,
      [
        inspectionId,
        stayId,
        adjustedBy,
        adjustedByName,
        JSON.stringify({ lineId, oldQty: oldLine.ConsumedQty, oldAmount: oldLine.LineAmount }),
        JSON.stringify({ lineId, newQty, newAmount }),
        `Lý do điều chỉnh: [${reasonCode}] ${note || ''}`
      ]
    );

    await conn.commit();

    res.json({
      success: true,
      message: 'Đã cập nhật điều chỉnh phí minibar thành công',
      data: { inspectionId, lineId, newQty, newAmount, totalAmount }
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /minibar adjust error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ─── 7. POST /api/v1/minibar/stays/:stayId/override ─────────────────────────
// Lễ tân thực hiện bỏ qua / miễn kiểm kê khi cần checkout gấp
router.post('/stays/:stayId/override', async (req, res) => {
  try {
    const { stayId } = req.params;
    const { overrideReason, overrideOption = 'WAIVE_INSPECTION', userId = 1, userName = 'Lễ Tân Trực Tiếp' } = req.body;

    if (!overrideReason || !overrideReason.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'MINIBAR_0007_REASON_REQUIRED',
        message: SPEC_MESSAGES.MINIBAR_0007_REASON_REQUIRED
      });
    }

    const [stays] = await pool.query('SELECT RoomId FROM Stays WHERE StayId = ?', [stayId]);
    if (!stays.length) {
      return res.status(404).json({ success: false, message: 'Lượt lưu trú không tồn tại' });
    }

    const [insRes] = await pool.query(
      `INSERT INTO MinibarInspections (
        StayId, RoomId, Status, Version, CheckedBy, CheckedByName, CheckedAt,
        ConfirmedBy, ConfirmedByName, ConfirmedAt, TotalConsumedQty, Subtotal, TotalAmount,
        Notes, OverrideReason, OverrideBy
      ) VALUES (?, ?, 'CONFIRMED', 1, ?, ?, NOW(), ?, ?, NOW(), 0, 0, 0, ?, ?, ?)`,
      [
        stayId,
        stays[0].RoomId,
        userId,
        userName,
        userId,
        userName,
        `Miễn kiểm kê minibar khi trả phòng (${overrideOption})`,
        overrideReason,
        userId
      ]
    );

    await pool.query(
      `INSERT INTO MinibarInspectionEvents (
        InspectionId, StayId, ActionType, UserId, UserName, NewValues, Reason
      ) VALUES (?, ?, 'MINIBAR_OVERRIDE', ?, ?, ?, ?)`,
      [
        insRes.insertId,
        stayId,
        userId,
        userName,
        JSON.stringify({ overrideOption, overrideReason }),
        `Lễ tân thực hiện Override: ${overrideReason}`
      ]
    );

    res.json({
      success: true,
      message: 'Đã ghi nhận phương án xử lý miễn kiểm kê minibar cho lượt trả phòng',
      data: { stayId, inspectionId: insRes.insertId, status: 'CONFIRMED' }
    });
  } catch (err) {
    console.error('POST /minibar override error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
