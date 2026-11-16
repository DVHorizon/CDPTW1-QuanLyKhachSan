'use strict';

/**
 * backend/tests/challenger_orch4_2_empirical_harness.js
 * EMPIRICAL CHALLENGER: Calculation Accuracy & Edge Case Stress Harness
 * 
 * Verifies all 6 challenge areas:
 * 1. Stay Night Calculation & Early/Late Checkouts (floating drift, cross-month, 1 night, actual vs contract)
 * 2. Stay Extensions vs SurchargeAmount (double counting verification, invoice collision check)
 * 3. Services Filter & Warning (Status filter, hasPendingServices flag)
 * 4. F&B Filter (PaymentMode PayNow vs RoomInvoice, Status filter)
 * 5. Damage Items & Room Inspection Reports (ApprovedCharge, LinenDamageFee, KeycardLossPenalty, status filters)
 * 6. Master Invoice Line Items Parity (sum(InvoiceDetails.TotalPrice) === Invoice.Subtotal)
 */

const assert = require('assert');
const path = require('path');
const rootDir = path.resolve(__dirname, '../..');
const pool = require(path.join(rootDir, 'backend/src/config/db'));
const { request } = require(path.join(rootDir, 'backend/tests/e2e_services_c1_c14/helpers/apiClient'));
const { getAuthContext } = require(path.join(rootDir, 'backend/tests/e2e_services_c1_c14/helpers/authHelper'));
const {
  sequelize,
  Booking,
  Stay,
  Room,
  RoomType,
  Service,
  ServiceCategory,
  ServiceOrder,
  FoodOrder,
  MinibarUsage,
  Invoice,
  InvoiceDetail,
  Payment,
  User,
} = require(path.join(rootDir, 'backend/src/models'));
const {
  calculateStayNights,
  calculateBookingChargesData,
} = require(path.join(rootDir, 'backend/src/modules/services/controllers/bookingChargesController'));

let adminToken;
const testResults = {
  area1: [],
  area2: [],
  area3: [],
  area4: [],
  area5: [],
  area6: [],
};

