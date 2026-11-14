import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import RoomDetailModal from "../../components/modals/RoomDetailModal";
import QuickBookingModal from "../../components/modals/QuickBookingModal";
import AmenityPerspectiveCarousel from "../../components/client/AmenityPerspectiveCarousel";
import ScrollIcon from "../../components/common/ScrollIcon";
import MorphDropdown from "../../components/common/MorphDropdown";
import { useWishlist } from "../../context/WishlistContext";
import { fetchHomeData } from "../../api/hotelApi";
import {
  mockBranches,
  mockRoomTypes,
  mockAmenities,
  mockSpecialOffers,
  mockReviews,
  mockFaqs,
  mockStats,
  mockExperiences,
} from "../../data/mockHomeData";

// Helper làm sạch tên tiện ích và gán Material Symbol chuẩn (tránh URL dài làm tràn vỡ layout)
const mapAmenityIcon = (name, rawIcon) => {
  if (
    rawIcon &&
    !rawIcon.startsWith("http") &&
    !rawIcon.includes("/") &&
    !rawIcon.includes(".")
  ) {
    return rawIcon;
  }
  const n = (name || "").toLowerCase();
  if (n.includes("hồ bơi") || n.includes("bể bơi")) return "pool";
  if (n.includes("spa") || n.includes("xông hơi") || n.includes("trị liệu"))
    return "spa";
  if (n.includes("biển") || n.includes("bãi biển")) return "beach_access";
  if (
    n.includes("nhà hàng") ||
    n.includes("ẩm thực") ||
    n.includes("buffet") ||
    n.includes("ăn")
  )
    return "restaurant";
  if (
    n.includes("thể hình") ||
    n.includes("gym") ||
    n.includes("fitness") ||
    n.includes("yoga")
  )
    return "fitness_center";
  if (n.includes("du thuyền") || n.includes("thuyền") || n.includes("yacht"))
    return "sailing";
  if (
    n.includes("xe") ||
    n.includes("sân bay") ||
    n.includes("limousine") ||
    n.includes("đưa đón")
  )
    return "airport_shuttle";
  if (
    n.includes("quản gia") ||
    n.includes("concierge") ||
    n.includes("phục vụ")
  )
    return "concierge";
  if (n.includes("wifi") || n.includes("mạng")) return "wifi";
  if (n.includes("bồn tắm") || n.includes("tắm") || n.includes("jacuzzi"))
    return "bathtub";
  if (n.includes("minibar") || n.includes("rượu") || n.includes("bar"))
    return "local_bar";
  if (n.includes("cà phê") || n.includes("coffee") || n.includes("nespresso"))
    return "coffee";
  if (n.includes("ban công") || n.includes("sân")) return "deck";
  if (n.includes("tv") || n.includes("truyền hình")) return "tv";
  return "hotel";
};

