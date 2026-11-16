import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import GuestSidebar from '../../components/layout/GuestSidebar';
import GuestHeader from '../../components/layout/GuestHeader';
import { useAuth } from '../../context/AuthContext';

const FnbReview = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const paramOrderId = searchParams.get('orderId');

  // State danh sách đơn đã phục vụ để chọn
  const [servedOrders, setServedOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(paramOrderId ? parseInt(paramOrderId, 10) : null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);

  // Form State theo SPEC FEAT-FNB-10 (Rating 1-5 sao bắt buộc, Comment tối đa 2000 ký tự)
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [dishRatings, setDishRatings] = useState({});
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [attachedPhotos, setAttachedPhotos] = useState([]);

  // Trạng thái xử lý gửi
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [reviewResult, setReviewResult] = useState(null);

  // 1. Tải danh sách đơn đã phục vụ của khách
  const fetchOrders = async () => {
    try {
      setIsLoadingOrder(true);
      const token = localStorage.getItem('hotel_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let uid = user?.userId || user?.id || user?.UserId;
      if (!uid) {
        try {
          const saved = JSON.parse(localStorage.getItem('hotel_user') || '{}');
          uid = saved?.id || saved?.UserId || saved?.userId;
        } catch {}
      }

      // Fetch served orders
      let url = 'http://localhost:5000/api/v1/fnb-orders/history?view=guest';
      if (uid) {
        url += `&userId=${uid}`;
      }

      const res = await fetch(url, { headers });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Chỉ lấy các đơn đã phục vụ (Served) theo đúng quy tắc SPEC FEAT-FNB-10
        const served = json.data.filter(o => o.status === 'Served');
        setServedOrders(served);

        if (served.length > 0) {
          let chosen = null;
          if (paramOrderId) {
            chosen = served.find(o => String(o.foodOrderId) === String(paramOrderId));
          }
          if (!chosen) {
            // Ưu tiên chọn đơn chưa đánh giá trước
            chosen = served.find(o => !o.hasReviewed) || served[0];
          }
          setSelectedOrderId(chosen.foodOrderId);
          setCurrentOrder(chosen);
        } else {
          setSelectedOrderId(null);
          setCurrentOrder(null);
        }
      }
    } catch (err) {
      console.error('Failed to load guest served orders:', err);
      setErrorMessage('Không thể tải lịch sử đơn gọi món.');
    } finally {
      setIsLoadingOrder(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [paramOrderId, user]);

  // Khi người dùng đổi đơn
  const handleSelectOrder = (orderId) => {
    const numId = Number(orderId);
    setSelectedOrderId(numId);
    const found = servedOrders.find(o => o.foodOrderId === numId);
    if (found) {
      setCurrentOrder(found);
      setErrorMessage('');
      setSuccessMessage('');
      setReviewResult(null);
      setDishRatings({});
    }
  };

  // Đổi số sao món ăn và tự động tính điểm sao trung bình của đơn theo đặc tả FEAT-FNB-10
  const handleDishRatingChange = (menuItemId, stars) => {
    setDishRatings(prev => {
      const updated = { ...prev, [menuItemId]: stars };
      const starValues = Object.values(updated);
      if (starValues.length > 0) {
        const avg = starValues.reduce((sum, val) => sum + val, 0) / starValues.length;
        setRating(Math.round(avg));
      }
      return updated;
    });
  };

  // Gửi đánh giá lên API (POST /api/v1/fnb-orders/{orderId}/reviews)
  const handleSubmitReview = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedOrderId) {
      setErrorMessage('Vui lòng chọn đơn món ăn đã phục vụ để đánh giá.');
      return;
    }

    if (currentOrder?.hasReviewed) {
      setErrorMessage('Đơn này đã được đánh giá trước đó.');
      return;
    }

    // TC01: Kiểm tra chọn số sao
    if (rating === undefined || rating === null || rating === '') {
      setErrorMessage('Vui lòng chọn số sao đánh giá.');
      return;
    }

    // TC02: Kiểm tra số sao ngoài 1-5
    if (rating < 1 || rating > 5) {
      setErrorMessage('Số sao đánh giá phải từ 1 đến 5.');
      return;
    }

    // TC03: Kiểm tra nhận xét vượt 2000 ký tự
    if (comment && comment.length > 2000) {
      setErrorMessage('Nhận xét không được vượt quá 2000 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('hotel_token');
      if (!token) {
        setErrorMessage('Bạn cần đăng nhập để thực hiện chức năng này.');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        rating: Number(rating),
        comment: comment.trim(),
        isAnonymous,
        photos: attachedPhotos
      };

      const res = await fetch(`http://localhost:5000/api/v1/fnb-orders/${selectedOrderId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'ERROR_0007_DUPLICATE') {
          setErrorMessage('Đơn này đã được đánh giá.');
        } else if (data.code === 'ERROR_0009_UNAUTHENTICATED') {
          setErrorMessage('Bạn cần đăng nhập để thực hiện chức năng này.');
        } else if (data.code === 'ERROR_0010_FORBIDDEN') {
          setErrorMessage('Bạn không có quyền thực hiện chức năng này.');
        } else {
          setErrorMessage(data.message || 'Không thể gửi đánh giá.');
        }
      } else {
        setSuccessMessage('Thêm mới đánh giá thành công!');
        setReviewResult(data.data);
        // Refresh danh sách đơn
        fetchOrders();
      }
    } catch (err) {
      console.error('Submit review error:', err);
      setErrorMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Danh sách món ăn thực tế của đơn hàng (lấy đúng từ order.details/items)
  const orderItems = currentOrder?.items || [];

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 font-sans antialiased">
      <GuestSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="lg:pl-72 transition-all">
        <GuestHeader onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />

        <main className="relative pt-20 sm:pt-24 px-4 sm:px-8 pb-12 w-full max-w-5xl mx-auto">
          {/* Header Title Bar */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                  Dịch Vụ Ẩm Thực (F&amp;B)
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-slate-500 text-xs font-medium">Đặc Tả FEAT-FNB-10</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Đánh Giá Chất Lượng Món Ăn &amp; Dịch Vụ
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Ghi nhận ý kiến thực tế của Quý khách để không ngừng hoàn thiện trải nghiệm phục vụ.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/fnb/history')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition self-start sm:self-center"
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              Lịch Sử Gọi Món
            </button>
          </div>

          {/* TRƯỜNG HỢP: KHÔNG CÓ ĐƠN NÀO ĐỦ ĐIỀU KIỆN (Chưa có đơn Served) */}
          {!isLoadingOrder && servedOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm flex flex-col items-center max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl">restaurant_menu</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Chưa có đơn món ăn để đánh giá</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Theo quy định nghiệp vụ, Quý khách chỉ có thể gửi đánh giá cho các đơn món ăn ở trạng thái 
                <strong className="text-emerald-700"> Đã phục vụ (Served)</strong>. Hiện chưa có đơn nào sẵn sàng để đánh giá.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/fnb/history')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Xem Lịch Sử Gọi Món
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/fnb/order')}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  + Khám Phá Menu &amp; Đặt Món
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">

              {/* KHỐI 1: CHỌN ĐƠN HÀNG THỰC TẾ & THÔNG TIN ĐƠN */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-[22px]">receipt_long</span>
                    <span className="font-bold text-slate-800 text-sm">Chọn đơn cần đánh giá:</span>
                  </div>

                  <select
                    value={selectedOrderId || ''}
                    onChange={(e) => handleSelectOrder(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 text-xs shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    {servedOrders.map(o => (
                      <option key={o.foodOrderId} value={o.foodOrderId}>
                        Đơn #{o.foodOrderId} • {o.roomNumber ? `Phòng ${o.roomNumber}` : 'Bàn ăn'} • {Number(o.totalAmount || 0).toLocaleString('vi-VN')} đ {o.hasReviewed ? '(Đã đánh giá)' : '(Chờ đánh giá)'}
                      </option>
                    ))}
                  </select>
                </div>

                {currentOrder && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-medium">Thời gian đặt món:</span>
                      <strong className="text-slate-800 font-mono mt-0.5 block">
                        {currentOrder.orderTime ? new Date(currentOrder.orderTime).toLocaleString('vi-VN') : 'Vừa xong'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Vị trí phục vụ:</span>
                      <strong className="text-slate-800 mt-0.5 block">
                        {currentOrder.roomNumber ? `Phòng ${currentOrder.roomNumber}` : 'Nhà hàng ẩm thực'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Trạng thái đơn:</span>
                      <span className="inline-flex items-center gap-1 mt-0.5 text-emerald-700 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {currentOrder.status === 'Served' ? 'Đã phục vụ (Served)' : currentOrder.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* KHỐI 2: CHẤM ĐIỂM SAO CHO TỪNG MÓN ĂN THỰC TẾ TRONG ĐƠN */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Chi Tiết Thực Đơn Dùng Bữa</span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      Đánh Giá Từng Món Ăn Trong Đơn ({orderItems.length} món)
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Trích xuất từ dữ liệu đơn hàng thực tế</span>
                </div>

                {orderItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg">
                    Đơn hàng này không có chi tiết món ăn hoặc món ăn đã được lưu trước đó.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {orderItems.map((item, idx) => {
                      const itemKey = item.menuItemId || idx;
                      const dishStar = dishRatings[itemKey] || rating || 5;
                      return (
                        <div
                          key={itemKey}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150'}
                              alt={item.itemName}
                              className="w-14 h-14 rounded-lg object-cover shadow-xs shrink-0 border border-slate-200 bg-white"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-sm">
                                {item.quantity ? `${item.quantity}x ` : '1x '}
                                {item.itemName}
                              </div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">
                                {Number(item.price || item.unitPrice || 0).toLocaleString('vi-VN')} đ
                              </div>
                            </div>
                          </div>

                          {/* Chấm sao từng món */}
                          <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs self-end sm:self-center">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                type="button"
                                disabled={currentOrder?.hasReviewed}
                                onClick={() => handleDishRatingChange(itemKey, s)}
                                className="focus:outline-none p-0.5 cursor-pointer disabled:cursor-not-allowed"
                                title={`${s} sao`}
                              >
                                <span
                                  className={`material-symbols-outlined text-[20px] ${
                                    s <= dishStar ? 'text-amber-400' : 'text-slate-300'
                                  }`}
                                  style={{ fontVariationSettings: s <= dishStar ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                  star
                                </span>
                              </button>
                            ))}
                            <span className="text-xs font-bold font-mono text-slate-700 ml-1.5">{dishStar}/5</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* KHỐI 3: ĐÁNH GIÁ TỔNG THỂ ĐƠN HÀNG (RATING 1-5 SAO) */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Đánh Giá Chung</span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">Số Sao Đánh Giá Tổng Thể *</h2>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    {rating} / 5 - {rating === 5 ? 'Rất tốt' : rating === 4 ? 'Tốt' : rating === 3 ? 'Bình thường' : rating === 2 ? 'Tệ' : 'Rất tệ'}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-200/80 gap-4">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={currentOrder?.hasReviewed}
                        onClick={() => setRating(s)}
                        className="hover:scale-110 transition-transform focus:outline-none p-1 cursor-pointer disabled:cursor-not-allowed"
                        title={`${s} sao`}
                      >
                        <span
                          className={`material-symbols-outlined text-[36px] ${
                            s <= rating ? 'text-amber-400' : 'text-slate-300'
                          }`}
                          style={{ fontVariationSettings: s <= rating ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="text-center sm:text-right">
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">
                      {rating}.0
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block mt-0.5">
                      {rating >= 4 ? 'Hài lòng dịch vụ' : 'Cần cải thiện chất lượng'}
                    </span>
                  </div>
                </div>
              </div>

              {/* KHỐI 4: NHẬN XÉT CHI TIẾT (COMMENT TỐI ĐA 2000 KÝ TỰ) */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Nội Dung Nhận Xét / Góp Ý</h2>
                  <span className={`text-xs font-mono ${comment.length > 2000 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                    {comment.length} / 2000 ký tự
                  </span>
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={2000}
                  disabled={currentOrder?.hasReviewed}
                  rows={4}
                  placeholder="Quý khách có thể chia sẻ thêm về hương vị món ăn, độ nóng sốt, tốc độ giao món hoặc thái độ phục vụ..."
                  className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                />

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    disabled={currentOrder?.hasReviewed}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span>Đánh giá ẩn danh (không hiển thị họ tên của Quý khách)</span>
                </label>
              </div>

              {/* KHỐI THÔNG BÁO LỖI HOẶC THÀNH CÔNG */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                    <span className="material-symbols-outlined text-[20px] text-emerald-700">check_circle</span>
                    <span>{successMessage}</span>
                  </div>
                  {reviewResult && (
                    <div className="text-slate-600 pl-7 leading-relaxed">
                      Điểm đánh giá của bạn: <strong>{reviewResult.rating}★</strong>. 
                      Điểm trung bình F&B hiện tại: <strong>{reviewResult.averageRating}★</strong> ({reviewResult.totalReviews} lượt đánh giá).
                    </div>
                  )}
                </div>
              )}

              {/* NÚT SUBMIT GỬI ĐÁNH GIÁ */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/fnb/history')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Quay Lại
                </button>

                {currentOrder?.hasReviewed ? (
                  <button
                    type="button"
                    disabled
                    className="px-6 py-2.5 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    Đơn Này Đã Được Đánh Giá
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitReview}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    {isSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá Trải Nghiệm'}
                  </button>
                )}
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default FnbReview;
