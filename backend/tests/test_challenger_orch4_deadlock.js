'use strict';

/**
 * backend/tests/test_challenger_orch4_deadlock.js
 * Empirical Challenger: Concurrency, Deadlock & Interleaved Read/Write Harness
 * Verifies no deadlock occurs during simultaneous reads and writes on Bookings, Invoices, and Payments.
 */

const assert = require('assert');
const path = require('path');
const { performance } = require('perf_hooks');

const rootDir = path.resolve(__dirname, '../..');
const { request } = require(path.join(rootDir, 'backend/tests/e2e_services_c1_c14/helpers/apiClient'));
const { getAuthContext } = require(path.join(rootDir, 'backend/tests/e2e_services_c1_c14/helpers/authHelper'));
const {
  sequelize,
  Booking,
  Stay,
  Room,
  RoomType,
  Invoice,
  InvoiceDetail,
  Payment,
  User,
} = require(path.join(rootDir, 'backend/src/models'));

async function setupBookingWithStay() {
  const room = await Room.findOne();
  const roomType = await RoomType.findOne();
  const user = await User.findOne();

  const booking = await Booking.create({
    UserId: user ? user.UserId : 1,
    RoomTypeId: roomType ? roomType.RoomTypeId : 1,
    ConfirmationCode: `DEADLOCK-TEST-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    CheckInDate: '2026-11-01',
    CheckOutDate: '2026-11-04',
    NumberOfNights: 3,
    RoomQuantity: 1,
    RoomSubtotal: 2000000,
    TotalAmount: 2000000,
    DepositAmount: 200000,
    Status: 'CheckedOut',
    CreatedAt: new Date(),
  });

  const stay = await Stay.create({
    BookingId: booking.BookingId,
    RoomId: room ? room.RoomId : 1,
    CheckInDate: '2026-11-01',
    CheckOutDate: '2026-11-04',
    ActualCheckIn: '2026-11-01T14:00:00Z',
    ActualCheckOut: '2026-11-04T12:00:00Z',
    Status: 'CheckedOut',
    CreatedAt: new Date(),
  });

  return { booking, stay };
}

async function cleanupBooking(bookingId) {
  if (!bookingId) return;
  const invoices = await Invoice.findAll({ where: { BookingId: bookingId } });
  const invoiceIds = invoices.map((i) => i.InvoiceId);
  if (invoiceIds.length > 0) {
    await Payment.destroy({ where: { InvoiceId: invoiceIds } });
    await InvoiceDetail.destroy({ where: { InvoiceId: invoiceIds } });
    await Invoice.destroy({ where: { InvoiceId: invoiceIds } });
  }
  await Payment.destroy({ where: { BookingId: bookingId } });
  await Stay.destroy({ where: { BookingId: bookingId } });
  await Booking.destroy({ where: { BookingId: bookingId } });
}

async function runDeadlockVerification() {
  console.log('================================================================================');
  console.log('⚡ EMPIRICAL CHALLENGER: SIMULTANEOUS READ/WRITE DEADLOCK VERIFICATION');
  console.log('================================================================================\n');

  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const { booking } = await setupBookingWithStay();
  let createdInvoiceId = null;

  try {
    // 1. First test: Interleaved 30 simultaneous reads on Folio and writes (create invoice)
    console.log('--- Test 1: Simultaneous Folio Reads & Master Invoice Creation ---');
    const promisesTest1 = [];

    // 20 concurrent folio reads
    for (let i = 0; i < 20; i++) {
      promisesTest1.push(
        request(`/bookings/${booking.BookingId}/charges`, {
          method: 'GET',
          headers: adminHeaders,
        }).then((res) => ({ type: 'read_folio', status: res.status, data: res.data }))
      );
    }

    // 5 concurrent invoice creations
    for (let i = 0; i < 5; i++) {
      promisesTest1.push(
        request('/invoices/master', {
          method: 'POST',
          headers: adminHeaders,
          body: {
            bookingId: booking.BookingId,
            vatRate: 10,
            bypassCheckOutRule: true,
          },
        }).then((res) => ({ type: 'create_invoice', status: res.status, data: res.data }))
      );
    }

    const resultsTest1 = await Promise.all(promisesTest1);
    const deadlocksTest1 = resultsTest1.filter(
      (r) =>
        r.data?.error?.includes('Deadlock') ||
        r.data?.message?.includes('Deadlock') ||
        r.data?.error?.includes('ER_LOCK_DEADLOCK')
    );

    const folioReads200 = resultsTest1.filter((r) => r.type === 'read_folio' && r.status === 200);
    const invoiceCreates201 = resultsTest1.filter((r) => r.type === 'create_invoice' && r.status === 201);
    const invoiceCreates409 = resultsTest1.filter((r) => r.type === 'create_invoice' && r.status === 409);

    console.log(`  Folio Reads (200 OK):            ${folioReads200.length} / 20`);
    console.log(`  Invoice Created (201):           ${invoiceCreates201.length} (Expected: 1)`);
    console.log(`  Invoice Conflict (409):          ${invoiceCreates409.length} (Expected: 4)`);
    console.log(`  Deadlocks detected in Test 1:    ${deadlocksTest1.length} (Expected: 0)`);

    assert.strictEqual(deadlocksTest1.length, 0, 'No deadlock should occur in Test 1');
    assert.strictEqual(invoiceCreates201.length, 1, 'Exactly 1 invoice should be created');
    assert.strictEqual(folioReads200.length, 20, 'All 20 folio reads should succeed');

    createdInvoiceId = invoiceCreates201[0].data?.data?.invoiceId || invoiceCreates201[0].data?.invoiceId;
    console.log(`  Created Invoice ID:              ${createdInvoiceId}\n`);

    // 2. Second test: Interleaved Reads (GET invoice, GET booking folio) and Writes (Partial Settlements)
    console.log('--- Test 2: Simultaneous Reads & Settlements & Partial Pays ---');
    const promisesTest2 = [];

    // 15 reads on invoice
    for (let i = 0; i < 15; i++) {
      promisesTest2.push(
        request(`/invoices/${createdInvoiceId}`, {
          method: 'GET',
          headers: adminHeaders,
        }).then((res) => ({ type: 'read_invoice', status: res.status, data: res.data }))
      );
    }

    // 15 reads on folio charges
    for (let i = 0; i < 15; i++) {
      promisesTest2.push(
        request(`/bookings/${booking.BookingId}/charges`, {
          method: 'GET',
          headers: adminHeaders,
        }).then((res) => ({ type: 'read_folio', status: res.status, data: res.data }))
      );
    }

    // 10 concurrent partial payments (each 400,000 VND)
    for (let i = 0; i < 10; i++) {
      promisesTest2.push(
        request(`/invoices/${createdInvoiceId}/pay`, {
          method: 'POST',
          headers: adminHeaders,
          body: {
            tenders: [{ method: 'Card', amount: 400000, transactionCode: `CRD-DEADLOCK-${i + 1}` }],
            note: `Concurrent partial payment ${i + 1}`,
          },
        }).then((res) => ({ type: 'partial_pay', status: res.status, data: res.data }))
      );
    }

    const resultsTest2 = await Promise.all(promisesTest2);
    const deadlocksTest2 = resultsTest2.filter(
      (r) =>
        r.data?.error?.includes('Deadlock') ||
        r.data?.message?.includes('Deadlock') ||
        r.data?.error?.includes('ER_LOCK_DEADLOCK')
    );

    const invoiceReads200 = resultsTest2.filter((r) => r.type === 'read_invoice' && r.status === 200);
    const folioReads200_2 = resultsTest2.filter((r) => r.type === 'read_folio' && r.status === 200);
    const partialPay200 = resultsTest2.filter((r) => r.type === 'partial_pay' && r.status === 200);
    const partialPay400 = resultsTest2.filter((r) => r.type === 'partial_pay' && r.status === 400);

    console.log(`  Invoice Reads (200 OK):          ${invoiceReads200.length} / 15`);
    console.log(`  Folio Reads (200 OK):            ${folioReads200_2.length} / 15`);
    console.log(`  Partial Payments Accepted:       ${partialPay200.length}`);
    console.log(`  Partial Payments Rejected:       ${partialPay400.length}`);
    console.log(`  Deadlocks detected in Test 2:    ${deadlocksTest2.length} (Expected: 0)`);

    assert.strictEqual(deadlocksTest2.length, 0, 'No deadlock should occur in Test 2');
    assert.strictEqual(invoiceReads200.length, 15, 'All invoice reads must succeed');
    assert.strictEqual(folioReads200_2.length, 15, 'All folio reads must succeed');
    assert.strictEqual(partialPay200.length + partialPay400.length, 10, 'All partial payments processed');

    // Verify DB integrity
    const dbPayments = await Payment.findAll({ where: { InvoiceId: createdInvoiceId } });
    const totalPaid = dbPayments.reduce((s, p) => s + Number(p.Amount || 0), 0);
    const invInDb = await Invoice.findByPk(createdInvoiceId);
    console.log(`  Total Paid in DB:                ${totalPaid.toLocaleString()} VND`);
    console.log(`  Invoice Status:                  ${invInDb.Status}`);
    assert.ok(totalPaid <= Number(invInDb.TotalAmount), 'Total paid must not exceed invoice total amount');

    // 3. Third test: Cross-table locking between Refund and Pay
    console.log('\n--- Test 3: Concurrent Pay and Refund on the same Invoice ---');
    if (dbPayments.length > 0) {
      const targetPayment = dbPayments[0];
      const promisesTest3 = [
        // One tries to pay more
        request(`/invoices/${createdInvoiceId}/pay`, {
          method: 'POST',
          headers: adminHeaders,
          body: {
            tenders: [{ method: 'Cash', amount: 50000, customerCashGiven: 50000 }],
          },
        }),
        // One tries to refund targetPayment
        request(`/payments/${targetPayment.PaymentId}/refund`, {
          method: 'PATCH',
          headers: adminHeaders,
          body: {
            refundReason: 'Stress test simultaneous pay and refund deadlock check',
            refundAmount: 50000,
          },
        }),
      ];

      const resultsTest3 = await Promise.all(promisesTest3);
      const deadlocksTest3 = resultsTest3.filter(
        (r) =>
          r.data?.error?.includes('Deadlock') ||
          r.data?.message?.includes('Deadlock') ||
          r.data?.error?.includes('ER_LOCK_DEADLOCK')
      );
      console.log(`  Deadlocks detected in Test 3:    ${deadlocksTest3.length} (Expected: 0)`);
      assert.strictEqual(deadlocksTest3.length, 0, 'No deadlock between simultaneous pay and refund');
    }

    console.log('\n================================================================================');
    console.log('🎉 DEADLOCK & CONCURRENCY VERIFICATION: 100% PASS (ZERO DEADLOCKS DETECTED)');
    console.log('================================================================================\n');
  } finally {
    await cleanupBooking(booking.BookingId);
  }
}

if (require.main === module) {
  runDeadlockVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Deadlock verification failed:', err);
      process.exit(1);
    });
}

module.exports = { runDeadlockVerification };
