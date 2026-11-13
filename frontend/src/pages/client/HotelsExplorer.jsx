import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { getBranchesApi } from '../../api/roomApi';

// Format tiền tệ VND
const formatVND = (num) => {
  return Number(num || 0).toLocaleString('vi-VN') + 'đ';
};

export default function HotelsExplorer() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await getBranchesApi();
        if (data && data.length > 0) {
          setBranches(data);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách khách sạn:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  const handleSelectHotel = (branchId) => {
    // Chuyển hướng sang Bước 2: Chọn Loại Phòng của khách sạn đó
    navigate(`/rooms?branchId=${branchId}`);
  };

  return (
    <MainLayout>
      <div className="flex flex-col w-full bg-[#fafaf8] min-h-screen">
        {/* HERO BANNER SECTION */}
        <section className="relative isolate py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#131b2e] overflow-hidden text-center text-white">
          <div
            className="absolute inset-0 bg-cover bg-center -z-20 opacity-30"
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop")'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#131b2e]/90 via-[#131b2e]/70 to-[#fafaf8] -z-10" />

          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#ffd985] text-xs font-semibold uppercase tracking-wider mb-5">
              <span className="material-symbols-outlined text-base">stars</span>
              <span>Bộ Sưu Tập Điểm Đến Nghỉ Dưỡng</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Bộ Sưu Tập Khách Sạn &amp; Khu Nghỉ Dưỡng <br />
              <span className="text-[#ffd985] italic font-normal">Grand Horizon Hotels &amp; Resorts</span>
            </h1>

            <p className="text-white/80 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Quý khách vui lòng chọn điểm đến và khách sạn nghỉ dưỡng mong muốn. Hệ thống sẽ mở ra bộ sưu tập các loại phòng ngủ và biệt thự riêng biệt của khách sạn đó.
            </p>
          </div>
        </section>

        {/* DANH SÁCH KHÁCH SẠN */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full -mt-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131b2e]">
                {branches.length > 0 ? `${branches.length} Thiên Đường Nghỉ Dưỡng Tại Việt Nam` : 'Hệ Thống Nghỉ Dưỡng Thượng Lưu Toàn Quốc'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Tất cả các khu nghỉ dưỡng đều đạt tiêu chuẩn 5 sao quốc tế với bãi biển riêng và ẩm thực thượng hạng.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-xs text-slate-500 uppercase tracking-widest block font-semibold">Tập đoàn Grand Horizon</span>
              <span className="text-sm font-bold text-[#b9a277]">Dịch vụ quản gia 24/7</span>
            </div>
          </div>

          {/* Grid các khách sạn */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {branches.map((branch, index) => (
              <div
                key={branch.BranchId}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-[#dedad0] hover:border-[#b9a277] transition-all duration-300 flex flex-col group"
              >
                {/* Ảnh chính & Badges */}
                <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-100">
                  <img
                    src={branch.ImageUrl || 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop'}
                    alt={branch.BranchName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Huy hiệu số thứ tự */}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#131b2e]/80 backdrop-blur-md text-[#ffd985] text-xs font-bold border border-[#ffd985]/30">
                    Khách sạn #{index + 1}
                  </div>

                  {/* Đánh giá sao */}
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-800 text-xs font-bold shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#f59e0b] text-sm">star</span>
                    <span>{branch.Rating || 5.0}</span>
                    <span className="text-slate-400 font-normal">({branch.TotalReviews || 180} đánh giá)</span>
                  </div>

                  {/* Tên khách sạn và vị trí trên ảnh */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-1.5 text-xs text-[#ffd985] font-semibold uppercase tracking-wider mb-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span>{branch.City || 'Việt Nam'}</span>
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold leading-snug drop-shadow-sm">
                      {branch.BranchName}
                    </h3>
                  </div>
                </div>

                {/* Nội dung thông tin chi tiết */}
                <div className="p-6 flex flex-col justify-between flex-1">
                  <div>
                    {/* Địa chỉ & Hotline */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="material-symbols-outlined text-sm text-[#b9a277]">pin_drop</span>
                        <span className="truncate">{branch.Address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="material-symbols-outlined text-sm text-[#b9a277]">call</span>
                        <span>{branch.Phone || '1900 6868'}</span>
                      </div>
                    </div>

                    {/* Điểm nhấn / Highlight */}
                    <p className="text-slate-600 text-sm mt-4 leading-relaxed line-clamp-2">
                      {branch.Highlight || 'Trải nghiệm kỳ nghỉ xa hoa tại khu nghỉ dưỡng ven biển hàng đầu với kiến trúc sang trọng, hồ bơi vô cực và bãi biển riêng biệt.'}
                    </p>

                    {/* Tags tiện ích */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="px-2.5 py-1 rounded-md bg-[#fafaf8] border border-[#dedad0] text-xs font-medium text-slate-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-[#b9a277]">beach_access</span>
                        <span>Bãi biển riêng</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#fafaf8] border border-[#dedad0] text-xs font-medium text-slate-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-[#b9a277]">pool</span>
                        <span>Hồ bơi vô cực</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#fafaf8] border border-[#dedad0] text-xs font-medium text-slate-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-[#b9a277]">spa</span>
                        <span>Spa trị liệu 5★</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#fafaf8] border border-[#dedad0] text-xs font-medium text-slate-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-[#b9a277]">meeting_room</span>
                        <span>{branch.TotalRooms || 200} phòng nghỉ &amp; villa</span>
                      </span>
                    </div>
                  </div>

                  {/* Giá và nút CTA chọn khách sạn */}
                  <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">Giá phòng nghỉ chỉ từ</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-bold text-[#b9a277]">
                          {formatVND(branch.MinPrice || 1850000)}
                        </span>
                        <span className="text-xs text-slate-500 font-normal">/ đêm</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectHotel(branch.BranchId)}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#ffd985] to-[#f3c258] text-[#131b2e] font-bold text-xs sm:text-sm hover:brightness-105 active:scale-95 transition-all shadow-md flex items-center gap-2 group-hover:shadow-lg"
                    >
                      <span>Khám phá &amp; Chọn phòng</span>
                      <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

