'use strict';

let WebSocket = null;
try {
  WebSocket = require('ws');
} catch (_) {
  WebSocket = null;
}

let wss = null;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WEBSOCKET REALTIME HUB
 * Quản lý các kết nối WebSocket tập trung cho toàn bộ ứng dụng:
 * 1. Sơ đồ phòng & Kiểm tra phòng trống Real-time (/ws/rooms hoặc /ws)
 * 2. Khóa phòng tạm thời & Đặt phòng trực tuyến Real-time
 * 3. Đơn món F&B Room Service Real-time (/ws/fnb-orders)
 * ═══════════════════════════════════════════════════════════════════════════
 */

function initSocket(server) {
  if (!WebSocket) {
    console.warn('⚠️ ws package is not installed. WebSocket realtime support disabled.');
    return null;
  }

  try {
    // Khởi tạo WebSocket Server với cơ chế phân phối URL path
    wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      try {
        const urlObj = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
        const pathname = urlObj.pathname;

        // Chấp nhận các path hợp lệ: /ws, /ws/rooms, /ws/tables, /ws/fnb-orders, /ws/v1/fnb-orders, /ws/v1/kitchen-notifications
        if (
          pathname === '/ws' ||
          pathname === '/ws/rooms' ||
          pathname === '/ws/tables' ||
          pathname === '/ws/fnb-orders' ||
          pathname === '/ws/v1/fnb-orders' ||
          pathname === '/ws/v1/kitchen-notifications'
        ) {
          // FEAT-FNB-12: Kiểm tra xác thực token cho /ws/v1/kitchen-notifications nếu có truyền token
          // FEAT-FNB-12: Kiểm tra xác thực token cho /ws/v1/kitchen-notifications
          if (pathname === '/ws/v1/kitchen-notifications') {
            const token = urlObj.searchParams.get('token');
            if (token) {
              const jwt = require('jsonwebtoken');
              const JWT_SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_key_2026_luxury_hotel';
              try {
                const decoded = jwt.verify(token, JWT_SECRET);
                request.user = decoded;
              } catch (jwtErr) {
                // Token lỗi hoặc hết hạn thì bỏ qua, cho phép kết nối ở chế độ Terminal Bếp
                request.user = null;
              }
            }
          }

          wss.handleUpgrade(request, socket, head, (ws) => {
            ws.pathname = pathname;
            ws.user = request.user || null;
            wss.emit('connection', ws, request);
          });
        } else {
          socket.destroy();
        }
      } catch (upgradeErr) {
        console.warn('⚠️ WebSocket upgrade error:', upgradeErr.message);
        socket.destroy();
      }
    });

    wss.on('connection', (ws, req) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });

      const clientPath = ws.pathname || req.url;
      console.log(`🔌 [WebSocket] Client đã kết nối tới: ${clientPath}`);

      // Gửi gói tin chào mừng & xác nhận kết nối
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        path: clientPath,
        timestamp: new Date().toISOString(),
        message: 'Kết nối WebSocket Realtime thành công.'
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          // 1. Client đăng ký theo dõi đơn F&B cụ thể
          if (data.type === 'SUBSCRIBE' && data.foodOrderId) {
            ws.subscribedOrderId = data.foodOrderId;
            ws.send(JSON.stringify({
              type: 'SUBSCRIBED',
              foodOrderId: data.foodOrderId,
              message: `Đã theo dõi đơn F&B #${data.foodOrderId}`
            }));
          }

          // 2. Client ping kiểm tra độ trễ
          if (data.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          }
        } catch (err) {
          // Bỏ qua gói tin không đúng định dạng JSON
        }
      });

      ws.on('error', (err) => {
        console.error('❌ [WebSocket] Client error:', err.message);
      });

      ws.on('close', () => {
        // Client ngắt kết nối
      });
    });

    // Heartbeat ping kiểm tra kết nối định kỳ mỗi 30s
    const pingInterval = setInterval(() => {
      if (!wss) return;
      wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    wss.on('close', () => {
      clearInterval(pingInterval);
    });

    console.log('✅ WebSocket Realtime Hub đã sẵn sàng (/ws, /ws/rooms, /ws/fnb-orders)');
    return wss;
  } catch (err) {
    console.warn('⚠️ Lỗi khởi tạo WebSocket Server:', err.message);
    return null;
  }
}

