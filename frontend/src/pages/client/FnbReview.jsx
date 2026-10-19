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
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  // Form State theo SPEC FEAT-FNB-10
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('Bữa tiệc tối tuyệt vời vượt kỳ vọng! Miếng Bò Wagyu A5 nướng than mọng nước, thơm lừng mùi khói gỗ kết hợp cùng sốt nấm truffle đậm đà xuất sắc. Cá tuyết giữ được độ tươi giòn hiếm có, sốt bơ chanh đặc trưng Phú Quốc rất sảng khoái. Đặc biệt, rượu vang được phục vụ chuẩn nhiệt độ khiến bữa tối trọn vẹn từng khoảnh khắc dưới làn gió biển Phú Quốc dịu êm.');
  
  // Tiêu chí chi tiết (thang điểm 10)
  const [foodQualityScore, setFoodQualityScore] = useState(10);
  const [platingScore, setPlatingScore] = useState(9.5);
  const [serviceSpeedScore, setServiceSpeedScore] = useState(9.0);
  const [staffAttitudeScore, setStaffAttitudeScore] = useState(10);
  const [ambianceScore, setAmbianceScore] = useState(9.5);

  // Đánh giá từng món ăn
  const [dishRatings, setDishRatings] = useState({});

  // Tuyên dương nhân viên
  const [commendHeadChef, setCommendHeadChef] = useState(true);
  const [commendSommelier, setCommendSommelier] = useState(true);

  // Ẩn danh
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Ảnh đính kèm
  const [attachedPhotos, setAttachedPhotos] = useState([
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCam3wQ5MdgcT2zrwQBPep44HxAtVUzB-fxIhtkt5ZrP7IjoomPwC5qyM1MhxwdxM4JBzs3-z-QESTbcUfC_O4_b6UZM_tljIctSQwUvNT0ehHBUcTJQGYzuOOBIKt-7sWxo3wh-RFB8L0Rc5MPpWnXx9FN5Gz9KklDQD1DR9MGtdwhanD1_hKuGNsV6O_6ip-dWPsLPYsJg11LRz3V72QrbuOnXdotBLM65y8Qv7tYEDluX7-Sy7sx',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB8t81H8KKKHsYKwgnRGlg2PfGilMdrk9jo6QImd2_u2wfG_maE_MVPA_FV3Bi06EBDecVK5b8AfY5d7RHv1fZVJ07fsDlEOjXscI0ks9x8m1FZwW7R3aD98_LdnZaJZbjlKiYnKen4loute_R_y5jz52x3TLu3b12X1OqLnpHQPq2OXxS43lkkI6TjflmMycvdMW-TxKqM9Hc8I4SZPaLwJ4SCzBhAyJukUz3BMFeaFlAQBuH3SUoq',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB_7O_4EhV_6kgQAeFxOBRUQx2U3vmOUpyadtpsklyM5QSY0Umg6l2IkIZPqk3zXaunsYbM38zqiud-OYgOeqoFXwjpr72ydVRO-LJx8Uwpj9KU9geFY3-s4XzeSpDwODXRGD6HwQUVvSXMa_CPRYzpk42LcxvpOL16gQg3gMQoWJTttC4O6oWkFUaiD07rTXhtROaDB9ml6i3PHqCDDw2cfayhkDIuRey2EaMLthFJwJ0cpvvjpWCr'
  ]);

  // Trạng thái xử lý gửi
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [reviewResult, setReviewResult] = useState(null);

  // 1. Tải danh sách đơn đã phục vụ của khách
  useEffect(() => {
    const fetchOrders = async () => {
      try {
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
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          // Ưu tiên đơn Served, nếu chưa có thì lấy tất cả đơn để khách có thể đánh giá trải nghiệm
          const served = json.data.filter(o => o.status === 'Served');
          const availableOrders = served.length > 0 ? served : json.data;
          setServedOrders(availableOrders);

          if (paramOrderId) {
            const target = availableOrders.find(o => String(o.foodOrderId) === String(paramOrderId));
            if (target) {
              setSelectedOrderId(target.foodOrderId);
              setCurrentOrder(target);
            } else {
              setSelectedOrderId(availableOrders[0].foodOrderId);
              setCurrentOrder(availableOrders[0]);
            }
          } else {
            setSelectedOrderId(availableOrders[0].foodOrderId);
            setCurrentOrder(availableOrders[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load guest served orders:', err);
      }
    };

    fetchOrders();
  }, [paramOrderId, user]);

  // Khi người dùng đổi đơn
  const handleSelectOrder = (orderId) => {
    setSelectedOrderId(orderId);
    const found = servedOrders.find(o => o.foodOrderId === orderId);
    if (found) {
      setCurrentOrder(found);
      setErrorMessage('');
      setSuccessMessage('');
      setReviewResult(null);
    }
  };

  // Đổi số sao món ăn
  const handleDishRatingChange = (menuItemId, stars) => {
    setDishRatings(prev => ({ ...prev, [menuItemId]: stars }));
  };

  // Gửi đánh giá lên API (POST /api/v1/fnb-orders/{orderId}/reviews)
  const handleSubmitReview = async () => {
    setErrorMessage('');
    setSuccessMessage('');

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
      setErrorMessage('Nhận xét không được vượt quá 2000 ký tự');
      return;
    }

    if (!selectedOrderId) {
      setErrorMessage('Vui lòng chọn đơn cần đánh giá.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('hotel_token');
      if (!token) {
        setErrorMessage('Bạn cần đăng nhập để thực hiện chức năng này');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        rating: Number(rating),
        comment: comment.trim(),
        cleanlinessScore: Math.round(foodQualityScore),
        staffServiceScore: Math.round(staffAttitudeScore),
        roomComfortScore: Math.round(serviceSpeedScore),
        diningScore: Math.round(platingScore),
        valueForMoneyScore: Math.round(ambianceScore),
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
        // Xử lý các mã lỗi SPEC
        if (data.code === 'ERROR_0007_DUPLICATE') {
          setErrorMessage('Đơn này đã được đánh giá.');
        } else if (data.code === 'ERROR_0009_UNAUTHENTICATED') {
          setErrorMessage('Bạn cần đăng nhập để thực hiện chức năng này');
        } else if (data.code === 'ERROR_0010_FORBIDDEN') {
          setErrorMessage('Bạn không có quyền thực hiện chức năng này');
        } else {
          setErrorMessage(data.message || 'Không thể gửi đánh giá.');
        }
      } else {
        setSuccessMessage('Thêm mới đánh giá thành công');
        setReviewResult(data.data);
      }
    } catch (err) {
      console.error('Submit review error:', err);
      setErrorMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mock dishes nếu đơn trống hoặc chưa có chi tiết
  const displayItems = currentOrder?.items && currentOrder.items.length > 0 ? currentOrder.items : [
    {
      menuItemId: 1,
      itemName: 'Bò Bít Tết Wagyu A5 Sốt Nấm Truffle',
      category: 'Món Chính Chữ Ký',
      note: 'Bếp trưởng Arnaud điều phối • Binchotan nướng xém cạnh vừa vặn',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAiyugBQBg8_OUutY8ByNjF64d8Vby07-yn7xcYHSb3PW6b0pVAsWbhj75zrz4TNK6e2Eq4_NQ_mdYGEbvQ1bcHL0Date-ki8QBwkE6_GZ9HiunA8GrvBf5gkdDZ6tJRD_KNF1TiXn6725UeR95Dr9uQPAtHce7CPH8ynt4JAexDbZEDYVRr9AteYQ7_FwJn0N-6uPbpQv96ygQRhbXVCCbxYBjsCWV8x5Ysqd6LwWy9_I5tx-4r4DJ'
    },
    {
      menuItemId: 2,
      itemName: 'Cá Tuyết Áp Chảo Bơ Chanh Phú Quốc',
      category: 'Đặc Sản Biển Cao Cấp',
      note: 'Chanh ranh bản địa • Da cá giòn hoàn hảo mọng nước',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDis-6ZKv2GQxMZUx9OKhAuByirHQM5tx1lT6bWrpixCf2qZmKSb-b50hB7Flg7FUazsvk8yBnPJX6C82oJPiNA9htFV3SQrV5nLA5WARYTePYMJfCZoObRO4YU6IXZEYZq0Lbmidg7et-7u8vZThlsHO9_MUgLUvkIG5UyHw80o0_TBXpDNORYUNYFBu2TVdvJRibNCI_pgxS976OUIDevIqGAP3Orz3xvkmA5_acFKbKBsKDLhsw4'
    },
    {
      menuItemId: 3,
      itemName: 'Tráng Miệng Kem Yuzu Mascarpone Quenelle',
      category: 'Nghệ Thuật Tráng Miệng',
      note: 'Vị thanh nhẹ cân bằng hậu vị hoàn mỹ',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDu-UkJKTKDhxSP9W3oE9UmJVIbMT0EOPBFCeHK8hLX7A487QhBSx96Z-jJWzunGh4oh4-EsRmJssrQK_zDj0kmX6I-wgImurtYbd1mMeIQFtB2WdXktqIibxGLWH0MnSQJFrfGm3SWTRBKfSCJXlVVFIbOd-o2q1Gogz2Uqy309HMekQ4WmcQcQ_9aLBXvw-sNFUEvrT97amiQNSscBNbd2mbAPVf5N4LfPbdOPJVNR8E4PUreC2Ht'
    }
  ];

  return (
    <div className="bg-[#f4fbf4] min-h-screen text-slate-800 font-sans antialiased">
      <GuestSidebar />

      <div className="pl-72">
        <GuestHeader />

        <main className="relative pt-24 px-8 pb-12 w-full max-w-[1600px] mx-auto">
          {/* Header Banner - Sunset Beachfront Luxury Resort Atmosphere */}
          <div className="relative w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-white">
            <div
              className="relative h-64 sm:h-72 lg:h-80 w-full bg-cover bg-center"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAXQJ2Gk5mN833eR3fyboRoo2wCUhJG4L9GsDPSMe1NCyP9y67hq0rz-HzbzQdFpmTIiqPyEPJAT5boYjk-_Fhlkl9naPRsQogH81hT7lKocBr4nqaOpNWD4d5iNmWI1FdUHgSh1LkM8CfkbjvxV5Y-XGGN-ASf9Bq80Pf9bEymYV0qpNMHdzja73KsnAcuR6xNkhk8CrZKkoAmqZwEc9GlPa9zAY-OSkysmTionvS5FWIDGuLRMXKO')`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent flex flex-col justify-end p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-col gap-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider">
                        Trải Nghiệm Thượng Lưu
                      </span>
                      <span className="text-white/70 text-xs">•</span>
                      <span className="text-white/90 text-xs font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-emerald-300">room_service</span>
                        Đơn F&B #{selectedOrderId || 'Chưa chọn đơn'}
                      </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Đánh Giá Trải Nghiệm Ẩm Thực
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      Cảm ơn Quý khách đã lựa chọn tiệc ẩm thực tại Grand Horizon. Mọi phản hồi sâu sắc từ Quý khách là kim chỉ nam để chúng tôi không ngừng hoàn thiện nghệ thuật phục vụ chuẩn 5 sao.
                    </p>
                  </div>

                  {/* Đặc quyền hội viên */}
                  <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-3 rounded-xl text-white shadow-sm border border-white/20">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                      <span className="material-symbols-outlined text-[24px]">stars</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Đặc quyền hội viên</span>
                      <span className="text-sm font-bold text-white">+200 Điểm Horizon Club</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Thông tin đơn phục vụ & Menu selector */}
            <div className="bg-emerald-50/70 border-t border-emerald-100 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 text-xs text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">receipt_long</span>
                  <span className="text-slate-500 font-semibold">Chọn đơn đánh giá:</span>
                  <select
                    value={selectedOrderId || ''}
                    onChange={(e) => handleSelectOrder(Number(e.target.value))}
                    className="bg-white border border-emerald-300 rounded-lg px-3 py-1 font-bold text-emerald-800 text-xs shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {servedOrders.length === 0 ? (
                      <option value="">Không có đơn Served nào</option>
                    ) : (
                      servedOrders.map(o => (
                        <option key={o.foodOrderId} value={o.foodOrderId}>
                          Đơn #{o.foodOrderId} • {o.roomNumber || 'Phòng 804'} • {o.totalAmount?.toLocaleString('vi-VN')} đ {o.hasReviewed ? '(Đã đánh giá)' : '(Chờ đánh giá)'}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">restaurant</span>
                  <span className="text-slate-400">Địa điểm:</span>
                  <span className="font-semibold text-slate-800">Horizon Grill &amp; Lounge</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">schedule</span>
                  <span className="text-slate-400">Thời gian:</span>
                  <span className="font-semibold text-slate-800">
                    {currentOrder?.orderTime ? new Date(currentOrder.orderTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay, 20:42'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Trạng Thái: {currentOrder?.status === 'Served' ? 'Đã Phục Vụ (Served)' : 'Sẵn Sàng Đánh Giá'}
                </span>
              </div>
            </div>
          </div>

          {/* Lưới nội dung 12 cột */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Cột Trái: Đánh Giá Chung, Tiêu Chí & Nhận Xét (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">

              {/* CARD 1: ĐÁNH GIÁ CHUNG BỮA TIỆC (RATING 1-5 SAO) */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Đánh Giá Chung Bữa Tiệc</span>
                    <h2 className="text-lg font-bold text-slate-800 mt-0.5">Thang Điểm Tổng Thể (FEAT-FNB-10)</h2>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>{rating} / 5 - {rating === 5 ? 'Tuyệt Vời' : rating === 4 ? 'Hài Lòng' : rating === 3 ? 'Bình Thường' : rating === 2 ? 'Chưa Hài Lòng' : 'Rất Kém'}</span>
                  </div>
                </div>

                {/* Chọn số sao tương tác */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-emerald-50/50 rounded-xl border border-emerald-100 gap-4">
                  <div className="flex items-center gap-1" id="starContainer">
                    {[1, 2, 3, 4, 5].map((starNum) => (
                      <button
                        key={starNum}
                        type="button"
                        onClick={() => setRating(starNum)}
                        className="hover:scale-110 transition-transform focus:outline-none p-1 cursor-pointer"
                        title={`${starNum} sao`}
                      >
                        <span
                          className={`material-symbols-outlined text-[38px] ${
                            starNum <= rating ? 'text-amber-400' : 'text-slate-300'
                          }`}
                          style={{ fontVariationSettings: starNum <= rating ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="text-center sm:text-right">
                    <span className="text-4xl font-extrabold text-emerald-800 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {rating}.0
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block mt-0.5">
                      {rating >= 4 ? 'HOÀN HẢO THEO CHUẨN BOUTIQUE' : 'CẦN CẢI THIỆN CHẤT LƯỢNG'}
                    </span>
                  </div>
                </div>

                {/* 5 Tiêu chí chi tiết (Thang điểm 10) */}
                <div className="flex flex-col gap-4 pt-1">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                    Tiêu Chí Đánh Giá Chi Tiết (Thang điểm 10)
                  </span>

                  {/* Tiêu chí 1 */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-700 text-[18px]">skillet</span>
                        <span className="font-bold text-slate-800">Chất lượng &amp; Hương vị món ăn</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-700 font-mono">{foodQualityScore.toFixed(1)} / 10</span>
                        <span className="text-slate-400 text-[11px] hidden sm:inline">(Cực kỳ xuất sắc)</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={foodQualityScore}
                      onChange={(e) => setFoodQualityScore(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Tiêu chí 2 */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-700 text-[18px]">palette</span>
                        <span className="font-bold text-slate-800">Nghệ thuật trình bày món</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-700 font-mono">{platingScore.toFixed(1)} / 10</span>
                        <span className="text-slate-400 text-[11px] hidden sm:inline">(Tinh tế chuẩn Michelin)</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={platingScore}
                      onChange={(e) => setPlatingScore(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Tiêu chí 3 */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-700 text-[18px]">pace</span>
                        <span className="font-bold text-slate-800">Tốc độ phục vụ &amp; Nhịp ra món</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-700 font-mono">{serviceSpeedScore.toFixed(1)} / 10</span>
                        <span className="text-slate-400 text-[11px] hidden sm:inline">(Đúng thời điểm)</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={serviceSpeedScore}
                      onChange={(e) => setServiceSpeedScore(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Tiêu chí 4 */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-700 text-[18px]">diversity_1</span>
                        <span className="font-bold text-slate-800">Thái độ &amp; Tác phong nhân viên</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-700 font-mono">{staffAttitudeScore.toFixed(1)} / 10</span>
                        <span className="text-slate-400 text-[11px] hidden sm:inline">(Ân cần, chu đáo 5 sao)</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={staffAttitudeScore}
                      onChange={(e) => setStaffAttitudeScore(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Tiêu chí 5 */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-700 text-[18px]">music_note</span>
                        <span className="font-bold text-slate-800">Không gian &amp; Âm nhạc</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-700 font-mono">{ambianceScore.toFixed(1)} / 10</span>
                        <span className="text-slate-400 text-[11px] hidden sm:inline">(Nhạc jazz dịu mát)</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={ambianceScore}
                      onChange={(e) => setAmbianceScore(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: ĐÁNH GIÁ CHI TIẾT TỪNG MÓN ĂN DÙNG TẠI BÀN */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Món Thực Tế Dùng Tại Bàn</span>
                    <h2 className="text-lg font-bold text-slate-800 mt-0.5">
                      Hài Lòng Từng Món Ăn ({displayItems.length} Món)
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">Ghi nhận từ POS Bếp chính</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {displayItems.map((item, idx) => {
                    const dishStar = dishRatings[item.menuItemId || idx] || 5;
                    return (
                      <div
                        key={item.menuItemId || idx}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150'}
                            alt={item.itemName}
                            className="w-16 h-16 rounded-xl object-cover shadow-sm shrink-0 border border-slate-200/60"
                          />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                              {item.category || 'Món Chính Chữ Ký'}
                            </span>
                            <span className="text-sm font-bold text-slate-800 line-clamp-1">
                              {item.quantity ? `${item.quantity}x ` : '1x '}
                              {item.itemName}
                            </span>
                            <span className="text-xs text-slate-400 line-clamp-1">
                              {item.note || 'Bếp trưởng Arnaud điều phối • Binchotan nướng xém cạnh'}
                            </span>
                          </div>
                        </div>

                        {/* Star Rating per item */}
                        <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200/70 shadow-sm self-end sm:self-center">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleDishRatingChange(item.menuItemId || idx, s)}
                              className="focus:outline-none p-0.5 cursor-pointer"
                            >
                              <span
                                className={`material-symbols-outlined text-[18px] ${
                                  s <= dishStar ? 'text-amber-400' : 'text-slate-300'
                                }`}
                                style={{ fontVariationSettings: s <= dishStar ? "'FILL' 1" : "'FILL' 0" }}
                              >
                                star
                              </span>
                            </button>
                          ))}
                          <span className="text-xs font-bold font-mono text-slate-700 ml-1">{dishStar}/5</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CARD 3: NHẬN XÉT CỦA QUÝ KHÁCH (COMMENT TỐI ĐA 2000 KÝ TỰ) */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Ghi Chú Thưởng Thức Chi Tiết</span>
                    <h2 className="text-lg font-bold text-slate-800 mt-0.5">Nhận Xét Của Quý Khách</h2>
                  </div>
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>Đang soạn thảo
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Chia sẻ thêm cảm nhận về các cung bậc vị giác hoặc điểm phục vụ ấn tượng..."
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none leading-relaxed"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">sentiment_very_satisfied</span>
                    <span>Phản hồi tích cực nổi bật sẽ được lưu vào hồ sơ ẩm thực VIP cá nhân.</span>
                  </div>
                  <span className={`font-mono text-xs ${comment.length > 2000 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                    {comment.length} / 2000 ký tự
                  </span>
                </div>
              </div>

            </div>

            {/* Cột Phải: Ảnh Đính Kèm, Tuyên Dương & Nút Gửi (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">

              {/* KHỐI ẢNH THỰC TẾ (3 ẢNH) */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Khoảnh Khắc Bàn Tiệc</span>
                    <h3 className="text-sm font-bold text-slate-800 mt-0.5">Ảnh Thực Tế ({attachedPhotos.length} Ảnh Đã Tải)</h3>
                  </div>
                  <button
                    type="button"
                    title="Thêm ảnh"
                    onClick={() => {
                      const newUrl = prompt('Nhập đường dẫn ảnh ẩm thực thực tế (URL):', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500');
                      if (newUrl && newUrl.trim()) {
                        setAttachedPhotos(prev => [...prev.slice(0, 4), newUrl.trim()]);
                      }
                    }}
                    className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {attachedPhotos.map((photo, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100 shadow-sm border border-slate-200/60">
                      <img
                        src={photo}
                        alt={`Ảnh đánh giá ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-[12px]">done</span>
                      </div>
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400">Đã tối ưu hóa chất lượng HDR cho thư viện ẩm thực resort.</span>
              </div>

              {/* TUYÊN DƯƠNG NHÂN SỰ PHỤC VỤ */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Ghi Nhận Đội Ngũ Dịch Vụ</span>
                  <h3 className="text-sm font-bold text-slate-800 mt-0.5">Tuyên Dương Nhân Sự</h3>
                  <p className="text-xs text-slate-500 mt-1">Lời khen của Quý khách sẽ trực tiếp cộng điểm thi đua tháng cho đội ngũ.</p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/70 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">cooking</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate">Bếp Trưởng Arnaud</span>
                        <span className="text-[11px] text-slate-400 truncate">Executive Chef • Bếp Quốc Tế</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={commendHeadChef}
                      onChange={(e) => setCommendHeadChef(e.target.checked)}
                      className="w-5 h-5 rounded text-emerald-600 focus:ring-0 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/70 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">wine_bar</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate">Nhân Viên Phục Vụ Jean-Luc</span>
                        <span className="text-[11px] text-slate-400 truncate">Head Sommelier &amp; Captain T14</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={commendSommelier}
                      onChange={(e) => setCommendSommelier(e.target.checked)}
                      className="w-5 h-5 rounded text-emerald-600 focus:ring-0 accent-emerald-600 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Đánh giá ẩn danh */}
                <div className="pt-1 border-t border-slate-100">
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-5 h-5 rounded text-emerald-600 focus:ring-0 accent-emerald-600 mt-0.5 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">Đánh giá ẩn danh (Chỉ gửi Ban Quản Lý)</span>
                      <span className="text-[11px] text-slate-400">Tên Quý khách sẽ không hiển thị trên bảng tin ẩm thực chung của khu nghỉ.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* ACTION BOX & NÚT GỬI ĐÁNH GIÁ */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-600 text-[28px]">loyalty</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Tặng Thưởng Điểm VIP</span>
                    <span className="text-[11px] text-slate-500">Cộng ngay 200 điểm thưởng Horizon Club sau khi gửi đánh giá thành công.</span>
                  </div>
                </div>

                {/* Thông báo lỗi nếu có */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] shrink-0 text-red-600">error</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Thông báo thành công */}
                {successMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                      <span className="font-bold">{successMessage}</span>
                    </div>
                    {reviewResult && (
                      <span className="text-[11px] text-slate-600 mt-0.5">
                        Điểm trung bình toàn hệ thống: <strong>{reviewResult.averageRating}★</strong> ({reviewResult.totalReviews} lượt đánh giá)
                      </span>
                    )}
                  </div>
                )}

                {/* Nút gửi đánh giá */}
                <button
                  type="button"
                  disabled={isSubmitting || !!successMessage}
                  onClick={handleSubmitReview}
                  className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang xử lý gửi đánh giá...</span>
                    </>
                  ) : successMessage ? (
                    <>
                      <span className="material-symbols-outlined text-[20px]">task_alt</span>
                      <span>Đã Gửi Thành Công! Cảm Ơn Quý Khách</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">send</span>
                      <span>Gửi Đánh Giá Trải Nghiệm</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/fnb/history')}
                    className="hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    ← Bỏ qua &amp; Đánh giá sau
                  </button>
                  <span>PMS Instant Sync</span>
                </div>
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default FnbReview;
