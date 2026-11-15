import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { getWishlistApi } from '../../api/wishlistApi';

/**
 * MÀN HÌNH 59: QUẢN LÝ DANH SÁCH PHÒNG YÊU THÍCH (GUEST ROOM WISHLIST & SAVED SUITES)
 * Mã tính năng: FEAT-GUEST-13C  |  Mã truy vết: A13 (Wishlist)
 * Module: WSH-059 / SAVED_WISHLIST_SPEC_059
 * Tone màu chủ đạo: Vàng Nâu Sang Trọng (Grand Horizon Warm Gold & Bronze Palette)
 * (#b9a277, #a68e64, #203044, #fedeb2, #725b38, #fbf8f2, #dedad0)
 */

const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

export default function Wishlist() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const {
    wishlist,
    wishlistCount,
    isWishlisted,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist
  } = useWishlist();

  // Bộ lọc sắp xếp (sortOption enum theo đặc tả)
  // DATE_ADDED_NEWEST, DATE_ADDED_OLDEST, PRICE_LOW_TO_HIGH, PRICE_HIGH_TO_LOW
  const [sortOption, setSortOption] = useState('DATE_ADDED_NEWEST');

  // Danh sách chi tiết các phòng đã lưu
  const [roomItems, setRoomItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Danh sách các phòng được tick chọn để xóa (Select to Delete)
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal xác nhận Clear Wishlist
  const [showClearModal, setShowClearModal] = useState(false);

  // Danh sách phòng mẫu gợi ý (khi wishlist trống)
  const fallbackSuggestions = [
    {
      roomTypeId: 1,
      typeName: 'Biệt Thự Vườn Xanh Secluded Forest Villa',
      description: 'Không gian tĩnh lặng giữa rừng thông và vườn nhiệt đới nguyên sơ, hiên gỗ teak hòa mình với thiên nhiên Phú Quốc.',
      basePrice: 4800000,
      area: '115 m²',
      occupancy: '2 người lớn + 1 trẻ em',
      bed: '1 Giường King',
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      badge: 'Gần Gũi Thiên Nhiên'
    },
    {
      roomTypeId: 2,
      typeName: 'Căn Hộ Horizon Plunge Pool Suite',
      description: 'Hồ bơi nước ấm vô cực riêng tại ban công ngắm trọn hoàng hôn Bãi Trường, dịch vụ quản gia cá nhân chu đáo.',
      basePrice: 8500000,
      area: '160 m²',
      occupancy: '3 người lớn (hoặc 2 lớn + 2 bé)',
      bed: '1 California King',
      imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
      badge: 'Lựa Chọn Phổ Biến Nhất'
    },
    {
      roomTypeId: 3,
      typeName: 'Dinh Thự Tổng Thống Presidential Beachfront',
      description: 'Dinh thự sát bờ biển cát trắng với hồ bơi vô cực 45m, phòng sauna riêng biệt và đầu bếp ẩm thực 5 sao phục vụ 24/7.',
      basePrice: 28500000,
      area: '340 m²',
      occupancy: '6 người lớn',
      bed: '2 Master King + 2 Queen',
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      badge: 'Đặc Quyền Thượng Lưu'
    }
  ];

  // Fetch dữ liệu chi tiết các phòng trong Wishlist
  useEffect(() => {
    let isMounted = true;

    async function loadWishlistDetails() {
      if (wishlist.length === 0) {
        if (isMounted) {
          setRoomItems([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const params = {
          sortOption,
          roomTypeIds: wishlist.join(',')
        };
        const res = await getWishlistApi(params, token);

        if (isMounted) {
          const currentWishlistIds = wishlist.map(id => Number(id));
          if (res.success && res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
            // Chỉ giữ lại những phòng thực sự nằm trong wishlist của client
            const validItems = res.data.items.filter(item => currentWishlistIds.includes(Number(item.roomTypeId)));
            setRoomItems(validItems);
          } else {
            // Cứu hộ tự động: nếu API wishlist chưa có dữ liệu, nạp trực tiếp danh sách loại phòng chuẩn
            try {
              const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              let fbRes = await fetch(`${API_BASE}/loai-phong`);
              if (!fbRes.ok) fbRes = await fetch(`${API_BASE}/v1/rooms/types`);
              const fbJson = await fbRes.json();
              const allTypes = Array.isArray(fbJson) ? fbJson : (fbJson.data || []);

              const matched = allTypes
                .filter(rt => currentWishlistIds.includes(Number(rt.RoomTypeId || rt.MaLoaiPhong || rt.id)))
                .map(rt => {
                  let img = rt.ImageUrl || rt.HinhAnh || '';
                  try {
                    const parsed = JSON.parse(img);
                    if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
                  } catch (_) {}
                  return {
                    wishlistId: null,
                    roomTypeId: Number(rt.RoomTypeId || rt.MaLoaiPhong || rt.id),
                    typeName: rt.TypeName || rt.TenLoaiPhong || 'Hạng Phòng Nghỉ Dưỡng',
                    description: rt.Description || rt.MoTa || 'Không gian nghỉ dưỡng sang trọng chuẩn 5 sao với đầy đủ tiện nghi đẳng cấp.',
                    basePrice: Number(rt.BasePrice || rt.GiaCoBan) || 0,
                    adultCapacity: rt.AdultCapacity || 2,
                    imageUrl: img || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
                    amenities: []
                  };
                });

              if (matched.length > 0) {
                setRoomItems(matched);
              } else {
                setRoomItems([]);
              }
            } catch (fbErr) {
              console.warn('Lỗi cứu hộ danh sách phòng:', fbErr);
              setRoomItems([]);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết wishlist:', err);
        setRoomItems([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadWishlistDetails();

    return () => {
      isMounted = false;
    };
  }, [wishlist, sortOption, token]);

  // Sắp xếp dữ liệu hiển thị phía Client để phản hồi tức thì
  const sortedItems = useMemo(() => {
    const list = [...roomItems];
    if (sortOption === 'PRICE_LOW_TO_HIGH') {
      return list.sort((a, b) => a.basePrice - b.basePrice);
    }
    if (sortOption === 'PRICE_HIGH_TO_LOW') {
      return list.sort((a, b) => b.basePrice - a.basePrice);
    }
    if (sortOption === 'DATE_ADDED_OLDEST') {
      return list.sort((a, b) => new Date(a.addedAt || 0) - new Date(b.addedAt || 0));
    }
    // Mặc định: DATE_ADDED_NEWEST
    return list.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
  }, [roomItems, sortOption]);

  // 1. Chọn / Bỏ chọn 1 phòng cụ thể
  const toggleSelectRoom = (roomTypeId) => {
    const id = Number(roomTypeId);
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 2. Chọn tất cả / Bỏ chọn tất cả các phòng hiển thị
  const handleSelectAll = () => {
    if (selectedIds.length === sortedItems.length && sortedItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedItems.map(item => item.roomTypeId));
    }
  };

  // 3. Xóa trực tiếp 1 phòng (Optimistic Update phản hồi tức thì)
  const handleRemoveSingle = async (roomTypeId) => {
    const id = Number(roomTypeId);
    if (isNaN(id) || id <= 0) return;

    // Phản hồi giao diện ngay lập tức
    setRoomItems(prev => prev.filter(item => item.roomTypeId !== id));
    setSelectedIds(prev => prev.filter(selId => selId !== id));

    // Đồng bộ lên Context, LocalStorage và Database
    await removeFromWishlist(id);
  };

  // 4. Xóa tất cả các phòng đã được tick chọn (Select to Delete)
  const handleRemoveSelected = async () => {
    if (selectedIds.length === 0) return;
    const idsToRemove = [...selectedIds];

    // Cập nhật UI ngay lập tức
    setRoomItems(prev => prev.filter(item => !idsToRemove.includes(item.roomTypeId)));
    setSelectedIds([]);

    // Xóa từng phòng trong danh sách đã chọn
    for (const id of idsToRemove) {
      await removeFromWishlist(id);
    }
  };

  // 5. Xử lý khi nhấn nút Clear Wishlist (Xóa toàn bộ)
  const handleConfirmClear = async () => {
    setShowClearModal(false);
    setSelectedIds([]);
    await clearWishlist();
    setRoomItems([]);
  };

  return (
    <div className="min-h-screen bg-[#fbf8f2] text-[#203044] flex flex-col font-sans selection:bg-[#fedeb2] selection:text-[#725b38]">
      {/* Header Grand Horizon chuẩn */}
      <Header 
        wishlistCount={wishlistCount} 
        onWishlistClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
      />

      <main className="flex-1 pt-28 pb-20 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[#8a8782]">
          <Link to="/" className="hover:text-[#b9a277] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-[#b9a277]">home</span>
            Trang Chủ
          </Link>
          <span className="text-[#dedad0]">/</span>
          <Link to="/rooms" className="hover:text-[#b9a277] transition-colors">
            Phòng &amp; Biệt Thự
          </Link>
          <span className="text-[#dedad0]">/</span>
          <span className="text-[#b9a277] font-semibold">Danh Sách Yêu Thích</span>
        </nav>

        {/* Hero Title Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#dedad0] mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#203044] tracking-tight">
              Danh Sách Phòng Yêu Thích
            </h1>
          </div>

          {/* Action bar: Bộ đếm & Các nút thao tác xóa */}
          {wishlistCount > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs text-[#8a8782] font-medium bg-white px-3.5 py-2 rounded-lg border border-[#dedad0] shadow-xs">
                Đang lưu <span className="font-bold text-[#b9a277] text-sm">{wishlistCount}</span> hạng phòng
              </div>

              {/* Nút xóa các phòng đã được tick chọn */}
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleRemoveSelected}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer animate-in fade-in"
                  title={`Xóa ${selectedIds.length} phòng đã chọn khỏi danh sách`}
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  XÓA ĐÃ CHỌN ({selectedIds.length})
                </button>
              )}

              {/* Nút xóa toàn bộ (Clear All) */}
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all cursor-pointer shadow-xs"
                title="Xóa toàn bộ phòng đã lưu"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                XÓA TẤT CẢ
              </button>
            </div>
          )}
        </div>

        {/* Controls Bar: Chọn nhiều phòng & Sắp xếp (sortOption) khi có phòng */}
        {wishlistCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-4 rounded-xl border border-[#dedad0] shadow-xs">
            <div className="flex items-center gap-3">
              {/* Checkbox chọn tất cả */}
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#dedad0] hover:border-[#b9a277] bg-[#fbf8f2] hover:bg-white text-xs font-semibold text-[#203044] transition-all cursor-pointer"
                title={selectedIds.length === sortedItems.length ? "Bỏ chọn tất cả" : "Chọn tất cả các phòng"}
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  selectedIds.length > 0 && selectedIds.length === sortedItems.length
                    ? 'bg-[#b9a277] border-[#b9a277] text-white'
                    : selectedIds.length > 0
                    ? 'bg-[#fedeb2] border-[#b9a277] text-[#725b38]'
                    : 'border-gray-400 bg-white text-transparent'
                }`}>
                  <span className="material-symbols-outlined text-[14px] font-bold">
                    {selectedIds.length > 0 && selectedIds.length === sortedItems.length ? 'check' : selectedIds.length > 0 ? 'remove' : ''}
                  </span>
                </span>
                <span>
                  {selectedIds.length === sortedItems.length && sortedItems.length > 0
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </span>
              </button>

              {/* Thông báo số lượng phòng đang được tick chọn */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#b9a277] bg-[#fedeb2]/30 px-2.5 py-1 rounded-md border border-[#b9a277]/30">
                    Đã chọn {selectedIds.length} phòng
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-xs text-[#8a8782] hover:text-[#203044] underline cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sortOption" className="text-xs text-[#8a8782] whitespace-nowrap">
                Sắp xếp theo:
              </label>
              <select
                id="sortOption"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="text-xs font-semibold bg-[#fbf8f2] text-[#203044] border border-[#dedad0] rounded-lg px-3 py-2 outline-none focus:border-[#b9a277] transition-all cursor-pointer"
              >
                <option value="DATE_ADDED_NEWEST">Mới nhất vừa thêm</option>
                <option value="DATE_ADDED_OLDEST">Cũ nhất trước đây</option>
                <option value="PRICE_LOW_TO_HIGH">Giá: Thấp đến Cao</option>
                <option value="PRICE_HIGH_TO_LOW">Giá: Cao đến Thấp</option>
              </select>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* NỘI DUNG CHÍNH: LƯỚI 3 CỘT (GRID 3 COLUMNS) HOẶC FALLBACK STATE     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#b9a277]/20 border-t-[#b9a277] rounded-full animate-spin mb-4"></div>
            <p className="text-xs text-[#8a8782] tracking-widest uppercase">Đang đồng bộ danh sách phòng yêu thích...</p>
          </div>
        ) : wishlistCount > 0 && sortedItems.length > 0 ? (
          /* GIAO DIỆN LƯỚI 3 CỘT (3-COLUMN GRID) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {sortedItems.map((room) => {
              const isSelected = selectedIds.includes(room.roomTypeId);

              return (
                <div
                  key={room.roomTypeId}
                  className={`group bg-white rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col relative ${
                    isSelected
                      ? 'border-[#b9a277] ring-2 ring-[#b9a277]/60 shadow-md bg-[#fbf8f2]/30'
                      : 'border-[#dedad0] hover:border-[#b9a277] shadow-sm hover:shadow-xl'
                  }`}
                >
                  {/* Khung ảnh, Ô chọn (Checkbox) & Nút Xóa phòng */}
                  <div className="relative h-60 w-full overflow-hidden bg-[#203044]">
                    <img
                      src={room.imageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'}
                      alt={room.typeName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-95 group-hover:opacity-100"
                      loading="lazy"
                    />

                    {/* Vùng chọn Checkbox & Badge Grand Horizon ở góc trên bên trái */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                      {/* Ô Tick Checkbox để chọn phòng này */}
                      <button
                        type="button"
                        onClick={() => toggleSelectRoom(room.roomTypeId)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md backdrop-blur-md cursor-pointer border ${
                          isSelected
                            ? 'bg-[#b9a277] text-white border-[#b9a277] scale-105'
                            : 'bg-white/90 text-transparent border-white/80 hover:bg-white hover:text-gray-400'
                        }`}
                        title={isSelected ? "Bỏ chọn phòng này" : "Chọn phòng này để xóa"}
                        aria-label={`Chọn phòng ${room.typeName}`}
                      >
                        <span className="material-symbols-outlined text-[20px] font-bold">
                          check
                        </span>
                      </button>

                      {/* Badge phân hạng */}
                      <span className="bg-[#203044]/90 backdrop-blur-md text-[#ffd985] text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-full uppercase border border-[#b9a277]/40 shadow-xs">
                        Grand Horizon 5 Sao
                      </span>
                    </div>
                  </div>

                  {/* Nội dung thông tin phòng */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="text-xl font-serif font-bold text-[#203044] group-hover:text-[#b9a277] transition-colors leading-snug line-clamp-1">
                        {room.typeName}
                      </h2>
                      <p className="mt-2 text-xs text-[#8a8782] line-clamp-2 leading-relaxed">
                        {room.description || 'Không gian nghỉ dưỡng sang trọng với tầm nhìn ngoạn mục và các dịch vụ cá nhân hóa chuẩn thượng lưu.'}
                      </p>

                      {/* Tiện ích nổi bật (3 badges) */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#fbf8f2] text-[#725b38] text-[11px] font-medium border border-[#dedad0]">
                          <span className="material-symbols-outlined text-[14px] text-[#b9a277]">aspect_ratio</span>
                          {room.area || '120 m²'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#fbf8f2] text-[#725b38] text-[11px] font-medium border border-[#dedad0]">
                          <span className="material-symbols-outlined text-[14px] text-[#b9a277]">group</span>
                          {room.adultCapacity || 2} Khách
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#fbf8f2] text-[#725b38] text-[11px] font-medium border border-[#dedad0]">
                          <span className="material-symbols-outlined text-[14px] text-[#b9a277]">bed</span>
                          Giường King
                        </span>
                      </div>
                    </div>

                    {/* Giá tiền & Các nút hành động */}
                    <div className="mt-6 pt-4 border-t border-[#dedad0]">
                      <div className="flex items-baseline justify-between mb-4">
                        <span className="text-xs text-[#8a8782] uppercase tracking-wider font-medium">Giá khởi điểm</span>
                        <div className="text-right">
                          <span className="text-xl font-bold text-[#b9a277]">
                            {formatVND(room.basePrice)}
                          </span>
                          <span className="text-xs text-[#8a8782] ml-1">/ đêm</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Link
                          to={`/rooms/${room.roomTypeId}`}
                          className="w-full py-2.5 text-center text-xs font-semibold text-[#203044] bg-[#fbf8f2] hover:bg-[#f5f4ef] border border-[#dedad0] hover:border-[#b9a277] hover:text-[#b9a277] rounded-xl transition-all"
                        >
                          Xem Chi Tiết
                        </Link>
                        <Link
                          to={`/booking?roomTypeId=${room.roomTypeId}`}
                          className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#b9a277] hover:bg-[#a68e64] rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          Đặt Phòng
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════ */
          /* GIAO DIỆN FALLBACK STATE (EMPTY STATE - TC02 TEST SPEC)         */
          /* TONE VÀNG NÂU SANG TRỌNG                                       */
          /* ═══════════════════════════════════════════════════════════════ */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl p-8 sm:p-12 text-center border border-[#dedad0] shadow-sm relative overflow-hidden">
              {/* Trang trí background ánh kim vàng nâu dịu */}
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#fedeb2]/30 blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#b9a277]/15 blur-2xl pointer-events-none"></div>

              {/* Icon Fallback lớn vàng nâu */}
              <div className="w-20 h-20 rounded-2xl bg-[#fbf8f2] border border-[#b9a277]/30 flex items-center justify-center mx-auto mb-6 shadow-xs">
                <span className="material-symbols-outlined text-4xl text-[#b9a277]">
                  bookmark_heart
                </span>
              </div>

              {/* Tiêu đề & Thông điệp Fallback */}
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#203044] mb-3">
                Danh Sách Yêu Thích Của Quý Khách Đang Trống
              </h2>
              <p className="text-sm text-[#8a8782] max-w-md mx-auto mb-8 leading-relaxed">
                Quý khách chưa lưu lại căn phòng hoặc biệt thự nghỉ dưỡng nào. Hãy khám phá bộ sưu tập phòng suite và dinh thự sát biển độc bản của Grand Horizon Phú Quốc để chọn không gian lưu trú tuyệt mỹ cho kỳ nghỉ tới.
              </p>

              {/* Nút hành động Explore CTA màu vàng nâu sang trọng */}
              <Link
                to="/rooms"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white text-sm font-bold tracking-wide transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined text-[20px]">travel_explore</span>
                KHÁM PHÁ BỘ SƯU TẬP HẠNG PHÒNG
              </Link>
            </div>

            {/* Mục gợi ý nhanh khi danh sách trống */}
            <div className="w-full max-w-5xl mt-16">
              <div className="text-center mb-8">
                <span className="text-xs font-semibold text-[#b9a277] uppercase tracking-widest">
                  Gợi Ý Kỳ Nghỉ Trong Mơ
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#203044] mt-1">
                  Các Hạng Biệt Thự &amp; Suite Được Yêu Thích Nhất
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {fallbackSuggestions.map((item) => (
                  <div
                    key={item.roomTypeId}
                    className="bg-white rounded-2xl overflow-hidden border border-[#dedad0] shadow-xs hover:shadow-md hover:border-[#b9a277]/60 transition-all flex flex-col justify-between"
                  >
                    <div className="relative h-44 w-full overflow-hidden bg-[#203044]">
                      <img
                        src={item.imageUrl}
                        alt={item.typeName}
                        className="w-full h-full object-cover opacity-95 hover:opacity-100 transition-opacity"
                      />
                      <span className="absolute top-2.5 left-2.5 bg-[#203044]/90 backdrop-blur-md text-[#fedeb2] border border-[#b9a277]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                        {item.badge}
                      </span>
                      {/* Bấm thêm nhanh vào wishlist */}
                      <button
                        type="button"
                        onClick={() => toggleWishlist(item.roomTypeId)}
                        className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center transition-all ${
                          isWishlisted(item.roomTypeId) ? 'text-rose-500' : 'text-[#8a8782] hover:text-rose-500'
                        }`}
                        title="Thêm vào danh sách yêu thích"
                      >
                        <span className={`material-symbols-outlined text-[18px] ${isWishlisted(item.roomTypeId) ? 'fill-current' : ''}`}>
                          favorite
                        </span>
                      </button>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-base text-[#203044] line-clamp-1">
                          {item.typeName}
                        </h4>
                        <p className="mt-1.5 text-xs text-[#8a8782] line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#dedad0] flex items-center justify-between">
                        <span className="text-sm font-bold text-[#b9a277]">
                          {formatVND(item.basePrice)} <span className="text-xs text-[#8a8782] font-normal">/ đêm</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(item.roomTypeId)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                            isWishlisted(item.roomTypeId)
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : 'bg-[#fbf8f2] text-[#725b38] border-[#dedad0] hover:bg-[#b9a277] hover:text-white hover:border-[#b9a277]'
                          }`}
                        >
                          {isWishlisted(item.roomTypeId) ? 'Đã Lưu' : '+ Lưu Phòng'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Xác Nhận Xóa Toàn Bộ (Clear Wishlist) */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#dedad0] animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-2xl">delete_sweep</span>
            </div>
            <h3 className="text-lg font-serif font-bold text-center text-[#203044] mb-2">
              Xác Nhận Xóa Toàn Bộ Danh Sách?
            </h3>
            <p className="text-xs text-[#8a8782] text-center mb-6 leading-relaxed">
              Tất cả các hạng phòng bạn đã lưu sẽ được gỡ bỏ khỏi danh sách yêu thích và chuyển về trạng thái trống. Bạn có thể thêm lại bất cứ lúc nào khi khám phá các phòng nghỉ.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-[#373435] bg-[#fbf8f2] hover:bg-[#f5f4ef] rounded-xl border border-[#dedad0] transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Grand Horizon */}
      <Footer />
    </div>
  );
}
