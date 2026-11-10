'use strict';

/**
 * Sinh dữ liệu tiếng Việt realistic cho khách sạn 5 sao Grand Horizon
 */
const faker = {
  random: {
    int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    float: (min, max, dec = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dec)),
    arrayElement: (arr) => arr[Math.floor(Math.random() * arr.length)],
    weighted: (weights) => {
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (const [value, weight] of Object.entries(weights)) {
        if ((r -= weight) < 0) return value;
      }
      return Object.keys(weights)[0];
    },
    bool: (prob = 0.5) => Math.random() < prob,
  },
};

// ============ VIETNAMESE NAMES ============
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const TEN_DEM_NAM = ['Văn', 'Hữu', 'Đức', 'Quang', 'Minh', 'Thanh', 'Hoàng', 'Anh', 'Bảo', 'Công'];
const TEN_NAM = ['An', 'Bình', 'Cường', 'Dũng', 'Hưng', 'Khoa', 'Long', 'Mạnh', 'Phong', 'Quân', 'Sơn', 'Tùng', 'Việt'];
const TEN_DEM_NU = ['Thị', 'Ngọc', 'Thuỷ', 'Hồng', 'Kim', 'Phương', 'Trúc', 'Bích'];
const TEN_NU = ['Anh', 'Bình', 'Châu', 'Dung', 'Hà', 'Hương', 'Lan', 'Linh', 'Mai', 'Phương', 'Thảo', 'Trang', 'Uyên'];

function fullName() {
  const isMale = Math.random() < 0.55;
  const ho = faker.random.arrayElement(HO);
  const tendem = isMale ? faker.random.arrayElement(TEN_DEM_NAM) : faker.random.arrayElement(TEN_DEM_NU);
  const ten = isMale ? faker.random.arrayElement(TEN_NAM) : faker.random.arrayElement(TEN_NU);
  return `${ho} ${tendem} ${ten}`;
}

// ============ EMAIL & PHONE ============
function email(seed, roleName = 'user') {
  return `${roleName}_${seed}@hoteldomain.vn`;
}

