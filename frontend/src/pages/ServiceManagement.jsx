import React, { useState, useMemo, useEffect } from "react";
import AdminLayout from "../components/admin/layout/AdminLayout";
import styles from "./ServiceManagement.module.css";
import {
  fetchServicesApi,
  fetchCategoriesApi,
  createServiceApi,
  updateServiceApi,
  deactivateServiceApi,
  reactivateServiceApi,
  syncPosApi,
} from "../api/serviceApi";

// ─── DỮ LIỆU DANH MỤC MẪU BAN ĐẦU (FALLBACK) ──────────────────────────────────

const INITIAL_CATEGORIES = [
  { CategoryId: 1, CategoryName: "Spa & Trị liệu", IsDeleted: false },
  { CategoryId: 2, CategoryName: "Vận chuyển Concierge", IsDeleted: false },
  { CategoryId: 3, CategoryName: "Tour & Trải nghiệm", IsDeleted: false },
  { CategoryId: 4, CategoryName: "Buồng phòng & Giặt là", IsDeleted: false },
  { CategoryId: 5, CategoryName: "Ẩm thực F&B", IsDeleted: false },
];

const INITIAL_SERVICES = [
  {
    ServiceId: 1,
    ServiceCode: "SVC-SPA-001",
    CategoryId: 1,
    ServiceName: "Trị liệu thảo mộc toàn thân Aroma 60m",
    Price: 1650000,
    Unit: "Liệu trình",
    Description:
      "Tiếp đón với trà ấm, ngâm chân muối khoáng biển và massage tinh dầu thảo dược thiên nhiên.",
    Status: "Active",
    category: { CategoryId: 1, CategoryName: "Spa & Trị liệu" },
  },
  {
    ServiceId: 2,
    ServiceCode: "SVC-TRN-001",
    CategoryId: 2,
    ServiceName: "Đưa đón sân bay Limousine Mercedes Maybach",
    Price: 2200000,
    Unit: "Chuyến",
    Description:
      "Xe sang Maybach đời mới, tài xế riêng chuẩn VIP đón khách tận sảnh ga đến.",
    Status: "Active",
    category: { CategoryId: 2, CategoryName: "Vận chuyển Concierge" },
  },
  {
    ServiceId: 3,
    ServiceCode: "SVC-EXP-001",
    CategoryId: 3,
    ServiceName: "Tour du thuyền ngắm hoàng hôn vịnh An Thới",
    Price: 8500000,
    Unit: "Chuyến riêng",
    Description:
      "Hải trình khám phá vịnh biển 3 tiếng kèm tiệc rượu vang và canapé cao cấp.",
    Status: "Active",
    category: { CategoryId: 3, CategoryName: "Tour & Trải nghiệm" },
  },
  {
    ServiceId: 4,
    ServiceCode: "SVC-LND-001",
    CategoryId: 4,
    ServiceName: "Giặt ủi hấp ép lấy nhanh trong 4 giờ",
    Price: 350000,
    Unit: "Lượt",
    Description:
      "Quy trình giặt sấy bảo quản sợi tơ tằm, ép nhiệt và đóng gói chống bụi.",
    Status: "Active",
    category: { CategoryId: 4, CategoryName: "Buồng phòng & Giặt là" },
  },
  {
    ServiceId: 5,
    ServiceCode: "SVC-DNG-001",
    CategoryId: 5,
    ServiceName: "Bữa tối lãng mạn ánh nến bên bờ biển",
    Price: 4800000,
    Unit: "Cặp đôi",
    Description:
      "Bàn tiệc riêng tư sát biển, thực đơn 5 món chế biến trực tiếp bởi Bếp trưởng.",
    Status: "Inactive",
    category: { CategoryId: 5, CategoryName: "Ẩm thực F&B" },
  },
];

// Helper: Chuẩn hóa chuỗi tìm kiếm bỏ dấu tiếng Việt (Mục 0.2)
const normalizeSearch = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
    .toLowerCase()
    .trim();
};

// Helper: Định dạng tiền tệ VND làm tròn 0 chữ số (Mục 0.2)
const formatCurrency = (amount) => {
  const num = Math.floor(Number(amount) || 0);
  return new Intl.NumberFormat("vi-VN").format(num) + " đ";
};

// ─── THÀNH PHẦN CHỈ SỐ KPI TỔNG QUAN ──────────────────────────────────────────

