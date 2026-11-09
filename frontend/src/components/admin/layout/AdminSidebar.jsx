import React, { useState, useEffect, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

// Danh sách nhóm chức năng trên Sidebar PMS (gom nhóm gọn gàng theo phân hệ nghiệp vụ)
const NAV_GROUPS = [
  {
    id: "overview",
    title: "Tổng Quan & Sơ Đồ",
    icon: "space_dashboard",
    items: [
      {
        icon: "grid_view",
        label: "Bàn Làm Việc",
        to: "/admin/ban-lam-viec",
        allowedRoles: ["Admin", "Receptionist", "Kitchen", "Housekeeping"],
      },
      {
        icon: "room_service",
        label: "Lễ Tân & Tiền Sảnh",
        to: "/admin/le-tan",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "dashboard",
        label: "Sơ Đồ Phòng (Real-time)",
        to: "/admin/room-availability",
        allowedRoles: ["Admin", "Receptionist", "Housekeeping"],
      },
      {
        icon: "grid_on",
        label: "Sơ Đồ & Trạng Thái Phòng",
        to: "/admin/so-do-phong",
        allowedRoles: ["Admin", "Receptionist", "Housekeeping"],
      },
    ],
  },
  {
    id: "front_desk",
    title: "Lễ Tân & Lưu Trú",
    icon: "concierge",
    items: [
      {
        icon: "receipt_long",
        label: "Quản Lý Đặt Phòng",
        to: "/admin/dat-phong",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "assignment_turned_in",
        label: "Gán Phòng (Allocation)",
        to: "/admin/room-assignment",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "how_to_reg",
        label: "Check-in Tại Quầy",
        to: "/admin/check-in",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "more_time",
        label: "Gia Hạn & Đổi Phòng",
        to: "/admin/extend-stay",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "logout",
        label: "Check-Out & Kiểm Phòng",
        to: "/admin/check-out",
        allowedRoles: ["Admin", "Receptionist"],
      },
    ],
  },
  {
    id: "finance",
    title: "Tài Chính & Hoá Đơn",
    icon: "account_balance",
    items: [
      {
        icon: "receipt",
        label: "Bảng Kê Chi Phí (Folio)",
        to: "/admin/charges",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "dark_mode",
        label: "Kiểm Toán Đêm Tự Động",
        to: "/admin/night-audit",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "account_balance",
        label: "Tài Chính & Sổ Cái",
        to: "/admin/tai-chinh",
        allowedRoles: ["Admin", "Receptionist"],
      },
    ],
  },
  {
    id: "services_fnb",
    title: "Dịch Vụ & Ẩm Thực (F&B)",
    icon: "spa",
    items: [
      {
        icon: "spa",
        label: "Danh Mục Dịch Vụ",
        to: "/admin/services",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "event_available",
        label: "Tiếp Nhận & Đặt Dịch Vụ",
        to: "/admin/services/dispatch",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "pending_actions",
        label: "Tiến Độ Đơn Dịch Vụ",
        to: "/admin/services/orders",
        allowedRoles: ["Admin", "Receptionist", "Housekeeping"],
      },
      {
        icon: "restaurant",
        label: "Quản Lý Thực Đơn (F&B)",
        to: "/admin/menu",
        allowedRoles: ["Admin", "Kitchen", "Receptionist"],
      },
      {
        icon: "inventory_2",
        label: "Kho Nguyên Liệu Bếp",
        to: "/admin/fnb/kitchen-inventory",
        allowedRoles: ["Admin", "Kitchen"],
      },
      {
        icon: "table_restaurant",
        label: "Sơ Đồ Bàn Ăn (Table Map)",
        to: "/admin/fnb/table-map",
        allowedRoles: ["Admin", "Kitchen", "Receptionist"],
      },
      {
        icon: "soup_kitchen",
        label: "Màn Hình Bếp (KDS)",
        to: "/admin/fnb/kitchen",
        allowedRoles: ["Admin", "Kitchen"],
      },
      {
        icon: "local_shipping",
        label: "Theo Dõi & Giao Món",
        to: "/admin/fnb/dispatch",
        allowedRoles: ["Admin", "Kitchen", "Receptionist"],
      },
      {
        icon: "receipt_long",
        label: "Lịch Sử & Tổng Hợp F&B",
        to: "/admin/fnb/history",
        allowedRoles: ["Admin", "Kitchen", "Receptionist"],
      },
    ],
  },
  {
    id: "housekeeping_eng",
    title: "Buồng Phòng & Kỹ Thuật",
    icon: "cleaning_services",
    items: [
      {
        icon: "cleaning_services",
        label: "Điều Phối Buồng Phòng",
        to: "/admin/buong-phong",
        allowedRoles: ["Admin", "Receptionist", "Housekeeping"],
      },
      {
        icon: "kitchen",
        label: "Quản Lý Minibar Phòng",
        to: "/admin/minibar",
        allowedRoles: ["Admin", "Receptionist", "Housekeeping"],
      },
      {
        icon: "inventory_2",
        label: "Kho Đồ Tiêu Hao & Minibar",
        to: "/admin/housekeeping/inventory",
        allowedRoles: ["Admin", "Housekeeping", "Receptionist"],
      },
      {
        icon: "dry_cleaning",
        label: "Đồ Vải & Chu Kỳ Giặt Ủi",
        to: "/admin/housekeeping/linen",
        allowedRoles: ["Admin", "Housekeeping"],
      },
      {
        icon: "search_hands_free",
        label: "Đồ Thất Lạc & Bỏ Quên",
        to: "/admin/housekeeping/lost-and-found",
        allowedRoles: ["Admin", "Housekeeping", "Receptionist"],
      },
      {
        icon: "engineering",
        label: "Bảo Trì & Kỹ Thuật",
        to: "/admin/engineering",
        allowedRoles: ["Admin", "Receptionist", "Housekeeping"],
      },
    ],
  },
  {
    id: "rooms_security",
    title: "Cấu Hình Phòng & Vận Hành",
    icon: "meeting_room",
    items: [
      {
        icon: "bedroom_parent",
        label: "Quản Lý Hạng Phòng",
        to: "/admin/room-types",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "meeting_room",
        label: "Quản Lý Phòng Vật Lý",
        to: "/admin/rooms",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "key",
        label: "Khóa Thông Minh & E-Key",
        to: "/admin/security/smart-lock",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "event_available",
        label: "Điều Độ Lịch Trực Ca",
        to: "/admin/roster",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "directions_car",
        label: "Đón Tiễn Sân Bay & Đội Xe",
        to: "/admin/transportation",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "local_police",
        label: "Khai Báo Tạm Trú Công An (A08)",
        to: "/admin/police-declaration",
        allowedRoles: ["Admin", "Receptionist"],
      },
    ],
  },
  {
    id: "crm_ai_system",
    title: "CSKH, AI & Hệ Thống",
    icon: "admin_panel_settings",
    items: [
      {
        icon: "neurology",
        label: "AI Concierge & Chatbot",
        to: "/admin/ai-concierge",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "loyalty",
        label: "Khách Hàng & Hội Viên",
        to: "/admin/loyalty",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "campaign",
        label: "Tiếp Thị & CSKH (Marketing)",
        to: "/admin/marketing",
        allowedRoles: ["Admin", "Receptionist"],
      },
      {
        icon: "security",
        label: "Kiểm Soát Nội Bộ & Nhật Ký",
        to: "/admin/audit-logs",
        allowedRoles: ["Admin"],
      },
      // Quản lý tài khoản (USER_MANAGE) — Spec 3: CHỈ ADMIN mới nhìn thấy menu này!
      {
        icon: "manage_accounts",
        label: "Tài Khoản & Phân Quyền",
        to: "/admin/staff",
        allowedRoles: ["Admin"],
        requiredPermission: "USER_MANAGE",
      },
      {
        icon: "admin_panel_settings",
        label: "Quản Trị Hệ Thống",
        to: "/admin/quan-tri",
        allowedRoles: ["Admin"],
      },
    ],
  },
];

const AdminSidebar = ({ isCollapsed = false, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const userRole = user?.roleName || "Staff";
  const isAdmin = user?.roleId === 1 || userRole === "Admin";

  // Lọc các nhóm và mục menu theo vai trò người dùng (Spec 3 - Mục 3.1 & 3.6)
  const visibleGroups = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return NAV_GROUPS.map((group) => {
      const items = group.items.filter((item) => {
        if (!isAdmin) {
          if (item.requiredPermission === "USER_MANAGE") return false;
          if (item.allowedRoles && !item.allowedRoles.includes(userRole))
            return false;
        }
        if (q && !item.label.toLowerCase().includes(q) && !group.title.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      });
      return { ...group, items };
    }).filter((group) => group.items.length > 0);
  }, [isAdmin, userRole, searchTerm]);

  // Kiểm tra một nhóm có chứa đường dẫn hiện tại không
  const isGroupActive = (group) =>
    group.items.some(
      (item) =>
        location.pathname === item.to ||
        (item.to !== "/admin" && location.pathname.startsWith(item.to + "/"))
    );

  // Quản lý trạng thái đóng/mở từng nhóm (lưu vào localStorage)
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_open_groups");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      overview: true,
      front_desk: true,
    };
  });

  // Tự động mở nhóm chứa trang hiện tại khi chuyển route
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((g) =>
      g.items.some(
        (item) =>
          location.pathname === item.to ||
          (item.to !== "/admin" && location.pathname.startsWith(item.to + "/"))
      )
    );
    if (activeGroup) {
      setOpenGroups((prev) => {
        if (prev[activeGroup.id]) return prev;
        const next = { ...prev, [activeGroup.id]: true };
        try {
          localStorage.setItem("admin_sidebar_open_groups", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  }, [location.pathname]);

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem("admin_sidebar_open_groups", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const expandOrCollapseAll = () => {
    const anyOpen = visibleGroups.some((g) => openGroups[g.id]);
    const next = {};
    visibleGroups.forEach((g) => {
      next[g.id] = !anyOpen;
    });
    setOpenGroups(next);
    try {
      localStorage.setItem("admin_sidebar_open_groups", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Badge màu theo vai trò (Spec 3 - Wireframe 6.1)
  const getRoleBadge = (role) => {
    switch (role) {
      case "Admin":
        return {
          bg: "bg-red-800 text-red-100 border-red-700/60",
          text: "Quản Trị Viên",
        };
      case "Receptionist":
        return {
          bg: "bg-blue-800 text-blue-100 border-blue-700/60",
          text: "Lễ Tân",
        };
      case "Kitchen":
        return {
          bg: "bg-amber-700 text-amber-100 border-amber-600/60",
          text: "Bếp / F&B",
        };
      case "Housekeeping":
        return {
          bg: "bg-emerald-800 text-emerald-100 border-emerald-700/60",
          text: "Dọn Phòng",
        };
      default:
        return {
          bg: "bg-slate-700 text-slate-200 border-slate-600",
          text: role || "Nhân Viên",
        };
    }
  };

  const badgeInfo = getRoleBadge(userRole);
  const isSearching = searchTerm.trim().length > 0;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen ${
        isCollapsed ? "w-20" : "w-72"
      } bg-surface-container-lowest z-50 shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out border-r border-outline-variant/20`}
    >
      <div className="h-full flex flex-col justify-between overflow-hidden">
        {/* Top Brand */}
        <div
          className={`h-16 ${
            isCollapsed ? "px-2 justify-center" : "px-space-md justify-start"
          } flex items-center bg-surface-container-low flex-shrink-0 border-b border-outline-variant/20`}
        >
          {isCollapsed ? (
            <div className="w-9 h-9 rounded-lg bg-admin-primary flex items-center justify-center text-on-admin-primary shadow-[0_0_10px_rgba(16,185,129,0.25)]">
              <span className="material-symbols-outlined text-[20px]">
                corporate_fare
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-space-sm overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-admin-primary flex items-center justify-center text-on-admin-primary shadow-[0_0_10px_rgba(16,185,129,0.25)] flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">
                  corporate_fare
                </span>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-headline-sm text-label-md uppercase tracking-wider text-on-surface font-bold truncate">
                  Grand Horizon
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-admin-primary font-semibold truncate">
                  Resort &amp; Suites • PMS
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Search & Group Controls (only when expanded) */}
        {!isCollapsed && (
          <div className="px-space-md pt-space-sm pb-1 flex-shrink-0 border-b border-outline-variant/10">
            <div className="relative">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nhanh chức năng..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-surface-container border border-outline-variant/20 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-admin-primary transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                  title="Xoá tìm kiếm"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    close
                  </span>
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 mb-1 px-1">
              <span className="font-label-sm text-[10px] uppercase text-on-surface-variant font-bold tracking-wider">
                Phân Hệ Tác Nghiệp ({visibleGroups.length} nhóm)
              </span>
              <button
                type="button"
                onClick={expandOrCollapseAll}
                className="text-[10px] text-admin-primary hover:underline font-semibold cursor-pointer"
              >
                {visibleGroups.some((g) => openGroups[g.id])
                  ? "Thu gọn nhóm"
                  : "Mở hết nhóm"}
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Groups */}
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden ${
            isCollapsed ? "px-space-xs py-space-sm" : "px-space-sm py-space-xs"
          } space-y-1.5`}
        >
          {visibleGroups.map((group, groupIndex) => {
            const isOpen = isSearching || Boolean(openGroups[group.id]);
            const hasActiveChild = isGroupActive(group);

            if (isCollapsed) {
              return (
                <div
                  key={group.id}
                  className={`${
                    groupIndex > 0
                      ? "pt-1.5 border-t border-outline-variant/15"
                      : ""
                  } flex flex-col gap-1`}
                >
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={`${group.title} • ${item.label}`}
                      end={true}
                      className={({ isActive }) =>
                        `flex items-center justify-center w-11 h-10 mx-auto rounded-xl transition-all duration-200 group no-underline relative ${
                          isActive
                            ? "bg-admin-primary text-[#002114] font-bold shadow-sm"
                            : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <span
                          className={`material-symbols-outlined text-[20px] transition-colors flex-shrink-0 ${
                            isActive ? "text-[#002114]" : ""
                          }`}
                        >
                          {item.icon}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              );
            }

            return (
              <div
                key={group.id}
                className="rounded-xl bg-surface-container-low/50 border border-outline-variant/10 overflow-hidden"
              >
                {/* Group Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer select-none ${
                    hasActiveChild
                      ? "bg-admin-primary/10 text-admin-primary font-bold"
                      : "text-on-surface hover:bg-surface-container-high/60 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`material-symbols-outlined text-[18px] flex-shrink-0 ${
                        hasActiveChild
                          ? "text-admin-primary"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {group.icon}
                    </span>
                    <span className="text-xs uppercase tracking-wider truncate">
                      {group.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        hasActiveChild
                          ? "bg-admin-primary text-[#002114]"
                          : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {group.items.length}
                    </span>
                    <span
                      className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </div>
                </button>

                {/* Group Items */}
                {isOpen && (
                  <nav className="flex flex-col gap-0.5 px-1.5 pb-1.5 pt-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        title={item.label}
                        end={true}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-lg transition-all duration-150 group no-underline relative ${
                            isActive
                              ? "bg-admin-primary text-[#002114] font-bold shadow-xs"
                              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              className={`material-symbols-outlined text-[18px] transition-colors flex-shrink-0 ${
                                isActive ? "text-[#002114]" : ""
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                              {item.label}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#002114] flex-shrink-0" />
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </nav>
                )}
              </div>
            );
          })}
        </div>

        {/* User Card & Logout Bottom */}
        <div className="border-t border-outline-variant/20 p-space-sm bg-surface-container-low flex-shrink-0">
          {!isCollapsed ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 px-1 py-1">
                <div className="w-8 h-8 rounded-full bg-admin-primary text-[#002114] font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>
                      {(user?.fullName || "NV").substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-on-surface truncate">
                    {user?.fullName || "Nhân Viên"}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badgeInfo.bg}`}
                    >
                      {badgeInfo.text}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  title="Đăng xuất"
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    logout
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                title="Đăng xuất"
                className="w-10 h-10 rounded-xl bg-surface-container hover:bg-error/10 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  logout
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
