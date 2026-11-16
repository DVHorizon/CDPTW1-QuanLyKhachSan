import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { compareRoomsApi } from "../../api/roomApi";
import QuickBookingModal from "../../components/modals/QuickBookingModal";
import GuestSidebar from "../../components/layout/GuestSidebar";

export default function RoomComparisonMatrix() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Danh sách ID phòng lấy từ URL params hoặc localStorage (mặc định [1, 2, 3])
  const [roomTypeIds, setRoomTypeIds] = useState(() => {
    const fromQuery =
      searchParams.get("ids") || searchParams.get("roomTypeIds");
    if (fromQuery) {
      return fromQuery
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter(Boolean);
    }
    const saved = localStorage.getItem("compare_room_ids");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2)
          return parsed.slice(0, 4);
      } catch (_) {}
    }
    return [1, 2, 3];
  });

  // Filter View: ALL_ATTRIBUTES, DIFFERENCES_ONLY, DIMENSIONS_CAPACITY, INCLUSIONS
  const [filterView, setFilterView] = useState(() => {
    return (searchParams.get("filterView") || "ALL_ATTRIBUTES").toUpperCase();
  });

  const [loading, setLoading] = useState(true);
  const [errorData, setErrorData] = useState(null);
  const [matrixData, setMatrixData] = useState(null);

  // Quick booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);

  // Load comparison data from backend
  const loadComparison = async (ids, currentFilter) => {
    setLoading(true);
    setErrorData(null);
    try {
      const res = await compareRoomsApi({ ids, filterView: currentFilter });
      if (res && res.success) {
        setMatrixData(res);
        setErrorData(null);
      } else {
        setErrorData({
          code: res?.code || "ERROR_UNKNOWN",
          message: res?.message || "Đã có lỗi xảy ra khi so sánh phòng.",
        });
      }
    } catch (err) {
      setErrorData({
        code: "ERROR_0044_MIN_COMPARE_ROOMS",
        message: "Không thể kết nối đến máy chủ so sánh phòng.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cập nhật URL search params
    const params = new URLSearchParams();
    if (roomTypeIds.length > 0) {
      params.set("ids", roomTypeIds.join(","));
    }
    if (filterView) {
      params.set("filterView", filterView);
    }
    setSearchParams(params, { replace: true });
    localStorage.setItem("compare_room_ids", JSON.stringify(roomTypeIds));

    // Kiểm tra ràng buộc kỹ thuật: Min 2, Max 4
    if (roomTypeIds.length < 2) {
      setErrorData({
        code: "ERROR_0044_MIN_COMPARE_ROOMS",
        message: "Vui lòng chọn ít nhất 2 loại phòng để tiến hành so sánh",
      });
      setLoading(false);
      return;
    }

    if (roomTypeIds.length > 4) {
      setErrorData({
        code: "ERROR_0045_MAX_COMPARE_ROOMS",
        message: "Hệ thống chỉ hỗ trợ so sánh tối đa 4 loại phòng cùng lúc",
      });
      setLoading(false);
      return;
    }

    loadComparison(roomTypeIds, filterView);
  }, [roomTypeIds, filterView]);

  // Handler xóa 1 phòng khỏi ma trận so sánh
  const handleRemoveRoom = (idToRemove) => {
    const updated = roomTypeIds.filter((id) => id !== idToRemove);
    setRoomTypeIds(updated);
  };

  // Handler mở modal đặt phòng nhanh
  const handleOpenBooking = (room) => {
    setSelectedRoomForBooking({
      roomTypeId: room.roomTypeId,
      typeName: room.typeName,
      basePrice: room.basePrice,
      imageUrl: room.imageUrl,
      maxOccupancy: room.specifications?.capacity?.maxOccupancy || 2,
    });
    setBookingModalOpen(true);
  };

  // Lọc tiêu chí dựa vào filterView
  const displayedCriteria = useMemo(() => {
    if (!matrixData || !matrixData.criteria) return [];
    if (filterView === "DIFFERENCES_ONLY") {
      return matrixData.criteria.filter((c) => c.isDifferent);
    }
    if (filterView === "DIMENSIONS_CAPACITY") {
      return matrixData.criteria.filter(
        (c) => c.category === "DIMENSIONS_CAPACITY",
      );
    }
    if (filterView === "INCLUSIONS") {
      return matrixData.criteria.filter((c) => c.category === "INCLUSIONS");
    }
    return matrixData.criteria;
  }, [matrixData, filterView]);

  return (
    <div className="bg-[#f4fbf4] font-['Inter'] text-[#161d19] antialiased min-h-screen">
      {/* Sidebar Guest Portal */}
      <GuestSidebar />

      <div className="pl-72">
        {/* Header Thanh Điều Hướng */}
        <header className="fixed top-0 left-72 right-0 h-20 bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="font-['Playfair_Display'] text-2xl text-[#161d19] font-medium">
                Grand Horizon Resort & Suites
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Bãi Trường, Phú Quốc
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-[11px] text-[#006c49] font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    verified
                  </span>
                  Tiêu Chuẩn 5 Sao Quốc Tế
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/rooms"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">
                arrow_back
              </span>
              Quay lại danh sách phòng
            </Link>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs text-[#161d19] font-semibold">
                  Khách Hàng Quý Tộc
                </span>
                <span className="text-[11px] text-[#006c49] font-medium">
                  Hội viên VIP
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#006c49] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[18px]">
                  person
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Nội dung chính Màn hình 58 (CMP-ARCH-58) */}
        <main className="relative pt-24 bg-[#f4fbf4] min-h-screen w-full px-8 pb-12">
          <div className="flex flex-col w-full">
            {/* Header Tiêu Đề & Bộ Lọc Nhanh (Filter Tabs) */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-2 text-[#006c49]">
                <span className="material-symbols-outlined text-[18px]">
                  balance
                </span>
                <span className="text-[11px] uppercase tracking-widest font-bold">
                  Quyết Định Thưởng Thức Kỳ Nghỉ Hoàn Mỹ
                </span>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col gap-1 max-w-2xl">
                  <h1 className="font-['Playfair_Display'] text-2xl lg:text-3xl font-bold text-[#161d19]">
                    So Sánh Hạng Phòng & Biệt Thự Nghỉ Dưỡng
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Đối chiếu minh bạch từng thông số kiến trúc, trải nghiệm ẩm thực, và đặc quyền quản gia cá nhân để chọn không gian lưu trú tinh tế nhất tại bờ biển Bãi Trường, Phú Quốc.
                  </p>
                </div>

                {/* Filter Tabs Button */}
                <div className="flex items-center gap-1.5 bg-[#eef6ee] p-1.5 rounded-xl shrink-0 shadow-xs border border-emerald-100/50 self-start lg:self-auto">
                  <button
                    onClick={() => setFilterView("ALL_ATTRIBUTES")}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      filterView === "ALL_ATTRIBUTES"
                        ? "bg-white text-[#006c49] shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    }`}
                    id="filter-all"
                  >
                    Xem Tất Cả ({matrixData?.meta?.totalCriteria || 9})
                  </button>
                  <button
                    onClick={() => setFilterView("DIFFERENCES_ONLY")}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      filterView === "DIFFERENCES_ONLY"
                        ? "bg-white text-[#006c49] shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    }`}
                    id="filter-diff"
                  >
                    Điểm Khác Biệt ({matrixData?.meta?.differencesCount || 5})
                  </button>
                  <button
                    onClick={() => setFilterView("DIMENSIONS_CAPACITY")}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      filterView === "DIMENSIONS_CAPACITY"
                        ? "bg-white text-[#006c49] shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    }`}
                  >
                    Kích Thước
                  </button>
                  <button
                    onClick={() => setFilterView("INCLUSIONS")}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      filterView === "INCLUSIONS"
                        ? "bg-white text-[#006c49] shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    }`}
                    id="filter-amenities"
                  >
                    Tiện Ích & Dịch Vụ
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message Box nếu vi phạm quy tắc */}
            {errorData && (
              <div className="mb-8 p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4 text-rose-800 shadow-sm animate-fade-in">
                <span className="material-symbols-outlined text-rose-600 text-2xl shrink-0 mt-0.5">
                  error
                </span>
                <div className="flex flex-col gap-1">
                  <div className="font-bold text-sm tracking-wide">
                    [{errorData.code}] LỖI SO SÁNH PHÒNG
                  </div>
                  <div className="text-sm">{errorData.message}</div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => setRoomTypeIds([1, 2, 3])}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
                    >
                      Đặt lại 3 phòng mặc định
                    </button>
                    <Link
                      to="/rooms"
                      className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
                    >
                      Chọn phòng từ danh sách
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading && !errorData && (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white rounded-2xl shadow-xs">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-slate-600 font-medium">
                  Đang phân tích và đối chiếu thông số ma trận phòng...
                </span>
              </div>
            )}

            {/* Ma Trận Đối Chiếu Side-by-Side Bảng Liền Mạch (Clean Seamless Table Format) */}
            {!loading && !errorData && matrixData && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[980px]">
                    {/* Header: Ảnh, Tên và Giá phòng */}
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <th className="w-1/4 p-6 align-top border-r border-slate-200/80">
                          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                            Hạng Mục Khảo Sát
                          </span>
                          <div className="font-['Playfair_Display'] text-xl font-bold text-[#161d19] mt-1">
                            Tổng Thể {matrixData.rooms.length} Dòng Không Gian
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Đối chiếu song song 9 tiêu chí
                          </div>
                        </th>

                        {matrixData.rooms.map((room) => (
                          <th
                            key={room.roomTypeId}
                            className={`p-6 align-top relative border-r border-slate-200/80 last:border-r-0 ${
                              room.isPopular ? "bg-emerald-50/30" : ""
                            }`}
                            style={{ width: `${75 / matrixData.rooms.length}%` }}
                          >
                            {/* Nút xóa phòng */}
                            {matrixData.rooms.length > 2 && (
                              <button
                                onClick={() => handleRemoveRoom(room.roomTypeId)}
                                title="Bỏ khỏi bảng so sánh"
                                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-200/80 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all z-10 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            )}

                            {/* Badge lựa chọn phổ biến */}
                            {room.isPopular && (
                              <div className="inline-flex items-center gap-1 bg-[#006c49] text-white px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
                                <span className="material-symbols-outlined text-[12px]">star</span>
                                Phổ biến nhất
                              </div>
                            )}

                            {/* Ảnh đại diện phòng sắc nét */}
                            <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-100 mb-3 shadow-xs border border-slate-100">
                              <img
                                src={room.imageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80'}
                                alt={room.typeName}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-md bg-white/90 backdrop-blur text-slate-800 text-[10px] font-bold">
                                {room.category}
                              </span>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                {room.badge}
                              </span>
                              <h2 className="font-['Playfair_Display'] text-base font-bold text-[#161d19] line-clamp-1 mt-0.5" title={room.typeName}>
                                {room.typeName}
                              </h2>
                              <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-xl font-extrabold text-[#b9a277]">
                                  {room.formattedPrice}
                                </span>
                                <span className="text-xs text-slate-400">/ đêm</span>
                              </div>
                              {room.breakfastIncluded && (
                                <span className="text-[11px] text-[#006c49] font-medium mt-0.5">
                                  {room.breakfastIncluded}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    {/* Body: 9 Tiêu chí đối chiếu theo từng hàng bảng chuẩn */}
                    <tbody className="divide-y divide-slate-200/80">
                      {displayedCriteria.map((crit, idx) => (
                        <tr
                          key={crit.key}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            idx % 2 === 1 ? "bg-slate-50/20" : "bg-white"
                          }`}
                        >
                          {/* Cột Tên Tiêu Chí */}
                          <td className="p-5 align-middle border-r border-slate-200/80">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#006c49] flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px]">
                                  {crit.icon}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-[#161d19] font-bold flex items-center gap-1.5">
                                  {crit.label}
                                  {crit.isDifferent && (
                                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] rounded font-semibold uppercase">
                                      Khác biệt
                                    </span>
                                  )}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {crit.category === "DIMENSIONS_CAPACITY"
                                    ? "Không gian lưu trú tiêu chuẩn"
                                    : crit.category === "INCLUSIONS"
                                      ? "Đặc quyền chăm sóc lưu trú"
                                      : "Tiêu chuẩn tiện nghi"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Dữ liệu từng cột phòng */}
                          {matrixData.rooms.map((room) => {
                            let content = null;
                            if (crit.key === "price") {
                              content = (
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-900">{room.formattedPrice}</span>
                                  <span className="text-[11px] text-slate-400">Chưa bao gồm thuế phí</span>
                                </div>
                              );
                            } else if (crit.key === "area") {
                              content = (
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-900">{room.specifications?.area?.value}</span>
                                  <span className="text-[11px] text-slate-500">{room.specifications?.area?.desc}</span>
                                </div>
                              );
                            } else if (crit.key === "capacity") {
                              content = (
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-[#006c49]">{room.specifications?.capacity?.value}</span>
                                  <span className="text-[11px] text-slate-500">{room.specifications?.capacity?.desc}</span>
                                </div>
                              );
                            } else if (crit.key === "pool") {
                              const hasPool = room.specifications?.pool?.hasPrivatePool;
                              content = (
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1">
                                    {hasPool && <span className="material-symbols-outlined text-[16px] text-[#006c49]">check_circle</span>}
                                    <span className={`text-xs font-semibold ${hasPool ? "text-[#006c49]" : "text-slate-800"}`}>
                                      {room.specifications?.pool?.value}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400">{room.specifications?.pool?.desc}</span>
                                </div>
                              );
                            } else if (crit.key === "butler") {
                              const hasButler = room.specifications?.butler?.hasPrivateButler;
                              content = (
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1">
                                    {hasButler && <span className="material-symbols-outlined text-[16px] text-[#006c49]">person_outline</span>}
                                    <span className={`text-xs font-semibold ${hasButler ? "text-[#006c49]" : "text-slate-800"}`}>
                                      {room.specifications?.butler?.value}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400">{room.specifications?.butler?.desc}</span>
                                </div>
                              );
                            } else {
                              const spec = room.specifications?.[crit.key];
                              content = (
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-slate-800">{spec?.value || "—"}</span>
                                  <span className="text-[11px] text-slate-400">{spec?.desc || ""}</span>
                                </div>
                              );
                            }

                            return (
                              <td
                                key={room.roomTypeId}
                                className={`p-5 align-middle border-r border-slate-200/80 last:border-r-0 ${
                                  room.isPopular ? "bg-emerald-50/20" : ""
                                }`}
                              >
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Hàng Cuối: Nút Đặt Phòng Nhanh (Action Buttons) */}
                      <tr className="bg-slate-50/80">
                        <td className="p-6 align-middle border-r border-slate-200/80">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                            Hành Động Đặt Chỗ
                          </span>
                          <span className="text-sm font-bold text-[#161d19] block">
                            Xác Nhận Giữ Hạng Phòng
                          </span>
                          <span className="text-xs text-slate-500">
                            Hỗ trợ hủy phòng miễn phí trước 48h
                          </span>
                        </td>

                        {matrixData.rooms.map((room) => (
                          <td
                            key={room.roomTypeId}
                            className={`p-6 align-middle border-r border-slate-200/80 last:border-r-0 ${
                              room.isPopular ? "bg-emerald-50/40" : ""
                            }`}
                          >
                            <button
                              onClick={() => handleOpenBooking(room)}
                              className={`w-full h-11 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                                room.isPopular
                                  ? "bg-[#006c49] hover:bg-[#005236] text-white"
                                  : "bg-[#b9a277] hover:bg-[#a58e65] text-white"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[17px]">hotel</span>
                              Đặt {room.typeName.length > 15 ? room.typeName.slice(0, 15) + "..." : room.typeName}
                            </button>

                            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 mt-2">
                              {room.highlightOffer ? (
                                <>
                                  <span className="material-symbols-outlined text-[14px] text-[#006c49]">bolt</span>
                                  <span className="text-[#006c49] font-semibold">{room.highlightOffer}</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[14px]">lock</span>
                                  <span>Còn {room.availableRooms} phòng trống</span>
                                </>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Quick Booking Modal */}
      {bookingModalOpen && selectedRoomForBooking && (
        <QuickBookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          room={selectedRoomForBooking}
          checkInDate={new Date().toISOString().split("T")[0]}
          checkOutDate={
            new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]
          }
          guestsCount={2}
          onBookingSuccess={() => {
            setBookingModalOpen(false);
            navigate("/booking-confirmation");
          }}
        />
      )}
    </div>
  );
}