/**
 * Phát sự kiện liên quan đến Buồng phòng và Đặt phòng (Rooms & Bookings)
 * @param {string} eventType Tên sự kiện: 'ROOM_STATUS_CHANGED' | 'ROOM_LOCKED' | 'ROOM_RELEASED' | 'BOOKING_CREATED'
 * @param {Object} payload Dữ liệu sự kiện
 */
function broadcastRoomEvent(eventType, payload) {
  if (!wss) return;

  const message = JSON.stringify({
    type: eventType,
    data: payload,
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // Gửi cho các client ở /ws/rooms hoặc /ws (hoặc mọi client chung)
      if (!client.pathname || client.pathname === '/ws/rooms' || client.pathname === '/ws') {
        client.send(message);
        sentCount++;
      }
    }
  });

  console.log(`📢 [WebSocket] Broadcast [${eventType}] tới ${sentCount} clients.`);
}

/**
 * Phát sự kiện đơn F&B Room Service (tương thích ngược với hệ thống F&B cũ)
 */
function broadcastOrderStatus(order) {
  if (!wss) return;

  const payload = JSON.stringify({
    type: 'ORDER_STATUS_CHANGED',
    data: {
      foodOrderId: order.FoodOrderId,
      status: order.Status,
      orderTime: order.OrderTime,
      totalAmount: order.TotalAmount,
      roomNumber: order.Stay?.Room?.RoomNumber || 'N/A'
    }
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (!client.pathname || client.pathname === '/ws/fnb-orders' || client.pathname === '/ws/v1/fnb-orders' || client.pathname === '/ws') {
        if (!client.subscribedOrderId || client.subscribedOrderId === order.FoodOrderId) {
          client.send(payload);
        }
      }
    }
  });
}

/**
 * FEAT-FNB-12 (A4.12): Phát sự kiện new_fnb_order khi có đơn đặt món mới gửi tới Bếp
 * @param {Object} orderData Dữ liệu đơn hàng F&B
 */
function broadcastNewKitchenOrder(orderData) {
  if (!wss) return;

  const payload = JSON.stringify({
    event: 'new_fnb_order',
    data: {
      event: 'new_fnb_order',
      foodOrderId: orderData.foodOrderId,
      orderType: orderData.orderType || 'RoomService', // 'RoomService' hoặc 'DineIn'
      location: orderData.location || 'N/A', // Số phòng hoặc số bàn
      orderTime: orderData.orderTime || new Date().toISOString(),
      totalAmount: orderData.totalAmount || 0,
      note: orderData.note || '',
      items: orderData.items || []
    },
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // Gửi cho client kết nối tới /ws/v1/kitchen-notifications, /ws/fnb-orders hoặc /ws
      if (
        !client.pathname ||
        client.pathname === '/ws/v1/kitchen-notifications' ||
        client.pathname === '/ws/fnb-orders' ||
        client.pathname === '/ws'
      ) {
        client.send(payload);
        sentCount++;
      }
    }
  });

  console.log(`📢 [WebSocket] Broadcast new_fnb_order (#${orderData.foodOrderId} - ${orderData.location}) tới ${sentCount} clients.`);
}

/**
 * FEAT-FNB-13 (A4.13): Đồng bộ trạng thái bàn real-time tới tất cả client mở sơ đồ bàn
 * @param {Object} tableData Dữ liệu bàn thay đổi trạng thái
 */
function broadcastTableUpdate(tableData) {
  if (!wss) return;

  const payload = JSON.stringify({
    event: 'table_status_changed',
    type: 'TABLE_STATUS_CHANGED',
    data: tableData,
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      if (
        !client.pathname ||
        client.pathname === '/ws/tables' ||
        client.pathname === '/ws'
      ) {
        client.send(payload);
        sentCount++;
      }
    }
  });

  console.log(`📢 [WebSocket] Broadcast table_status_changed (Table #${tableData.tableId} -> ${tableData.status}) tới ${sentCount} clients.`);
}

function getWss() {
  return wss;
}

module.exports = {
  initSocket,
  broadcastRoomEvent,
  broadcastOrderStatus,
  broadcastNewKitchenOrder,
  broadcastTableUpdate,
  getWss
};

