import React from 'react';
import AdminLayout from '../../components/admin/layout/AdminLayout';

const RoomService = () => {
  return (
    <AdminLayout>
      <div className="flex flex-col w-full -mx-space-lg -mt-16">
        {/* Top Command & Header Ribbon */}
        <div className="w-full bg-surface-container-lowest px-space-lg py-space-md shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-space-md px-space-lg">
            <div className="flex items-center gap-space-md min-w-0">
<div className="w-10 h-10 rounded-lg bg-admin-primary/10 flex items-center justify-center text-admin-primary">
<span className="material-symbols-outlined text-[24px]">room_service</span>
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-space-xs">
<span className="font-label-sm text-label-sm text-admin-primary uppercase tracking-widest">MODULE 31 // KHU ẨM THỰC PHÒNG</span>
<span className="w-1 h-1 rounded-full bg-outline-variant"></span>
<span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">TỰ ĐỘNG GHI NỢ PHÒNG (IRD)</span>
</div>
<h1 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight truncate">
            Đặt Món Tại Phòng &amp; Ghi Nợ Folio Tức Thời
          </h1>
</div>
</div>
{/* Live Terminal Status Strip */}
<div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-xl">
<div className="flex items-center gap-space-xs">
<span className="w-2.5 h-2.5 rounded-full bg-admin-primary-container shadow-sm animate-pulse"></span>
<span className="font-label-sm text-label-sm text-on-surface font-bold">KẾT NỐI BẾP TRUNG TÂM</span>
</div>
<span className="h-4 w-px bg-outline-variant mx-space-xs"></span>
<div className="font-body-sm text-body-sm text-on-surface-variant">
          Cổng <span className="font-semibold text-on-surface">Micros Simphony v4.2</span>
</div>
<span className="h-4 w-px bg-outline-variant mx-space-xs"></span>
<div className="flex items-center gap-space-xs text-admin-primary font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[16px]">bolt</span>
<span>100ms</span>
</div>
</div>
</div>
</div>
{/* Primary 3-Column Console Canvas */}
<div className="w-full px-space-lg py-space-lg">
<div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start px-space-lg">
{/* ========================================================================= */}
{/* CỘT 1: HỒ SƠ KHÁCH IN-HOUSE & THÔNG SỐ GIAO MÓN (28% -> Col span 3 or 4) */}
{/* ========================================================================= */}
<div className="xl:col-span-3 space-y-space-md">
{/* Thẻ Khách Hàng Lưu Trú */}
<div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md">
<div className="flex items-center justify-between">
<span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Hồ sơ khách In-House</span>
<span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">Tháp B • Tầng 8</span>
</div>
<div className="flex items-start gap-space-md pt-space-xs">
<div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-admin-primary flex-shrink-0 shadow-inner">
<span className="font-headline-lg text-headline-sm font-bold">804</span>
</div>
<div className="flex flex-col min-w-0">
<span className="font-headline-lg text-headline-sm text-on-surface font-bold truncate">Arthur Dent</span>
<div className="flex items-center gap-space-xs mt-0.5">
<span className="px-space-xs py-0.2 rounded-full bg-secondary/10 text-secondary font-label-sm text-label-sm font-semibold">
                  Silver Resident
                </span>
<span className="font-body-sm text-body-sm text-on-surface-variant truncate">#GH-2025-88219</span>
</div>
</div>
</div>
{/* Thông tin hạn mức & Tài chính */}
<div className="bg-surface-container-low rounded-lg p-space-md space-y-space-xs">
<div className="flex items-center justify-between text-body-sm font-body-sm">
<span className="text-on-surface-variant flex items-center gap-1">
<span className="material-symbols-outlined text-[16px] text-secondary">credit_card</span>
                Visa Ký Quỹ
              </span>
<span className="font-semibold text-on-surface">**** 4092</span>
</div>
<div className="flex items-center justify-between text-body-sm font-body-sm">
<span className="text-on-surface-variant">Hạn mức khả dụng</span>
<span className="font-bold text-admin-primary">30.000.000 đ</span>
</div>
<div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden mt-1">
<div className="bg-admin-primary h-full rounded-full" style={{ width: '22%' }}></div>
</div>
<div className="flex justify-between items-center pt-0.5">
<span className="font-label-sm text-label-sm text-outline">Đã tiêu: 6.600.000 đ</span>
<span className="font-label-sm text-label-sm text-outline">Quyền ghi nợ: Mở</span>
</div>
</div>
{/* Cảnh báo Y tế & Dị ứng nghiêm ngặt */}
<div className="bg-error-container/30 rounded-lg p-space-md space-y-space-xs">
<div className="flex items-center gap-space-xs text-error font-label-sm text-label-sm font-bold">
<span className="material-symbols-outlined text-[18px]">warning</span>
              CẢNH BÁO DỊ ỨNG THỰC PHẨM
            </div>
<div className="flex flex-wrap gap-1 pt-1">
<span className="px-space-xs py-0.5 rounded bg-error/15 text-error font-label-sm text-label-sm font-semibold">
                Giáp xác / Tôm cua (Shellfish)
              </span>
<span className="px-space-xs py-0.5 rounded bg-error/15 text-error font-label-sm text-label-sm font-semibold">
                Hạt mè (Sesame seed)
              </span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant pt-1 leading-snug">
              • Bếp trưởng cần ký xác nhận miễn nhiễm chéo trước khi đóng gói ra xe đẩy.
            </p>
</div>
</div>
{/* Thông số giao món & Setup bàn */}
<div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md">
<div className="flex items-center justify-between">
<span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Thông Số Giao Hàng</span>
<span className="material-symbols-outlined text-admin-primary text-[18px]">nest_clock_farsight_analog</span>
</div>
{/* Khung giờ giao */}
<div className="space-y-space-xs">
<label className="font-label-sm text-label-sm text-on-surface-variant block">Thời gian giao món</label>
<div className="grid grid-cols-2 gap-space-xs">
<button className="py-space-xs px-space-sm rounded-lg bg-admin-primary-container text-on-admin-primary-container font-label-sm text-label-sm text-center font-bold shadow-sm" type="button">
                Ngay tức thì (25-35p)
              </button>
<button className="py-space-xs px-space-sm rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm text-center transition-colors" type="button">
                Hẹn giờ: 19:30
              </button>
</div>
</div>
{/* Hình thức dọn bàn */}
<div className="space-y-space-xs">
<label className="font-label-sm text-label-sm text-on-surface-variant block">Hình thức phục vụ</label>
<div className="grid grid-cols-2 gap-space-xs">
<div className="p-space-xs bg-admin-primary/10 rounded-lg text-admin-primary flex items-center gap-space-xs">
<span className="material-symbols-outlined text-[18px]">table_restaurant</span>
<div className="flex flex-col text-left">
<span className="font-label-sm text-label-sm font-bold">Bàn xe đẩy</span>
<span className="text-[10px] text-on-surface-variant">Khăn trắng 5 sao</span>
</div>
</div>
<div className="p-space-xs bg-surface-container rounded-lg text-on-surface-variant flex items-center gap-space-xs opacity-75">
<span className="material-symbols-outlined text-[18px]">inventory_2</span>
<div className="flex flex-col text-left">
<span className="font-label-sm text-label-sm font-semibold">Khay tại cửa</span>
<span className="text-[10px] text-on-surface-variant">Không tiếp xúc</span>
</div>
</div>
</div>
</div>
{/* Số lượng khách & Ghi chú quản gia */}
<div className="space-y-space-xs">
<div className="flex items-center justify-between">
<span className="font-label-sm text-label-sm text-on-surface-variant">Số lượng khách dùng</span>
<div className="flex items-center gap-space-sm bg-surface-container-low px-space-sm py-1 rounded-lg">
<button className="text-on-surface-variant hover:text-admin-primary font-bold">-</button>
<span className="font-label-md text-label-md text-on-surface font-bold px-1">02</span>
<button className="text-on-surface-variant hover:text-admin-primary font-bold">+</button>
</div>
</div>
</div>
<div className="pt-space-xs space-y-1">
<span className="font-label-sm text-label-sm text-outline">Ghi chú điều phối tiền sảnh</span>
<div className="bg-surface-container-low p-space-sm rounded-lg text-body-sm font-body-sm text-on-surface">
              • Chuẩn bị 2 ly pha lê Bordeaux cao cấp.<br />
              • Tuyệt đối không dùng hạt mè rắc bánh mì và salad.
            </div>
</div>
</div>
</div>
{/* ========================================================================= */}
{/* CỘT 2: DANH MỤC THỰC ĐƠN & BẢNG MODIFIERS (44% -> Col span 5 or 6)       */}
{/* ========================================================================= */}
<div className="xl:col-span-5 space-y-space-md">
{/* Thanh Tìm Kiếm Món & Phân Loại Thực Đơn */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md">
<div className="relative w-full">
<span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-outline">search</span>
<input className="w-full bg-surface-container-low rounded-lg pl-10 pr-space-md py-2 text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none" placeholder="Tìm kiếm món trong thực đơn Room Service (Ví dụ: Cá tuyết, Bò Wagyu...)" type="text" />
</div>
{/* Phân loại Tabs */}
<div className="flex items-center gap-space-xs overflow-x-auto pb-1">
<button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm whitespace-nowrap">
              Phổ Biến
            </button>
<button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm whitespace-nowrap">
              Khai Vị
            </button>
<button className="px-space-md py-1.5 rounded-lg bg-admin-primary text-on-admin-primary font-label-sm text-label-sm whitespace-nowrap shadow-sm">
              Món Chính &amp; Nướng
            </button>
<button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm whitespace-nowrap">
              Tráng Miệng
            </button>
<button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm whitespace-nowrap">
              Vang &amp; Đồ Uống
            </button>
</div>
{/* Bộ lọc chuyên sâu */}
<div className="flex items-center justify-between pt-space-xs">
<div className="flex items-center gap-space-xs">
<span className="px-space-xs py-0.5 rounded-full bg-admin-primary/10 text-admin-primary font-label-sm text-label-sm flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">eco</span>
                Ăn chay (Vegetarian)
              </span>
<span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                Không Gluten
              </span>
</div>
<span className="font-label-sm text-label-sm text-outline">Hiển thị 6 / 42 món</span>
</div>
</div>
{/* Lưới Danh Sách Món Ăn (Menu Grid) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
{/* Món 1: Cá Tuyết (Đang chọn kích hoạt) */}
<div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group cursor-pointer">
<div className="relative h-32 w-full overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Gourmet Chilean sea bass pan-seared to golden perfection with lemon butter sauce and seasonal microgreens on luxury ceramic plate, five-star hotel cuisine style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1j5cHLdLdJb3iNQ8D5ECQu13rOW5IBKfFlx2NoPJEBLV-dKj7r3eVcX5U9Gh0QgqxgbFkJrpXY2ZkpsadODwjbJd1isKG_ksD8DBLOnAT9qgCrOaKLAeEGwatz-OCuyvU66AghTDJc9PKLu8QwVy3PosmLj1BSS6uWrks3Iq7O9FFXbQbCsmpc546CkLaf52W0GAEa6tJj2Fb0Yn2ZaSxDtOjv3CWBlxS92ohhbqpdJdQEARa2n08" />
<div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-admin-primary">
                910.000 đ
              </div>
<div className="absolute top-2 left-2 flex gap-1">
<span className="bg-admin-primary text-on-admin-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold">Đang chọn</span>
</div>
</div>
<div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
<div>
<h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Cá Tuyết Áp Chảo Bơ Chanh</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Xốt kem bơ nụ bạch hoa, cà rốt non đút lò mật ong, măng tây giòn.</p>
</div>
<div className="flex items-center justify-between pt-space-xs">
<div className="flex gap-1">
<span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Cá biển</span>
<span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Bơ sữa</span>
</div>
<span className="material-symbols-outlined text-admin-primary text-[20px]">check_circle</span>
</div>
</div>
</div>
{/* Món 2: Wagyu Úc */}
<div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer">
<div className="relative h-32 w-full overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Australian Wagyu steak medium rare sliced on dark slate board with roasted garlic and fresh rosemary sprig in atmospheric restaurant lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDz3iHK7JoUjUw7BnBGW-gM96Xg4xvuKXL0XE3ODqkqv9-v7EnqHvaa4Iy8eRizncLLJQkvdLdTxzYvgsGTasRZUgQMBGuheQ9NI5vjWlKK_Je_Gajnft73wagibZQTCwy7F7ppl8b-Ew7E7AlLkOXsggJrkjo3haxDl_sYCoyEHPyOrG38kZ2TVR0Qk37AEO_V1UHLj_iNnhzUAhfajJqpfvvOaylse1L-__lGxYFJIvs9XrBcQW-_" />
<div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-on-surface">
                1.450.000 đ
              </div>
</div>
<div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
<div>
<h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Bò Bít Tết Wagyu Úc Nướng Than</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Thăn ngoại MB7+, xốt tiêu đen Phú Quốc &amp; tỏi nướng nguyên tép.</p>
</div>
<div className="flex items-center justify-between pt-space-xs">
<div className="flex gap-1">
<span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Gluten</span>
<span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Bò cao cấp</span>
</div>
<button className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-admin-primary hover:text-on-admin-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">add</span>
</button>
</div>
</div>
</div>
{/* Món 3: Risotto Nấm Truffle */}
<div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer">
<div className="relative h-32 w-full overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Creamy wild mushroom risotto with freshly shaved black truffles and grated parmesan in elegant white bowl, luxury gastronomy photography" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9ff2gYrl1C9dP-8TDycpd7gb_vhXC7PmMhR9CtQR6ni3fY3LTyM10BQmQyVGKOdRf_L8El2VXhFGv9KYV_UhxeIRMhcY_LRIJ01hITL6ii2gFnNBCoVes-fTPSz92BDf_n3GIgyrLPKvTCFdTOzJYt_LDF0Brn-A7y_MQ43q_A8l3pN1-ZEXyiEHH-bEK-muz9f-evZRRhjtzOZLTL6MHgpuHbmRbBncY95lozxLbRnmjhnSOrYlP" />
<div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-on-surface">
                520.000 đ
              </div>
<div className="absolute top-2 left-2">
<span className="px-1.5 py-0.5 rounded bg-admin-primary/20 backdrop-blur-sm text-admin-primary font-label-sm text-label-sm font-bold">Ăn chay</span>
</div>
</div>
<div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
<div>
<h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Cơm Ý Nấm Rừng Truffle Tươi</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Gạo Carnaroli, phô mai Parmigiano Reggiano 24 tháng ủ.</p>
</div>
<div className="flex items-center justify-between pt-space-xs">
<div className="flex gap-1">
<span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Nấm dại</span>
<span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Bơ sữa</span>
</div>
<button className="w-7 h-7 rounded-full bg-admin-primary-container text-on-admin-primary-container flex items-center justify-center font-bold">
<span className="material-symbols-outlined text-[18px]">check</span>
</button>
</div>
</div>
</div>
{/* Món 4: Đĩa Thịt Nguội & Phô Mai */}
<div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer">
<div className="relative h-32 w-full overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Artisanal charcuterie board with prosciutto, salami, imported aged cheeses, figs, and grapes on rustic wooden platter" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFCztO64DZeo2faPfIcKzS_xJnLTH0dG5FNi_ZTemplMx9PCKSml_SDo7KSVcGUGFGHvZxYHc-wUgfz1IOFCdZ-nLb1uoqPuZOWmng0naEND9swvOjQkz6_6Lp9MzReMT-pUkdwdsLjfPr39H8Cw7ZiBoaDjoaOUAF94NCez1fh0hgihsryiBkDDw8KOyn62NDQyY5RMg5AVkC8MxDjEblp6J40KfSYhCw4L5ZDH62FqUVbkx54Xgd" />
<div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-on-surface">
                690.000 đ
              </div>
</div>
<div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
<div>
<h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Tháp Thịt Nguội &amp; Phô Mai</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Đùi heo muối Jamon Iberico, phô mai Brie de Meaux, mật ong rừng.</p>
</div>
<div className="flex items-center justify-between pt-space-xs">
<div className="flex gap-1">
<span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Thịt nguội</span>
</div>
<button className="w-7 h-7 rounded-full bg-admin-primary-container text-on-admin-primary-container flex items-center justify-center font-bold">
<span className="material-symbols-outlined text-[18px]">check</span>
</button>
</div>
</div>
</div>
{/* Món 5: Bánh Socola Valrhona */}
<div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer">
<div className="relative h-32 w-full overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Warm chocolate lava cake oozing rich molten dark Valrhona ganache with Madagascar vanilla ice cream and gold leaf dusting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAx-WmPEV4LlnVeAh8_AlEnnn-UtoI8exCwGiWy_5DjTVe5rIxNN_HtvwceriNUdSu8LT9jrSWrHeDaiWID86_eWJ28IoEaY7oDeS7S7J_oEEgLosUcKxXRwZnccYRugD4d5ew66Bg17_-T59vmEuP9tllfneSKQngdUaFgYKwVg2VGz69tVfdBp8eZMJAJDsqiXfLfANUm_WeZPOxanKfWOV7wJSrmsnh9axhPUtmHLCdclh9LV0iI" />
<div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-on-surface">
                390.000 đ
              </div>
</div>
<div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
<div>
<h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Bánh Socola Valrhona Núi Lửa</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Socola 70% chảy, kem vani hạt Madagascar, vụn bánh quy bơ.</p>
</div>
<div className="flex items-center justify-between pt-space-xs">
<div className="flex gap-1">
<span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Tráng miệng</span>
</div>
<button className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-admin-primary hover:text-on-admin-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">add</span>
</button>
</div>
</div>
</div>
{/* Món 6: Vang Grand Cru */}
<div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer">
<div className="relative h-32 w-full overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Prestige Grand Cru Chateau red wine bottle next to crystal wine glasses in luxurious cellar background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZJVKTGxJI-oB0VisQV5wVW958FRVqmSU0fNNRGYGQcKbYi8C4QCvVsdD9UIbAvjKotk0ApEFzfyKcxBt4E5jdjySf8wLo0fwNiodfBfyvNwsFn0aZKQKYPdCqyTabDpi9z1MjcX3WGRLiDsXrVM3u-1pLLsxsvfRH10joK5g7BtVTiwGUA4afsaPUTUrz6UONgtRut-aWhkA7VbMex2h9muiv0NcCz2ytm2YfnNApcExQxEnsYrqE" />
<div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-on-surface">
                7.800.000 đ
              </div>
<div className="absolute top-2 left-2">
<span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[12px]">lock</span>
                  Tủ Sommelier
                </span>
</div>
</div>
<div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
<div>
<h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Château Margaux Premier Cru</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Niên vụ 2015, phục vụ tại nhiệt độ chuẩn 16°C với bình decanter pha lê.</p>
</div>
<div className="flex items-center justify-between pt-space-xs">
<div className="flex gap-1">
<span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Bordeaux</span>
</div>
<button className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-admin-primary hover:text-on-admin-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">add</span>
</button>
</div>
</div>
</div>
</div>
{/* BẢNG TÙY CHỈNH MODIFIERS MATRIX CHO MÓN ĐANG CHỌN */}
<div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-sm">
<span className="w-2 h-5 bg-admin-primary rounded-full"></span>
<h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Tùy Chỉnh Món: Cá Tuyết Áp Chảo Bơ Chanh (910.000 đ)
              </h3>
</div>
<span className="font-label-sm text-label-sm text-admin-primary font-bold">Bắt buộc chọn 1 ăn kèm</span>
</div>
{/* Options Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
{/* Món Ăn Kèm (Side selection) */}
<div className="space-y-space-xs">
<span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">Món Ăn Kèm (Chọn 1)</span>
<div className="space-y-1.5">
<label className="flex items-center justify-between p-space-xs bg-surface-container-low rounded-lg cursor-pointer">
<div className="flex items-center gap-space-xs">
<input defaultChecked className="text-admin-primary focus:ring-0" name="side_choice" type="radio" />
<span className="font-body-sm text-body-sm text-on-surface font-medium">Khoai tây nghiền Truffle</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">+0 đ</span>
</label>
<label className="flex items-center justify-between p-space-xs bg-surface-container-lowest rounded-lg hover:bg-surface-container-low cursor-pointer">
<div className="flex items-center gap-space-xs">
<input className="text-admin-primary" name="side_choice" type="radio" />
<span className="font-body-sm text-body-sm text-on-surface">Măng tây áp chảo tỏi</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">+0 đ</span>
</label>
<label className="flex items-center justify-between p-space-xs bg-surface-container-lowest rounded-lg hover:bg-surface-container-low cursor-pointer">
<div className="flex items-center gap-space-xs">
<input className="text-admin-primary" name="side_choice" type="radio" />
<span className="font-body-sm text-body-sm text-on-surface">Bánh mì men chua ủ thủ công</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">+0 đ</span>
</label>
</div>
</div>
{/* Thêm Nguyên Liệu Thượng Hạng (Upsell) */}
<div className="space-y-space-xs">
<span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">Nâng Cấp Cao Cấp (Tùy chọn)</span>
<div className="space-y-1.5">
<label className="flex items-center justify-between p-space-xs bg-admin-primary/5 rounded-lg cursor-pointer">
<div className="flex items-center gap-space-xs">
<input defaultChecked className="rounded text-admin-primary focus:ring-0" type="checkbox" />
<span className="font-body-sm text-body-sm text-on-surface font-medium">Nấm truffle đen cạo tươi (3g)</span>
</div>
<span className="font-label-sm text-label-sm text-admin-primary font-bold">+250.000 đ</span>
</label>
<label className="flex items-center justify-between p-space-xs bg-surface-container-lowest rounded-lg hover:bg-surface-container-low cursor-pointer">
<div className="flex items-center gap-space-xs">
<input className="rounded text-admin-primary" type="checkbox" />
<span className="font-body-sm text-body-sm text-on-surface">Thêm sốt bơ nụ bạch hoa riêng</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">+45.000 đ</span>
</label>
<label className="flex items-center justify-between p-space-xs bg-surface-container-lowest rounded-lg hover:bg-surface-container-low cursor-pointer">
<div className="flex items-center gap-space-xs">
<input className="rounded text-admin-primary" type="checkbox" />
<span className="font-body-sm text-body-sm text-on-surface">Bọc màng bạc giữ nhiệt cực đại</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">+0 đ</span>
</label>
</div>
</div>
</div>
{/* Nút Cập Nhật Món Vào Hóa Đơn */}
<div className="pt-space-xs flex justify-end gap-space-sm">
<button className="px-space-md py-space-xs rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-colors">
              Hủy thay đổi
            </button>
<button className="px-space-lg py-space-xs rounded-lg bg-admin-primary text-on-admin-primary font-label-md text-label-md flex items-center gap-space-xs shadow-sm hover:brightness-105 transition-all">
<span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
              Lưu &amp; Cập Nhật Vào Phiếu IRD
            </button>
</div>
</div>
</div>
{/* ========================================================================= */}
{/* CỘT 3: PHIẾU GỌI MÓN (TICKET #IRD-4092) & QUYẾT TOÁN GHI NỢ (28% -> Col 4) */}
{/* ========================================================================= */}
<div className="xl:col-span-4 space-y-space-md">
<div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md space-y-space-md">
{/* Header Ticket */}
<div className="flex items-center justify-between pb-space-xs">
<div className="flex flex-col">
<div className="flex items-center gap-space-xs">
<span className="font-headline-sm text-headline-sm font-bold text-on-surface">Phiếu Gọi Món</span>
<span className="font-label-sm text-label-sm text-admin-primary font-semibold">#IRD-4092</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">Phòng 804 • NV: T. Marco • Lúc: 19:12</span>
</div>
<span className="px-space-sm py-1 rounded-full bg-secondary/15 text-secondary font-label-sm text-label-sm font-bold">
              Bản Nháp Mở
            </span>
</div>
{/* Danh sách món gọi */}
<div className="space-y-space-sm pt-space-xs">
{/* Món 1 */}
<div className="bg-surface-container-low rounded-lg p-space-sm space-y-1">
<div className="flex items-start justify-between">
<div className="flex items-start gap-space-xs">
<span className="font-label-md text-label-md text-admin-primary font-bold">1x</span>
<div>
<span className="font-label-md text-label-md text-on-surface font-semibold">Cá Tuyết Áp Chảo Bơ Chanh</span>
<div className="font-body-sm text-body-sm text-on-surface-variant">
                      • Khoai tây nghiền Truffle (+0)<br />
                      • Nấm truffle đen cạo tươi (+250k)<br />
<span className="text-error font-medium">• Không rắc hạt mè lên đĩa</span>
</div>
</div>
</div>
<div className="flex flex-col items-end">
<span className="font-label-md text-label-md font-bold text-on-surface">1.160.000 đ</span>
<button className="text-outline hover:text-error transition-colors mt-1">
<span className="material-symbols-outlined text-[16px]">delete</span>
</button>
</div>
</div>
</div>
{/* Món 2 */}
<div className="bg-surface-container-low rounded-lg p-space-sm space-y-1">
<div className="flex items-start justify-between">
<div className="flex items-start gap-space-xs">
<span className="font-label-md text-label-md text-admin-primary font-bold">1x</span>
<div>
<span className="font-label-md text-label-md text-on-surface font-semibold">Cơm Ý Nấm Rừng Truffle Tươi</span>
<div className="font-body-sm text-body-sm text-on-surface-variant">
                      • Thêm phô mai Pecorino bào sợi
                    </div>
</div>
</div>
<div className="flex flex-col items-end">
<span className="font-label-md text-label-md font-bold text-on-surface">520.000 đ</span>
<button className="text-outline hover:text-error transition-colors mt-1">
<span className="material-symbols-outlined text-[16px]">delete</span>
</button>
</div>
</div>
</div>
{/* Món 3 */}
<div className="bg-surface-container-low rounded-lg p-space-sm space-y-1">
<div className="flex items-start justify-between">
<div className="flex items-start gap-space-xs">
<span className="font-label-md text-label-md text-admin-primary font-bold">1x</span>
<div>
<span className="font-label-md text-label-md text-on-surface font-semibold">Tháp Thịt Nguội &amp; Phô Mai</span>
<div className="font-body-sm text-body-sm text-on-surface-variant">
                      • Tặng kèm quả vả &amp; quả ô liu ngâm
                    </div>
</div>
</div>
<div className="flex flex-col items-end">
<span className="font-label-md text-label-md font-bold text-on-surface">690.000 đ</span>
<button className="text-outline hover:text-error transition-colors mt-1">
<span className="material-symbols-outlined text-[16px]">delete</span>
</button>
</div>
</div>
</div>
{/* Món 4: Nước uống */}
<div className="bg-surface-container-low rounded-lg p-space-sm space-y-1">
<div className="flex items-start justify-between">
<div className="flex items-start gap-space-xs">
<span className="font-label-md text-label-md text-admin-primary font-bold">2x</span>
<div>
<span className="font-label-md text-label-md text-on-surface font-semibold">Nước Khoáng Có Ga San Pellegrino 750ml</span>
<div className="font-body-sm text-body-sm text-on-surface-variant">
                      • Ướp lạnh, phục vụ chanh vàng thái lát
                    </div>
</div>
</div>
<div className="flex flex-col items-end">
<span className="font-label-md text-label-md font-bold text-on-surface">360.000 đ</span>
<button className="text-outline hover:text-error transition-colors mt-1">
<span className="material-symbols-outlined text-[16px]">delete</span>
</button>
</div>
</div>
</div>
</div>
{/* Chi tiết tài chính & Phụ phí dịch vụ phòng */}
<div className="bg-surface-container rounded-xl p-space-md space-y-space-xs">
<div className="flex justify-between items-center text-body-sm font-body-sm">
<span className="text-on-surface-variant">Tổng tiền thực phẩm &amp; đồ uống:</span>
<span className="font-semibold text-on-surface">2.730.000 đ</span>
</div>
<div className="flex justify-between items-center text-body-sm font-body-sm">
<span className="text-on-surface-variant">Phụ phí phục vụ tại phòng (15% IRD):</span>
<span className="font-semibold text-on-surface">409.500 đ</span>
</div>
<div className="flex justify-between items-center text-body-sm font-body-sm">
<span className="text-on-surface-variant">Thuế VAT (8%) &amp; Phí bảo quản (5%):</span>
<span className="font-semibold text-on-surface">354.900 đ</span>
</div>
{/* Giảm trừ hội viên Silver */}
<div className="flex justify-between items-center text-body-sm font-body-sm text-admin-primary">
<span className="font-medium">Ưu đãi Silver Resident (-10% món ăn):</span>
<span className="font-bold">-320.000 đ</span>
</div>
<div className="w-full h-px bg-outline-variant my-space-xs"></div>
<div className="flex justify-between items-baseline pt-1">
<div>
<span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">Tổng Thanh Toán Cuối</span>
<span className="font-label-sm text-label-sm text-outline">Quy đổi: ~$128.00 USD</span>
</div>
<span className="font-headline-lg text-headline-sm text-admin-primary font-bold tracking-tight">
                3.174.400 đ
              </span>
</div>
</div>
{/* Phương thức quyết toán */}
<div className="space-y-space-xs pt-space-xs">
<span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">Hình thức quyết toán hóa đơn</span>
<label className="flex items-center gap-space-sm p-space-sm rounded-xl bg-admin-primary/10 cursor-pointer shadow-sm">
<input defaultChecked className="text-admin-primary focus:ring-0" name="billing_opt" type="radio" />
<div className="flex flex-col">
<span className="font-label-md text-label-md text-on-surface font-bold">Ký nợ vào Hóa đơn phòng (Room Charge)</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Ghi nợ Folio tự động: #FL-88031-C</span>
</div>
</label>
<label className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high cursor-pointer transition-colors">
<input className="text-admin-primary" name="billing_opt" type="radio" />
<div className="flex flex-col">
<span className="font-label-md text-label-md text-on-surface font-medium">Quẹt thẻ ngân hàng tại phòng (Mobile POS)</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Nhân viên mang máy quẹt thẻ kèm hóa đơn</span>
</div>
</label>
<label className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high cursor-pointer transition-colors">
<input className="text-admin-primary" name="billing_opt" type="radio" />
<div className="flex flex-col">
<span className="font-label-md text-label-md text-on-surface font-medium">Chiêu đãi miễn phí (GM Special Privilege)</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Cần phê duyệt từ Tổng Quản Lý</span>
</div>
</label>
</div>
{/* Nút Thực Thi Nghiệp Vụ Chính */}
<div className="space-y-space-xs pt-space-sm">
<button className="w-full py-3 px-space-md rounded-xl bg-admin-primary-container text-on-admin-primary-container font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-sm shadow-md hover:brightness-105 active:scale-[0.99] transition-all" type="button">
<span className="material-symbols-outlined text-[20px]">send_and_archive</span>
              XÁC NHẬN GỬI BẾP &amp; GHI NỢ PHÒNG
            </button>
<div className="grid grid-cols-2 gap-space-xs pt-1">
<button className="py-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm flex items-center justify-center gap-1 transition-colors" type="button">
<span className="material-symbols-outlined text-[16px]">print</span>
                In Phiếu Bếp (KOT)
              </button>
<button className="py-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm flex items-center justify-center gap-1 transition-colors" type="button">
<span className="material-symbols-outlined text-[16px]">save</span>
                Lưu Nháp Tạm
              </button>
</div>
</div>
{/* Bảo mật & Xác thực kiểm toán */}
<div className="text-center pt-space-xs">
<span className="font-body-sm text-[11px] text-outline">
              Chứng từ ký nợ tuân theo chuẩn kế toán khách sạn USALI 11th Edition.
            </span>
</div>
</div>
</div>
</div>
</div>
</div>
    </AdminLayout>
  );
};

export default RoomService;