const cleanAmenityTitle = (name, fallbackName) => {
  if (!name) return fallbackName || "Tiện Nghi Nghỉ Dưỡng";
  return name.replace(/\s*#\d+$/i, "").trim();
};

const cleanAmenityDesc = (desc, fallbackDesc) => {
  if (!desc || desc.includes("số hiệu")) {
    return (
      fallbackDesc ||
      "Chuẩn mực tiện nghi sang trọng và đẳng cấp quốc tế phục vụ riêng cho thượng khách."
    );
  }
  return desc;
};

function Home() {
  const navigate = useNavigate();
  const [homeData, setHomeData] = useState({
    branches: mockBranches,
    featuredRoomTypes: mockRoomTypes,
    amenities: mockAmenities,
    offers: mockSpecialOffers,
    experiences: mockExperiences,
    reviews: mockReviews,
    faqs: mockFaqs,
    stats: mockStats,
  });

  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(
    mockBranches[0].BranchId,
  );
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestOption, setGuestOption] = useState("2-0-1");
  const [searchNotification, setSearchNotification] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { wishlist, wishlistCount, toggleWishlist } = useWishlist();
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState(null);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [openFaqId, setOpenFaqId] = useState(1);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterName, setNewsletterName] = useState("");
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [selectedHotelRegion, setSelectedHotelRegion] = useState("all");
  const [showAllHotels, setShowAllHotels] = useState(false);
  const [hotelDisplayLimit, setHotelDisplayLimit] = useState(3);

  const getBranchRegion = (b) => {
    const id = Number(b.BranchId);
    if ([8, 10, 13, 15].includes(id)) return "north";
    if ([2, 4, 5, 7, 9, 11, 16].includes(id)) return "central";
    return "south";
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // Danh sách options cho MorphDropdown Chi Nhánh Khách Sạn (Phân nhóm rõ nét, chuẩn 5 sao)
  const branchOptions = useMemo(() => {
    const getRegionGroup = (b) => {
      const id = Number(b.BranchId);
      if ([8, 10, 13, 15].includes(id)) return "MIỀN BẮC & KỲ QUAN";
      if ([2, 4, 5, 7, 9, 11, 16].includes(id)) return "MIỀN TRUNG & DI SẢN";
      return "MIỀN NAM & BIỂN ĐẢO";
    };

    return homeData.branches.map((branch) => {
      const addressParts = (branch.Address || "").split(",");
      const shortLoc =
        addressParts.length >= 2
          ? `${addressParts[0].trim()}, ${addressParts[addressParts.length - 1].trim()}`
          : branch.City || branch.Address || "Việt Nam";

      return {
        value: branch.BranchId,
        label: branch.BranchName,
        subLabel: shortLoc,
        group: getRegionGroup(branch),
      };
    });
  }, [homeData.branches]);

  // Danh sách options cho MorphDropdown Số Khách & Phòng
  const guestOptions = useMemo(
    () => [
      {
        group: "LỰA CHỌN PHỔ BIẾN",
        value: "2-0-1",
        label: "2 Người lớn, 1 Phòng",
        subLabel: "Phù hợp cho cặp đôi & kỳ nghỉ riêng tư",
      },
      {
        group: "LỰA CHỌN PHỔ BIẾN",
        value: "1-0-1",
        label: "1 Người lớn, 1 Phòng",
        subLabel: "Dành cho khách công tác hoặc du lịch đơn",
      },
      {
        group: "GIA ĐÌNH & NHÓM BẠN",
        value: "2-1-1",
        label: "2 Người lớn, 1 Trẻ em",
        subLabel: "Không gian ấm cúng cho gia đình nhỏ",
      },
      {
        group: "GIA ĐÌNH & NHÓM BẠN",
        value: "4-2-2",
        label: "4 Người lớn, 2 Trẻ em (Villa)",
        subLabel: "Biệt thự hồ bơi riêng & phòng khách rộng",
      },
    ],
    [],
  );

  // Tải dữ liệu từ Backend API (nếu có), fallback về Mock data
  useEffect(() => {
    const loadData = async () => {
      try {
        const liveData = await fetchHomeData();
        if (liveData) {
          setHomeData((prev) => ({
            ...prev,
            branches: liveData.branches?.length
              ? liveData.branches.map((b, idx) => {
                  const fallback =
                    mockBranches[idx % mockBranches.length] || {};
                  return {
                    ...fallback,
                    ...b,
                    City:
                      b.City ||
                      (b.Address ? b.Address.split(",").pop()?.trim() : "") ||
                      fallback.City ||
                      "Việt Nam",
                  };
                })
              : mockBranches,
            featuredRoomTypes: liveData.featuredRoomTypes?.length
              ? liveData.featuredRoomTypes.map((rt, idx) => {
                  const fallback =
                    mockRoomTypes[idx % mockRoomTypes.length] || {};
                  return {
                    ...fallback,
                    ...rt,
                    BasePrice: Number(
                      rt.BasePrice || fallback.BasePrice || 1850000,
                    ),
                    Category: rt.Category || fallback.Category || "deluxe",
                    Gallery: rt.Gallery?.length
                      ? rt.Gallery
                      : [rt.ImageUrl || fallback.ImageUrl].filter(Boolean),
                    Rating: rt.Rating || fallback.Rating || 5.0,
                    TotalReviews:
                      rt.TotalReviews || fallback.TotalReviews || 99,
                  };
                })
              : mockRoomTypes,
            amenities: liveData.amenities?.length
              ? liveData.amenities.map((a, idx) => {
                  const fallback =
                    mockAmenities[idx % mockAmenities.length] || {};
                  const cleanName = cleanAmenityTitle(
                    a.AmenityName,
                    fallback.AmenityName,
                  );
                  return {
                    ...fallback,
                    AmenityId: a.AmenityId || idx + 1,
                    AmenityName: cleanName,
                    Description: cleanAmenityDesc(
                      a.Description,
                      fallback.Description,
                    ),
                    IconName: mapAmenityIcon(
                      cleanName,
                      a.IconName || fallback.IconName,
                    ),
                  };
                })
              : mockAmenities,
            offers: liveData.offers?.length
              ? liveData.offers
              : mockSpecialOffers,
            experiences: mockExperiences,
            reviews: liveData.reviews?.length ? liveData.reviews : mockReviews,
            stats: liveData.stats || mockStats,
          }));
        }
      } catch (err) {
        console.info("Sử dụng dữ liệu Mock hoàn chỉnh cho Trang Chủ.");
      }
    };

    loadData();
  }, []);

  // Xử lý Tìm Phòng (FEAT-GUEST-02)
  const handleSearch = (e) => {
    e.preventDefault();

    if (!checkInDate) {
      setSearchNotification("Vui lòng chọn ngày nhận phòng.");
      return;
    }

    // TC01: Ngày quá khứ
    if (checkInDate < todayStr) {
      setSearchNotification("Ngày nhận phòng không được ở trong quá khứ");
      return;
    }

    // TC02: Ngày trả cùng ngày nhận hoặc quá khứ
    if (!checkOutDate || checkOutDate <= checkInDate) {
      setSearchNotification(
        "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm",
      );
      return;
    }

    // TC03: Lưu trú quá 30 đêm
    const d1 = new Date(checkInDate + "T00:00:00");
    const d2 = new Date(checkOutDate + "T00:00:00");
    const nights = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (nights > 30) {
      setSearchNotification(
        "Hệ thống chỉ hỗ trợ đặt phòng tối đa 30 đêm trực tuyến",
      );
      return;
    }

    const guests = parseInt(guestOption.split("-")[0], 10) || 2;
    navigate(
      `/rooms?branchId=${selectedBranch}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&totalGuests=${guests}`,
    );
  };

  // Chuyển hướng trực tiếp tới màn hình Đặt Phòng (Booking Engine)
  const handleBookNow = (rt) => {
    const guests = guestOption ? guestOption.split("-") : ["2", "0", "1"];
    const adults = guests[0] || "2";
    const children = guests[1] || "0";
    const units = guests[2] || "1";

    const params = new URLSearchParams();
    params.set("roomTypeId", rt.RoomTypeId || rt.id || "1");
    if (checkInDate) params.set("checkInDate", checkInDate);
    if (checkOutDate) params.set("checkOutDate", checkOutDate);
    params.set("adults", adults);
    if (children && children !== "0") params.set("children", children);
    params.set("units", units);

    navigate(`/dat-phong?${params.toString()}`);
  };

  // Lọc phòng theo danh mục
  const filteredRooms = homeData.featuredRoomTypes.filter((room) => {
    if (activeCategory === "all") return true;
    return room.Category === activeCategory;
  });

  const currentBranchName =
    homeData.branches.find((b) => String(b.BranchId) === String(selectedBranch))
      ?.BranchName || "Phú Quốc Oasis";

  return (
    <MainLayout
      wishlistCount={wishlistCount}
      onWishlistClick={() => navigate("/wishlist")}
    >
      <div className="flex flex-col w-full">
        {/* ================= 1. HERO BANNER SECTION ================= */}
        <section
          id="trang-chu"
          className="relative w-full pt-32 pb-24 lg:pb-32 min-h-[720px] lg:min-h-[820px] flex flex-col items-center justify-center z-20"
        >
          {/* Background image & gradient overlay (Được bọc riêng với overflow-hidden để không cắt xén dropdown menu nổi) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <div
              className="absolute inset-0 bg-cover bg-center"
              data-alt="Ultra luxury beachfront tropical resort at twilight sunset"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop")',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#131b2e]/85 via-[#203044]/60 to-[#131b2e]/85" />
          </div>

          {/* Heading Typography & Highlights */}
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center">
            {/* Prestige Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[#ffd985] text-[11.5px] font-semibold tracking-wider uppercase mb-6 animate-fade-in shadow-sm">
              <span className="material-symbols-outlined text-[17px]">
                verified
              </span>
              <span>
                Thương Hiệu Nghỉ Dưỡng Thượng Lưu Hàng Đầu Châu Á 2026
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-[40px] sm:text-[56px] lg:text-[70px] text-white font-bold leading-[1.12] tracking-tight max-w-4xl text-shadow-md">
              Kỳ Nghỉ Thượng Lưu <br />
              <span className="italic font-normal text-[#ffd985]">
                Bên Bờ Biển Thiên Đường
              </span>
            </h1>

            {/* 3 Brand Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 mt-5 text-white/95 text-[13px] font-medium">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#ffd985] text-[18px]">
                  verified
                </span>
                Chuẩn mực 5 sao quốc tế
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#ffd985] text-[18px]">
                  payments
                </span>
                Đảm bảo giá tốt nhất
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#ffd985] text-[18px]">
                  support_agent
                </span>
                Đặc quyền phục vụ 24/7
              </span>
            </div>
          </div>

          {/* FLOATING BOOKING SEARCH BAR: Trải dài đúng bằng viền đầu Logo và viền cuối Avatar */}
          <div className="w-full px-4 sm:px-8 lg:px-12 mt-10 relative z-30">
            <div className="w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] p-4 sm:p-5 lg:p-6 border border-[#dedad0]">
              <form
                onSubmit={handleSearch}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-end text-left"
              >
                {/* Điểm đến / Chi nhánh (MorphDropdown Framer Component) */}
                <div className="lg:col-span-4 flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8a8782] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#b9a277]">
                      location_on
                    </span>
                    Điểm Đến / Chi Nhánh
                  </label>
                  <MorphDropdown
                    options={branchOptions}
                    value={selectedBranch}
                    onChange={(val) => setSelectedBranch(val)}
                    placeholder="Chọn chi nhánh khách sạn"
                    menuMaxHeight={320}
                  />
                </div>

                {/* Ngày nhận - Ngày trả */}
                <div className="lg:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8a8782] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#b9a277]">
                      calendar_today
                    </span>
                    Thời Gian Lưu Trú (dd/mm/yyyy)
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-[#fbf8f2] rounded-xl border border-[#dedad0] px-3 py-1.5">
                    <div className="relative flex flex-col cursor-pointer group">
                      <span className="text-[10px] text-[#8a8782] font-semibold">
                        Nhận phòng
                      </span>
                      <span className="text-[12px] font-bold text-[#203044] group-hover:text-[#b9a277] transition-colors select-none py-0.5">
                        {checkInDate
                          ? checkInDate.split("-").reverse().join("/")
                          : "dd/mm/yyyy"}
                      </span>
                      <input
                        type="date"
                        value={checkInDate}
                        min={todayStr}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        onClick={(e) => {
                          try {
                            e.target.showPicker();
                          } catch (_) {}
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Chọn ngày nhận phòng (dd/mm/yyyy)"
                      />
                    </div>
                    <div className="relative flex flex-col pl-2 border-l border-[#dedad0] cursor-pointer group">
                      <span className="text-[10px] text-[#8a8782] font-semibold">
                        Trả phòng
                      </span>
                      <span className="text-[12px] font-bold text-[#203044] group-hover:text-[#b9a277] transition-colors select-none py-0.5">
                        {checkOutDate
                          ? checkOutDate.split("-").reverse().join("/")
                          : "dd/mm/yyyy"}
                      </span>
                      <input
                        type="date"
                        value={checkOutDate}
                        min={checkInDate || todayStr}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        onClick={(e) => {
                          try {
                            e.target.showPicker();
                          } catch (_) {}
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Chọn ngày trả phòng (dd/mm/yyyy)"
                      />
                    </div>
                  </div>
                </div>

                {/* Số Khách & Phòng (MorphDropdown Framer Component) */}
                <div className="lg:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8a8782] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#b9a277]">
                      group
                    </span>
                    Số Khách
                  </label>
                  <MorphDropdown
                    options={guestOptions}
                    value={guestOption}
                    onChange={(val) => setGuestOption(val)}
                    placeholder="Chọn số lượng khách"
                    menuMaxHeight={360}
                  />
                </div>

                {/* Nút Tìm Kiếm */}
                <div className="lg:col-span-2">
                  <button
                    type="submit"
                    className="w-full h-[46px] rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white font-bold text-[13.5px] shadow-[0_6px_20px_rgba(185,162,119,0.4)] hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      search
                    </span>
                    <span>Tìm Phòng</span>
                  </button>
                </div>
              </form>

              {/* Search Notification Banner */}
              {searchNotification && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[13px] font-medium flex items-center gap-2 animate-fade-in">
                  <span className="material-symbols-outlined text-[18px] text-[#b9a277]">
                    info
                  </span>
                  <span>{searchNotification}</span>
                </div>
              )}
            </div>
          </div>

          {/* Framer ScrollIcon Component (https://framer.com/m/ScrollIcon-kcl63q.js@QbSiYs7OTAywUGMWsnNt) */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center">
            <ScrollIcon
              iconColor="#ffd985"
              borderColor="rgba(255, 255, 255, 0.45)"
              borderWidth={2}
              borderRadius={18}
              mouseWidth={26}
              mouseHeight={42}
              dotSize={5}
              animationSpeed={1.5}
              pauseDuration={0.3}
              showLabel={true}
              labelText="CUỘN XUỐNG"
              onClick={() => {
                const target =
                  document.getElementById("gioi-thieu") ||
                  document.querySelector("section:nth-of-type(2)");
                if (target) target.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        </section>

        {/* ================= 2. FEATURE HIGHLIGHTS & STATS ================= */}
        <section
          id="gioi-thieu"
          className="w-full py-12 bg-white border-b border-[#dedad0] scroll-mt-20 relative z-10"
        >
          <div className="w-full px-4 sm:px-8 lg:px-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center divide-y lg:divide-y-0 lg:divide-x divide-[#dedad0]">
              <div className="flex flex-col items-center justify-center p-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[32px] sm:text-[36px] text-[#203044] font-extrabold tracking-tight">
                    4.98
                  </span>
                  <span className="text-[#b9a277] text-[20px]">★</span>
                </div>
                <span className="text-[14px] text-[#203044] font-bold">
                  Đánh Giá Thượng Hạng
                </span>
                <span className="text-[12px] text-[#8a8782] mt-0.5">
                  Từ hơn 25,000+ lượt trải nghiệm
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[32px] sm:text-[36px] text-[#203044] font-extrabold tracking-tight">
                    {homeData.stats?.totalRooms || "550"}
                  </span>
                  <span className="text-[#b9a277] text-[20px] font-bold self-end mb-1">
                    +
                  </span>
                </div>
                <span className="text-[14px] text-[#203044] font-bold">
                  Phòng &amp; Biệt Thự Biển
                </span>
                <span className="text-[12px] text-[#8a8782] mt-0.5">
                  Tại {homeData.branches.length} khu nghỉ dưỡng danh tiếng
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3">
                <div className="flex items-center gap-1 mb-1 text-[#b9a277]">
                  <span className="material-symbols-outlined text-[36px]">
                    concierge
                  </span>
                </div>
                <span className="text-[14px] text-[#203044] font-bold">
                  Quản Gia Riêng 24/7
                </span>
                <span className="text-[12px] text-[#8a8782] mt-0.5">
                  Chuẩn mực phục vụ tận tâm, tinh tế
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[32px] sm:text-[36px] text-[#203044] font-extrabold tracking-tight">
                    100%
                  </span>
                </div>
                <span className="text-[14px] text-[#203044] font-bold">
                  Bãi Biển Độc Quyền
                </span>
                <span className="text-[12px] text-[#8a8782] mt-0.5">
                  Cát trắng mịn màng &amp; biển ngọc lam
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 2.5. HOTEL SELECTION SECTION (BƯỚC 1: CHỌN KHÁCH SẠN) ================= */}
        <section
          id="he-thong-khach-san"
          className="w-full py-16 lg:py-20 bg-white border-b border-[#dedad0]"
        >
          <div className="w-full px-4 sm:px-8 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fbf8f2] text-[#8c6d3b] border border-[#d8c49e] text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
                <span className="material-symbols-outlined text-base">
                  stars
                </span>
                <span>
                  Hệ Thống Khách Sạn &amp; Khu Nghỉ Dưỡng 5★ Toàn Quốc
                </span>
              </div>
              <h2 className="font-serif text-[30px] lg:text-[40px] text-[#203044] font-bold tracking-tight leading-tight">
                Khám Phá {homeData.branches.length} Thiên Đường Nghỉ Dưỡng 5★
              </h2>

              {/* Dropdown Filters & Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                {/* Dropdown Khu Vực */}
                <div className="relative inline-flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[#8c6d3b] text-base pointer-events-none">
                    travel_explore
                  </span>
                  <select
                    value={selectedHotelRegion}
                    onChange={(e) => {
                      setSelectedHotelRegion(e.target.value);
                      setShowAllHotels(false);
                    }}
                    className="appearance-none pl-9 pr-9 py-2 rounded-full text-xs font-bold bg-[#f4efe6] text-[#203044] border border-[#d8c49e] hover:border-[#8c6d3b] focus:outline-none cursor-pointer shadow-xs transition-all"
                  >
                    <option value="all">
                      Tất Cả Điểm Đến ({homeData.branches.length} Khách Sạn)
                    </option>
                    <option value="north">
                      Miền Bắc &amp; Kỳ Quan (4 Khách Sạn)
                    </option>
                    <option value="central">
                      Miền Trung &amp; Di Sản (7 Khách Sạn)
                    </option>
                    <option value="south">
                      Miền Nam &amp; Biển Đảo (5 Khách Sạn)
                    </option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 text-[#8c6d3b] text-base pointer-events-none">
                    expand_more
                  </span>
                </div>

                {/* Dropdown Số Lượng Hiển Thị */}
                <div className="relative inline-flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#8c6d3b] text-base pointer-events-none">
                    tune
                  </span>
                  <select
                    value={showAllHotels ? "all" : String(hotelDisplayLimit)}
                    onChange={(e) => {
                      if (e.target.value === "all") {
                        setShowAllHotels(true);
                      } else {
                        setShowAllHotels(false);
                        setHotelDisplayLimit(Number(e.target.value));
                      }
                    }}
                    className="appearance-none pl-8 pr-8 py-2 rounded-full text-xs font-bold bg-[#f4efe6] text-[#203044] border border-[#d8c49e] hover:border-[#8c6d3b] focus:outline-none cursor-pointer shadow-xs transition-all"
                  >
                    <option value="3">Hiển thị gọn (3 khách sạn)</option>
                    <option value="6">Hiển thị 6 khách sạn</option>
                    <option value="all">
                      Hiển thị tất cả ({homeData.branches.length} khách sạn)
                    </option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 text-[#8c6d3b] text-base pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Grid Khách Sạn (Hiển thị gọn gàng theo giới hạn) */}
            {(() => {
              const filteredList = homeData.branches.filter(
                (b) =>
                  selectedHotelRegion === "all" ||
                  getBranchRegion(b) === selectedHotelRegion,
              );
              const visibleItems = showAllHotels
                ? filteredList
                : filteredList.slice(0, hotelDisplayLimit);

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleItems.map((branch, index) => (
                      <div
                        key={branch.BranchId}
                        className="group bg-[#fafaf8] rounded-2xl overflow-hidden border border-[#dedad0] hover:border-[#b9a277] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                      >
                        <div className="relative h-56 w-full overflow-hidden bg-slate-200">
                          <img
                            src={
                              branch.ImageUrl ||
                              "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=800&auto=format&fit=crop"
                            }
                            alt={branch.BranchName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#131b2e]/85 backdrop-blur-md text-[#ffd985] text-[11px] font-bold border border-[#ffd985]/30">
                            Điểm đến #{index + 1}
                          </div>

                          <div className="absolute bottom-3 left-3 right-3 text-white">
                            <div className="flex items-center gap-1 text-[11px] text-[#ffd985] font-semibold uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[13px]">
                                location_on
                              </span>
                              <span>{branch.City || "Việt Nam"}</span>
                            </div>
                            <h3 className="font-serif text-lg font-bold leading-tight mt-0.5">
                              {branch.BranchName}
                            </h3>
                          </div>
                        </div>

                        <div className="p-5 flex flex-col justify-between flex-1">
                          <div>
                            <p className="text-xs text-slate-500 flex items-center gap-1 line-clamp-1 mb-2">
                              <span className="material-symbols-outlined text-xs text-[#b9a277]">
                                pin_drop
                              </span>
                              <span>{branch.Address}</span>
                            </p>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {branch.Highlight ||
                                "Trải nghiệm nghỉ dưỡng xa hoa bên bờ biển với hồ bơi vô cực và ẩm thực thượng hạng."}
                            </p>
                          </div>

                          <div className="pt-4 mt-4 border-t border-slate-200/70 flex items-center justify-between">
                            <div>
                              <span className="text-[10.5px] text-slate-400 block">
                                Giá phòng chỉ từ
                              </span>
                              <span className="text-base font-bold text-[#b9a277]">
                                {(branch.MinPrice || 1850000).toLocaleString(
                                  "vi-VN",
                                )}
                                đ
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {" "}
                                / đêm
                              </span>
                            </div>

                            <button
                              onClick={() =>
                                navigate(`/rooms?branchId=${branch.BranchId}`)
                              }
                              className="px-4 py-2.5 rounded-xl bg-[#131b2e] group-hover:bg-[#8c6d3b] text-[#ffd985] group-hover:text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Khám phá &amp; Chọn phòng</span>
                              <span className="material-symbols-outlined text-sm">
                                arrow_forward
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Nút Dropdown Xổ Xuống Xem Thêm / Thu Gọn */}
                  {filteredList.length > visibleItems.length ? (
                    <div className="mt-8 text-center flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAllHotels(true)}
                        className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#8c6d3b] hover:bg-[#72572e] text-white font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-95"
                      >
                        <span>
                          Xem thêm {filteredList.length - visibleItems.length}{" "}
                          khách sạn khác
                        </span>
                        <span className="material-symbols-outlined text-base">
                          expand_more
                        </span>
                      </button>
                    </div>
                  ) : showAllHotels && filteredList.length > 3 ? (
                    <div className="mt-8 text-center flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAllHotels(false)}
                        className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#f4efe6] hover:bg-[#eae2d3] text-[#203044] border border-[#d8c49e] font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <span>Thu gọn bớt khách sạn</span>
                        <span className="material-symbols-outlined text-base">
                          expand_less
                        </span>
                      </button>
                      <span className="text-[11.5px] text-slate-500">
                        Đang hiển thị toàn bộ {filteredList.length} khách sạn
                      </span>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        </section>

        {/* ================= 3. ROOM COLLECTION SECTION ================= */}
        <section
          id="room-collection"
          className="w-full py-16 lg:py-24 bg-[#fafaf8] scroll-mt-24"
        >
          <div className="w-full px-4 sm:px-8 lg:px-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                  Không Gian Nghỉ Dưỡng Tinh Hoa
                </span>
                <h2 className="font-serif text-[28px] lg:text-[36px] text-[#203044] mt-1 font-bold tracking-tight leading-[1.25]">
                  Bộ Sưu Tập Biệt Thự &amp; Phòng Suite
                </h2>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
              {[
                { id: "all", label: "Tất Cả Hạng Phòng" },
                { id: "villa", label: "Biệt Thự Biển (Villa)" },
                { id: "suite", label: "Suite Thượng Hạng" },
                { id: "family", label: "Dành Cho Gia Đình" },
                { id: "deluxe", label: "Phòng Deluxe Cao Cấp" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-4 sm:px-5 py-2.5 rounded-full text-[13px] font-bold transition-all shrink-0 border ${
                    activeCategory === tab.id
                      ? "bg-[#203044] text-white border-[#203044] shadow-md"
                      : "bg-white text-[#203044] border-[#dedad0] hover:border-[#b9a277]"
                  }`}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Room Cards Grid (6 items) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredRooms.map((rt) => {
                const isWishlisted = wishlist.includes(rt.RoomTypeId);
                return (
                  <div
                    key={rt.RoomTypeId}
                    onClick={() => navigate(`/rooms/${rt.RoomTypeId}`)}
                    className="group bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_-15px_rgba(32,48,68,0.25)] hover:shadow-[0_20px_45px_-20px_rgba(32,48,68,0.45)] transition-all duration-300 flex flex-col justify-between border border-[#dedad0] hover:-translate-y-1 relative cursor-pointer"
                  >
                    {/* Image Thumbnail */}
                    <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#203044]">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95 group-hover:opacity-100"
                        alt={rt.TypeName}
                        src={rt.ImageUrl}
                      />
                      {/* Badge */}
                      <div className="absolute top-3 left-3 px-3 py-1 bg-[#203044]/90 backdrop-blur-md rounded-full text-[#b9a277] text-[11px] font-bold uppercase tracking-wider border border-[#b9a277]/40 shadow-sm">
                        {rt.Badge || "Grand Horizon 5 Sao"}
                      </div>

                      {/* Wishlist Heart Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(rt.RoomTypeId);
                        }}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#203044] flex items-center justify-center transition-all shadow-md active:scale-90"
                        type="button"
                        aria-label="Yêu thích phòng"
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] transition-colors ${isWishlisted ? "text-rose-500 font-bold fill-current" : "text-[#8a8782]"}`}
                        >
                          favorite
                        </span>
                      </button>

                      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-lg text-[11px] font-semibold text-[#203044] flex items-center gap-1 shadow-sm">
                        <span className="text-[#b9a277]">★</span>{" "}
                        {rt.Rating || 5.0} ({rt.TotalReviews || 99})
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Room Meta Specs */}
                        <div className="flex items-center gap-3 text-[12px] text-[#8a8782] mb-2 font-medium">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-[#b9a277]">
                              straighten
                            </span>
                            {rt.SizeM2} m²
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-[#b9a277]">
                              bed
                            </span>
                            {rt.AdultCapacity} người lớn
                          </span>
                          <span>•</span>
                          <span
                            className="flex items-center gap-1 truncate max-w-[130px]"
                            title={rt.ViewType}
                          >
                            <span className="material-symbols-outlined text-[15px] text-[#b9a277]">
                              visibility
                            </span>
                            {rt.ViewType}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-serif text-[18px] text-[#203044] font-bold group-hover:text-[#b9a277] transition-colors leading-snug mb-2">
                          {rt.TypeName}
                        </h3>

                        {/* Short Description */}
                        <p className="text-[13px] text-[#373435]/80 line-clamp-2 leading-relaxed mb-4">
                          {rt.Description}
                        </p>

                        {/* Amenity Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          <span className="px-2.5 py-1 rounded-md bg-[#fbf8f2] border border-[#dedad0] text-[11px] font-medium text-[#203044] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-[#b9a277]">
                              restaurant
                            </span>{" "}
                            Bữa sáng 5 sao
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-[#fbf8f2] border border-[#dedad0] text-[11px] font-medium text-[#203044] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-[#b9a277]">
                              pool
                            </span>{" "}
                            Hồ bơi
                          </span>
                        </div>
                      </div>

                      {/* Price & Actions */}
                      <div className="pt-4 border-t border-[#dedad0] flex items-center justify-between mt-auto">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#8a8782] font-semibold uppercase">
                              Giá từ
                            </span>
                            {rt.OriginalPrice && (
                              <span className="text-[11px] text-[#8a8782] line-through">
                                {Number(rt.OriginalPrice).toLocaleString(
                                  "vi-VN",
                                )}
                                ₫
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[20px] font-extrabold text-[#203044]">
                              {Number(rt.BasePrice).toLocaleString("vi-VN")}₫
                            </span>
                            <span className="text-[11px] text-[#8a8782]">
                              /đêm
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/rooms/${rt.RoomTypeId}`);
                            }}
                            className="px-3 py-2 rounded-xl bg-[#fbf8f2] hover:bg-[#eae8df] text-[#203044] text-[12.5px] font-bold border border-[#dedad0] transition-colors"
                            type="button"
                          >
                            Chi Tiết
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookNow(rt);
                            }}
                            className="px-4 py-2 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white text-[12.5px] font-bold shadow-sm transition-all flex items-center gap-1 group-hover:shadow-md"
                            type="button"
                          >
                            <span>Đặt Ngay</span>
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_forward
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= 4. SPECIAL OFFERS SECTION (DARK NAVY LUXURY) ================= */}
        <section
          id="uu-dai"
          className="w-full py-20 lg:py-24 bg-[#131b2e] text-white border-t border-slate-800 relative overflow-hidden"
        >
          {/* Subtle glow background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#b9a277]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#203044]/60 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full px-4 sm:px-8 lg:px-12 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-[11px] uppercase tracking-widest text-[#ffd985] font-bold">
                Đặc Quyền Nghỉ Dưỡng
              </span>
              <h2 className="font-serif text-[28px] sm:text-[34px] lg:text-[40px] text-white mt-1.5 font-bold tracking-tight leading-[1.25]">
                Gói Ưu Đãi &amp; Khuyến Mãi Đặc Biệt
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {homeData.offers.map((offer) => (
                <div
                  key={offer.OfferId}
                  className="bg-[#203044]/80 backdrop-blur-md rounded-2xl p-7 border border-white/10 hover:border-[#b9a277] transition-all hover:shadow-[0_12px_32px_-8px_rgba(185,162,119,0.3)] flex flex-col justify-between relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#b9a277]/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-[#ffd985] text-[11px] font-bold uppercase mb-4 border border-white/10 shadow-xs">
                      {offer.Badge || "Đặc Biệt"}
                    </div>
                    <span className="text-[26px] font-extrabold text-[#ffd985] block mb-1">
                      {offer.DiscountText}
                    </span>
                    <h3 className="font-serif text-[19px] text-white font-bold mb-1 leading-snug group-hover:text-[#ffd985] transition-colors">
                      {offer.Title}
                    </h3>
                    <p className="text-[12.5px] text-[#ffd985]/80 font-semibold mb-3">
                      {offer.Subtitle}
                    </p>
                    <p className="text-[13px] text-white/75 leading-relaxed mb-6">
                      {offer.Description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/15 flex items-center justify-between">
                    <span className="text-[11.5px] text-white/60 font-medium">
                      {offer.ExpiryDate}
                    </span>
                    <a
                      href="#room-collection"
                      className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#ffd985] hover:text-white transition-colors"
                    >
                      <span>Áp Dụng</span>
                      <span className="material-symbols-outlined text-[16px]">
                        arrow_forward
                      </span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= 5. RESORT AMENITIES SECTION ================= */}
        <section
          id="trai-nghiem"
          className="w-full py-16 lg:py-20 bg-[#fafaf8] border-t border-[#dedad0]"
        >
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-8 sm:mb-12">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                Tiện Nghi Đẳng Cấp 5 Sao
              </span>
              <h2 className="font-serif text-[28px] sm:text-[34px] lg:text-[40px] text-[#203044] mt-1.5 font-bold tracking-tight leading-[1.25]">
                Chuẩn Mực Nghỉ Dưỡng 5 Sao Quốc Tế
              </h2>
            </div>
          </div>

          {/* 3D Perspective Coverflow Carousel trải rộng đúng bằng viền Header (Logo đến Avatar Profile) */}
          <div className="w-full px-4 sm:px-8 lg:px-12">
            <AmenityPerspectiveCarousel />
          </div>
        </section>

        {/* ================= 6. FEATURED EXPERIENCES SECTION (4 PHOTO CARDS) ================= */}
        <section
          id="am-thuc"
          className="w-full py-20 lg:py-24 bg-[#fbf8f2] border-t border-[#dedad0]"
        >
          <div className="w-full px-4 sm:px-8 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                Trải Nghiệm Độc Bản
              </span>
              <h2 className="font-serif text-[28px] sm:text-[34px] lg:text-[40px] text-[#203044] mt-1.5 font-bold tracking-tight leading-[1.25]">
                Trải Nghiệm Đặc Sắc Tại Grand Horizon
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {homeData.experiences.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white rounded-2xl overflow-hidden border border-[#dedad0] hover:border-[#b9a277] hover:shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#203044]">
                    <img
                      src={exp.imageUrl}
                      alt={exp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#203044]/90 backdrop-blur-md rounded-md text-[#ffd985] text-[10px] font-bold uppercase tracking-wider">
                      {exp.tag}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-[17px] font-bold text-[#203044] group-hover:text-[#b9a277] transition-colors mb-2 leading-snug">
                        {exp.title}
                      </h3>
                      <p className="text-[13px] text-[#373435]/80 leading-relaxed line-clamp-3 mb-4">
                        {exp.description}
                      </p>
                    </div>

                    <a
                      href="#room-collection"
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#b9a277] hover:text-[#203044] transition-colors pt-2 border-t border-[#dedad0]/60"
                    >
                      <span>Khám Phá Chi Tiết</span>
                      <span className="material-symbols-outlined text-[16px]">
                        arrow_forward
                      </span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= 7. GUEST REVIEWS & ELITE MEMBERSHIP ================= */}
        <section className="w-full py-20 lg:py-24 bg-[#fafaf8] border-t border-[#dedad0]">
          <div className="w-full px-4 sm:px-8 lg:px-12">
            {/* Section Heading placed above grid so both columns align at the top */}
            <div className="mb-8">
              <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                Lưu Giữ Khoảnh Khắc
              </span>
              <h2 className="font-serif text-[28px] lg:text-[36px] text-[#203044] mt-1 font-bold tracking-tight leading-[1.25]">
                Dấu Ấn Kỷ Niệm Khó Phai
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* REVIEWS COLUMN */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {homeData.reviews.slice(0, 4).map((rev) => (
                    <div
                      key={rev.ReviewId}
                      className="bg-white p-6 rounded-2xl border border-[#dedad0] shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-1 text-[#b9a277] mb-2">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-[15px]">
                              ★
                            </span>
                          ))}
                        </div>
                        <h4 className="font-bold text-[14px] text-[#203044] mb-1 leading-snug">
                          {rev.ReviewTitle
                            ? rev.ReviewTitle.replace(/\s*#\d+$/, "").trim()
                            : "Kỳ nghỉ tuyệt vời"}
                        </h4>
                        <p className="text-[12.5px] text-[#373435]/85 leading-relaxed line-clamp-4 mb-4">
                          "{rev.ReviewBody}"
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-3 border-t border-[#dedad0]">
                        <div className="w-9 h-9 rounded-full bg-[#203044] text-[#b9a277] flex items-center justify-center font-bold text-[12px]">
                          {(rev.ReviewerName || "KH")
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] text-[#203044] font-bold leading-tight">
                            {rev.ReviewerName || "Thượng Khách VIP"}
                          </span>
                          <span className="text-[11px] text-[#8a8782]">
                            {rev.TripClassification || "Khách Nghỉ Dưỡng"} •{" "}
                            {rev.ReviewDate || "Gần đây"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-1 text-[#373435]/80">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#b9a277] text-[20px]">
                      verified_user
                    </span>
                    <span className="text-[12px] font-medium">
                      Bảo lưu và hoàn cọc linh hoạt 48h
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#b9a277] text-[20px]">
                      lock
                    </span>
                    <span className="text-[12px] font-medium">
                      Thanh toán bảo mật chuẩn SSL 256-bit
                    </span>
                  </div>
                </div>
              </div>

              {/* MEMBERSHIP SIGNUP CARD */}
              <div id="hoi-vien" className="lg:col-span-5 flex flex-col">
                <div className="relative bg-[#203044] text-white p-7 sm:p-9 rounded-2xl overflow-hidden shadow-[0_18px_50px_-28px_rgba(32,48,68,0.7)] border border-[#203044] h-full flex flex-col justify-between">
                  <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-[#b9a277]/20 blur-2xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <div className="w-11 h-11 rounded-xl bg-[#b9a277]/20 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-[#b9a277] text-[26px]">
                          stars
                        </span>
                      </div>
                      <span className="text-[11px] uppercase tracking-widest text-[#ffd985] font-bold">
                        Grand Horizon Elite Club
                      </span>
                      <h3 className="text-[22px] text-white mt-1 mb-2 font-bold leading-snug">
                        Đăng Ký Hội Viên &amp; Nhận Ngay Ưu Đãi 10%
                      </h3>
                      <p className="text-[13px] text-white/80 mb-6 leading-relaxed">
                        Đặc quyền chiết khấu trực tiếp trên giá phòng, nâng cấp
                        hạng phòng miễn phí tùy tình trạng và dịch vụ xe đưa đón
                        Limousine.
                      </p>
                    </div>

                    <div>
                      {newsletterSuccess ? (
                        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-[13px] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px]">
                            check_circle
                          </span>
                          <span>
                            Đăng ký thành công! Mã ưu đãi ELITE10 đã được gửi
                            đến email của bạn.
                          </span>
                        </div>
                      ) : (
                        <form
                          className="flex flex-col gap-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (newsletterEmail) {
                              setNewsletterSuccess(true);
                            }
                          }}
                        >
                          <div>
                            <input
                              className="w-full h-11 px-3.5 rounded-xl bg-white/10 text-white placeholder-white/50 text-[13px] focus:outline-none focus:bg-white/20 transition-all border border-white/15"
                              placeholder="Họ và tên của Quý khách"
                              type="text"
                              value={newsletterName}
                              onChange={(e) =>
                                setNewsletterName(e.target.value)
                              }
                              required
                            />
                          </div>
                          <div>
                            <input
                              className="w-full h-11 px-3.5 rounded-xl bg-white/10 text-white placeholder-white/50 text-[13px] focus:outline-none focus:bg-white/20 transition-all border border-white/15"
                              placeholder="Địa chỉ email cá nhân"
                              type="email"
                              value={newsletterEmail}
                              onChange={(e) =>
                                setNewsletterEmail(e.target.value)
                              }
                              required
                            />
                          </div>
                          <button
                            className="w-full h-11 mt-1 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                            type="submit"
                          >
                            <span>Trở Thành Hội Viên Grand Horizon Elite</span>
                            <span className="material-symbols-outlined text-[16px]">
                              card_membership
                            </span>
                          </button>
                        </form>
                      )}

                      <p className="text-[11px] text-white/60 text-center mt-4">
                        Không thu phí thường niên • Bảo mật dữ liệu cá nhân theo
                        chuẩn quốc tế
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* MODALS */}
      <RoomDetailModal
        room={selectedRoomForDetail}
        isOpen={Boolean(selectedRoomForDetail)}
        onClose={() => setSelectedRoomForDetail(null)}
        onBookNow={(room) => {
          setSelectedRoomForDetail(null);
          setSelectedRoomForBooking(room);
        }}
      />

      <QuickBookingModal
        room={selectedRoomForBooking}
        branch={currentBranchName}
        checkIn={checkInDate}
        checkOut={checkOutDate}
        isOpen={Boolean(selectedRoomForBooking)}
        onClose={() => setSelectedRoomForBooking(null)}
      />
    </MainLayout>
  );
}

export default Home;
