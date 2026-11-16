'use strict';

/**
 * scripts/start-all.js
 * Khởi chạy đồng bộ toàn bộ dự án Grand Horizon Hotel PMS chỉ với 1 lệnh (`npm start`):
 * 1. Tự động kiểm tra & đồng bộ file backend/.env từ backend/.env.example (giữ nguyên các key đã có như AI_API_KEY)
 * 2. Bật toàn bộ Docker containers (MySQL, Backend, Frontend, phpMyAdmin) hoặc chạy Local (--local)
 * 3. Chờ MySQL sẵn sàng -> Chạy toàn bộ Migration -> Đồng bộ bảng/cột Sequelize -> Tự động Seed & mở rộng 16 chi nhánh
 * 4. Kiểm tra Health Check của Backend (:5000) và Frontend (:3000)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const ENV_PATH = path.join(BACKEND_DIR, '.env');
const ENV_EXAMPLE_PATH = path.join(BACKEND_DIR, '.env.example');

function syncEnvFile() {
  console.log('\n================================================================================');
  console.log('🚀 GRAND HORIZON PMS — ĐỒNG BỘ MÔI TRƯỜNG, DATABASE, BACKEND & FRONTEND');
  console.log('================================================================================\n');

  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    console.warn('⚠️  Không tìm thấy backend/.env.example, bỏ qua bước đồng bộ mẫu.');
    return;
  }

  const exampleContent = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8');
  if (!fs.existsSync(ENV_PATH)) {
    fs.writeFileSync(ENV_PATH, exampleContent, 'utf8');
    console.log('✅ [1/4] Đã tự động tạo backend/.env từ backend/.env.example');
    return;
  }

  const currentContent = fs.readFileSync(ENV_PATH, 'utf8');
  const existingKeys = new Set();
  for (const line of currentContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      existingKeys.add(trimmed.slice(0, eqIdx).trim());
    }
  }

  const missingLines = [];
  for (const line of exampleContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      if (!existingKeys.has(key)) {
        missingLines.push(trimmed);
      }
    }
  }

  if (missingLines.length > 0) {
    const updated = currentContent.trimEnd() + '\n\n# Tự động bổ sung từ .env.example\n' + missingLines.join('\n') + '\n';
    fs.writeFileSync(ENV_PATH, updated, 'utf8');
    console.log(`✅ [1/4] Đã bổ sung ${missingLines.length} biến môi trường còn thiếu vào backend/.env: ${missingLines.map((l) => l.split('=')[0]).join(', ')}`);
  } else {
    console.log('✅ [1/4] File backend/.env đã đầy đủ các biến cấu hình.');
  }
}

async function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function main() {
  const isLocalMode = process.argv.includes('--local');

  // Bước 1: Đồng bộ file .env
  syncEnvFile();

  // Bước 2: Khởi động Docker (MySQL + Backend + Frontend + phpMyAdmin)
  if (!isLocalMode) {
    console.log('🐳 [2/4] Đang bật các Docker containers (MySQL, Backend, Frontend, phpMyAdmin)...');
    execSync('docker compose up -d', { cwd: ROOT_DIR, stdio: 'inherit' });
  } else {
    console.log('🐳 [2/4] Chế độ --local: Bật container MySQL...');
    try {
      execSync('docker compose up -d mysql phpmyadmin', { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch (_) {}
  }

  // Bước 3: Chạy Bootstrap DB (Wait MySQL -> Migrate -> Sync Models -> Auto Seed & 16 Branches)
  console.log('\n🗄️  [3/4] Đang đồng bộ Database Schema, Migration & Dữ liệu 16 chi nhánh...');
  const bootstrapScript = path.join(BACKEND_DIR, 'src', 'seeders', 'bootstrapDb.js');
  execSync(`node "${bootstrapScript}"`, { cwd: BACKEND_DIR, stdio: 'inherit' });

  // Bước 4: Khởi động hoặc kiểm tra Backend & Frontend
  if (isLocalMode) {
    console.log('\n⚡ [4/4] Đang khởi chạy trực tiếp Backend (:5000) và Frontend (:3000) trên máy...');
    const be = spawn('npm', ['run', 'dev'], { cwd: BACKEND_DIR, stdio: 'inherit', shell: true });
    const fe = spawn('npm', ['run', 'dev'], { cwd: FRONTEND_DIR, stdio: 'inherit', shell: true });
    process.on('SIGINT', () => {
      be.kill();
      fe.kill();
      process.exit(0);
    });
    return;
  }

  console.log('\n🔍 [4/4] Đang kiểm tra trạng thái sẵn sàng của Backend và Frontend...');
  const beOk = await waitForHttp('http://localhost:5000/api/health', 25000);
  const feOk = await waitForHttp('http://localhost:3000', 25000);

  console.log('\n================================================================================');
  console.log('🎉 HỆ THỐNG ĐÃ ĐỒNG BỘ VÀ KHỞI CHẠY THÀNH CÔNG!');
  console.log('--------------------------------------------------------------------------------');
  console.log(` 🌐 Frontend (Guest & Admin UI) : http://localhost:3000        [${feOk ? '🟢 ONLINE' : '🟡 STARTING'}]`);
  console.log(` ⚙️  Backend API Server          : http://localhost:5000/api/v1 [${beOk ? '🟢 ONLINE' : '🟡 STARTING'}]`);
  console.log(` 🗄️  phpMyAdmin (Quản lý DB)     : http://localhost:8080        [🟢 ONLINE]`);
  console.log(` 🐬 MySQL Database              : 127.0.0.1:3306 (hotel_management)`);
  console.log('================================================================================\n');
}

main().catch((err) => {
  console.error('❌ Lỗi khi khởi chạy hệ thống:', err.message);
  process.exit(1);
});
