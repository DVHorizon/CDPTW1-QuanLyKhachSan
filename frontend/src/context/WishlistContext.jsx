'use strict';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  getWishlistApi,
  addToWishlistApi,
  removeFromWishlistApi,
  clearWishlistApi,
  syncWishlistApi
} from '../api/wishlistApi';

const STORAGE_KEY = 'grand_horizon_wishlist';
const SUCCESS_CODE = 'SUCCESS_0010_WISHLIST_UPDATED';
const SUCCESS_MESSAGE = 'Đã cập nhật danh sách phòng yêu thích';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();

  // Danh sách ID các loại phòng đã lưu (mảng số)
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc wishlist từ localStorage:', e);
    }
    return [];
  });

  // State toast thông báo nổi
  const [toast, setToast] = useState({ show: false, message: '', code: '' });
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message = SUCCESS_MESSAGE, code = SUCCESS_CODE) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message, code });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '', code: '' });
    }, 3200);
  }, []);

  const hideToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: false, message: '', code: '' });
  }, []);

  // Lưu vào localStorage khi wishlist thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.warn('Lỗi ghi wishlist vào localStorage:', e);
    }
  }, [wishlist]);

  // Khi người dùng đăng nhập: đồng bộ danh sách LocalStorage với Database
  useEffect(() => {
    let isMounted = true;

    async function syncWithBackend() {
      if (!isAuthenticated) return;

      try {
        const localItems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (Array.isArray(localItems) && localItems.length > 0) {
          await syncWishlistApi(localItems, token);
        }

        const res = await getWishlistApi({}, token);
        if (isMounted && res.success && res.data && Array.isArray(res.data.roomTypeIds)) {
          const remoteIds = res.data.roomTypeIds.map(id => Number(id));
          // Kết hợp danh sách
          const merged = Array.from(new Set([...wishlist, ...remoteIds]));
          setWishlist(merged);
        }
      } catch (err) {
        console.warn('Lỗi đồng bộ wishlist sau đăng nhập:', err);
      }
    }

    syncWithBackend();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, token]);

  // Kiểm tra phòng đã được lưu chưa
  const isWishlisted = useCallback((roomTypeId) => {
    const id = Number(roomTypeId);
    return wishlist.includes(id);
  }, [wishlist]);

  // Thêm phòng vào Wishlist
  const addToWishlist = useCallback(async (roomTypeId) => {
    const id = Number(roomTypeId);
    if (isNaN(id) || id <= 0) return;

    setWishlist(prev => {
      if (prev.includes(id)) return prev;
      return [id, ...prev];
    });

    showToast(SUCCESS_MESSAGE, SUCCESS_CODE);

    if (isAuthenticated) {
      try {
        await addToWishlistApi(id, token);
      } catch (err) {
        console.error('Lỗi gọi API addToWishlist:', err);
      }
    }
  }, [isAuthenticated, token, showToast]);

  // Xóa phòng khỏi Wishlist
  const removeFromWishlist = useCallback(async (roomTypeId) => {
    const id = Number(roomTypeId);
    if (isNaN(id) || id <= 0) return;

    setWishlist(prev => prev.filter(item => item !== id));

    showToast(SUCCESS_MESSAGE, SUCCESS_CODE);

    if (isAuthenticated) {
      try {
        await removeFromWishlistApi(id, token);
      } catch (err) {
        console.error('Lỗi gọi API removeFromWishlist:', err);
      }
    }
  }, [isAuthenticated, token, showToast]);

  // Bật/tắt trạng thái yêu thích (Toggle)
  const toggleWishlist = useCallback(async (roomTypeId) => {
    const id = Number(roomTypeId);
    if (isNaN(id) || id <= 0) return;

    if (wishlist.includes(id)) {
      await removeFromWishlist(id);
    } else {
      await addToWishlist(id);
    }
  }, [wishlist, addToWishlist, removeFromWishlist]);

  // Xóa toàn bộ phòng yêu thích (TC02: Clear Wishlist -> Empty State)
  const clearWishlist = useCallback(async () => {
    setWishlist([]);
    showToast(SUCCESS_MESSAGE, SUCCESS_CODE);

    if (isAuthenticated) {
      try {
        await clearWishlistApi(token);
      } catch (err) {
        console.error('Lỗi gọi API clearWishlist:', err);
      }
    }
  }, [isAuthenticated, token, showToast]);

  const value = {
    wishlist,
    wishlistCount: wishlist.length,
    isWishlisted,
    toggleWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    toast,
    showToast,
    hideToast
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
      {/* Toast Notification toàn cục chuẩn Grand Horizon */}
      {toast.show && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-[#07131e] border border-[#b9a277]/40 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md"
        >
          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0">
            <span className="material-symbols-outlined text-[18px]">favorite</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[#b9a277] font-semibold tracking-wider uppercase">
              Grand Horizon Wishlist
            </span>
            <span className="text-sm text-slate-100 font-medium">
              {toast.message}
            </span>
          </div>
          <button 
            onClick={hideToast}
            className="ml-3 text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Đóng thông báo"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist phải được sử dụng bên trong <WishlistProvider>');
  }
  return context;
};
