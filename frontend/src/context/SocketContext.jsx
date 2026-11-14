import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const SocketContext = createContext(null);

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws/rooms';

export const SocketProvider = ({ children, url = DEFAULT_WS_URL }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const listenersRef = useRef(new Map()); // Map<eventType, Set<callback>>
  const isUnmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;

    // Dọn dẹp kết nối cũ nếu có (gỡ onclose để tránh kích hoạt sự kiện lặp)
    if (socketRef.current) {
      try {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        socketRef.current.onopen = null;
        socketRef.current.close(1000, 'Reconnecting');
      } catch (_) {}
      socketRef.current = null;
    }

    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close(1000, 'Unmounted');
          return;
        }
        console.log(`⚡ [SocketContext] Đã kết nối WebSocket tới: ${url}`);
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (isUnmountedRef.current) return;
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
        if (!isUnmountedRef.current) {
          console.warn('⚠️ [SocketContext] Lỗi kết nối WebSocket:', err);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        if (isUnmountedRef.current) return;

        // Nếu đóng có chủ ý (1000) thì không reconnect tự động
        if (event && event.code === 1000) return;

        console.log('🔌 [SocketContext] WebSocket đóng kết nối. Sẽ thử kết nối lại sau 3s...');
        // Tự động thử kết nối lại sau 3 giây
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) {
            connect();
          }
        }, 3000);
      };
    } catch (err) {
      if (!isUnmountedRef.current) {
        console.warn('⚠️ [SocketContext] Không thể tạo WebSocket:', err.message);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) {
            connect();
          }
        }, 5000);
      }
    }
  }, [url]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        socketRef.current.onopen = null;
        socketRef.current.close(1000, 'Component unmounted');
        socketRef.current = null;
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