const OverviewKpiCards = ({ services, categories }) => {
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.Status === "Active").length;
    const inactive = services.filter((s) => s.Status === "Inactive").length;
    const totalCategories = categories.length;
    return { total, active, inactive, totalCategories };
  }, [services, categories]);

  return (
    <div className={styles.kpiGrid}>
      <div className={styles.kpiCard}>
        <div>
          <p className={styles.kpiLabel}>Tổng Dịch Vụ</p>
          <p className={styles.kpiValue}>{stats.total}</p>
        </div>
        <div
          className={styles.kpiIconWrapper}
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            color: "#10b981",
          }}
        >
          <span className="material-symbols-outlined text-[22px]">
            category
          </span>
        </div>
      </div>

      <div className={styles.kpiCard}>
        <div>
          <p className={styles.kpiLabel}>Đang Hoạt Động</p>
          <p className={styles.kpiValue} style={{ color: "#059669" }}>
            {stats.active}
          </p>
        </div>
        <div
          className={styles.kpiIconWrapper}
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            color: "#059669",
          }}
        >
          <span className="material-symbols-outlined text-[22px]">
            check_circle
          </span>
        </div>
      </div>

      <div className={styles.kpiCard}>
        <div>
          <p className={styles.kpiLabel}>Ngừng Cung Cấp</p>
          <p className={styles.kpiValue} style={{ color: "#dc2626" }}>
            {stats.inactive}
          </p>
        </div>
        <div
          className={styles.kpiIconWrapper}
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            color: "#dc2626",
          }}
        >
          <span className="material-symbols-outlined text-[22px]">
            pause_circle
          </span>
        </div>
      </div>

      <div className={styles.kpiCard}>
        <div>
          <p className={styles.kpiLabel}>Nhóm Dịch Vụ</p>
          <p className={styles.kpiValue}>{stats.totalCategories}</p>
        </div>
        <div
          className={styles.kpiIconWrapper}
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            color: "#d97706",
          }}
        >
          <span className="material-symbols-outlined text-[22px]">folder</span>
        </div>
      </div>
    </div>
  );
};

// ─── HEADER SECTION ────────────────────────────────────────────────────────────

const HeaderSection = ({ onAddNew, onExportExcel, onSyncPOS, isSyncing }) => (
  <div className={styles.headerCard}>
    <div className={styles.headerInfo}>
      <span className={styles.headerSubtitle}>Module 22 • FEAT-SERVICE-01</span>
      <h1 className={styles.headerTitle}>Quản Lý Danh Mục Dịch Vụ Khách Sạn</h1>
      <p className={styles.headerDesc}>
        Tạo, xem, hiệu chỉnh biểu phí và quản lý trạng thái cung cấp (Active /
        Inactive)
      </p>
    </div>
    <div className={styles.headerActions}>
      <button
        onClick={onExportExcel}
        className={`${styles.btn} ${styles.btnOutline}`}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">
          file_download
        </span>
        <span>Xuất File Bảng Giá</span>
      </button>

      <button
        onClick={onSyncPOS}
        disabled={isSyncing}
        className={`${styles.btn} ${styles.btnOutline}`}
        style={isSyncing ? { opacity: 0.6, cursor: "not-allowed" } : {}}
        type="button"
      >
        <span
          className={`material-symbols-outlined text-[18px] ${isSyncing ? "animate-spin" : ""}`}
        >
          sync_alt
        </span>
        <span>{isSyncing ? "Đang Đồng Bộ..." : "Đồng Bộ Sang POS"}</span>
      </button>

      <button
        onClick={onAddNew}
        className={`${styles.btn} ${styles.btnPrimary}`}
        type="button"
      >
        <span className="material-symbols-outlined text-[20px]">
          add_circle
        </span>
        <span>New Service</span>
      </button>
    </div>
  </div>
);

// ─── DANH SÁCH & BỘ LỌC DỊCH VỤ ───────────────────────────────────────────────

