'use strict';
require('dotenv').config();
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'grand_horizon_secret_key_2026_luxury_hotel';
const token = jwt.sign(
  { userId: 1, id: 1, email: 'admin@hoteldomain.vn', roleId: 1, RoleId: 1, role: 'admin' },
  secret,
  { expiresIn: '1d' }
);

async function run() {
  const res = await fetch('http://localhost:5000/api/v1/kitchen-inventory/ingredients', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Kitchen API Status:', res.status);
  console.log('API Success:', data.success);
  console.log('Metrics KPI:', JSON.stringify(data.metrics, null, 2));
  console.log('Total items in list:', data.data?.length);
  if (data.data?.length > 0) {
    data.data.forEach(item => {
      console.log(`[${item.ItemCode}] ${item.ItemName} - SL: ${item.Quantity} ${item.Unit} (Cảnh báo: ${item.StockAlertLevel})`);
    });
  }
}

run().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
