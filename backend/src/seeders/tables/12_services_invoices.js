'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;

  const [categories] = await sequelize.query('SELECT CategoryId FROM ServiceCategories');
  const catIds = categories.map(c => c.CategoryId);

  const [stays] = await sequelize.query('SELECT StayId, BookingId FROM Stays');
  const [users] = await sequelize.query('SELECT UserId FROM Users');
  const userIds = users.map(u => u.UserId);

  // 1. Seed Services
  console.log(`   • Seeding Services (${count.toLocaleString()})...`);
  await seedInChunks('Services', (i) => {
    const catId = catIds.length > 0 ? catIds[(i - 1) % catIds.length] : 1;
    const price = faker.servicePrice(i);

    return {
      CategoryId: catId,
      ServiceName: faker.serviceName(i),
      Price: price,
      Unit: 'Lượt / Gói',
      Description: `Dịch vụ nghỉ dưỡng trải nghiệm đạt chuẩn quốc tế tại Grand Horizon (Mã dịch vụ #${i}).`,
      Status: 'Active',
      ServiceCode: `SVC-${String(i).padStart(6, '0')}`,
      IsDeleted: false,
    };
  }, count, 5000);

  // 2. Seed ServiceOrders
  console.log(`   • Seeding ServiceOrders (${count.toLocaleString()})...`);
  await seedInChunks('ServiceOrders', (i) => {
    const stay = stays.length > 0 ? stays[(i - 1) % stays.length] : { StayId: 1 };
    const price = faker.vndPrice(200000, 2500000);
    const qty = faker.random.int(1, 2);

    return {
      StayId: stay.StayId,
      ServiceId: i,
      CreatedBy: userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1,
      Quantity: qty,
      UnitPrice: price,
      TotalPrice: qty * price,
      OrderDate: faker.dateInPast(30),
      Status: faker.random.weighted({ Completed: 70, Received: 20, Cancelled: 10 }),
      Note: null,
    };
  }, count, 5000);

  // 3. Seed Invoices
  console.log(`   • Seeding Invoices (${count.toLocaleString()})...`);
  await seedInChunks('Invoices', (i) => {
    const stay = stays.length > 0 ? stays[(i - 1) % stays.length] : { StayId: 1, BookingId: 1 };
    const subtotal = faker.vndPrice(2000000, 15000000);
    const vat = Math.round(subtotal * 0.1);
    const total = subtotal + vat;

    return {
      StayId: stay.StayId,
      BookingId: stay.BookingId || 1,
      InvoiceNumber: `INV-2026-${String(i).padStart(7, '0')}`,
      InvoiceDate: faker.dateInPast(90),
      Subtotal: subtotal,
      VATRate: 10.0,
      VATAmount: vat,
      TotalAmount: total,
      Status: faker.random.weighted({ Paid: 80, Unpaid: 15, Cancelled: 5 }),
      PdfPath: `/invoices/2026/INV_${i}.pdf`,
      AssignedTo: userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1,
    };
  }, count, 5000);

  // 4. Seed InvoiceDetails (3 details / invoice)
  const detailTotal = count * 3;
  console.log(`   • Seeding InvoiceDetails (${detailTotal.toLocaleString()})...`);
  const itemTypes = ['RoomCharge', 'FoodAndBeverage', 'SpaAndWellness', 'Minibar', 'LateCheckOut'];

  await seedInChunks('InvoiceDetails', (i) => {
    const invId = Math.floor((i - 1) / 3) + 1;
    const price = faker.vndPrice(250000, 3000000);
    const type = faker.random.arrayElement(itemTypes);

    return {
      InvoiceId: invId,
      ItemType: type,
      ItemId: i,
      Description: `Khoản thanh toán dịch vụ chi tiết: ${type} #${i}`,
      Quantity: 1.0,
      UnitPrice: price,
      TotalPrice: price,
    };
  }, detailTotal, 5000);

  // 5. Seed Payments
  console.log(`   • Seeding Payments (${count.toLocaleString()})...`);
  const methods = ['CreditCard', 'VNPayQR', 'MoMo', 'Cash', 'BankTransfer'];

  await seedInChunks('Payments', (i) => {
    const stay = stays.length > 0 ? stays[(i - 1) % stays.length] : { StayId: 1, BookingId: 1 };
    const amount = faker.vndPrice(1000000, 10000000);

    return {
      InvoiceId: i,
      BookingId: stay.BookingId || 1,
      UserId: userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1,
      Amount: amount,
      PaymentMethod: faker.random.arrayElement(methods),
      PaymentDate: faker.dateInPast(60),
      TransactionCode: `PAY-TXN-${faker.confirmationCode()}-${i}`,
      Status: 'Success',
      RefundReason: null,
      RefundAmount: 0.0,
      GatewayResponse: JSON.stringify({ code: '00', message: 'Success', vnp_TxnRef: `REF_${i}` }),
    };
  }, count, 5000);

  console.log(`   ✅ Services, Orders, Invoices & Payments completed.`);
}

module.exports = { run };