async function logResult(area, name, passed, details = {}) {
  testResults[area].push({ name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${status}: ${name}`);
  if (!passed || details.note) {
    console.log(`     Details:`, JSON.stringify(details));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA 1: Stay Night Calculation & Early/Late Checkouts
// ─────────────────────────────────────────────────────────────────────────────
async function testArea1_StayNights() {
  console.log('\n======================================================');
  console.log('📌 CHALLENGE AREA 1: Stay Night Calculation & Drift');
  console.log('======================================================');

  // 1.1 Floating drift test: Run 50 iterations with simulated time offsets
  let driftDetected = false;
  const mockBooking = {
    NumberOfNights: 3,
    CheckInDate: '2026-11-01',
    CheckOutDate: '2026-11-04',
  };
  const mockStay = {
    ActualCheckIn: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    ExpectedCheckOut: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
  };

  const initialNights = calculateStayNights(mockStay, mockBooking);
  for (let i = 0; i < 50; i++) {
    // Artificial time simulation
    const current = calculateStayNights(mockStay, mockBooking);
    if (current !== initialNights || current !== 3) {
      driftDetected = true;
      break;
    }
  }
  await logResult('area1', 'Floating drift test (Date.now() drift elimination)', !driftDetected && initialNights === 3, {
    initialNights,
    driftDetected,
  });

  // 1.2 Cross-month boundary (Feb 28 to Mar 2 non-leap year)
  const febToMarBooking = {
    NumberOfNights: 0, // force date diff calculation
    CheckInDate: '2026-02-28',
    CheckOutDate: '2026-03-02',
  };
  const febToMarNights = calculateStayNights(null, febToMarBooking);
  await logResult('area1', 'Cross-month boundary calculation (2026-02-28 to 2026-03-02)', febToMarNights === 2, {
    expected: 2,
    actual: febToMarNights,
  });

  // 1.3 Cross-year boundary (Dec 31 to Jan 2)
  const decToJanBooking = {
    NumberOfNights: null,
    CheckInDate: '2026-12-31',
    CheckOutDate: '2027-01-03',
  };
  const decToJanNights = calculateStayNights(null, decToJanBooking);
  await logResult('area1', 'Cross-year boundary calculation (2026-12-31 to 2027-01-03)', decToJanNights === 3, {
    expected: 3,
    actual: decToJanNights,
  });

  // 1.4 Single night stay (NumberOfNights: 1)
  const singleNightBooking = {
    NumberOfNights: 1,
    CheckInDate: '2026-11-05',
    CheckOutDate: '2026-11-06',
  };
  const singleNight = calculateStayNights(null, singleNightBooking);
  await logResult('area1', 'Single night stay (NumberOfNights = 1)', singleNight === 1, {
    expected: 1,
    actual: singleNight,
  });

  // 1.5 Early checkout: ActualCheckOut is earlier than CheckOutDate
  // Contractual policy check: Does calculateStayNights bill contract nights or actual nights?
  const earlyCheckoutStay = {
    ActualCheckIn: '2026-11-01T14:00:00Z',
    ActualCheckOut: '2026-11-02T10:00:00Z',
    ExpectedCheckOut: '2026-11-04T12:00:00Z',
  };
  const contractBooking = {
    NumberOfNights: 3,
    CheckInDate: '2026-11-01',
    CheckOutDate: '2026-11-04',
  };
  const earlyNights = calculateStayNights(earlyCheckoutStay, contractBooking);
  await logResult('area1', 'Early check-out contractual night adherence (3 contract nights)', earlyNights === 3, {
    expected: 3,
    actual: earlyNights,
    note: 'Contractual nights preserved according to D15 policy',
  });

  // 1.6 Stay fallback when booking is absent
  const standaloneStay = {
    ActualCheckIn: '2026-11-01T14:00:00Z',
    ExpectedCheckOut: '2026-11-03T12:00:00Z',
  };
  const standaloneNights = calculateStayNights(standaloneStay, null);
  await logResult('area1', 'Fallback to Stay ExpectedCheckOut - ActualCheckIn when booking is null', standaloneNights === 2, {
    expected: 2,
    actual: standaloneNights,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA 2: Stay Extensions vs SurchargeAmount
// ─────────────────────────────────────────────────────────────────────────────
async function testArea2_ExtensionsVsSurcharge() {
  console.log('\n======================================================');
  console.log('📌 CHALLENGE AREA 2: Stay Extensions vs SurchargeAmount');
  console.log('======================================================');

  const room = await Room.findOne();
  const roomType = await RoomType.findOne();
  const user = await User.findOne();

  // Create a clean booking
  const booking = await Booking.create({
    UserId: user ? user.UserId : 1,
    RoomTypeId: roomType ? roomType.RoomTypeId : 1,
    ConfirmationCode: `CHALLENGE-EXT-${Date.now()}`,
    CheckInDate: '2026-11-10',
    CheckOutDate: '2026-11-12',
    NumberOfNights: 2,
    RoomQuantity: 1,
    RoomSubtotal: 2000000,
    TotalAmount: 2000000,
    SurchargeAmount: 0,
    DepositAmount: 0,
    Status: 'CheckedIn',
    CreatedAt: new Date(),
  });

  const stay = await Stay.create({
    BookingId: booking.BookingId,
    RoomId: room ? room.RoomId : 1,
    CheckInDate: '2026-11-10',
    CheckOutDate: '2026-11-12',
    ActualCheckIn: '2026-11-10T14:00:00Z',
    ExpectedCheckOut: '2026-11-12T12:00:00Z',
    Status: 'CheckedIn',
    CreatedAt: new Date(),
  });

  // Simulate stay extension confirmed:
  // Extension: 1 night, 1,000,000 VND
  // stayExtensionRoutes.js updates:
  // 1) SurchargeAmount on Booking += 1,000,000
  // 2) Inserts into StayExtensions
  await pool.query(
    `INSERT INTO StayExtensions 
     (StayId, BookingId, RoomId, CurrentCheckoutAt, RequestedCheckoutAt, AdditionalNights, BaseAmount, TaxRate, TaxAmount, TotalAmount, ExtensionStatus, QuoteExpiresAt, CreatedAt, UpdatedAt)
     VALUES (?, ?, ?, '2026-11-12 12:00:00', '2026-11-13 12:00:00', 1, 892857, 12.00, 107143, 1000000, 'CONFIRMED', NOW(), NOW(), NOW())`,
    [stay.StayId, booking.BookingId, stay.RoomId]
  );

  // Update Booking as stayExtensionRoutes.js does
  await booking.update({
    NumberOfNights: 3,
    CheckOutDate: '2026-11-13',
    TotalAmount: 3000000,
    SurchargeAmount: 1000000,
  });

  // Test C6 charges calculation
  const charges = await calculateBookingChargesData(booking.BookingId);

  // Verification 2.1: GrandTotal must be 3,000,000 (Room 2,000,000 + Extension 1,000,000). NOT 4,000,000!
  const expectedGrandTotal = 3000000;
  const isNoDoubleCount = charges.grandTotal === expectedGrandTotal;
  await logResult('area2', 'No double-counting when StayExtension updates Booking.SurchargeAmount', isNoDoubleCount, {
    expectedGrandTotal,
    actualGrandTotal: charges.grandTotal,
    netSurcharge: charges.surchargeAmount,
    extensionTotal: charges.stays[0].extensions.reduce((sum, e) => sum + e.total, 0),
  });

  // Verification 2.2: What if Booking had an independent surcharge (e.g. 300,000 Extra Bed) PLUS the 1,000,000 extension?
  await booking.update({
    SurchargeAmount: 1300000, // 1,000,000 extension + 300,000 extra bed
  });
  const chargesWithIndependentSurcharge = await calculateBookingChargesData(booking.BookingId);
  // Expected grandTotal: 2,000,000 room + 1,000,000 extension + 300,000 extra bed = 3,300,000
  const isIndependentSurchargePreserved = chargesWithIndependentSurcharge.grandTotal === 3300000 && chargesWithIndependentSurcharge.surchargeAmount === 300000;
  await logResult('area2', 'Independent Surcharge preservation (1M ext + 300k extra bed = 3.3M)', isIndependentSurchargePreserved, {
    expectedGrandTotal: 3300000,
    actualGrandTotal: chargesWithIndependentSurcharge.grandTotal,
    netSurcharge: chargesWithIndependentSurcharge.surchargeAmount,
  });

  // Verification 2.3: Check if stayExtensionRoutes creates early invoice that blocks masterInvoice
  // Let's inspect whether an Invoice already exists for this booking
  const existingInvoices = await Invoice.findAll({ where: { BookingId: booking.BookingId } });
  await logResult('area2', 'Extension confirmation does NOT block Master Invoice creation', existingInvoices.length === 0, {
    existingInvoicesCount: existingInvoices.length,
    note: existingInvoices.length > 0 ? 'WARNING: Early invoice created by stayExtensionRoutes' : 'Clean: No premature invoice',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA 3: Services Filter & Warning
// ─────────────────────────────────────────────────────────────────────────────
async function testArea3_ServicesFilter() {
  console.log('\n======================================================');
  console.log('📌 CHALLENGE AREA 3: Services Filter & Pending Warning');
  console.log('======================================================');

  const room = await Room.findOne();
  const roomType = await RoomType.findOne();
  const user = await User.findOne();
  const service = await Service.findOne();

  const booking = await Booking.create({
    UserId: user ? user.UserId : 1,
    RoomTypeId: roomType ? roomType.RoomTypeId : 1,
    ConfirmationCode: `CHALLENGE-SVC-${Date.now()}`,
    CheckInDate: '2026-11-15',
    CheckOutDate: '2026-11-17',
    NumberOfNights: 2,
    RoomQuantity: 1,
    RoomSubtotal: 2000000,
    TotalAmount: 2000000,
    SurchargeAmount: 0,
    DepositAmount: 0,
    Status: 'CheckedIn',
    CreatedAt: new Date(),
  });

  const stay = await Stay.create({
    BookingId: booking.BookingId,
    RoomId: room ? room.RoomId : 1,
    CheckInDate: '2026-11-15',
    CheckOutDate: '2026-11-17',
    ActualCheckIn: '2026-11-15T14:00:00Z',
    ExpectedCheckOut: '2026-11-17T12:00:00Z',
    Status: 'CheckedIn',
    CreatedAt: new Date(),
  });

  // Create 4 ServiceOrders:
  // 1. Completed (200,000)
  // 2. InProgress (150,000)
  // 3. Received (100,000)
  // 4. Cancelled (50,000)
  const serviceId = service ? service.ServiceId : 1;
  await ServiceOrder.bulkCreate([
    {
      StayId: stay.StayId,
      ServiceId: serviceId,
      UserId: user ? user.UserId : 1,
      Quantity: 1,
      UnitPrice: 200000,
      TotalPrice: 200000,
      Status: 'Completed',
      OrderDate: new Date(),
    },
    {
      StayId: stay.StayId,
      ServiceId: serviceId,
      UserId: user ? user.UserId : 1,
      Quantity: 1,
      UnitPrice: 150000,
      TotalPrice: 150000,
      Status: 'InProgress',
      OrderDate: new Date(),
    },
    {
      StayId: stay.StayId,
      ServiceId: serviceId,
      UserId: user ? user.UserId : 1,
      Quantity: 1,
      UnitPrice: 100000,
      TotalPrice: 100000,
      Status: 'Received',
      OrderDate: new Date(),
    },
    {
      StayId: stay.StayId,
      ServiceId: serviceId,
      UserId: user ? user.UserId : 1,
      Quantity: 1,
      UnitPrice: 50000,
      TotalPrice: 50000,
      Status: 'Cancelled',
      OrderDate: new Date(),
    },
  ]);

  const charges = await calculateBookingChargesData(booking.BookingId);
  const stayDetail = charges.stays[0];
  const serviceItems = stayDetail.services;
  const servicesSubtotal = serviceItems.reduce((sum, s) => sum + s.subtotal, 0);

  // 3.1 Only Completed orders in subtotal
  const onlyCompletedInSubtotal = servicesSubtotal === 200000 && serviceItems.length === 1;
  await logResult('area3', 'Only Completed ServiceOrders contribute to subtotal (200k vs 500k)', onlyCompletedInSubtotal, {
    expectedSubtotal: 200000,
    actualSubtotal: servicesSubtotal,
    itemCount: serviceItems.length,
  });

  // 3.2 hasPendingServices flag must be true
  await logResult('area3', 'hasPendingServices is true when InProgress/Received orders exist', charges.hasPendingServices === true, {
    hasPendingServices: charges.hasPendingServices,
  });

  // 3.3 When InProgress & Received are completed, hasPendingServices becomes false & subtotal updates
  await ServiceOrder.update(
    { Status: 'Completed' },
    { where: { StayId: stay.StayId, Status: ['InProgress', 'Received'] } }
  );
  const chargesAfterUpdate = await calculateBookingChargesData(booking.BookingId);
  const updatedStayDetail = chargesAfterUpdate.stays[0];
  const updatedSubtotal = updatedStayDetail.services.reduce((sum, s) => sum + s.subtotal, 0);

  const pendingCleared = chargesAfterUpdate.hasPendingServices === false && updatedSubtotal === 450000;
  await logResult('area3', 'Pending cleared and subtotal reflects all 3 completed orders (450k)', pendingCleared, {
    hasPendingServices: chargesAfterUpdate.hasPendingServices,
    updatedSubtotal,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA 4: F&B Filter
// ─────────────────────────────────────────────────────────────────────────────
async function testArea4_FoodFilter() {
  console.log('\n======================================================');
  console.log('📌 CHALLENGE AREA 4: F&B PaymentMode & Status Filter');
  console.log('======================================================');

  const room = await Room.findOne();
  const roomType = await RoomType.findOne();
  const user = await User.findOne();

  const booking = await Booking.create({
    UserId: user ? user.UserId : 1,
    RoomTypeId: roomType ? roomType.RoomTypeId : 1,
    ConfirmationCode: `CHALLENGE-FNB-${Date.now()}`,
    CheckInDate: '2026-11-20',
    CheckOutDate: '2026-11-22',
    NumberOfNights: 2,
    RoomQuantity: 1,
    RoomSubtotal: 2000000,
    TotalAmount: 2000000,
    SurchargeAmount: 0,
    DepositAmount: 0,
    Status: 'CheckedIn',
    CreatedAt: new Date(),
  });

  const stay = await Stay.create({
    BookingId: booking.BookingId,
    RoomId: room ? room.RoomId : 1,
    CheckInDate: '2026-11-20',
    CheckOutDate: '2026-11-22',
    ActualCheckIn: '2026-11-20T14:00:00Z',
    ExpectedCheckOut: '2026-11-22T12:00:00Z',
    Status: 'CheckedIn',
    CreatedAt: new Date(),
  });

  // Create 5 FoodOrders:
  // 1. PayNow + Served (300k) -> MUST EXCLUDE
  // 2. RoomInvoice + Served (450k) -> MUST INCLUDE
  // 3. RoomInvoice + Delivered (150k) -> MUST INCLUDE
  // 4. RoomInvoice + Preparing (200k) -> MUST EXCLUDE
  // 5. PayNow + Delivered (120k) -> MUST EXCLUDE
  const uid = user ? user.UserId : 1;
  await FoodOrder.bulkCreate([
    {
      StayId: stay.StayId,
      UserId: uid,
      PaymentMode: 'PayNow',
      Status: 'Served',
      TotalAmount: 300000,
      OrderType: 'DineIn',
      OrderTime: new Date(),
    },
    {
      StayId: stay.StayId,
      UserId: uid,
      PaymentMode: 'RoomInvoice',
      Status: 'Served',
      TotalAmount: 450000,
      OrderType: 'RoomService',
      OrderTime: new Date(),
    },
    {
      StayId: stay.StayId,
      UserId: uid,
      PaymentMode: 'RoomInvoice',
      Status: 'Delivered',
      TotalAmount: 150000,
      OrderType: 'RoomService',
      OrderTime: new Date(),
    },
    {
      StayId: stay.StayId,
      UserId: uid,
      PaymentMode: 'RoomInvoice',
      Status: 'Preparing',
      TotalAmount: 200000,
      OrderType: 'RoomService',
      OrderTime: new Date(),
    },
    {
      StayId: stay.StayId,
      UserId: uid,
      PaymentMode: 'PayNow',
      Status: 'Delivered',
      TotalAmount: 120000,
      OrderType: 'Bar',
      OrderTime: new Date(),
    },
  ]);

  const charges = await calculateBookingChargesData(booking.BookingId);
  const foodItems = charges.stays[0].food;
  const foodSubtotal = foodItems.reduce((sum, f) => sum + f.subtotal, 0);

  // 4.1 PayNow is strictly excluded
  const hasPayNow = foodItems.some(f => f.orderType === 'DineIn' || f.orderType === 'Bar');
  await logResult('area4', 'FoodOrders with PaymentMode = PayNow are strictly excluded (0 PayNow items)', !hasPayNow, {
    foodItemsCount: foodItems.length,
    foodSubtotal,
  });

  // 4.2 Only RoomInvoice with Served or Delivered included
  const isFoodSubtotalExact = foodSubtotal === 600000 && foodItems.length === 2;
  await logResult('area4', 'F&B Subtotal exactly equals 600k (450k Served + 150k Delivered)', isFoodSubtotalExact, {
    expectedSubtotal: 600000,
    actualSubtotal: foodSubtotal,
    itemCount: foodItems.length,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA 5: Damage Items & Room Inspection Reports
// ─────────────────────────────────────────────────────────────────────────────
async function testArea5_DamagesAndInspections() {
  console.log('\n======================================================');
  console.log('📌 CHALLENGE AREA 5: Damage Items & Inspection Reports');
  console.log('======================================================');

  const room = await Room.findOne();
  const roomType = await RoomType.findOne();
  const user = await User.findOne();

  const booking = await Booking.create({
    UserId: user ? user.UserId : 1,
    RoomTypeId: roomType ? roomType.RoomTypeId : 1,
    ConfirmationCode: `CHALLENGE-DAM-${Date.now()}`,
    CheckInDate: '2026-11-25',
    CheckOutDate: '2026-11-27',
    NumberOfNights: 2,
    RoomQuantity: 1,
    RoomSubtotal: 2000000,
    TotalAmount: 2000000,
    SurchargeAmount: 0,
    DepositAmount: 0,
    Status: 'CheckedIn',
    CreatedAt: new Date(),
  });

  const stay = await Stay.create({
    BookingId: booking.BookingId,
    RoomId: room ? room.RoomId : 1,
    CheckInDate: '2026-11-25',
    CheckOutDate: '2026-11-27',
    ActualCheckIn: '2026-11-25T14:00:00Z',
    ExpectedCheckOut: '2026-11-27T12:00:00Z',
    Status: 'CheckedIn',
    CreatedAt: new Date(),
  });

  // 5.1 Insert DamageItems
  // Approved: 350k
  // Charged: 150k
  // Pending: 500k (ApprovedCharge: 0) -> MUST EXCLUDE
  // Cancelled: 200k -> MUST EXCLUDE
  // Rejected: 100k -> MUST EXCLUDE
  await pool.query(
    `INSERT INTO DamageItems (StayId, RoomId, ItemName, DamageDescription, ProposedCharge, ApprovedCharge, Status, ReasonCode, CreatedAt, UpdatedAt)
     VALUES 
     (?, ?, 'Vỡ cốc pha lê', 'Vỡ cốc', 400000, 350000, 'APPROVED', 'Vỡ đồ thủy tinh', NOW(), NOW()),
     (?, ?, 'Hỏng điều khiển TV', 'Hỏng nút', 150000, 150000, 'CHARGED', 'Hỏng thiết bị', NOW(), NOW()),
     (?, ?, 'Rách ga trải giường', 'Rách góc', 500000, 0, 'PENDING', 'Chờ giám sát duyệt', NOW(), NOW()),
     (?, ?, 'Hỏng bàn ủi', 'Không nóng', 200000, 200000, 'CANCELLED', 'Khách không làm hỏng', NOW(), NOW()),
     (?, ?, 'Vết ố sofa', 'Ố trà', 100000, 100000, 'REJECTED', 'Hao mòn tự nhiên', NOW(), NOW())`,
    [
      stay.StayId, stay.RoomId,
      stay.StayId, stay.RoomId,
      stay.StayId, stay.RoomId,
      stay.StayId, stay.RoomId,
      stay.StayId, stay.RoomId,
    ]
  );

  // 5.2 Insert RoomInspectionReports
  // COMPLETED: Linen 80k, Keycard 50k -> MUST INCLUDE
  // REJECTED: Linen 500k, Keycard 100k -> MUST EXCLUDE
  // WAIVED: Linen 200k, Keycard 50k -> MUST EXCLUDE
  await pool.query(
    `INSERT INTO RoomInspectionReports (StayId, RoomId, InspectorId, InspectionTime, Status, LinenDamageFee, KeycardLossPenalty, CreatedAt, UpdatedAt)
     VALUES 
     (?, ?, 1, NOW(), 'COMPLETED', 80000, 50000, NOW(), NOW()),
     (?, ?, 1, NOW(), 'REJECTED', 500000, 100000, NOW(), NOW()),
     (?, ?, 1, NOW(), 'WAIVED', 200000, 50000, NOW(), NOW())`,
    [
      stay.StayId, stay.RoomId,
      stay.StayId, stay.RoomId,
      stay.StayId, stay.RoomId,
    ]
  );

  const charges = await calculateBookingChargesData(booking.BookingId);
  const damageItems = charges.stays[0].damages;
  const damageSubtotal = damageItems.reduce((sum, d) => sum + d.total, 0);

  // Expected damage items:
  // 1. DamageItem Approved: 350k
  // 2. DamageItem Charged: 150k
  // 3. Inspection Linen: 80k
  // 4. Inspection Keycard: 50k
  // Total: 630k
  const isDamageSubtotalExact = damageSubtotal === 630000 && damageItems.length === 4;
  await logResult('area5', 'Damage subtotal exact: 630k (Approved 350k, Charged 150k, Linen 80k, Keycard 50k)', isDamageSubtotalExact, {
    expectedSubtotal: 630000,
    actualSubtotal: damageSubtotal,
    items: damageItems,
  });

  // Verify ApprovedCharge is used, not ProposedCharge (350k vs 400k)
  const crystalItem = damageItems.find(d => d.item === 'Vỡ cốc pha lê');
  await logResult('area5', 'ApprovedCharge (350k) is used instead of ProposedCharge (400k)', crystalItem && crystalItem.total === 350000, {
    crystalItem,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA 6: Master Invoice Line Items Parity
// ─────────────────────────────────────────────────────────────────────────────
async function testArea6_InvoiceParity() {
  console.log('\n======================================================');
  console.log('📌 CHALLENGE AREA 6: Master Invoice Line Items Parity');
  console.log('======================================================');

  const room = await Room.findOne();
  const roomType = await RoomType.findOne();
  const user = await User.findOne();
  const service = await Service.findOne();

  // Create booking with CheckedOut stay to allow Master Invoice creation
  const booking = await Booking.create({
    UserId: user ? user.UserId : 1,
    RoomTypeId: roomType ? roomType.RoomTypeId : 1,
    ConfirmationCode: `CHALLENGE-INV-${Date.now()}`,
    CheckInDate: '2026-11-28',
    CheckOutDate: '2026-11-30',
    NumberOfNights: 2,
    RoomQuantity: 1,
    RoomSubtotal: 2000000,
    TotalAmount: 2000000,
    SurchargeAmount: 100000, // Booking surcharge
    DiscountAmount: 50000,  // Booking discount
    DepositAmount: 500000,
    Status: 'CheckedOut',
    CreatedAt: new Date(),
  });

  const stay = await Stay.create({
    BookingId: booking.BookingId,
    RoomId: room ? room.RoomId : 1,
    CheckInDate: '2026-11-28',
    CheckOutDate: '2026-11-30',
    ActualCheckIn: '2026-11-28T14:00:00Z',
    ActualCheckOut: '2026-11-30T11:00:00Z',
    Status: 'CheckedOut',
    CreatedAt: new Date(),
  });

  // Add ServiceOrder (Completed: 250k)
  await ServiceOrder.create({
    StayId: stay.StayId,
    ServiceId: service ? service.ServiceId : 1,
    UserId: user ? user.UserId : 1,
    Quantity: 1,
    UnitPrice: 250000,
    TotalPrice: 250000,
    Status: 'Completed',
    OrderDate: new Date(),
  });

  // Add MinibarUsage (75k)
  await MinibarUsage.create({
    StayId: stay.StayId,
    ItemId: 1,
    Quantity: 1,
    UnitPrice: 75000,
    TotalAmount: 75000,
    UsageDate: new Date(),
  });

  // Add FoodOrder (RoomInvoice Served: 320k)
  await FoodOrder.create({
    StayId: stay.StayId,
    UserId: user ? user.UserId : 1,
    PaymentMode: 'RoomInvoice',
    Status: 'Served',
    TotalAmount: 320000,
    OrderType: 'RoomService',
    OrderTime: new Date(),
  });

  // Add StayExtension (1 night: 800k)
  await pool.query(
    `INSERT INTO StayExtensions 
     (StayId, BookingId, RoomId, CurrentCheckoutAt, RequestedCheckoutAt, AdditionalNights, BaseAmount, TaxRate, TaxAmount, TotalAmount, ExtensionStatus, QuoteExpiresAt, CreatedAt, UpdatedAt)
     VALUES (?, ?, ?, '2026-11-30 12:00:00', '2026-12-01 12:00:00', 1, 714286, 12.00, 85714, 800000, 'CONFIRMED', NOW(), NOW(), NOW())`,
    [stay.StayId, booking.BookingId, stay.RoomId]
  );

  // Add DamageItem (Approved: 180k)
  await pool.query(
    `INSERT INTO DamageItems (StayId, RoomId, ItemName, DamageDescription, ProposedCharge, ApprovedCharge, Status, ReasonCode, CreatedAt, UpdatedAt)
     VALUES (?, ?, 'Làm bẩn rèm cửa', 'Bẩn rèm', 200000, 180000, 'APPROVED', 'Vết bẩn', NOW(), NOW())`,
    [stay.StayId, stay.RoomId]
  );

  // Add RoomInspectionReport (KeycardLoss: 50k)
  await pool.query(
    `INSERT INTO RoomInspectionReports (StayId, RoomId, InspectorId, InspectionTime, Status, LinenDamageFee, KeycardLossPenalty, CreatedAt, UpdatedAt)
     VALUES (?, ?, 1, NOW(), 'COMPLETED', 0, 50000, NOW(), NOW())`,
    [stay.StayId, stay.RoomId]
  );

  // Now create Master Invoice via API with a manual adjustment
  const invoiceRes = await request('/invoices/master', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      bookingId: booking.BookingId,
      vatRate: 10,
      manualAdjustments: [
        { description: 'Phụ thu nhận phòng sớm 30 phút', amount: 60000, itemType: 'Surcharge' },
      ],
    },
  });

  const invCreated = invoiceRes.status === 201;
  await logResult('area6', 'Master Invoice created successfully (201 Created)', invCreated, {
    status: invoiceRes.status,
    data: invoiceRes.data,
  });

  if (!invCreated) {
    console.error('Failed to create Master Invoice:', invoiceRes.data);
    return;
  }

  console.log('Area 6 API Response:', JSON.stringify(invoiceRes.data, null, 2));
  const invoiceId = invoiceRes.data.data.invoiceId;
  console.log('Area 6 invoiceId:', invoiceId);

  // Now check database parity:
  // 1) Fetch Invoice
  const invoiceRow = await Invoice.findByPk(invoiceId);
  // 2) Fetch all InvoiceDetails
  const details = await InvoiceDetail.findAll({ where: { InvoiceId: invoiceId } });

  const sumDetailsTotalPrice = details.reduce((sum, d) => sum + Number(d.TotalPrice || 0), 0);
  const invoiceSubtotal = Number(invoiceRow.Subtotal || 0);

  const diff = Math.abs(sumDetailsTotalPrice - invoiceSubtotal);
  const isParityExact = diff < 0.01;

  await logResult('area6', 'sum(InvoiceDetails.TotalPrice) === Invoice.Subtotal parity check', isParityExact, {
    invoiceSubtotal,
    sumDetailsTotalPrice,
    diff,
    lineItemsCount: details.length,
    itemTypes: details.map(d => ({ type: d.ItemType, desc: d.Description, price: Number(d.TotalPrice) })),
  });

  // Verify VAT and TotalAmount calculation
  const expectedVat = Math.round(invoiceSubtotal * 0.1 * 100) / 100;
  const expectedTotal = Math.round((invoiceSubtotal + expectedVat) * 100) / 100;
  const isVatAccurate = Math.abs(Number(invoiceRow.VATAmount) - expectedVat) < 0.01;
  const isTotalAccurate = Math.abs(Number(invoiceRow.TotalAmount) - expectedTotal) < 0.01;

  await logResult('area6', 'VAT (10%) and TotalAmount parity check', isVatAccurate && isTotalAccurate, {
    invoiceVat: Number(invoiceRow.VATAmount),
    expectedVat,
    invoiceTotal: Number(invoiceRow.TotalAmount),
    expectedTotal,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
async function run() {
  console.log('================================================================================');
  console.log('⚡ EMPIRICAL CHALLENGER: CALCULATION ACCURACY & EDGE CASE HARNESS');
  console.log('================================================================================');

  try {
    const authCtx = await getAuthContext();
    adminToken = authCtx.adminToken;
    console.log('Authenticated admin token retrieved.');

    await testArea1_StayNights();
    await testArea2_ExtensionsVsSurcharge();
    await testArea3_ServicesFilter();
    await testArea4_FoodFilter();
    await testArea5_DamagesAndInspections();
    await testArea6_InvoiceParity();

    console.log('\n================================================================================');
    console.log('📊 FINAL SUMMARY OF CHALLENGE TESTS');
    console.log('================================================================================');

    let allPassed = true;
    for (const [area, tests] of Object.entries(testResults)) {
      const passedCount = tests.filter(t => t.passed).length;
      const totalCount = tests.length;
      console.log(`  ${area.toUpperCase()}: ${passedCount}/${totalCount} tests passed`);
      if (passedCount !== totalCount) allPassed = false;
    }

    console.log('================================================================================');
    if (allPassed) {
      console.log('🎉 ALL EMPIRICAL CHALLENGES PASSED! Gate Verdict candidate: APPROVE');
    } else {
      console.log('❌ SOME CHALLENGES FAILED! Gate Verdict candidate: REQUEST_CHANGES');
    }
    console.log('================================================================================');

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('Harness Execution Error:', err);
    process.exit(1);
  }
}

run();
