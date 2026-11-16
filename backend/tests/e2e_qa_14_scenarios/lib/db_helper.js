'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('./config');

let pool = null;
const tableDescribeCache = new Map();
const registeredCleanups = [];

function getPool() {
  if (!pool) {
    pool = mysql.createPool(config.db);
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  tableDescribeCache.clear();
}

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function execute(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

function assertSafeIdentifier(name) {
  if (!/^[A-Za-z0-9_]+$/.test(String(name))) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
}

async function tableExists(table) {
  assertSafeIdentifier(table);
  const row = await queryOne(
    'SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );
  return Number(row?.cnt || 0) > 0;
}

async function describeTable(table) {
  assertSafeIdentifier(table);
  if (tableDescribeCache.has(table)) {
    return tableDescribeCache.get(table);
  }
  const rows = await query(`DESCRIBE \`${table}\``);
  tableDescribeCache.set(table, rows);
  return rows;
}

async function hasColumn(table, column) {
  const cols = await describeTable(table);
  return cols.some((c) => c.Field === column);
}

function registerCleanup(fn) {
  if (typeof fn === 'function') {
    registeredCleanups.push(fn);
  }
}

async function seedServiceCategory(opts = {}) {
  const categoryName = opts.categoryName || config.makeTag('CAT');
  const description = opts.description || `${config.prefix}Category description`;
  const status = opts.status || 'Active';
  const hasVer = await hasColumn('ServiceCategories', 'Version');

  const cols = ['CategoryName', 'Description', 'IsDeleted', 'Status'];
  const vals = [categoryName, description, 0, status];
  if (hasVer) {
    cols.push('Version');
    vals.push(1);
  }

  const placeholders = cols.map(() => '?').join(', ');
  const res = await execute(
    `INSERT INTO ServiceCategories (${cols.join(', ')}) VALUES (${placeholders})`,
    vals
  );
  const categoryId = res.insertId;

  registerCleanup(async () => {
    await execute('DELETE FROM ServiceCategories WHERE CategoryId = ?', [categoryId]);
  });

  return { CategoryId: categoryId, CategoryName: categoryName, Description: description, Status: status };
}

async function seedService(opts = {}) {
  let categoryId = opts.categoryId;
  if (!categoryId) {
    const cat = await seedServiceCategory();
    categoryId = cat.CategoryId;
  }

  const serviceName = opts.serviceName || config.makeTag('SVC');
  const price = opts.price !== undefined ? opts.price : 150000;
  const unit = opts.unit || 'Lần';
  const description = opts.description || `${config.prefix}Service description`;
  const status = opts.status || 'Active';
  const serviceCode = opts.serviceCode || config.makeCode('SVC');
  const hasVer = await hasColumn('Services', 'Version');

  const cols = ['CategoryId', 'ServiceName', 'Price', 'Unit', 'Description', 'Status', 'ServiceCode', 'IsDeleted'];
  const vals = [categoryId, serviceName, price, unit, description, status, serviceCode, 0];
  if (hasVer) {
    cols.push('Version');
    vals.push(1);
  }

  const placeholders = cols.map(() => '?').join(', ');
  const res = await execute(
    `INSERT INTO Services (${cols.join(', ')}) VALUES (${placeholders})`,
    vals
  );
  const serviceId = res.insertId;

  registerCleanup(async () => {
    await execute('DELETE FROM Services WHERE ServiceId = ?', [serviceId]);
  });

  return {
    ServiceId: serviceId,
    CategoryId: categoryId,
    ServiceName: serviceName,
    Price: price,
    Unit: unit,
    Status: status,
    ServiceCode: serviceCode,
  };
}

async function seedBookingAndStay(opts = {}) {
  const userId = opts.userId || 5; // seeded guest@hoteldomain.vn
  const roomTypeId = opts.roomTypeId || 1;
  const roomId = opts.roomId || 1;
  const bookingStatus = opts.status || 'CheckedIn';
  const stayStatus = opts.stayStatus || 'CheckedIn';
  const confirmationCode = opts.confirmationCode || config.makeCode('BK');
  const note = opts.note || `${config.prefix}Booking`;
  const createStay = opts.createStay !== false;

  const today = new Date();
  const checkInDate = opts.checkInDate || today.toISOString().slice(0, 10);
  const tomorrow = new Date(today.getTime() + 86400000);
  const checkOutDate = opts.checkOutDate || tomorrow.toISOString().slice(0, 10);

  const hasBookingVer = await hasColumn('Bookings', 'Version');
  const bCols = [
    'UserId',
    'RoomTypeId',
    'CheckInDate',
    'CheckOutDate',
    'NumberOfNights',
    'Adults',
    'Children',
    'RoomQuantity',
    'RoomSubtotal',
    'SurchargeAmount',
    'DiscountAmount',
    'TotalAmount',
    'DepositAmount',
    'Status',
    'BookingSource',
    'ConfirmationCode',
    'Note',
    'IsDeleted',
  ];
  const bVals = [
    userId,
    roomTypeId,
    checkInDate,
    checkOutDate,
    1,
    1,
    0,
    1,
    opts.roomSubtotal !== undefined ? opts.roomSubtotal : 1000000,
    0,
    0,
    opts.totalAmount !== undefined ? opts.totalAmount : 1000000,
    opts.depositAmount !== undefined ? opts.depositAmount : 0,
    bookingStatus,
    'DirectWeb',
    confirmationCode,
    note,
    0,
  ];
  if (hasBookingVer) {
    bCols.push('Version');
    bVals.push(1);
  }

  const bRes = await execute(
    `INSERT INTO Bookings (${bCols.join(', ')}) VALUES (${bCols.map(() => '?').join(', ')})`,
    bVals
  );
  const bookingId = bRes.insertId;

  const bgRes = await execute(
    'INSERT INTO BookingGuests (BookingId, FullName, Email, Phone, IsPrimaryGuest) VALUES (?, ?, ?, ?, ?)',
    [bookingId, `${config.prefix}Guest`, 'e2e_qa_guest@hoteldomain.vn', '0909999888', 1]
  );
  const bookingGuestId = bgRes.insertId;

  let stayId = null;
  if (createStay) {
    const hasStayVer = await hasColumn('Stays', 'Version');
    const sCols = ['BookingId', 'RoomId', 'ActualCheckIn', 'ExpectedCheckOut', 'Status', 'DepositAmount'];
    const sVals = [bookingId, roomId, new Date(), tomorrow, stayStatus, opts.depositAmount || 0];
    if (hasStayVer) {
      sCols.push('Version');
      sVals.push(1);
    }
    const sRes = await execute(
      `INSERT INTO Stays (${sCols.join(', ')}) VALUES (${sCols.map(() => '?').join(', ')})`,
      sVals
    );
    stayId = sRes.insertId;
  }

  registerCleanup(async () => {
    if (stayId) await execute('DELETE FROM Stays WHERE StayId = ?', [stayId]);
    await execute('DELETE FROM BookingGuests WHERE BookingGuestId = ?', [bookingGuestId]);
    await execute('DELETE FROM Bookings WHERE BookingId = ?', [bookingId]);
  });

  return {
    BookingId: bookingId,
    BookingGuestId: bookingGuestId,
    StayId: stayId,
    ConfirmationCode: confirmationCode,
    UserId: userId,
    RoomId: roomId,
  };
}

async function seedInvoice(opts = {}) {
  let bookingId = opts.bookingId;
  let stayId = opts.stayId !== undefined ? opts.stayId : null;
  if (!bookingId) {
    const bs = await seedBookingAndStay();
    bookingId = bs.BookingId;
    stayId = bs.StayId;
  }

  const invoiceNumber = opts.invoiceNumber || `INV-${config.makeCode('INV')}`;
  const subtotal = opts.subtotal !== undefined ? opts.subtotal : 500000;
  const vatRate = opts.vatRate !== undefined ? opts.vatRate : 10;
  const vatAmount = opts.vatAmount !== undefined ? opts.vatAmount : Math.round((subtotal * vatRate) / 100);
  const totalAmount = opts.totalAmount !== undefined ? opts.totalAmount : subtotal + vatAmount;
  const status = opts.status || 'Unpaid';
  const hasVer = await hasColumn('Invoices', 'Version');

  const cols = ['StayId', 'BookingId', 'InvoiceNumber', 'Subtotal', 'VATRate', 'VATAmount', 'TotalAmount', 'Status'];
  const vals = [stayId, bookingId, invoiceNumber, subtotal, vatRate, vatAmount, totalAmount, status];
  if (hasVer) {
    cols.push('Version');
    vals.push(1);
  }

  const res = await execute(
    `INSERT INTO Invoices (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    vals
  );
  const invoiceId = res.insertId;

  if (opts.withDetail !== false) {
    await execute(
      'INSERT INTO InvoiceDetails (InvoiceId, ItemType, Description, Quantity, UnitPrice, TotalPrice) VALUES (?, ?, ?, ?, ?, ?)',
      [invoiceId, 'RoomCharge', `${config.prefix}RoomCharge`, 1, subtotal, subtotal]
    );
  }

  registerCleanup(async () => {
    await execute('DELETE FROM InvoiceDetails WHERE InvoiceId = ?', [invoiceId]);
    await execute('DELETE FROM Invoices WHERE InvoiceId = ?', [invoiceId]);
  });

  return {
    InvoiceId: invoiceId,
    BookingId: bookingId,
    StayId: stayId,
    InvoiceNumber: invoiceNumber,
    Subtotal: subtotal,
    VATRate: vatRate,
    VATAmount: vatAmount,
    TotalAmount: totalAmount,
    Status: status,
  };
}

async function seedKnowledgeItem(opts = {}) {
  const question = opts.question || `${config.makeTag('KB')} Check-in time?`;
  const answer = opts.answer || `${config.prefix}Standard check-in starts at 14:00.`;
  const category = opts.category || 'General';
  const keywords = opts.keywords || 'e2e,qa,checkin';
  const status = opts.status || 'Active';
  const hasVer = await hasColumn('ChatbotKnowledgeBase', 'Version');

  const cols = ['Question', 'Answer', 'Category', 'Keywords', 'Status'];
  const vals = [question, answer, category, keywords, status];
  if (hasVer) {
    cols.push('Version');
    vals.push(1);
  }

  const res = await execute(
    `INSERT INTO ChatbotKnowledgeBase (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    vals
  );
  const knowledgeId = res.insertId;

  registerCleanup(async () => {
    await execute('DELETE FROM ChatbotMessages WHERE KnowledgeId = ?', [knowledgeId]);
    await execute('DELETE FROM ChatbotKnowledgeBase WHERE KnowledgeId = ?', [knowledgeId]);
  });

  return {
    KnowledgeId: knowledgeId,
    Question: question,
    Answer: answer,
    Category: category,
    Keywords: keywords,
    Status: status,
  };
}

function cleanupGeneratedInvoicePdfs() {
  const dir = config.invoicesUploadDir;
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const file of fs.readdirSync(dir)) {
    if (/^INV-.*E2EQA.*\.pdf$/i.test(file) || /^E2E_QA_.*\.pdf$/i.test(file)) {
      try {
        fs.unlinkSync(path.join(dir, file));
        removed++;
      } catch (_) {
        // ignore
      }
    }
  }
  return removed;
}

async function cleanupAll(extraFns = []) {
  const allFns = [...registeredCleanups, ...(Array.isArray(extraFns) ? extraFns : [])];
  registeredCleanups.length = 0;

  // Execute LIFO cleanups first
  for (let i = allFns.length - 1; i >= 0; i--) {
    try {
      await allFns[i]();
    } catch (_) {
      // Safe to continue; deterministic reverse-FK sweep follows
    }
  }

  // Deterministic reverse-FK sweep for any E2E_QA_ / E2EQA synthetic rows
  // NEVER touches AuditLogs (WORM trigger) and NEVER runs TRUNCATE
  const likeTag = `${config.prefix}%`;
  const likeCode = `${config.shortPrefix}%`;
  const likeInv = `INV-${config.shortPrefix}%`;
  const likePmt = `PMT-${config.shortPrefix}%`;

  const [e2eBookingRows] = await getPool().query(
    'SELECT BookingId FROM Bookings WHERE ConfirmationCode LIKE ? OR Note LIKE ?',
    [likeCode, likeTag]
  );
  const e2eBookingIds = e2eBookingRows.map((r) => r.BookingId);

  let e2eStayIds = [];
  if (e2eBookingIds.length > 0) {
    const [stayRows] = await getPool().query(
      `SELECT StayId FROM Stays WHERE BookingId IN (${e2eBookingIds.map(() => '?').join(',')})`,
      e2eBookingIds
    );
    e2eStayIds = stayRows.map((r) => r.StayId);
  }

  // 1. ChatbotMessages -> ChatbotConversations -> ChatbotKnowledgeBase
  await execute(
    `DELETE FROM ChatbotMessages WHERE MessageText LIKE ? OR KnowledgeId IN (SELECT KnowledgeId FROM ChatbotKnowledgeBase WHERE Question LIKE ?)`,
    [likeTag, likeTag]
  );
  // Delete conversations only if they had E2E_QA_ messages and are not seeded 1..3
  await execute(
    `DELETE FROM ChatbotConversations WHERE ConversationId > 3 AND ConversationId NOT IN (SELECT DISTINCT ConversationId FROM ChatbotMessages)`
  );
  await execute('DELETE FROM ChatbotKnowledgeBase WHERE Question LIKE ?', [likeTag]);

  // 2. Payments (before Invoices and Bookings due to NO ACTION FKs)
  if (e2eBookingIds.length > 0) {
    await execute(
      `DELETE FROM Payments WHERE TransactionCode LIKE ? OR TransactionCode LIKE ? OR BookingId IN (${e2eBookingIds.map(() => '?').join(',')})`,
      [likePmt, likeTag, ...e2eBookingIds]
    );
  } else {
    await execute('DELETE FROM Payments WHERE TransactionCode LIKE ? OR TransactionCode LIKE ?', [likePmt, likeTag]);
  }
  await execute(
    `DELETE FROM Payments WHERE InvoiceId IN (SELECT InvoiceId FROM Invoices WHERE InvoiceNumber LIKE ? OR InvoiceNumber LIKE ?)`,
    [likeInv, likeTag]
  );

  // 3. InvoiceDetails -> Invoices
  if (e2eBookingIds.length > 0) {
    await execute(
      `DELETE FROM InvoiceDetails WHERE Description LIKE ? OR InvoiceId IN (SELECT InvoiceId FROM Invoices WHERE InvoiceNumber LIKE ? OR InvoiceNumber LIKE ? OR BookingId IN (${e2eBookingIds.map(() => '?').join(',')}))`,
      [likeTag, likeInv, likeTag, ...e2eBookingIds]
    );
    await execute(
      `DELETE FROM Invoices WHERE InvoiceNumber LIKE ? OR InvoiceNumber LIKE ? OR BookingId IN (${e2eBookingIds.map(() => '?').join(',')})`,
      [likeInv, likeTag, ...e2eBookingIds]
    );
  } else {
    await execute(
      `DELETE FROM InvoiceDetails WHERE Description LIKE ? OR InvoiceId IN (SELECT InvoiceId FROM Invoices WHERE InvoiceNumber LIKE ? OR InvoiceNumber LIKE ?)`,
      [likeTag, likeInv, likeTag]
    );
    await execute('DELETE FROM Invoices WHERE InvoiceNumber LIKE ? OR InvoiceNumber LIKE ?', [likeInv, likeTag]);
  }

  // 4. ServiceOrders (before Services and Stays)
  await execute(
    `DELETE FROM ServiceOrders WHERE Note LIKE ? OR ServiceId IN (SELECT ServiceId FROM Services WHERE ServiceName LIKE ?)`,
    [likeTag, likeTag]
  );
  if (e2eStayIds.length > 0) {
    await execute(`DELETE FROM ServiceOrders WHERE StayId IN (${e2eStayIds.map(() => '?').join(',')})`, e2eStayIds);
  }

  // 5. FoodOrders, MinibarUsages, DamageItems, RoomInspectionReports, StayExtensions, StayRoomSegments
  if (e2eStayIds.length > 0) {
    const ph = e2eStayIds.map(() => '?').join(',');
    if (await tableExists('FoodOrderDetails') && await tableExists('FoodOrders')) {
      await execute(`DELETE FROM FoodOrderDetails WHERE FoodOrderId IN (SELECT FoodOrderId FROM FoodOrders WHERE StayId IN (${ph}))`, e2eStayIds);
      await execute(`DELETE FROM FoodOrders WHERE StayId IN (${ph})`, e2eStayIds);
    }
    for (const stayChild of ['MinibarUsages', 'DamageItems', 'RoomInspectionReports', 'StayExtensions', 'StayRoomSegments']) {
      if (await tableExists(stayChild)) {
        await execute(`DELETE FROM \`${stayChild}\` WHERE StayId IN (${ph})`, e2eStayIds);
      }
    }
  }

  // 6. BookingGuests -> Stays -> Bookings
  if (e2eBookingIds.length > 0) {
    const ph = e2eBookingIds.map(() => '?').join(',');
    await execute(`DELETE FROM BookingGuests WHERE BookingId IN (${ph})`, e2eBookingIds);
    await execute(`DELETE FROM Stays WHERE BookingId IN (${ph})`, e2eBookingIds);
    await execute(`DELETE FROM Bookings WHERE BookingId IN (${ph})`, e2eBookingIds);
  }

  // 7. Services -> ServiceCategories
  await execute('DELETE FROM Services WHERE ServiceName LIKE ? OR ServiceCode LIKE ?', [likeTag, likeCode]);
  await execute('DELETE FROM ServiceCategories WHERE CategoryName LIKE ?', [likeTag]);

  // 8. Synthetic Users (if any)
  await execute('DELETE FROM Users WHERE Email LIKE ? OR Username LIKE ?', ['e2e_qa_%', likeTag]);

  // 9. Generated Invoice PDF files
  cleanupGeneratedInvoicePdfs();
}

async function countMarkerRows() {
  const likeTag = `${config.prefix}%`;
  const likeCode = `${config.shortPrefix}%`;
  const likeInv = `INV-${config.shortPrefix}%`;
  const likePmt = `PMT-${config.shortPrefix}%`;

  const checks = [
    ['ServiceCategories', 'SELECT COUNT(*) AS cnt FROM ServiceCategories WHERE CategoryName LIKE ?', [likeTag]],
    ['Services', 'SELECT COUNT(*) AS cnt FROM Services WHERE ServiceName LIKE ? OR ServiceCode LIKE ?', [likeTag, likeCode]],
    ['Bookings', 'SELECT COUNT(*) AS cnt FROM Bookings WHERE ConfirmationCode LIKE ? OR Note LIKE ?', [likeCode, likeTag]],
    ['ServiceOrders', 'SELECT COUNT(*) AS cnt FROM ServiceOrders WHERE Note LIKE ?', [likeTag]],
    ['Invoices', 'SELECT COUNT(*) AS cnt FROM Invoices WHERE InvoiceNumber LIKE ? OR InvoiceNumber LIKE ?', [likeInv, likeTag]],
    ['Payments', 'SELECT COUNT(*) AS cnt FROM Payments WHERE TransactionCode LIKE ? OR TransactionCode LIKE ?', [likePmt, likeTag]],
    ['ChatbotKnowledgeBase', 'SELECT COUNT(*) AS cnt FROM ChatbotKnowledgeBase WHERE Question LIKE ?', [likeTag]],
    ['ChatbotMessages', 'SELECT COUNT(*) AS cnt FROM ChatbotMessages WHERE MessageText LIKE ?', [likeTag]],
    ['Users', 'SELECT COUNT(*) AS cnt FROM Users WHERE Email LIKE ? OR Username LIKE ?', ['e2e_qa_%', likeTag]],
  ];

  const breakdown = {};
  let total = 0;
  for (const [label, sql, params] of checks) {
    const row = await queryOne(sql, params);
    const cnt = Number(row?.cnt || 0);
    breakdown[label] = cnt;
    total += cnt;
  }

  return { total, breakdown };
}

module.exports = {
  getPool,
  closePool,
  query,
  queryOne,
  execute,
  tableExists,
  describeTable,
  hasColumn,
  registerCleanup,
  seedServiceCategory,
  seedService,
  seedBookingAndStay,
  seedInvoice,
  seedKnowledgeItem,
  cleanupAll,
  cleanupGeneratedInvoicePdfs,
  countMarkerRows,
};
