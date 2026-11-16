import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAiRoomRecommendationsApi } from '../../api/roomApi';

const formatVND = (num) => {
  return Number(num || 0).toLocaleString('vi-VN') + 'đ';
};

const TRAVEL_STYLES = [
  { id: 'all', label: 'Tất cả phong cách', icon: 'auto_awesome' },
  { id: 'View Biển Panorama', label: 'View Biển Trực Diện', icon: 'water' },
  { id: 'Villa Hồ Bơi Riêng', label: 'Villa Hồ Bơi Riêng', icon: 'pool' },
  { id: 'Gia Đình Đa Thế Hệ', label: 'Gia Đình Nghỉ Dưỡng', icon: 'family_restroom' },
  { id: 'Cặp Đôi Trăng Mật', label: 'Cặp Đôi / Trăng Mật', icon: 'favorite' },
  { id: 'Thượng Lưu & Di Sản', label: 'Thượng Lưu & Di Sản', icon: 'diamond' }
];

const BUDGET_OPTIONS = [
  { label: 'Dưới 4 triệu', value: 4000000 },
  { label: 'Dưới 6 triệu', value: 6000000 },
  { label: 'Dưới 9 triệu', value: 9000000 },
  { label: 'Không giới hạn', value: 30000000 }
];

export default function AiRoomAdvisorWidget({ variant = 'home', onSelectRoom }) {
  const navigate = useNavigate();

  const [maxBudget, setMaxBudget] = useState(9000000);
  const [travelStyle, setTravelStyle] = useState('View Biển Panorama');
  const [customPrompt, setCustomPrompt] = useState('');
  const [guests, setGuests] = useState(2);

  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  // Nếu ở trang tìm kiếm phòng: mặc định thu gọn để trang gọn gàng, khách muốn dùng thì mở ra
  const [isExpanded, setIsExpanded] = useState(variant === 'home');

  // Gọi AI gợi ý phòng
  const handleGetRecommendations = async (overrideStyle = null, overrideBudget = null) => {
    setLoading(true);
    try {
      const res = await getAiRoomRecommendationsApi({
        maxBudget: overrideBudget !== null ? overrideBudget : maxBudget,
        travelStyle: overrideStyle !== null ? overrideStyle : travelStyle,
        guests,
        customPrompt
      });

      if (res && res.success && res.data) {
        setAiData(res.data);
      }
    } catch (err) {
      console.error('Error fetching AI recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Khởi tạo chạy 1 lần khi component mount
  useEffect(() => {
    handleGetRecommendations();
  }, []);

  return (
    <div className={`w-full rounded-2xl overflow-hidden border border-[#dedad0] shadow-sm transition-all duration-300 ${
      variant === 'search' ? 'bg-surface-container-lowest mb-6' : 'bg-white my-8'
    }`}>
      {/* Header Banner với Gradient sang trọng */}
      <div className="bg-gradient-to-r from-[#203044] via-[#2a3d54] to-[#b9a277] p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-[#ffd985]/20 text-[#ffd985] text-xs font-bold uppercase tracking-wider border border-[#ffd985]/30 flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">psychology</span>
              Google Gemini 2.5 Flash
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md">
              RAG Dynamic Context
            </span>
            {aiData?.userContext?.hasHistory && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                Đã cá nhân hóa theo lịch sử ({aiData.userContext.pastBookingsCount} chuyến đi)
              </span>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#ffd985]">
            AI Concierge Cố Vấn Phòng Nghỉ Dưỡng
          </h3>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl">
            Phân tích thời gian thực ngân sách, phong cách lưu trú và lịch sử cá nhân để gợi ý không gian nghỉ dưỡng tối ưu nhất.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>{isExpanded ? 'Thu gọn' : 'Tùy chỉnh tiêu chí'}</span>
          <span className="material-symbols-outlined text-[18px]">
            {isExpanded ? 'expand_less' : 'tune'}
          </span>
        </button>
      </div>

      {/* Interactive Controls & Filters */}
      {isExpanded && (
        <div className="p-5 sm:p-6 bg-[#fcfaf7] border-b border-[#dedad0]/60 flex flex-col gap-5">
          {/* Hàng 1: Ngân sách & Số lượng khách */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-8 flex flex-col gap-2">
              <label className="text-xs font-bold text-[#8a8782] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#b9a277]">payments</span>
                Ngân Sách Tối Đa / Đêm
              </label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setMaxBudget(opt.value);
                      handleGetRecommendations(null, opt.value);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      maxBudget === opt.value
                        ? 'bg-[#b9a277] text-white shadow-sm'
                        : 'bg-white text-[#203044] hover:bg-slate-100 border border-[#dedad0]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-4 flex flex-col gap-2">
              <label className="text-xs font-bold text-[#8a8782] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#b9a277]">group</span>
                Số Khách Dự Kiến
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 4, 6].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGuests(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      guests === num
                        ? 'bg-[#203044] text-white'
                        : 'bg-white text-[#203044] hover:bg-slate-100 border border-[#dedad0]'
                    }`}
                  >
                    {num} người
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hàng 2: Phong cách kỳ nghỉ (Travel Style Chips) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#8a8782] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#b9a277]">interests</span>
              Gu &amp; Phong Cách Nghỉ Dưỡng Mong Muốn
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLES.map(style => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setTravelStyle(style.id);
                    handleGetRecommendations(style.id, null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    travelStyle === style.id
                      ? 'bg-[#203044] text-[#ffd985] shadow-sm'
                      : 'bg-white text-[#203044] hover:bg-slate-100 border border-[#dedad0]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{style.icon}</span>
                  <span>{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hàng 3: Ô tìm kiếm ngôn ngữ tự nhiên */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                chat_spark
              </span>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGetRecommendations();
                }}
                placeholder="Nhập yêu cầu riêng cho AI (vd: Cần ban công tầng cao ngắm hoàng hôn có bồn tắm lộ thiên...)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#dedad0] text-xs sm:text-sm text-on-surface focus:outline-none focus:border-[#b9a277] transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => handleGetRecommendations()}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  <span>AI Đang Phân Tích...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  <span>AI Phân Tích &amp; Gợi Ý</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* AI Recommendation Results Section (Chỉ hiển thị khi mở rộng) */}
      {isExpanded && (
        <div className="p-5 sm:p-6">
        {/* Lời chào tóm tắt từ AI */}
        {aiData?.summaryGreeting && (
          <div className="p-4 rounded-xl bg-[#f5f0e6] border border-[#e6dcce] text-[#203044] text-xs sm:text-sm flex items-start gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#b9a277] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <span className="material-symbols-outlined text-[18px]">spark</span>
            </div>
            <div className="flex-1">
              <span className="font-bold text-[#b9a277] uppercase text-[11px] tracking-wider block mb-0.5">
                Lời khuyên từ Cố vấn AI Concierge:
              </span>
              <p className="leading-relaxed font-medium">
                {aiData.summaryGreeting}
              </p>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-[#b9a277] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs sm:text-sm font-semibold text-[#8a8782]">
              Đang đối chiếu RAG Context với Google Gemini...
            </span>
          </div>
        )}

        {/* Danh sách thẻ phòng được AI gợi ý */}
        {!loading && aiData?.recommendations && aiData.recommendations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {aiData.recommendations.map((rec) => {
              const room = rec.roomDetails;
              if (!room) return null;

              return (
                <div
                  key={room.RoomTypeId}
                  className="group bg-white rounded-2xl overflow-hidden border border-[#dedad0] hover:border-[#b9a277] hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Hình ảnh phòng + Huy hiệu Match Score */}
                    <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100">
                      <img
                        src={room.ImageUrl || 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80'}
                        alt={room.TypeName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                        <span className="px-2.5 py-1 rounded-full bg-[#203044]/90 backdrop-blur-md text-[#ffd985] text-[11px] font-bold uppercase tracking-wider border border-[#ffd985]/30">
                          {rec.badge || 'Lựa chọn hàng đầu'}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-600/95 backdrop-blur-md text-white text-xs font-extrabold shadow-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        <span>{rec.matchScore}% Match</span>
                      </div>
                    </div>

                    {/* Nội dung chi tiết */}
                    <div className="p-4 sm:p-5 flex flex-col gap-2.5">
                      <h4 className="font-serif font-bold text-base sm:text-lg text-[#203044] group-hover:text-[#b9a277] transition-colors line-clamp-1" title={room.TypeName}>
                        {room.TypeName}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-[#8a8782]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-[#b9a277]">group</span>
                          Tối đa {room.MaxOccupancy || 2} khách
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-[#b9a277]">king_bed</span>
                          Chuẩn 5 Sao
                        </span>
                      </div>

                      {/* Hộp lý do AI đề xuất (RAG generated reason) */}
                      <div className="p-3 rounded-xl bg-[#fbf9f5] border border-[#eee8dc] text-xs text-[#4a5568] flex items-start gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#b9a277] shrink-0 mt-0.5">
                          psychology_alt
                        </span>
                        <p className="italic leading-relaxed">
                          "{rec.aiReason}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Giá & Nút hành động */}
                  <div className="p-4 sm:p-5 pt-0 mt-2 border-t border-[#dedad0]/40 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-outline uppercase font-semibold block">Giá ưu đãi</span>
                      <span className="text-lg font-bold font-serif text-[#b9a277]">
                        {formatVND(room.BasePrice)}
                        <span className="text-xs font-normal text-outline">/đêm</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectRoom) {
                            onSelectRoom(room);
                          } else {
                            navigate(`/rooms/${room.RoomTypeId}`);
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#203044] text-xs font-bold transition-all cursor-pointer"
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/dat-phong?roomTypeId=${room.RoomTypeId}&adults=${guests}&units=1`)}
                        className="px-3.5 py-2 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>Đặt ngay</span>
                        <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

