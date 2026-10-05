import React, { useState } from "react";
import AdminLayout from "../components/layout/AdminLayout";

const MenuManagement = () => {
  const [activeRow, setActiveRow] = useState(0);

  return (
    <AdminLayout>
      <div className="flex flex-col w-full">
        {/*  Top Technical Header Strip  */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md mb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-widest text-admin-primary font-bold">
              <span>Ẩm Thực &amp; Bếp</span>
              <span className="text-outline-variant">/</span>
              <span className="text-on-surface-variant font-mono">
                Module 30 // PMS F&amp;B Engine
              </span>
              <span className="text-outline-variant">/</span>
              <span className="inline-flex items-center gap-1 text-admin-primary bg-admin-primary/10 px-space-xs py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-admin-primary animate-pulse"></span>
                POS Sync Live v4.2.1
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight mt-0.5">
              Quản Lý Thực Đơn, Định Lượng &amp; Giá Thành Bếp
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Hệ thống điều hành công thức chuẩn (SOP), quản trị food cost và
              liên động KDS bếp đa trạm thời gian thực.
            </p>
          </div>
          {/*  Terminal Utility Command Bar  */}
          <div className="flex flex-wrap items-center gap-space-xs">
            <button
              className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container rounded-lg text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary">
                block
              </span>
              <span>Hết Hàng Nhanh (86'd)</span>
              <span className="bg-tertiary text-on-tertiary rounded-full px-1.5 py-0.2 text-[10px] font-mono">
                3
              </span>
            </button>
            <button
              className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container rounded-lg text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">
                file_upload
              </span>
              <span>Nhập CSV Công Thức</span>
            </button>
            <button
              className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container rounded-lg text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-admin-primary">
                nutrition
              </span>
              <span>Xuất Dinh Dưỡng</span>
            </button>
            <button
              className="flex items-center gap-space-xs px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-semibold rounded-lg hover:brightness-105 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                add_circle
              </span>
              <span>+ Thêm Món / SKU Mới</span>
            </button>
          </div>
        </div>
        {/*  Operational KPI Metric Grid (4 Cards)  */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg">
          {/*  Card 1: Active SKUs  */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                Món Đang Bán (Active SKUs)
              </span>
              <span className="material-symbols-outlined text-[20px] text-admin-primary">
                restaurant_menu
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">
                64
              </span>
              <span className="font-label-sm text-label-sm text-admin-primary font-semibold">
                SKU Trực Tuyến
              </span>
            </div>
            <div className="flex items-center gap-space-sm pt-space-xs mt-space-xs text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low px-space-xs py-1 rounded-md">
              <span>
                Khai vị:{" "}
                <strong className="text-on-surface font-mono">14</strong>
              </span>
              <span>•</span>
              <span>
                Chính: <strong className="text-on-surface font-mono">22</strong>
              </span>
              <span>•</span>
              <span>
                Bar: <strong className="text-on-surface font-mono">28</strong>
              </span>
            </div>
          </div>
          {/*  Card 2: Food Cost & Margin  */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                Biên Lợi Nhuận Gộp TB
              </span>
              <span className="material-symbols-outlined text-[20px] text-admin-primary-container">
                percent
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-admin-primary font-mono">
                68.4%
              </span>
              <span className="font-label-sm text-label-sm text-admin-primary bg-admin-primary/10 px-1 rounded font-semibold">
                +3.4% v/s KPI
              </span>
            </div>
            <div className="flex items-center justify-between pt-space-xs mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <span>Food Cost định mức:</span>
              <span className="font-mono font-bold text-on-surface">
                31.6% (Chuẩn: 35%)
              </span>
            </div>
          </div>
          {/*  Card 3: Out of Stock (86'd)  */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary font-bold">
                Tạm Khóa POS (86'd List)
              </span>
              <span className="material-symbols-outlined text-[20px] text-tertiary">
                do_not_disturb_on
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-tertiary font-mono">
                03
              </span>
              <span className="font-label-sm text-label-sm text-tertiary font-medium">
                Món cạn nguyên liệu
              </span>
            </div>
            <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm truncate">
              <span className="text-on-surface font-semibold">Wagyu A5</span>,{" "}
              <span className="text-on-surface font-semibold">
                Risotto Nấm Truffle
              </span>
              , <span className="text-on-surface font-semibold">Yuzu Tart</span>
            </div>
          </div>
          {/*  Card 4: KDS Stations  */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                KDS Màn Hình Bếp Liên Động
              </span>
              <span className="material-symbols-outlined text-[20px] text-secondary">
                desktop_windows
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">
                04/04
              </span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">
                Trạm Sẵn Sàng
              </span>
            </div>
            <div className="flex items-center gap-1 pt-space-xs mt-space-xs">
              <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-[10px] text-on-surface font-mono font-medium">
                Bếp Nóng
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-[10px] text-on-surface font-mono font-medium">
                Bếp Lạnh
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-[10px] text-on-surface font-mono font-medium">
                Bếp Bánh
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-[10px] text-on-surface font-mono font-medium">
                Bar Quầy
              </span>
            </div>
          </div>
        </div>
        {/*  Primary Workspace: Catalog Engine & Specification Drawer (Bento Split)  */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/*  Left Matrix: Menu Filters & Catalog Master Table (7 Cols)  */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            {/*  Filter Segmented Tabs & Instant Keyword Search  */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-md">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-sm">
                {/*  Meal Period Badges  */}
                <div className="inline-flex p-1 bg-surface-container rounded-lg gap-1 overflow-x-auto">
                  <button
                    className="px-space-sm py-1 rounded bg-surface-container-lowest shadow-sm text-admin-primary font-label-md text-label-md font-bold whitespace-nowrap"
                    type="button"
                  >
                    Tất Cả Menu (64)
                  </button>
                  <button
                    className="px-space-sm py-1 rounded hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md whitespace-nowrap"
                    type="button"
                  >
                    Ăn Sáng (06:00-11:00)
                  </button>
                  <button
                    className="px-space-sm py-1 rounded hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md whitespace-nowrap"
                    type="button"
                  >
                    Cả Ngày A La Carte
                  </button>
                  <button
                    className="px-space-sm py-1 rounded hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md whitespace-nowrap"
                    type="button"
                  >
                    In-Room Đêm
                  </button>
                  <button
                    className="px-space-sm py-1 rounded hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md whitespace-nowrap"
                    type="button"
                  >
                    Pool Bar
                  </button>
                </div>
                {/*  SKU Quick Lookup Field  */}
                <div className="relative min-w-[200px]">
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-on-surface-variant">
                    search
                  </span>
                  <input
                    className="w-full bg-surface pl-8 pr-12 py-1.5 rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Tìm tên món, mã SKU..."
                    type="text"
                    value="Cá tuyết"
                  />
                  <span className="absolute right-2 top-2 font-mono text-[10px] text-outline-variant bg-surface-container px-1 rounded">
                    ⌘K
                  </span>
                </div>
              </div>
              {/*  Catalog Data Table  */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                      <th className="py-2.5 px-3 rounded-l-lg">
                        Mã SKU &amp; Tên Món
                      </th>
                      <th className="py-2.5 px-3">Trạm Bếp</th>
                      <th className="py-2.5 px-3 text-center">Nấu (Phút)</th>
                      <th className="py-2.5 px-3 text-right">Giá Vốn</th>
                      <th className="py-2.5 px-3 text-right">Giá Niêm Yết</th>
                      <th className="py-2.5 px-3 text-center">Biên LN</th>
                      <th className="py-2.5 px-3 text-center rounded-r-lg">
                        POS Live
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm font-body-sm divide-y divide-surface-container-high/60">
                    {/*  Row 1: Selected Item (Pan-Roasted Halibut)  */}
                    <tr className="bg-surface-container-high/40 hover:bg-surface-container-high transition-colors cursor-pointer relative group">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-8 rounded bg-admin-primary"></div>
                          <div className="flex flex-col">
                            <span className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-admin-primary transition-colors">
                              Cá Tuyết Áp Chảo Xốt Bơ Chanh Tỏi
                            </span>
                            <span className="font-mono text-label-sm text-on-surface-variant">
                              SKU-HAL-2048 • Atlantic Halibut Fillet
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm bg-surface-container text-on-surface px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>{" "}
                          Bếp Nóng
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-on-surface">
                        18'
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-on-surface-variant">
                        268.000 đ
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-on-surface">
                        910.000 đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-admin-primary bg-admin-primary/10 px-2 py-0.5 rounded text-label-sm">
                          70.5%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-admin-primary/15 text-admin-primary">
                          <span className="material-symbols-outlined text-[16px]">
                            check_circle
                          </span>
                        </span>
                      </td>
                    </tr>
                    {/*  Row 2: Wagyu Steak  */}
                    <tr className="hover:bg-surface-container transition-colors cursor-pointer">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-8 rounded bg-transparent"></div>
                          <div className="flex flex-col">
                            <span className="font-headline-sm text-body-md font-semibold text-on-surface">
                              Bò Bít Tết Wagyu Úc Nướng Than Hoa
                            </span>
                            <span className="font-mono text-label-sm text-on-surface-variant">
                              SKU-WAG-1092 • Australian Wagyu MB7+ 250g
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm bg-surface-container text-on-surface px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>{" "}
                          Bếp Nóng
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-on-surface">
                        15'
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-on-surface-variant">
                        420.000 đ
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-on-surface">
                        1.450.000 đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-admin-primary bg-admin-primary/10 px-2 py-0.5 rounded text-label-sm">
                          71.0%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-admin-primary/15 text-admin-primary">
                          <span className="material-symbols-outlined text-[16px]">
                            check_circle
                          </span>
                        </span>
                      </td>
                    </tr>
                    {/*  Row 3: Risotto (Temporarily 86'd)  */}
                    <tr className="hover:bg-surface-container transition-colors cursor-pointer bg-error-container/20">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-8 rounded bg-tertiary"></div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-headline-sm text-body-md font-semibold text-on-surface line-through opacity-75">
                                Cơm Ý Risotto Nấm Rừng Truffle
                              </span>
                              <span className="bg-tertiary text-on-tertiary font-label-sm text-[9px] px-1 rounded font-bold uppercase">
                                86'D
                              </span>
                            </div>
                            <span className="font-mono text-label-sm text-on-surface-variant">
                              SKU-RIS-4401 • Carnaroli Truffle Wild Fungi
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm bg-surface-container text-on-surface px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>{" "}
                          Bếp Nóng
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-on-surface">
                        14'
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-on-surface-variant">
                        155.000 đ
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-on-surface">
                        520.000 đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-admin-primary bg-admin-primary/10 px-2 py-0.5 rounded text-label-sm">
                          70.2%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-tertiary/15 text-tertiary">
                          <span className="material-symbols-outlined text-[16px]">
                            cancel
                          </span>
                        </span>
                      </td>
                    </tr>
                    {/*  Row 4: Seafood Tower  */}
                    <tr className="hover:bg-surface-container transition-colors cursor-pointer">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-8 rounded bg-transparent"></div>
                          <div className="flex flex-col">
                            <span className="font-headline-sm text-body-md font-semibold text-on-surface">
                              Tháp Hải Sản Hoàng Gia Phú Quốc
                            </span>
                            <span className="font-mono text-label-sm text-on-surface-variant">
                              SKU-SEA-9912 • King Prawn, Nha Trang Lobster,
                              Oysters
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm bg-surface-container text-on-surface px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>{" "}
                          Bếp Lạnh
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-on-surface">
                        12'
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-on-surface-variant">
                        880.000 đ
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-on-surface">
                        2.680.000 đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-admin-primary bg-admin-primary/10 px-2 py-0.5 rounded text-label-sm">
                          67.1%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-admin-primary/15 text-admin-primary">
                          <span className="material-symbols-outlined text-[16px]">
                            check_circle
                          </span>
                        </span>
                      </td>
                    </tr>
                    {/*  Row 5: Charcuterie Board  */}
                    <tr className="hover:bg-surface-container transition-colors cursor-pointer">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-8 rounded bg-transparent"></div>
                          <div className="flex flex-col">
                            <span className="font-headline-sm text-body-md font-semibold text-on-surface">
                              Đĩa Thịt Nguội &amp; Phô Mai Nhập Khẩu
                            </span>
                            <span className="font-mono text-label-sm text-on-surface-variant">
                              SKU-CHA-3011 • Jamón Ibérico, Truffle Manchego,
                              Brie
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm bg-surface-container text-on-surface px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>{" "}
                          Bếp Lạnh
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-on-surface">
                        8'
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-on-surface-variant">
                        210.000 đ
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-on-surface">
                        690.000 đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-admin-primary bg-admin-primary/10 px-2 py-0.5 rounded text-label-sm">
                          69.5%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-admin-primary/15 text-admin-primary">
                          <span className="material-symbols-outlined text-[16px]">
                            check_circle
                          </span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/*  Table Operational Footer Strip  */}
              <div className="flex items-center justify-between pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <span>Hiển thị 5 / 64 món trong thực đơn hiện hành</span>
                <div className="flex items-center gap-space-xs">
                  <button
                    className="w-7 h-7 rounded flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      chevron_left
                    </span>
                  </button>
                  <span className="font-mono font-semibold text-on-surface">
                    1 / 13
                  </span>
                  <button
                    className="w-7 h-7 rounded flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>
            </div>
            {/*  Station Workload Micro-Telemetry Banner  */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-admin-primary">
                  <span className="material-symbols-outlined text-[24px]">
                    kitchen
                  </span>
                </div>
                <div>
                  <span className="font-label-md text-label-md font-bold text-on-surface">
                    Quy Trình Chuẩn Bị Bếp (Mise en Place)
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Kiểm định lô nguyên liệu hải sản tươi Phú Quốc giao lúc
                    11:30 sáng.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-sm">
                <span className="font-label-sm text-label-sm bg-admin-primary/10 text-admin-primary font-bold px-2 py-1 rounded">
                  100% Đạt Tiêu Chuẩn HACCP
                </span>
                <button
                  className="text-admin-primary font-label-md text-label-md font-semibold hover:underline"
                  type="button"
                >
                  Xem Báo Cáo Ca
                </button>
              </div>
            </div>
          </div>
          {/*  Right Matrix: Full Specification Drawer (5 Cols)  */}
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
              {/*  Drawer Header & Plating Vector / Photo Presentation  */}
              <div className="flex flex-col gap-space-md">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm font-mono text-admin-primary font-bold uppercase tracking-wider">
                      HỒ SƠ ĐỊNH LƯỢNG KỸ THUẬT // BOH-SPEC-2048
                    </span>
                    <h2 className="font-display-lg text-headline-lg font-bold text-on-surface">
                      Cá Tuyết Áp Chảo Bơ Chanh
                    </h2>
                    <span className="font-body-sm text-body-sm text-on-surface-variant italic">
                      Pan-Roasted Atlantic Halibut with Lemon Thyme Velouté
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-admin-primary/10 text-admin-primary font-label-sm text-label-sm font-bold shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-admin-primary"></span>{" "}
                    Đang Mở Bán
                  </span>
                </div>
                {/*  Culinary Plating Visual Preview Card  */}
                <div className="relative w-full h-52 rounded-xl overflow-hidden shadow-sm bg-surface-container">
                  <img
                    className="w-full h-full object-cover"
                    data-alt="A meticulously plated Atlantic halibut fillet on a 28cm hand-crafted ceramic plate with crispy golden skin, bright green asparagus tips, silky truffle mash, and micro-herbs, dressed with glossy lemon thyme velouté in a luxury five-star fine dining atmosphere with soft warm ambient lighting."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8cPZedpVzgE_i6OUewkG9wnONLfoayxDCaqmZqo613afO76mEPiRlZz4w36Tz11yNiEgMdbmUxYbXiJ_M6f1XHlbNsFwwFvCiaGFHgGiGtxhpKhvlLi-_sTGHTfkohVXBp4e3lkSqIVeqrQ2QfyHH2vJGDH8ZViq5uk_w3E0HwxM-nhxuC1NoS6i4QkqBbCnpqYeEFBBeq0QERXqCen-WKFf5CvgbrqubKnConpCvOYo_05WOeA1N"
                  />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest/90 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-admin-primary text-[18px]">
                        verified
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                        Đĩa sứ cao cấp 28cm • Decor hoa cải &amp; chanh sấy
                      </span>
                    </div>
                    <span className="font-mono text-label-sm text-on-surface font-bold">
                      18 Phút KDS
                    </span>
                  </div>
                </div>
                {/*  Financial & Margin Cost Breakdown  */}
                <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">
                    Cấu Trúc Chi Phí &amp; Giá Bán
                  </span>
                  <div className="grid grid-cols-3 gap-space-xs pt-1">
                    <div className="flex flex-col">
                      <span className="text-body-sm font-body-sm text-on-surface-variant">
                        Giá Bán Niêm Yết
                      </span>
                      <span className="font-mono font-bold text-body-lg text-on-surface">
                        910.000 đ
                      </span>
                      <span className="text-[10px] text-outline font-mono">
                        ~$38.00 USD
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-body-sm font-body-sm text-on-surface-variant">
                        Giá Vốn Nguyên Liệu
                      </span>
                      <span className="font-mono font-bold text-body-lg text-secondary">
                        268.000 đ
                      </span>
                      <span className="text-[10px] text-outline font-mono">
                        ~$11.20 USD
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-body-sm font-body-sm text-on-surface-variant">
                        Tỷ Lệ Food Cost
                      </span>
                      <span className="font-mono font-bold text-body-lg text-admin-primary">
                        29.45%
                      </span>
                      <span className="text-[10px] text-admin-primary font-bold">
                        Biên LN: 70.55%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-space-xs mt-space-xs border-t border-surface-container-highest font-label-sm text-label-sm text-on-surface-variant">
                    <span>
                      Phụ thu In-room Dining:{" "}
                      <strong className="text-on-surface">
                        +15% Service Tray
                      </strong>
                    </span>
                    <span>
                      Thuế &amp; Phí:{" "}
                      <strong className="text-on-surface">
                        VAT 8% + Phí PV 5%
                      </strong>
                    </span>
                  </div>
                </div>
                {/*  Recipe BOM (Bill of Materials) Mini Table  */}
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">
                      Định Lượng Nguyên Liệu Bếp (BOM)
                    </span>
                    <button
                      className="text-admin-primary font-label-sm text-label-sm font-semibold hover:underline"
                      type="button"
                    >
                      Chỉnh Định Lượng
                    </button>
                  </div>
                  <div className="bg-surface-container rounded-lg p-2 font-body-sm text-body-sm flex flex-col gap-1.5">
                    <div className="flex items-center justify-between font-mono text-label-sm">
                      <span className="text-on-surface font-sans">
                        1. Cá tuyết Atlantic Halibut tươi phi lê
                      </span>
                      <span className="text-on-surface font-bold">
                        220g / 185.000 đ
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-label-sm">
                      <span className="text-on-surface font-sans">
                        2. Bơ lạt Elle &amp; Vire Pháp &amp; Chanh vàng
                      </span>
                      <span className="text-on-surface font-bold">
                        40g / 28.000 đ
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-label-sm">
                      <span className="text-on-surface font-sans">
                        3. Măng tây xanh Đà Lạt chọn loại 1
                      </span>
                      <span className="text-on-surface font-bold">
                        60g / 32.000 đ
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-label-sm">
                      <span className="text-on-surface font-sans">
                        4. Gia vị, xạ hương, rượu vang trắng deglaze
                      </span>
                      <span className="text-on-surface font-bold">
                        Lô định mức / 23.000 đ
                      </span>
                    </div>
                  </div>
                </div>
                {/*  Allergen Declaration & Health Badges  */}
                <div className="flex flex-col gap-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">
                    Cảnh Báo Dị Ứng &amp; Tiêu Chuẩn Dinh Dưỡng
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                      <span className="material-symbols-outlined text-[14px]">
                        warning
                      </span>{" "}
                      Chứa Cá (Seafood)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                      <span className="material-symbols-outlined text-[14px]">
                        warning
                      </span>{" "}
                      Chứa Bơ Sữa (Dairy)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-medium">
                      <span className="material-symbols-outlined text-[14px] text-admin-primary">
                        eco
                      </span>{" "}
                      Gluten-Free
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-medium">
                      <span className="material-symbols-outlined text-[14px] text-secondary">
                        verified_user
                      </span>{" "}
                      Đạt Chuẩn Halal
                    </span>
                  </div>
                </div>
                {/*  Modifiers & Upsell Options  */}
                <div className="flex flex-col gap-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">
                    Tùy Chọn Kèm Theo (Modifiers &amp; Upsell)
                  </span>
                  <div className="grid grid-cols-2 gap-space-xs">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-surface-container cursor-pointer hover:bg-surface-container-high transition-colors">
                      <div className="flex items-center gap-2">
                        <input
                          checked=""
                          className="accent-primary rounded w-4 h-4"
                          type="checkbox"
                        />
                        <span className="font-body-sm text-body-sm text-on-surface">
                          Khoai tây nghiền nấm
                        </span>
                      </div>
                      <span className="font-mono text-label-sm text-on-surface-variant">
                        +0 đ
                      </span>
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-surface-container cursor-pointer hover:bg-surface-container-high transition-colors">
                      <div className="flex items-center gap-2">
                        <input
                          className="accent-primary rounded w-4 h-4"
                          type="checkbox"
                        />
                        <span className="font-body-sm text-body-sm text-on-surface">
                          Bào thêm nấm Truffle đen
                        </span>
                      </div>
                      <span className="font-mono text-label-sm text-admin-primary font-bold">
                        +250.000 đ
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              {/*  Action Command Buttons  */}
              <div className="flex flex-col sm:flex-row items-center gap-space-xs pt-space-lg mt-space-md border-t border-surface-container-high">
                <button
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-bold rounded-lg hover:brightness-105 shadow-sm transition-all"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    save
                  </span>
                  <span>Lưu Cập Nhật Công Thức</span>
                </button>
                <button
                  className="w-full sm:w-auto flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-surface-container text-on-surface font-label-md text-label-md font-semibold rounded-lg hover:bg-surface-container-high transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    content_copy
                  </span>
                  <span>Nhân Bản</span>
                </button>
                <button
                  className="w-full sm:w-auto flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-surface-container text-tertiary font-label-md text-label-md font-semibold rounded-lg hover:bg-error-container transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    block
                  </span>
                  <span>Khóa POS 86'd</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

