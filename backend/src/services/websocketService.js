let WebSocket = null;
try {
  WebSocket = require('ws');
} catch (_) {
  WebSocket = null;
}

let wss = null;

// Initialize WebSocket Server attached to HTTP Server
function initWebSocket(server) {
  if (!WebSocket) {
    console.warn('⚠️ ws package is not installed. WebSocket support disabled.');
    return null;
  }
  try {
    wss = new WebSocket.Server({ server, path: '/ws/fnb-orders' });
  } catch (err) {
    console.warn('⚠️ Could not init WebSocket server:', err.message);
    return null;
  }

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'SUBSCRIBE' && data.foodOrderId) {
          ws.subscribedOrderId = data.foodOrderId;
          ws.send(JSON.stringify({
            type: 'SUBSCRIBED',
            foodOrderId: data.foodOrderId,
            message: `Đã kết nối theo dõi đơn #${data.foodOrderId}`
          }));
        }
      } catch (err) {
        // Ignore malformed messages
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err.message);
    });
  });

  // Heartbeat ping interval
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

  console.log('WebSocket server initialized on /ws/fnb-orders');
  return wss;
}

// Broadcast order status change to connected clients
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
      // If client specifically subscribed to this order or subscribed to all
      if (!client.subscribedOrderId || client.subscribedOrderId === order.FoodOrderId) {
        client.send(payload);
      }
    }
  });
}

module.exports = {
  initWebSocket,
  broadcastOrderStatus
};
