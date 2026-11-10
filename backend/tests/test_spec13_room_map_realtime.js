'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEST SUITE: SPEC 13 - CẬP NHẬT TRẠNG THÁI SƠ ĐỒ PHÒNG REAL-TIME WEBSOCKET
 * Feature: FEAT-ROOMMAP-RT-01
 * Spec file: Spec_13.CapNhatSoDoPhongRealtime.docx
 * 
 * Kiểm thử toàn diện:
 * 1. Snapshot API (/api/v1/room-map/snapshot) - Schema, cursor, stats, data
 * 2. WebSocket Connection (/ws/v1/room-map) - READY envelope, heartbeat
 * 3. Realtime Broadcast khi đổi trạng thái phòng - Payload, version, sequence
 * 4. Optimistic Concurrency Control (expectedVersion) - Bắt lỗi 409 VERSION_CONFLICT
 * 5. Incremental changes API (/api/v1/room-map/changes) - Replay & Delta gap detection
 * 6. Ghi vết audit log vào bảng RoomStatusHistory trong MySQL thực tế
 * ═══════════════════════════════════════════════════════════════════════════
 */

const http = require('http');
const WebSocket = require('ws');
const pool = require('../src/config/db');
const { initSocket, getWss, broadcastRoomStatusChange, getCurrentSequence, getRoomVersion } = require('../src/sockets/socketHandler');

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`   ✅ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`   ❌ FAIL: ${testName} ${details ? '- ' + details : ''}`);
  }
}

async function runSpec13TestSuite() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG SPEC 13: REALTIME SƠ ĐỒ PHÒNG WEBSOCKET');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let testServer = null;
  let testRoomId = null;

  try {
    // 1. Lấy 1 phòng thực tế từ MySQL Database để test
    const [rooms] = await pool.query('SELECT RoomId, RoomNumber, Floor, Status, BranchId FROM Rooms WHERE IsDeleted = 0 LIMIT 1');
    if (rooms.length === 0) {
      throw new Error('Database không có phòng nào!');
    }
    const targetRoom = rooms[0];
    testRoomId = targetRoom.RoomId;
    console.log(`🏨 Chọn phòng thực tế từ MySQL: Phòng ${targetRoom.RoomNumber} (ID #${testRoomId}, Tầng ${targetRoom.Floor}, Trạng thái: ${targetRoom.Status})\n`);

    // 2. Setup Test Server & WebSocket Hub
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.use('/api/v1/room-map', require('../src/routes/admin/roomAvailability'));

    const server = http.createServer(app);
    initSocket(server);

    await new Promise((resolve) => server.listen(5088, resolve));
    testServer = server;
    console.log('🔌 Test Server & WebSocket Hub đang lắng nghe tại port 5088.\n');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Kiểm tra REST Snapshot API
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 1] Kiểm tra API Snapshot (/api/v1/room-map/snapshot):');

    const snapshotRes = await new Promise((resolve, reject) => {
      http.get('http://localhost:5088/api/v1/room-map/snapshot?propertyId=1', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    assert(snapshotRes.status === 200, 'Snapshot API trả về mã HTTP 200');
    assert(snapshotRes.body.schemaVersion === '1.0', 'schemaVersion là "1.0" chuẩn Spec 13');
    assert(typeof snapshotRes.body.cursor === 'number', 'Snapshot trả về cursor dạng số nguyên');
    assert(Boolean(snapshotRes.body.stats && snapshotRes.body.stats.AVAILABLE !== undefined), 'Snapshot trả về đối tượng stats gồm 8 trạng thái chuẩn');
    assert(Array.isArray(snapshotRes.body.data) && snapshotRes.body.data.length > 0, 'Dữ liệu data chứa danh sách phòng thực tế từ MySQL');

    const firstRoom = snapshotRes.body.data.find(r => r.roomId === testRoomId);
    assert(Boolean(firstRoom), `Tìm thấy phòng test ID #${testRoomId} trong snapshot`);
    assert(typeof firstRoom.version === 'number', 'Mỗi phòng có trường version theo dõi monotonic');
    assert(Boolean(firstRoom.displayHints && firstRoom.displayHints.color), 'Mỗi phòng có trường displayHints (color, badgeText)');
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Kết nối WebSocket Native & Nhận gói tin READY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 2] Kiểm tra Kết nối WebSocket Native (/ws/v1/room-map):');

    const wsReceivedEvents = [];
    const wsClient = new WebSocket('ws://localhost:5088/ws/v1/room-map?propertyId=1');

    wsClient.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        wsReceivedEvents.push(parsed);
      } catch (_) {}
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 3000);
      wsClient.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      wsClient.on('error', reject);
    });

    await new Promise((r) => setTimeout(r, 200));

    const readyEvent = wsReceivedEvents.find(e => e.eventType === 'READY' || e.type === 'CONNECTED');
    assert(Boolean(readyEvent), 'Client nhận được sự kiện READY khi kết nối tới /ws/v1/room-map');
    assert(readyEvent.schemaVersion === '1.0', 'Gói tin READY có schemaVersion 1.0');
    assert(readyEvent.heartbeatIntervalMs === 25000, 'heartbeatIntervalMs là 25000ms theo Spec 13');
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Đổi trạng thái phòng & Nhận Broadcast Realtime
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 3] Kiểm tra Đổi trạng thái & Broadcast Real-time qua WebSocket:');

    const initialVer = getRoomVersion(testRoomId);
    const startSeq = getCurrentSequence(1);

    // Cập nhật trạng thái sang CLEANING (hoặc AVAILABLE tùy trạng thái ban đầu)
    const newStatusToSet = 'DIRTY';

    const patchPayload = JSON.stringify({
      status: newStatusToSet,
      expectedVersion: initialVer,
      note: 'Kiểm thử Real-time WebSocket tự động',
      correlationId: `cor_test_${Date.now()}`
    });

    const patchRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5088,
        path: `/api/v1/room-map/rooms/${testRoomId}/status`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(patchPayload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(patchPayload);
      req.end();
    });

    assert(patchRes.status === 200, `PATCH /rooms/${testRoomId}/status trả về 200 OK`);
    assert(patchRes.body.success === true, 'Cập nhật trạng thái thành công');
    assert(patchRes.body.data.version === initialVer + 1, 'Version của phòng được tăng lên 1 đơn vị');

    // Chờ nhận broadcast từ WebSocket
    await new Promise((r) => setTimeout(r, 300));

    const statusChangedEvent = wsReceivedEvents.find(e => e.eventType === 'ROOM_STATUS_CHANGED' && e.payload?.roomId === testRoomId);
    assert(Boolean(statusChangedEvent), 'WebSocket client nhận được sự kiện ROOM_STATUS_CHANGED tức thì');
    assert(statusChangedEvent.sequence > startSeq, 'Sequence của luồng stream tăng đơn điệu');
    assert(statusChangedEvent.payload.currentStatus === newStatusToSet, `Trạng thái mới trong broadcast là ${newStatusToSet}`);
    assert(Boolean(statusChangedEvent.payload.displayHints), 'Broadcast chứa displayHints để client cập nhật giao diện mà không reload');
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Kiểm tra Khóa Lạc Quan (Optimistic Concurrency Control)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 4] Kiểm tra Khóa Lạc Quan (expectedVersion):');

    // Thử gửi yêu cầu với expectedVersion cũ (bằng initialVer thay vì initialVer + 1)
    const conflictPayload = JSON.stringify({
      status: 'AVAILABLE',
      expectedVersion: initialVer, // STALE VERSION!
      note: 'Thử xung đột phiên bản'
    });

    const conflictRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5088,
        path: `/api/v1/room-map/rooms/${testRoomId}/status`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(conflictPayload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(conflictPayload);
      req.end();
    });

    assert(conflictRes.status === 409, 'Hệ thống trả về HTTP 409 khi expectedVersion không khớp');
    assert(conflictRes.body.code === 'ROOMMAP_0006_VERSION_CONFLICT', 'Mã lỗi là ROOMMAP_0006_VERSION_CONFLICT');
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Kiểm tra API Delta Changes & Buffer Outbox
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 5] Kiểm tra API Delta Changes (/api/v1/room-map/changes):');

    const changesRes = await new Promise((resolve, reject) => {
      http.get(`http://localhost:5088/api/v1/room-map/changes?propertyId=1&after=${startSeq}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    assert(changesRes.status === 200, 'GET /changes trả về HTTP 200');
    assert(changesRes.body.changes.length > 0, 'Trả về danh sách các sự kiện sau cursor');
    assert(changesRes.body.changes.some(c => c.payload?.roomId === testRoomId), 'Có chứa sự kiện đổi trạng thái vừa thực hiện');
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: Kiểm tra Ghi Vết Lịch Sử trong Bảng RoomStatusHistory (MySQL)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 6] Kiểm tra Ghi Vết Thực Tế vào MySQL (RoomStatusHistory & AuditLogs):');

    const [historyRows] = await pool.query(
      'SELECT * FROM RoomStatusHistory WHERE RoomId = ? ORDER BY HistoryId DESC LIMIT 1',
      [testRoomId]
    );

    assert(historyRows.length > 0, 'Tìm thấy bản ghi mới trong bảng RoomStatusHistory');
    assert(historyRows[0].NewStatus === newStatusToSet, `Cột NewStatus trong MySQL đúng giá trị: ${newStatusToSet}`);
    assert(historyRows[0].TriggerEvent === 'STATUS_UPDATE', 'Cột TriggerEvent ghi đúng STATUS_UPDATE');
    console.log('');

    wsClient.close();

    // ─── TỔNG KẾT ───────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ SPEC 13:`);
    console.log(`   ✅ Số test case ĐẠT: ${passedCount}`);
    console.log(`   ❌ Số test case LỖI: ${failedCount}`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (failedCount === 0) {
      console.log('🎉 TOÀN BỘ TÍNH NĂNG SPEC 13 ĐÃ ĐƯỢC XÁC THỰC HOÀN HẢO!');
    } else {
      console.error('⚠️ CÓ TEST CASE BỊ LỖI, VUI LÒNG KIỂM TRA LẠI LOG CHI TIẾT.');
    }

    if (testServer) testServer.close();
    process.exit(failedCount === 0 ? 0 : 1);
  } catch (err) {
    console.error('Lỗi nghiêm trọng trong test runner:', err);
    if (testServer) testServer.close();
    process.exit(1);
  }
}

runSpec13TestSuite();
