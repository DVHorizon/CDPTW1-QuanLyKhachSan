import React, { useState } from "react";
import AdminLayout from "../components/admin/layout/AdminLayout";

// ─── DỮ LIỆU MẪU ────────────────────────────────────────────────────────────

const SERVICES_DATA = [
  {
    id: "SVC-SPA-01",
    name: "Trị liệu thảo mộc toàn thân Aroma 60m",
    dept: "Ban: Spa & Trị liệu • Kỹ thuật viên Spa chứng chỉ Quốc tế",
    status: "Đang mở bán",
    statusColor: "text-admin-primary",
    statusBg: "bg-admin-primary/10",
    skuColor: "text-on-admin-primary",
    skuBg: "bg-admin-primary",
    details: [
      { icon: "schedule", text: "60 phút", color: "text-admin-primary" },
      {
        icon: "meeting_room",
        text: "Lotus Suite VIP",
        color: "text-admin-primary",
      },
      { icon: "group", text: "Tối đa 4 khách", color: "text-outline" },
    ],
    price: "1.650.000 đ",
    unit: "/liệu trình",
  },
  {
    id: "SVC-TRN-04",
    name: "Đưa đón sân bay Limousine Mercedes Maybach",
    dept: "Ban: Vận chuyển Concierge • Tài xế riêng lễ tân VIP",
    status: "Đang hoạt động",
    statusColor: "text-admin-primary",
    statusBg: "bg-admin-primary/15",
    skuColor: "text-on-admin-primary",
    skuBg: "bg-admin-primary",
    details: [
      { icon: "timer", text: "45 phút", color: "text-admin-primary" },
      {
        icon: "directions_car",
        text: "Đội xe Maybach số 02",
        color: "text-admin-primary",
      },
    ],
    price: "2.200.000 đ",
    unit: "/chiều",
  },
  {
    id: "SVC-EXP-08",
    name: "Tour du thuyền ngắm hoàng hôn vịnh An Thới",
    dept: "Ban: Trải nghiệm biển • Thuyền trưởng & Hostess chuyên nghiệp",
    status: "Đang mở bán",
    statusColor: "text-admin-primary",
    statusBg: "bg-admin-primary/10",
    skuColor: "text-on-surface",
    skuBg: "bg-admin-primary/20",
    details: [
      { icon: "schedule", text: "180 phút", color: "text-admin-primary" },
      {
        icon: "sailing",
        text: "Du thuyền Lagoon 46",
        color: "text-admin-primary",
      },
    ],
    price: "8.500.000 đ",
    unit: "/chuyến riêng",
  },
  {
    id: "SVC-LND-02",
    name: "Giặt ủi hấp ép lấy nhanh trong 4 giờ",
    dept: "Ban: Buồng phòng & Giặt là • Kỹ thuật xử lý tơ lụa cao cấp",
    status: "Đang mở bán",
    statusColor: "text-admin-primary",
    statusBg: "bg-admin-primary/10",
    skuColor: "text-on-surface",
    skuBg: "bg-admin-primary/20",
    details: [
      { icon: "bolt", text: "Cam kết < 4 giờ", color: "text-admin-primary" },
      {
        icon: "dry_cleaning",
        text: "Laundry Hub Floor B1",
        color: "text-admin-primary",
      },
    ],
    price: "Theo định mức món",
    unit: "Biểu phí chi tiết",
  },
  {
    id: "SVC-DNG-06",
    name: "Bữa tối lãng mạn ánh nến bên bờ biển",
    dept: "Ban: Ẩm thực F&B • Đầu bếp riêng & Sommelier phục vụ",
    status: "Chỉ mở theo yêu cầu",
    statusColor: "text-tertiary",
    statusBg: "bg-tertiary/10",
    skuColor: "text-on-surface",
    skuBg: "bg-admin-primary/20",
    details: [
      {
        icon: "outdoor_grill",
        text: "Set Menu 5 Món",
        color: "text-admin-primary",
      },
      {
        icon: "beach_access",
        text: "Bãi biển Sunset Cove",
        color: "text-admin-primary",
      },
    ],
    price: "4.800.000 đ",
    unit: "/cặp đôi",
  },
];