const ServiceListSection = ({
  services,
  categories,
  selectedCode,
  onSelect,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  currentPage,
  setCurrentPage,
  itemsPerPage,
}) => {
  // Kiểm tra lỗi khoảng giá hợp lệ (FEAT-SERVICE-02)
  const isPriceRangeInvalid = useMemo(() => {
    if (minPrice !== "" && maxPrice !== "") {
      const minP = Number(minPrice);
      const maxP = Number(maxPrice);
      if (!isNaN(minP) && !isNaN(maxP) && minP > maxP) {
        return true;
      }
    }
    return false;
  }, [minPrice, maxPrice]);

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(searchTerm.trim()) ||
      categoryFilter !== "All" ||
      statusFilter !== "All" ||
      minPrice !== "" ||
      maxPrice !== "" ||
      sortBy !== "name_asc"
    );
  }, [searchTerm, categoryFilter, statusFilter, minPrice, maxPrice, sortBy]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("All");
    setStatusFilter("All");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("name_asc");
    setCurrentPage(1);
  };

  const filteredServices = useMemo(() => {
    let result = services.filter((svc) => {
      // 1. Tìm kiếm không dấu trên tên, mã SKU, tên nhóm và mô tả
      const matchSearch =
        !searchTerm.trim() ||
        normalizeSearch(svc.ServiceName).includes(
          normalizeSearch(searchTerm),
        ) ||
        normalizeSearch(svc.ServiceCode).includes(
          normalizeSearch(searchTerm),
        ) ||
        normalizeSearch(svc.category?.CategoryName || "").includes(
          normalizeSearch(searchTerm),
        );

      // 2. Lọc theo nhóm dịch vụ
      const matchCategory =
        categoryFilter === "All" ||
        String(svc.CategoryId) === String(categoryFilter);

      // 3. Lọc theo trạng thái
      const matchStatus = statusFilter === "All" || svc.Status === statusFilter;

      // 4. Lọc theo khoảng giá minPrice - maxPrice
      const priceNum = Number(svc.Price);
      const minP = minPrice !== "" && !isNaN(Number(minPrice)) ? Number(minPrice) : null;
      const maxP = maxPrice !== "" && !isNaN(Number(maxPrice)) ? Number(maxPrice) : null;

      const matchMinPrice = minP === null || priceNum >= minP;
      const matchMaxPrice = maxP === null || priceNum <= maxP;

      return matchSearch && matchCategory && matchStatus && matchMinPrice && matchMaxPrice;
    });

    // 5. Sắp xếp theo sortBy (FEAT-SERVICE-02: name_asc, price_asc, price_desc)
    result.sort((a, b) => {
      if (sortBy === "price_asc") {
        const diff = Number(a.Price) - Number(b.Price);
        if (diff !== 0) return diff;
        return (a.ServiceName || "").localeCompare(b.ServiceName || "", "vi");
      }
      if (sortBy === "price_desc") {
        const diff = Number(b.Price) - Number(a.Price);
        if (diff !== 0) return diff;
        return (a.ServiceName || "").localeCompare(b.ServiceName || "", "vi");
      }
      // Mặc định (name_asc): theo CategoryName A→Z, trong cùng nhóm sắp theo ServiceName A→Z
      const catA = a.category?.CategoryName || "";
      const catB = b.category?.CategoryName || "";
      const catComp = catA.localeCompare(catB, "vi");
      if (catComp !== 0) return catComp;

      return (a.ServiceName || "").localeCompare(b.ServiceName || "", "vi");
    });

    return result;
  }, [services, searchTerm, categoryFilter, statusFilter, minPrice, maxPrice, sortBy]);

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage) || 1;
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(start, start + itemsPerPage);
  }, [filteredServices, currentPage, itemsPerPage]);

  return (
    <div className={styles.leftCol}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ color: "#10b981" }}
          >
            list_alt
          </span>
          <span
            style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a" }}
          >
            Danh Mục Dịch Vụ
          </span>
          <span className={styles.skuBadge}>{filteredServices.length}</span>
        </div>

        <div
          style={{
            display: "flex",
            padding: "0.25rem",
            borderRadius: "0.5rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={() => setViewMode("list")}
            className={styles.pageBtn}
            style={
              viewMode === "list"
                ? {
                    background: "#ffffff",
                    fontWeight: 700,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }
                : {}
            }
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              view_list
            </span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={styles.pageBtn}
            style={
              viewMode === "grid"
                ? {
                    background: "#ffffff",
                    fontWeight: 700,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }
                : {}
            }
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              grid_view
            </span>
          </button>
        </div>
      </div>

      {/* Bộ lọc và ô tìm kiếm */}
      <div className={styles.searchFilterGrid}>
        <div className={styles.searchBox}>
          <span className={`material-symbols-outlined ${styles.searchIcon}`}>
            search
          </span>
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
            placeholder="Tìm theo mã SKU, tên dịch vụ (ví dụ: 'an uong' khớp 'Ăn uống')..."
            type="text"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className={styles.searchClearBtn}
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.selectControl}
          >
            <option value="All">Tất cả nhóm ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat.CategoryId} value={cat.CategoryId}>
                {cat.CategoryName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.selectControl}
          >
            <option value="All">Trạng thái: Tất cả</option>
            <option value="Active">Đang hoạt động (Active)</option>
            <option value="Inactive">Ngừng cung cấp (Inactive)</option>
          </select>
        </div>
      </div>

      {/* Hàng bộ lọc nâng cao: Sắp xếp (sortBy) & Khoảng giá (minPrice - maxPrice) */}
      <div className={styles.filterRowAdvanced}>
        {/* Sắp xếp */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.selectControl}
            title="Sắp xếp danh sách dịch vụ"
          >
            <option value="name_asc">Sắp xếp: Tên A→Z (Mặc định)</option>
            <option value="price_asc">Giá: Thấp đến Cao</option>
            <option value="price_desc">Giá: Cao đến Thấp</option>
          </select>
        </div>

        {/* Khoảng giá */}
        <div className={styles.priceRangeGroup}>
          <input
            type="number"
            min="0"
            step="10000"
            placeholder="Giá từ (VND)..."
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.priceRangeInput}
            title="Đơn giá tối thiểu"
          />
          <span className={styles.priceRangeSeparator}>-</span>
          <input
            type="number"
            min="0"
            step="10000"
            placeholder="Đến (VND)..."
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.priceRangeInput}
            title="Đơn giá tối đa"
          />
        </div>

        {/* Nút đặt lại bộ lọc */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className={styles.resetFilterBtn}
            type="button"
            title="Đặt lại toàn bộ tiêu chí lọc"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Đặt lại</span>
          </button>
        )}

        {/* Thông báo lỗi khi minPrice > maxPrice (ERROR_0004_INVALID_FORMAT) */}
        {isPriceRangeInvalid && (
          <div className={styles.filterErrorText}>
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>Khoảng giá không hợp lệ: Giá tối thiểu không được lớn hơn giá tối đa (ERROR_0004)</span>
          </div>
        )}
      </div>

      {/* Danh sách dịch vụ hoặc Empty state */}
      {paginatedServices.length === 0 ? (
        <div className={styles.emptyState}>
          <span
            className="material-symbols-outlined text-[48px]"
            style={{ color: "#94a3b8", marginBottom: "0.5rem" }}
          >
            search_off
          </span>
          <p style={{ fontWeight: 600, color: "#1e293b", margin: 0 }}>
            Không tìm thấy dịch vụ phù hợp với điều kiện lọc
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              marginTop: "0.25rem",
            }}
          >
            Vui lòng thử từ khóa khác hoặc điều chỉnh lại bộ lọc trạng thái.
          </p>
        </div>
      ) : (
        <div
          className={`${styles.serviceList} ${viewMode === "grid" ? styles.serviceGridMode : ""}`}
        >
          {paginatedServices.map((svc) => {
            const isSelected = svc.ServiceCode === selectedCode;
            const isActive = svc.Status === "Active";

            return (
              <div
                key={svc.ServiceCode || svc.ServiceId}
                onClick={() => onSelect(svc.ServiceCode)}
                className={`${styles.serviceCard} ${isSelected ? styles.serviceCardSelected : ""}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleGroup}>
                    <span className={styles.skuBadge}>{svc.ServiceCode}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h2 className={styles.cardTitle}>{svc.ServiceName}</h2>
                      <span className={styles.cardCategory}>
                        Nhóm: {svc.category?.CategoryName || "Tổng hợp"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={
                      isActive ? styles.badgeActive : styles.badgeInactive
                    }
                  >
                    <span
                      className={`${styles.dot} ${isActive ? styles.dotActive : styles.dotInactive}`}
                    ></span>
                    {isActive ? "Đang hoạt động" : "Ngừng cung cấp"}
                  </span>
                </div>

                <div className={styles.cardFooter}>
                  <p className={styles.cardDesc}>
                    {svc.Description || "Chưa có mô tả chi tiết quy trình."}
                  </p>
                  <div className={styles.cardPriceGroup}>
                    <span className={styles.priceTag}>
                      {formatCurrency(svc.Price)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      /{svc.Unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phân trang */}
      <div className={styles.paginationWrapper}>
        <span>
          Hiển thị{" "}
          <strong>
            {filteredServices.length === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}{" "}
            - {Math.min(currentPage * itemsPerPage, filteredServices.length)}
          </strong>{" "}
          trên tổng số <strong>{filteredServices.length}</strong> dịch vụ
        </span>

        <div className={styles.paginationControls}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={styles.pageNavBtn}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_left
            </span>
          </button>

          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`${styles.pageBtn} ${pageNum === currentPage ? styles.pageBtnActive : ""}`}
                type="button"
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={styles.pageNavBtn}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_right
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── FORM ĐẶC TẢ DỊCH VỤ (RIGHT COLUMN) ────────────────────────────────────────

const ServiceEditorSection = ({
  formData,
  setFormData,
  categories,
  isCreatingNew,
  onSave,
  onCancel,
  onToggleStatus,
  formErrors,
}) => {
  return (
    <div className={styles.rightCol}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ color: "#10b981" }}
          >
            {isCreatingNew ? "add_box" : "tune"}
          </span>
          <span
            style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a" }}
          >
            {isCreatingNew
              ? "Thêm Mới Dịch Vụ Khách Sạn"
              : "Hiệu Chỉnh Đặc Tả Dịch Vụ"}
          </span>
        </div>
        <span className={styles.skuBadge}>
          {isCreatingNew ? "Tạo Mới" : `Mã: ${formData.ServiceCode}`}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {/* Nhóm dịch vụ & Mã dịch vụ */}
        <div className={styles.formRow2}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Nhóm Dịch Vụ <span className={styles.requiredStar}>*</span>
            </label>
            <select
              value={formData.CategoryId || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : "";
                setFormData({ ...formData, CategoryId: val });
                if (formErrors.categoryId) {
                  setFormErrors((prev) => ({ ...prev, categoryId: null }));
                }
              }}
              className={`${styles.selectControl} ${formErrors.categoryId ? styles.inputError : ""}`}
            >
              <option value="">-- Chọn nhóm dịch vụ --</option>
              {categories.map((cat) => (
                <option
                  key={cat.CategoryId}
                  value={cat.CategoryId}
                  disabled={cat.IsDeleted}
                >
                  {cat.CategoryName} {cat.IsDeleted ? "(Đã ngừng)" : ""}
                </option>
              ))}
            </select>
            {formErrors.categoryId && (
              <span className={styles.errorMessage}>
                {formErrors.categoryId}
              </span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Mã Dịch Vụ (ServiceCode)</label>
            <input
              className={`${styles.inputControl} ${styles.inputReadOnly}`}
              type="text"
              readOnly
              value={
                isCreatingNew
                  ? "SVC-{NHÓM}-{SỐ} (Tự sinh)"
                  : formData.ServiceCode || ""
              }
              title="Mã dịch vụ tự sinh duy nhất toàn hệ thống, không cho sửa"
            />
          </div>
        </div>

        {/* Tên dịch vụ */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Tên Dịch Vụ <span className={styles.requiredStar}>*</span>
          </label>
          <input
            className={`${styles.inputControl} ${formErrors.serviceName ? styles.inputError : ""}`}
            type="text"
            placeholder="Nhập tên dịch vụ (2–150 ký tự)"
            value={formData.ServiceName || ""}
            onChange={(e) => {
              setFormData({ ...formData, ServiceName: e.target.value });
              if (formErrors.serviceName) setFormErrors((prev) => ({ ...prev, serviceName: null }));
            }}
          />
          {formErrors.serviceName && (
            <span className={styles.errorMessage}>
              {formErrors.serviceName}
            </span>
          )}
        </div>

        {/* Đơn giá & Đơn vị tính */}
        <div className={styles.formRow2}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Đơn Giá (VND) <span className={styles.requiredStar}>*</span>
            </label>
            <input
              className={`${styles.inputControl} ${formErrors.price ? styles.inputError : ""}`}
              style={{
                textAlign: "right",
                fontWeight: 700,
                color: "#10b981",
                fontSize: "1.125rem",
              }}
              type="number"
              min="1"
              step="1"
              placeholder="0"
              value={formData.Price ?? ""}
              onChange={(e) => {
                setFormData({ ...formData, Price: e.target.value });
                if (formErrors.price) setFormErrors((prev) => ({ ...prev, price: null }));
              }}
            />
            {formErrors.price && (
              <span className={styles.errorMessage}>{formErrors.price}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Đơn Vị Tính <span className={styles.requiredStar}>*</span>
            </label>
            <input
              className={`${styles.inputControl} ${formErrors.unit ? styles.inputError : ""}`}
              type="text"
              placeholder="VD: Lượt, Giờ, Phần, Chuyến..."
              value={formData.Unit || ""}
              onChange={(e) => {
                setFormData({ ...formData, Unit: e.target.value });
                if (formErrors.unit) setFormErrors((prev) => ({ ...prev, unit: null }));
              }}
            />
            {formErrors.unit && (
              <span className={styles.errorMessage}>{formErrors.unit}</span>
            )}
          </div>
        </div>

        {/* Trạng thái dịch vụ */}
        <div className={styles.statusDisplayBox}>
          <span className={styles.formLabel}>Trạng thái hệ thống</span>
          <span
            className={
              formData.Status === "Active"
                ? styles.badgeActive
                : styles.badgeInactive
            }
          >
            <span
              className={`${styles.dot} ${formData.Status === "Active" ? styles.dotActive : styles.dotInactive}`}
            ></span>
            {formData.Status === "Active"
              ? "Đang hoạt động (Active)"
              : "Ngừng cung cấp (Inactive)"}
          </span>
        </div>

        {/* Mô tả dịch vụ */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Mô Tả Dịch Vụ (Tối đa 1000 ký tự)
          </label>
          <textarea
            className={styles.textareaControl}
            rows="3"
            placeholder="Mô tả tiêu chuẩn phục vụ, quy trình SOP đón tiếp..."
            value={formData.Description || ""}
            onChange={(e) =>
              setFormData({ ...formData, Description: e.target.value })
            }
          ></textarea>
          {formErrors.description && (
            <span className={styles.errorMessage}>
              {formErrors.description}
            </span>
          )}
        </div>

        {/* Nút thao tác */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginTop: "0.5rem",
          }}
        >
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ flex: 1, justifyContent: "center" }}
            type="submit"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>{isCreatingNew ? "Lưu Dịch Vụ Mới" : "Lưu Cập Nhật"}</span>
          </button>

          {!isCreatingNew && (
            <button
              onClick={onToggleStatus}
              className={`${styles.btn} ${formData.Status === "Active" ? styles.btnDeactivate : styles.btnReactivate}`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                {formData.Status === "Active" ? "pause_circle" : "play_circle"}
              </span>
              <span>
                {formData.Status === "Active"
                  ? "Ngừng Cung Cấp"
                  : "Kích Hoạt Lại"}
              </span>
            </button>
          )}

          {isCreatingNew && (
            <button
              onClick={onCancel}
              className={`${styles.btn} ${styles.btnCancel}`}
              type="button"
            >
              Hủy
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

// ─── TRANG CHÍNH ──────────────────────────────────────────────────────────────

const ServiceManagement = () => {
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [selectedCode, setSelectedCode] = useState("SVC-SPA-001");
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Bộ lọc & phân trang (FEAT-SERVICE-02)
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [viewMode, setViewMode] = useState("list");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form Editor
  const [formData, setFormData] = useState(INITIAL_SERVICES[0]);
  const [formErrors, setFormErrors] = useState({});

  // Thông báo & POS sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    try {
      const [svcRes, catRes] = await Promise.all([
        fetchServicesApi().catch(() => null),
        fetchCategoriesApi().catch(() => null),
      ]);

      if (
        catRes &&
        catRes.success &&
        Array.isArray(catRes.data) &&
        catRes.data.length > 0
      ) {
        setCategories(catRes.data);
      }

      if (
        svcRes &&
        svcRes.success &&
        Array.isArray(svcRes.data) &&
        svcRes.data.length > 0
      ) {
        setServices(svcRes.data);
        setSelectedCode(svcRes.data[0].ServiceCode);
        setFormData(svcRes.data[0]);
      }
    } catch (err) {
      console.info("Đang sử dụng dữ liệu mặc định hệ thống:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectService = (code) => {
    const found = services.find((s) => s.ServiceCode === code);
    if (found) {
      setSelectedCode(code);
      setFormData({ ...found });
      setIsCreatingNew(false);
      setFormErrors({});
    }
  };

  const handleAddNew = () => {
    setIsCreatingNew(true);
    setSelectedCode("");
    setFormData({
      ServiceCode: "",
      CategoryId: categories[0]?.CategoryId || 1,
      ServiceName: "",
      Price: "",
      Unit: "Lượt",
      Description: "",
      Status: "Active",
    });
    setFormErrors({});
    showToast("Đã mở mẫu tạo mới dịch vụ", "info");
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.CategoryId) {
      errors.categoryId = "Vui lòng chọn nhóm dịch vụ (ERROR_0001_REQUIRED)";
    }
    const trimmedName = (formData.ServiceName || "").trim();
    if (!trimmedName) {
      errors.serviceName =
        "Tên dịch vụ không được để trống (ERROR_0001_REQUIRED)";
    } else if (trimmedName.length < 2) {
      errors.serviceName =
        "Tên dịch vụ phải có ít nhất 2 ký tự (ERROR_0002_MIN_LENGTH)";
    } else if (trimmedName.length > 150) {
      errors.serviceName =
        "Tên dịch vụ không được vượt quá 150 ký tự (ERROR_0003_MAX_LENGTH)";
    }

    const numPrice = Number(formData.Price);
    if (
      formData.Price === undefined ||
      formData.Price === "" ||
      isNaN(numPrice)
    ) {
      errors.price = "Đơn giá không đúng định dạng (ERROR_0004_INVALID_FORMAT)";
    } else if (numPrice <= 0) {
      errors.price = "Đơn giá phải lớn hơn 0 (ERROR_0012_OUT_OF_RANGE)";
    }

    const trimmedUnit = (formData.Unit || "").trim();
    if (!trimmedUnit) {
      errors.unit = "Đơn vị tính không được để trống (ERROR_0001_REQUIRED)";
    } else if (trimmedUnit.length > 50) {
      errors.unit =
        "Đơn vị tính không được vượt quá 50 ký tự (ERROR_0003_MAX_LENGTH)";
    }

    if (formData.Description && formData.Description.length > 1000) {
      errors.description =
        "Mô tả không được vượt quá 1000 ký tự (ERROR_0003_MAX_LENGTH)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast("Vui lòng kiểm tra lại các trường lỗi trên form!", "error");
      return;
    }

    try {
      if (isCreatingNew) {
        let created;
        try {
          const res = await createServiceApi(formData);
          created = res.data;
          if (res.data?.warning) {
            showToast(res.data.warning, "warning");
          }
        } catch (apiErr) {
          if (apiErr.code) {
            showToast(`${apiErr.code}: ${apiErr.message}`, "error");
            return;
          }
          const prefix =
            categories
              .find((c) => c.CategoryId === formData.CategoryId)
              ?.CategoryName?.slice(0, 3)
              .toUpperCase() || "SVC";
          created = {
            ...formData,
            ServiceId: Date.now(),
            ServiceCode: `SVC-${prefix}-${String(services.length + 1).padStart(3, "0")}`,
            category: categories.find(
              (c) => c.CategoryId === formData.CategoryId,
            ),
          };
        }

        const nextList = [created, ...services];
        setServices(nextList);
        setSelectedCode(created.ServiceCode);
        setFormData(created);
        setIsCreatingNew(false);
        showToast(
          "Thêm mới dịch vụ thành công (SUCCESS_0001_CREATED)",
          "success",
        );
      } else {
        try {
          await updateServiceApi(
            formData.ServiceCode || formData.ServiceId,
            formData,
          );
        } catch (apiErr) {
          if (apiErr.code) {
            showToast(`${apiErr.code}: ${apiErr.message}`, "error");
            return;
          }
        }

        const updated = services.map((s) =>
          s.ServiceCode === formData.ServiceCode ? { ...formData } : s,
        );
        setServices(updated);
        showToast(
          `Đã lưu cập nhật cho dịch vụ ${formData.ServiceCode}!`,
          "success",
        );
      }
    } catch (err) {
      showToast(err.message || "Lỗi khi lưu dữ liệu", "error");
    }
  };

  const handleToggleStatus = async () => {
    const isCurrentlyActive = formData.Status === "Active";

    try {
      if (isCurrentlyActive) {
        try {
          await deactivateServiceApi(
            formData.ServiceCode || formData.ServiceId,
          );
        } catch (apiErr) {
          if (apiErr.code) {
            showToast(`${apiErr.code}: ${apiErr.message}`, "error");
            return;
          }
        }
        const updated = { ...formData, Status: "Inactive" };
        setFormData(updated);
        setServices((prev) =>
          prev.map((s) =>
            s.ServiceCode === formData.ServiceCode ? updated : s,
          ),
        );
        showToast(
          `Dịch vụ ${formData.ServiceCode} đã chuyển sang trạng thái: "Ngừng cung cấp"`,
          "warning",
        );
      } else {
        try {
          await reactivateServiceApi(
            formData.ServiceCode || formData.ServiceId,
          );
        } catch (apiErr) {
          if (apiErr.code) {
            showToast(`${apiErr.code}: ${apiErr.message}`, "error");
            return;
          }
        }
        const updated = { ...formData, Status: "Active" };
        setFormData(updated);
        setServices((prev) =>
          prev.map((s) =>
            s.ServiceCode === formData.ServiceCode ? updated : s,
          ),
        );
        showToast(
          `Dịch vụ ${formData.ServiceCode} đã kích hoạt thành công (Active)!`,
          "success",
        );
      }
    } catch (err) {
      showToast("Lỗi khi cập nhật trạng thái dịch vụ", "error");
    }
  };

  const handleSyncPOS = async () => {
    setIsSyncing(true);
    try {
      const res = await syncPosApi();
      showToast(res.message || "Đồng bộ giá sang POS thành công!", "success");
    } catch (err) {
      showToast(
        err.message || "Đồng bộ giá sang POS thất bại — vui lòng thử lại.",
        "error",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const headers = [
        "Mã Dịch Vụ",
        "Tên Dịch Vụ",
        "Nhóm",
        "Đơn Giá (VND)",
        "Đơn Vị",
        "Trạng Thái",
      ];
      const rows = services.map((s) => [
        `"${s.ServiceCode}"`,
        `"${s.ServiceName}"`,
        `"${s.category?.CategoryName || ""}"`,
        Math.floor(Number(s.Price)),
        `"${s.Unit}"`,
        `"${s.Status}"`,
      ]);

      const csvContent =
        "\uFEFF" +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Bang_Gia_Dich_Vu_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Đã xuất file bảng giá CSV thành công!", "success");
    } catch (err) {
      showToast("Lỗi khi tạo file xuất dữ liệu!", "error");
    }
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
        {/* Toast thông báo */}
        {notification && (
          <div
            className={`${styles.toast} ${
              notification.type === "error"
                ? styles.toastError
                : notification.type === "warning"
                  ? styles.toastWarning
                  : notification.type === "info"
                    ? styles.toastInfo
                    : styles.toastSuccess
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {notification.type === "error"
                ? "error"
                : notification.type === "warning"
                  ? "warning"
                  : notification.type === "info"
                    ? "info"
                    : "check_circle"}
            </span>
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              {notification.message}
            </span>
          </div>
        )}

        {/* 1. Header tác vụ */}
        <HeaderSection
          onAddNew={handleAddNew}
          onExportExcel={handleExportExcel}
          onSyncPOS={handleSyncPOS}
          isSyncing={isSyncing}
        />

        {/* 2. Chỉ số KPI */}
        <OverviewKpiCards services={services} categories={categories} />

        {/* 3. Khung 2 cột chính */}
        <div className={styles.mainGrid}>
          <ServiceListSection
            services={services}
            categories={categories}
            selectedCode={selectedCode}
            onSelect={handleSelectService}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
          />

          <ServiceEditorSection
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            isCreatingNew={isCreatingNew}
            onSave={handleSave}
            onCancel={() => {
              setIsCreatingNew(false);
              if (services.length > 0)
                handleSelectService(services[0].ServiceCode);
            }}
            onToggleStatus={handleToggleStatus}
            formErrors={formErrors}
          />
        </div>
      </div>
    </AdminLayout>
  );
};

export default ServiceManagement;