function phone() {
  const prefix = faker.random.arrayElement(['090', '091', '093', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039']);
  let body = '';
  for (let i = 0; i < 8; i++) body += faker.random.int(0, 9);
  return `${prefix}${body}`;
}

function idNumber() {
  let s = '';
  for (let i = 0; i < 12; i++) s += faker.random.int(0, 9);
  return s;
}

// ============ MONEY (VND) ============
function vndPrice(min, max) {
  const raw = Math.random() * (max - min) + min;
  return Math.round(raw / 1000) * 1000;
}

// ============ DATES ============
function dateInPast(maxDaysAgo = 365) {
  const d = new Date();
  d.setDate(d.getDate() - faker.random.int(0, maxDaysAgo));
  return d;
}

function dateInFuture(maxDaysAhead = 365) {
  const d = new Date();
  d.setDate(d.getDate() + faker.random.int(1, maxDaysAhead));
  return d;
}

function dateBetween(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ============ BOOKING SPECIFIC ============
function nights() {
  return Number(faker.random.weighted({
    1: 30, 2: 35, 3: 15, 4: 8, 5: 5, 6: 3, 7: 2,
    8: 0.5, 9: 0.3, 10: 0.2, 14: 0.5, 30: 0.5
  }));
}

function adults() {
  return Number(faker.random.weighted({ 1: 15, 2: 60, 3: 15, 4: 8, 5: 1, 6: 0.5, 8: 0.5 }));
}

function children() {
  return Number(faker.random.weighted({ 0: 70, 1: 18, 2: 10, 3: 1.5, 4: 0.5 }));
}

function bookingStatus() {
  return faker.random.weighted({
    'Pending': 5, 'Confirmed': 25, 'CheckedIn': 45, 'CheckedOut': 15, 'Completed': 5, 'Cancelled': 5
  });
}

function bookingSource() {
  return faker.random.weighted({
    'DirectWeb': 50, 'OTA.Agoda': 15, 'OTA.Booking': 12, 'OTA.Traveloka': 10, 'Phone': 5, 'WalkIn': 5, 'Email': 3
  });
}

function confirmationCode() {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[faker.random.int(0, chars.length - 1)];
  return `GH${s}`;
}

// ============ ROOM TYPES / ROOMS ============
const ROOM_TYPE_TEMPLATES = [
  { name: 'Deluxe Ocean View', basePrice: 2500000, capacity: 2 },
  { name: 'Premier Suite', basePrice: 4500000, capacity: 3 },
  { name: 'Royal Villa', basePrice: 12000000, capacity: 4 },
  { name: 'Garden Bungalow', basePrice: 3200000, capacity: 2 },
  { name: 'Family Suite', basePrice: 5500000, capacity: 5 },
  { name: 'Presidential Penthouse', basePrice: 25000000, capacity: 6 },
  { name: 'Spa Suite', basePrice: 3800000, capacity: 2 },
  { name: 'Beachfront Villa', basePrice: 15000000, capacity: 4 },
  { name: 'Sky Room', basePrice: 1800000, capacity: 2 },
  { name: 'Honeymoon Suite', basePrice: 4800000, capacity: 2 },
];

function roomTypeName(idx) {
  const t = ROOM_TYPE_TEMPLATES[idx % ROOM_TYPE_TEMPLATES.length];
  return `${t.name} #${idx}`;
}

function roomTypeBasePrice(idx) {
  const t = ROOM_TYPE_TEMPLATES[idx % ROOM_TYPE_TEMPLATES.length];
  const multiplier = 0.85 + (Math.random() * 0.3);
  return Math.round((t.basePrice * multiplier) / 1000) * 1000;
}

function roomNumber(branchId, floor, numOnFloor) {
  return `${branchId}${String(floor).padStart(2, '0')}${String(numOnFloor).padStart(2, '0')}`;
}

// ============ FOOD / MENU ============
const DISH_TEMPLATES = [
  'Phở bò Wagyu', 'Bún chả Hà Nội', 'Cơm tấm sườn bê', 'Bánh xèo', 'Gỏi cuốn tôm thịt',
  'Cá Tuyết hấp xì dầu', 'Bò Wagyu A5 nướng than', 'Tôm hùm Alaska nướng bơ tỏi',
  'Cua Hoàng đế hấp bia', 'Sò điệp áp chảo', 'Bào ngư sốt nấm truffle',
  'Salad cá hồi Na Uy', 'Súp bào ngư vi cá', 'Chè hạt sen long nhãn',
  'Bánh flan caramel', 'Tiramisu Ý', 'Trà sen vàng', 'Cà phê sữa đá',
  'Rượu vang Chile 2018', 'Bia Tiger thùng', 'Nước ép cam tươi',
];

function dishName(idx) {
  const t = DISH_TEMPLATES[idx % DISH_TEMPLATES.length];
  return `${t} - Biến thể #${idx}`;
}

function dishPrice(min = 80000, max = 5000000) {
  return Math.round((Math.random() * (max - min) + min) / 1000) * 1000;
}

// ============ SERVICES ============
const SERVICE_TEMPLATES = [
  { name: 'Massage toàn thân 60 phút', price: 850000 },
  { name: 'Massage chân 30 phút', price: 350000 },
  { name: 'Spa đá nóng 90 phút', price: 1500000 },
  { name: 'Giặt ủi áo sơ mi', price: 80000 },
  { name: 'Giặt ủi vest', price: 150000 },
  { name: 'Đưa đón sân bay VIP', price: 1200000 },
  { name: 'Thuê xe máy 1 ngày', price: 200000 },
  { name: 'Yoga buổi sáng', price: 300000 },
  { name: 'Tour tham quan đảo', price: 2500000 },
  { name: 'Dịch vụ phòng 24/7', price: 0 },
];

function serviceName(idx) {
  const t = SERVICE_TEMPLATES[idx % SERVICE_TEMPLATES.length];
  return `${t.name} (gói ${idx})`;
}

function servicePrice(idx) {
  const t = SERVICE_TEMPLATES[idx % SERVICE_TEMPLATES.length];
  return t.price + faker.random.int(-50000, 50000);
}

// ============ REVIEWS ============
const REVIEW_TITLES = [
  'Trải nghiệm tuyệt vời', 'Khách sạn xứng đáng 5 sao', 'Dịch vụ chuyên nghiệp',
  'Phòng đẹp, view tuyệt', 'Nhân viên thân thiện', 'Buffet sáng đa dạng',
  'Spa rất thoải mái', 'Sẽ quay lại lần sau', 'View biển cực đẹp',
  'Hồ bơi tuyệt vời', 'Đáng tiền', 'Hoàn hảo cho kỳ nghỉ gia đình',
  'Phòng sạch sẽ', 'Đồ ăn ngon', 'Dịch vụ concierge xuất sắc',
  'Check-in nhanh', 'Nhà hàng phong phú', 'Yên tĩnh, thư giãn',
];

function reviewTitle() {
  return faker.random.arrayElement(REVIEW_TITLES) + ' #' + faker.random.int(1, 10000);
}

const REVIEW_BODY = [
  'Tôi vừa có một kỳ nghỉ tuyệt vời tại Grand Horizon. Phòng rộng rãi, sạch sẽ, view biển tuyệt đẹp. Nhân viên phục vụ nhiệt tình, chu đáo. Buffet sáng rất phong phú với nhiều món Á - Âu. Đặc biệt là hồ bơi vô cực nhìn ra biển rất ấn tượng. Sẽ quay lại vào mùa hè sau.',
  'Khách sạn đạt chuẩn 5 sao quốc tế. Check-in nhanh, phòng đẹp, giường rất êm. Spa services thật sự thư giãn. Giá hơi cao nhưng xứng đáng với chất lượng.',
  'Tôi đã ở đây 4 đêm cùng gia đình. Phòng Family Suite rất rộng, có view nhìn ra hồ bơi và biển. Con tôi rất thích buffet trẻ em. Dịch vụ phòng 24/7 phục vụ nhanh và chu đáo.',
  'Đây là lần thứ 3 tôi quay lại Grand Horizon. Mỗi lần đều có trải nghiệm mới mẻ. Đội ngũ staff nhớ tên tôi - rất cảm động! Sẽ giới thiệu bạn bè.',
  'Phòng Deluxe view biển rất đẹp, ánh sáng tự nhiên. Wifi tốc độ cao. Nhà hàng Sen phục vụ món Việt Nam chuẩn vị. Nhân viên lễ tân nói tiếng Anh lưu loát.',
];

function reviewBody() {
  return faker.random.arrayElement(REVIEW_BODY);
}

module.exports = {
  random: faker.random,
  ...faker.random,
  fullName,
  email,
  phone,
  idNumber,
  vndPrice,
  dateInPast,
  dateInFuture,
  dateBetween,
  nights,
  adults,
  children,
  bookingStatus,
  bookingSource,
  confirmationCode,
  roomTypeName,
  roomTypeBasePrice,
  roomNumber,
  dishName,
  dishPrice,
  serviceName,
  servicePrice,
  reviewTitle,
  reviewBody,
};