// ─── THÀNH PHẦN CON (COMPONENTS) ────────────────────────────────────────────

const HeaderSection = () => (
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md p-space-lg rounded-xl border shadow-sm mt-5">
    <div className="flex flex-col gap-space-xs">
      <div className="flex items-center gap-space-xs">
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-admin-primary font-bold">
          PMS Asset Configuration Core
        </span>
      </div>
      <h1 className="font-sans text-2xl lg:text-3xl text-on-surface font-bold tracking-tight leading-tight mt-2">
        Cấu Hình &amp; Bảng Giá Dịch Vụ Nghỉ Dưỡng
      </h1>
    </div>
    <div className="flex flex-wrap items-center gap-space-sm">
      <button
        className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-admin-primary/20 hover:bg-admin-primary/20 text-on-surface font-label-lg text-label-lg transition-colors shadow-sm"
        type="button"
      >
        <span className="material-symbols-outlined text-[18px] text-admin-primary">
          file_download
        </span>
        <span>Xuất File Bảng Giá (Excel)</span>
      </button>
      <button
        className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-admin-primary/20 hover:bg-admin-primary/20 text-on-surface font-label-lg text-label-lg transition-colors shadow-sm"
        type="button"
      >
        <span className="material-symbols-outlined text-[18px] text-admin-primary">
          sync_alt
        </span>
        <span>Đồng Bộ Sang POS Nhà Hàng / Spa</span>
      </button>
      <button
        className="flex items-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-admin-primary hover:bg-admin-primary-container text-on-admin-primary hover:text-on-admin-primary font-label-lg text-label-lg transition-all shadow-md"
        type="button"
      >
        <span className="material-symbols-outlined text-[20px]">
          add_circle
        </span>
        <span>Thêm Dịch Vụ Mới</span>
      </button>
    </div>
  </div>
);

