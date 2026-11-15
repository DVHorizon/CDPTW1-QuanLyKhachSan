async function test() {
  const base = 'http://localhost:5000/api/v1/rooms/search';

  console.log('=== TEST CASE 01: Ngày quá khứ ===');
  let res = await fetch(`${base}?checkInDate=2020-01-01&checkOutDate=2020-01-03`);
  let json = await res.json();
  console.log('Status:', res.status);
  console.log('Payload:', json);

  console.log('\n=== TEST CASE 02: Cùng ngày ===');
  res = await fetch(`${base}?checkInDate=2026-10-25&checkOutDate=2026-10-25`);
  json = await res.json();
  console.log('Status:', res.status);
  console.log('Payload:', json);

  console.log('\n=== TEST CASE 03: Quá 30 đêm ===');
  res = await fetch(`${base}?checkInDate=2026-11-01&checkOutDate=2026-12-06`);
  json = await res.json();
  console.log('Status:', res.status);
  console.log('Payload:', json);

  console.log('\n=== TEST CASE: Keyword quá 100 ký tự ===');
  const longKw = 'a'.repeat(101);
  res = await fetch(`${base}?checkInDate=2026-11-01&checkOutDate=2026-11-03&keyword=${longKw}`);
  json = await res.json();
  console.log('Status:', res.status);
  console.log('Payload:', json);

  console.log('\n=== TEST CASE 05: Tìm kiếm hợp lệ với từ khóa "Deluxe" ===');
  res = await fetch(`${base}?checkInDate=2026-11-15&checkOutDate=2026-11-18&keyword=Deluxe`);
  json = await res.json();
  console.log('Status:', res.status, 'Total found:', json.total);
  console.log('SearchEngine Metadata:', json.searchEngine);
  if (json.data && json.data.length > 0) {
    console.log('First 2 matched rooms:');
    json.data.slice(0, 2).forEach(r => {
      console.log(` - [${r.RoomTypeId}] ${r.TypeName} (${r.Category}) | Giá: ${r.BasePrice.toLocaleString('vi-VN')}đ | Trống: ${r.AvailableRooms} phòng | Score: ${r.searchScore}`);
    });
  }

  console.log('\n=== TEST CASE 04: Không có phòng trống phù hợp ===');
  res = await fetch(`${base}?checkInDate=2026-11-15&checkOutDate=2026-11-18&keyword=KhongTonTaiGiaSuX999`);
  json = await res.json();
  console.log('Status:', res.status);
  console.log('ErrorCode:', json.errorCode);
  console.log('Message:', json.message);
  console.log('Data count:', json.data.length);

  console.log('\n=== TEST CASE: Tìm theo chi nhánh Phú Quốc (branchId=1) ===');
  res = await fetch(`${base}?branchId=1&checkInDate=2026-11-15&checkOutDate=2026-11-18&totalGuests=2`);
  json = await res.json();
  console.log('Status:', res.status, 'Total rooms at Phú Quốc:', json.total);
  if (json.data && json.data.length > 0) {
    json.data.slice(0, 3).forEach(r => {
      console.log(` - ${r.TypeName} | Giá: ${r.BasePrice.toLocaleString('vi-VN')}đ/đêm | Tổng (${r.NumberOfNights} đêm): ${r.TotalPrice.toLocaleString('vi-VN')}đ | Trống: ${r.AvailableRooms} phòng`);
    });
  }

  console.log('\n=== TEST CASE: Kiểm tra trừ phòng trùng lịch (Overlap check) ===');
  // Ngày 2026-10-15 đến 2026-10-18 có Booking 1 đang active cho RoomType 1
  res = await fetch(`${base}?branchId=1&checkInDate=2026-10-15&checkOutDate=2026-10-18&totalGuests=2`);
  json = await res.json();
  const room1 = json.data.find(r => r.RoomTypeId === 1);
  if (room1) {
    console.log(` - ${room1.TypeName}: Tổng phòng 3, Có booking trùng lịch 1 phòng => Còn khả dụng: ${room1.AvailableRooms} phòng (Chỉ còn ${room1.AvailableRooms} phòng)`);
  }

  console.log('\n=== TEST CASE: Thử nghiệm Search Engine với nhiều từ khóa & tiếng Việt không dấu ===');
  const testKws = ['Villa', 'biển', 'bien', 'jacuzzi', 'hồ bơi', 'ho boi', 'buffet'];
  for (const kw of testKws) {
    const sRes = await fetch(`${base}?branchId=1&checkInDate=2026-11-15&checkOutDate=2026-11-18&totalGuests=2&keyword=${encodeURIComponent(kw)}`);
    const sJson = await sRes.json();
    console.log(` - Từ khóa "${kw}": tìm thấy ${sJson.total} phòng -> [${sJson.data.map(r => r.TypeName).join(', ')}]`);
  }
}

test().catch(console.error);
