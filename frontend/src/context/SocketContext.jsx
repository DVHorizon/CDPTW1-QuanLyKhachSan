import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const SocketContext = createContext(null);

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws/rooms';

export const SocketProvider = ({ children, url = DEFAULT_WS_URL }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const listenersRef = useRef(new Map()); // Map<eventType, Set<callback>>

  const connect = useCallback(() => {
    // Dọn dẹp kết nối cũ nếu có
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (_) {}
    }

    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log(`⚡ [SocketContext] Đã kết nối WebSocket tới: ${url}`);
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastEvent(payload);

          // Phát tới các listener đã đăng ký cho eventType cụ thể
          if (payload.type && listenersRef.current.has(payload.type)) {
            const callbacks = listenersRef.current.get(payload.type);
            callbacks.forEach((cb) => {
              try {
                cb(payload.data, payload);
              } catch (cbErr) {
                console.error(`Lỗi listener [${payload.type}]:`, cbErr);
              }
            });
          }

          // Phát tới wildcard listener '*' nếu có
          if (listenersRef.current.has('*')) {
            const allCallbacks = listenersRef.current.get('*');
            allCallbacks.forEach((cb) => cb(payload));
          }
        } catch (err) {
          // Bỏ qua gói tin không parse được JSON
        }
      };

      ws.onerror = (err) => {
        console.warn('⚠️ [SocketContext] Lỗi kết nối WebSocket:', err);
      };

      ws.onclose = () => {
        console.log('🔌 [SocketContext] WebSocket đóng kết nối. Sẽ thử kết nối lại sau 3s...');
        setIsConnected(false);
        // Tự động thử kết nối lại sau 3 giây
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (err) {
      console.warn('⚠️ [SocketContext] Không thể tạo WebSocket:', err.message);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  // Đăng ký nhận sự kiện cụ thể
  const subscribe = useCallback((eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    const set = listenersRef.current.get(eventType);
    set.add(callback);

    // Trả về hàm unsubscribe để clean-up trong useEffect
    return () => {
      const currentSet = listenersRef.current.get(eventType);
      if (currentSet) {
        currentSet.delete(callback);
        if (currentSet.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  // Gửi thông điệp lên server
  const send = useCallback((message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const value = {
    isConnected,
    lastEvent,
    subscribe,
    send,
    reconnect: connect
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket phải được sử dụng bên trong SocketProvider');
  }
  return context;
};

export default SocketContext;