const ServiceListSection = ({ selectedId, onSelect }) => (
  <div className="2xl:col-span-7 flex flex-col gap-space-md border rounded-md">
    <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-admin-primary text-[22px]">
            list_alt
          </span>
          <span className="font-sans text-headline-sm font-semibold text-on-surface">
            Danh Mục Dịch Vụ
          </span>
        </div>
        <div className="flex items-center gap-space-xs">
          <div className="flex items-center p-1 rounded-lg bg-surface-container-low">
            <button
              className="px-space-sm py-1 rounded bg-surface-container-lowest shadow-sm font-label-sm text-label-sm text-on-surface flex items-center gap-1"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                view_list
              </span>{" "}
              Danh sách
            </button>
            <button
              className="px-space-sm py-1 rounded text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm flex items-center gap-1"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                grid_view
              </span>{" "}
              Lưới ô
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm">
        <div className="md:col-span-6 relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline">
            search
          </span>
          <input
            className="w-full pl-9 pr-3 py-2 bg-surface-container-low rounded-lg text-on-surface placeholder:text-outline text-body-md font-body-md focus:outline-none focus:bg-surface-container-lowest shadow-inner"
            placeholder="Tìm theo mã, tên dịch vụ hoặc tiêu chuẩn..."
            type="text"
          />
        </div>
        <div className="md:col-span-3">
          <select className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface text-label-md font-label-md focus:outline-none cursor-pointer">
            <option>Tất cả phân ban (6)</option>
            <option>Spa &amp; Trị liệu</option>
            <option>Vận chuyển Concierge</option>
            <option>Tour &amp; Trải nghiệm</option>
            <option>Ẩm thực tại phòng</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <select className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface text-label-md font-label-md focus:outline-none cursor-pointer">
            <option>Trạng thái: Tất cả</option>
            <option>Đang mở bán</option>
            <option>Tạm khóa</option>
            <option>Đang hoạt động</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-space-xs overflow-hidden">
        {SERVICES_DATA.map((svc) => (
          <div
            key={svc.id}
            onClick={() => onSelect(svc.id)}
            className={`p-space-md rounded-xl transition-all flex flex-col gap-space-xs cursor-pointer ${
              svc.id === selectedId
                ? "bg-admin-primary/20 shadow-sm border border-admin-primary/20"
                : "bg-surface-container-low hover:bg-surface-container"
            }`}
          >
            <div className="flex items-start justify-between gap-space-md">
              <div className="flex items-center gap-space-sm min-w-0">
                <span
                  className={`px-2 py-1 rounded ${svc.skuBg} ${svc.skuColor} font-label-sm text-label-sm font-mono tracking-wider`}
                >
                  {svc.id}
                </span>
                <div className="flex flex-col min-w-0">
                  <h2 className="font-sans text-headline-sm text-on-surface font-semibold truncate">
                    {svc.name}
                  </h2>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {svc.dept}
                  </span>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full ${svc.statusBg} ${svc.statusColor} font-label-sm text-label-sm whitespace-nowrap flex items-center gap-1 font-bold`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${svc.statusColor.replace("text-", "bg-")}`}
                ></span>
                {svc.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs mt-space-xs bg-admin-primary/8070 p-space-sm rounded-lg">
              <div className="flex items-center gap-space-md text-body-sm font-body-sm text-on-surface-variant">
                {svc.details.map((d, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span
                      className={`material-symbols-outlined text-[16px] ${d.color}`}
                    >
                      {d.icon}
                    </span>{" "}
                    {d.text}
                  </span>
                ))}
              </div>
              <div className="text-right">
                <span
                  className={`font-sans text-headline-sm font-bold ${
                    svc.id === "SVC-SPA-01"
                      ? "text-admin-primary"
                      : "text-on-surface"
                  }`}
                >
                  {svc.price}
                </span>
                <span className="font-label-sm text-label-sm text-outline">
                  {" "}
                  {svc.unit}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
        <span>Hiển thị 5 trên tổng số 38 danh mục dịch vụ</span>
        <div className="flex items-center gap-space-xs">
          <button
            className="p-1 rounded bg-surface-container hover:bg-admin-primary/20 text-on-surface disabled:opacity-50"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_left
            </span>
          </button>
          <span className="px-2 py-0.5 rounded bg-admin-primary text-on-admin-primary font-bold">
            1
          </span>
          <button
            className="px-2 py-0.5 rounded hover:bg-surface-container text-on-surface"
            type="button"
          >
            2
          </button>
          <button
            className="px-2 py-0.5 rounded hover:bg-surface-container text-on-surface"
            type="button"
          >
            3
          </button>
          <button
            className="p-1 rounded bg-surface-container hover:bg-admin-primary/20 text-on-surface"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_right
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ServiceEditorSection = ({ selectedId }) => {
  const svc =
    SERVICES_DATA.find((s) => s.id === selectedId) || SERVICES_DATA[0];

  return (
    <div className="2xl:col-span-5 flex flex-col gap-space-md border rounded-md">
      <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-admin-primary text-[22px]">
              tune
            </span>
            <span className="font-sans text-headline-sm font-semibold text-on-surface">
              Đặc Tả &amp; Hiệu Chỉnh Biểu Phí
            </span>
          </div>
          <span className="px-2 py-1 rounded bg-admin-primary-container/20 text-on-admin-primary font-label-sm text-label-sm font-bold">
            Mục Đang Chọn: {svc.id}
          </span>
        </div>

        <div className="flex flex-col gap-space-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                Mã Dịch Vụ
              </label>
              <input
                className="px-3 py-2 bg-surface-container-low rounded-lg font-mono text-label-md font-bold text-on-surface focus:outline-none"
                readOnly
                type="text"
                value={svc.id}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                Danh Mục
              </label>
              <select className="px-3 py-2 bg-surface-container-low rounded-lg font-label-md text-label-md text-on-surface focus:outline-none">
                <option>Spa &amp; Trị liệu (Lotus Spa)</option>
                <option>Vận chuyển Concierge</option>
                <option>Tour &amp; Trải nghiệm</option>
                <option>Ẩm thực F&amp;B</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-outline uppercase font-semibold">
              Tên Dịch Vụ
            </label>
            <input
              className="px-3 py-2 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest shadow-inner"
              type="text"
              defaultValue={svc.name}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                Mô Hình Tính Cước
              </label>
              <div className="flex items-center gap-space-sm pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-body-sm text-body-sm text-on-surface">
                  <input
                    defaultChecked
                    className="accent-admin-primary"
                    name={`billing-${svc.id}`}
                    type="radio"
                  />
                  <span>Cố định trọn gói</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-body-sm text-body-sm text-on-surface-variant">
                  <input
                    className="accent-admin-primary"
                    name={`billing-${svc.id}`}
                    type="radio"
                  />
                  <span>Theo giờ / Định lượng</span>
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                Đơn Giá
              </label>
              <input
                className="px-3 py-2 bg-surface-container-low rounded-lg font-sans text-headline-sm font-bold text-admin-primary focus:outline-none focus:bg-surface-container-lowest shadow-inner text-right"
                type="text"
                defaultValue={svc.price}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-outline">
                Thuế GTGT (VAT)
              </span>
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  VAT 8.0%
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-outline">
                Phí Phục Vụ
              </span>
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  SVC 5.0%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                Giới Hạn Lượt Đặt Đồng Thời
              </label>
              <div className="flex items-center gap-space-xs">
                <input
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg font-label-md text-label-md text-on-surface focus:outline-none"
                  type="number"
                  defaultValue="4"
                />
                <span className="font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                  khách/khung giờ
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                Nơi thực hiện
              </label>
              <select className="px-3 py-2 bg-surface-container-low rounded-lg font-label-md text-label-md text-on-surface focus:outline-none">
                <option>Lotus Spa Suite VIP (Phòng đôi)</option>
                <option>Jasmine Treatment Room 102</option>
                <option>Bambusa Therapy Suite 104</option>
                <option>Cabana Bờ Biển Số 01</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                Ghi Chú SOP Quy Trình Phục Vụ
              </label>
              <span className="font-label-sm text-label-sm text-admin-primary font-medium">
                SOP-SPA-REV2.1
              </span>
            </div>
            <textarea
              className="px-3 py-2 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest shadow-inner"
              rows="3"
              defaultValue="1. Tiếp đón tại sảnh Lotus Spa với trà hoa cúc mật ong ấm và khăn lạnh sả chanh. 2. Kiểm tra phiếu sức khỏe khách (dị ứng tinh dầu hạt, huyết áp hoặc thai kỳ). 3. Chuẩn bị bồn ngâm chân muối khoáng biển Phú Quốc trước 10 phút. 4. Trả phòng spa và hoàn tất hóa đơn sang Folio phòng qua cổng kết nối PMS Core."
            ></textarea>
          </div>

          <div className="pt-space-xs flex items-center gap-space-sm">
            <button
              className="flex-1 py-2.5 rounded-lg bg-admin-primary hover:bg-admin-primary-container text-on-admin-primary hover:text-on-admin-primary font-label-lg text-label-lg transition-all shadow-md flex items-center justify-center gap-space-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                save
              </span>
              <span>Lưu Cập Nhật Bảng Giá</span>
            </button>
            <button
              className="px-space-md py-2.5 rounded-lg bg-admin-primary/20 hover:bg-error/15 text-error font-label-lg text-label-lg transition-colors flex items-center gap-space-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                pause_circle
              </span>
              <span>Tạm Đóng Dịch Vụ</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-admin-primary text-[22px]">
            cloud_done
          </span>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              Đồng bộ tự động POS Terminal
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Lần cập nhật gần nhất: 14:12:08
            </span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-admin-primary/10 text-admin-primary font-label-sm text-label-sm font-bold">
          Đã đồng bộ
        </span>
      </div>
    </div>
  );
};

// ─── TRANG CHÍNH (MAIN PAGE) ──────────────────────────────────────────────────

const ServiceManagement = () => {
  const [selectedId, setSelectedId] = useState("SVC-SPA-01");

  return (
    <AdminLayout>
      <div className="flex flex-col w-full pb-24 font-sans">
        <div className="flex flex-col w-full gap-space-lg">
          <HeaderSection />

          <div className="grid grid-cols-1 2xl:grid-cols-12 gap-space-lg items-start">
            <ServiceListSection
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <ServiceEditorSection selectedId={selectedId} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ServiceManagement;
