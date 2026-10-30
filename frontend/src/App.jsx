import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Home from './pages/client/Home';
import SearchRooms from './pages/SearchRooms';
import RoomDetail from './pages/client/RoomDetail';
import BookingEngine from './pages/client/BookingEngine';
import DepositPayment from './pages/client/DepositPayment';
import Auth from './pages/Auth';
import MenuManagement from './pages/admin/menu/MenuManagement';
import RoomAvailability from './pages/admin/menu/RoomAvailability';
import RoomTypeManagement from './pages/RoomTypeManagement';
import RoomManagement from './pages/RoomManagement';
import StaffManagement from './pages/StaffManagement';
import RoomService from './pages/client/RoomService';
import Profile from './pages/client/Profile';
import MyBookings from './pages/client/MyBookings';
import KitchenDisplay from './pages/admin/fnb/KitchenDisplay';
import OrderDispatchHub from './pages/admin/fnb/OrderDispatchHub';
import FnbOrderHistory from './pages/admin/fnb/FnbOrderHistory';
import GuestOrderHistory from './pages/client/GuestOrderHistory';
import TableReservation from './pages/client/TableReservation';
import LoyaltyManagement from './pages/LoyaltyManagement';
import ServiceManagement from './pages/admin/services/ServiceManagement';
import ServiceDispatchTerminal from './pages/admin/services/ServiceDispatchTerminal';
import ServiceOrdersKanban from './pages/admin/services/ServiceOrdersKanban';
import RoomStatusManagement from './pages/RoomStatusManagement';
import BookingManagement from './pages/BookingManagement';
import RoomAssignment from './pages/admin/RoomAssignment';
import CheckInDesk from './pages/admin/CheckInDesk';
import CheckOutDesk from './pages/admin/CheckOutDesk';
import FnbReview from './pages/client/FnbReview';
import MockPaymentGateway from './pages/client/MockPaymentGateway';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ExtendStayAndMove from './pages/admin/ExtendStayAndMove';
import MinibarManagement from './pages/admin/MinibarManagement';

// tuyen/7 imports:
import MarketingDashboard from './pages/admin/marketing/MarketingDashboard';
import CampaignComposer from './pages/admin/marketing/CampaignComposer';
import ConsumablesInventory from './pages/admin/housekeeping/ConsumablesInventory';
import LinenManagement from './pages/admin/housekeeping/LinenManagement';
import LostAndFoundManagement from './pages/admin/housekeeping/LostAndFoundManagement';
import SmartLockManagement from './pages/admin/security/SmartLockManagement';
import MaintenanceDashboard from './pages/admin/engineering/MaintenanceDashboard';
import MaintenanceTicketCreate from './pages/admin/engineering/MaintenanceTicketCreate';
import AuditLogs from './pages/AuditLogs';
import RosterShifts from './pages/RosterShifts';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rooms" element={<SearchRooms />} />
            <Route path="/rooms/search" element={<SearchRooms />} />
            <Route path="/tim-kiem" element={<SearchRooms />} />
            <Route path="/rooms/:id" element={<RoomDetail />} />
            <Route path="/room/:id" element={<RoomDetail />} />
            <Route path="/dat-phong" element={<BookingEngine />} />
            <Route path="/booking" element={<BookingEngine />} />
            <Route path="/checkout" element={<BookingEngine />} />
            <Route path="/checkout/step-1" element={<BookingEngine />} />
            <Route path="/payment" element={<DepositPayment />} />
            <Route path="/thanh-toan" element={<DepositPayment />} />
            <Route path="/checkout/payment" element={<DepositPayment />} />
            <Route path="/checkout/step-2" element={<DepositPayment />} />
            <Route path="/mock-payment/:transactionCode" element={<MockPaymentGateway />} />
            <Route path="/room-service" element={<RoomService />} />
            <Route path="/fnb/history" element={<GuestOrderHistory />} />
            <Route path="/lich-su-dat-mon" element={<GuestOrderHistory />} />
            <Route path="/fnb/danh-gia" element={<FnbReview />} />
            <Route path="/danh-gia" element={<FnbReview />} />
            <Route path="/fnb/dat-ban" element={<TableReservation />} />
            <Route path="/dat-ban" element={<TableReservation />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/me/bookings" element={<MyBookings />} />
            <Route path="/lich-su-dat-phong" element={<MyBookings />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />

            {/* Phân hệ Quản trị (Admin / Nội bộ) - Được bảo vệ bằng RBAC Database */}
            <Route path="/admin" element={<ProtectedRoute><Navigate to="/admin/menu" replace /></ProtectedRoute>} />
            <Route path="/admin/menu" element={<ProtectedRoute><MenuManagement /></ProtectedRoute>} />
            <Route path="/admin/room-types" element={<ProtectedRoute><RoomTypeManagement /></ProtectedRoute>} />
            <Route path="/admin/rooms" element={<ProtectedRoute><RoomManagement /></ProtectedRoute>} />
            <Route path="/admin/bookings" element={<ProtectedRoute requiredPermission="BOOKING_VIEW"><BookingManagement /></ProtectedRoute>} />
            <Route path="/admin/dat-phong" element={<ProtectedRoute requiredPermission="BOOKING_VIEW"><BookingManagement /></ProtectedRoute>} />
            <Route path="/admin/danh-sach-dat-phong" element={<ProtectedRoute requiredPermission="BOOKING_VIEW"><BookingManagement /></ProtectedRoute>} />
            <Route path="/admin/room-assignment" element={<ProtectedRoute><RoomAssignment /></ProtectedRoute>} />
            <Route path="/admin/room-assignment/:bookingId" element={<ProtectedRoute><RoomAssignment /></ProtectedRoute>} />
            <Route path="/admin/room-allocation" element={<ProtectedRoute><RoomAssignment /></ProtectedRoute>} />
            <Route path="/admin/gan-phong" element={<ProtectedRoute><RoomAssignment /></ProtectedRoute>} />
            <Route path="/admin/checkin" element={<Navigate to="/admin/check-in" replace />} />
            <Route path="/admin/check-in" element={<ProtectedRoute><CheckInDesk /></ProtectedRoute>} />
            <Route path="/admin/check-in/:bookingId" element={<ProtectedRoute><CheckInDesk /></ProtectedRoute>} />
            <Route path="/admin/guest-check-in" element={<ProtectedRoute><CheckInDesk /></ProtectedRoute>} />

            {/* Phân hệ Gia hạn lưu trú & Đổi phòng (FEAT-STAY-EXTEND-01 / Spec 9) */}
            <Route path="/admin/extend-stay" element={<ProtectedRoute><ExtendStayAndMove /></ProtectedRoute>} />
            <Route path="/admin/extend-stay/:stayId" element={<ProtectedRoute><ExtendStayAndMove /></ProtectedRoute>} />
            <Route path="/admin/gia-han-luu-tru" element={<ProtectedRoute><ExtendStayAndMove /></ProtectedRoute>} />
            <Route path="/admin/gia-han-luu-tru/:stayId" element={<ProtectedRoute><ExtendStayAndMove /></ProtectedRoute>} />
            <Route path="/admin/doi-phong" element={<ProtectedRoute><ExtendStayAndMove /></ProtectedRoute>} />
            <Route path="/admin/doi-phong/:stayId" element={<ProtectedRoute><ExtendStayAndMove /></ProtectedRoute>} />

            {/* Phân hệ Check-out & Kiểm phòng (FEAT-CHECKOUT-INSPECT-01 / Spec 11) */}
            <Route path="/admin/check-out" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/check-out/:stayId" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/guest-check-out" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/kiem-phong" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/tra-phong" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />

            {/* Phân hệ Quản lý Minibar phòng (FEAT-MINIBAR-01 / Spec 12) */}
            <Route path="/admin/minibar" element={<ProtectedRoute><MinibarManagement /></ProtectedRoute>} />
            <Route path="/admin/minibar/:stayId" element={<ProtectedRoute><MinibarManagement /></ProtectedRoute>} />
            <Route path="/admin/quan-ly-minibar" element={<ProtectedRoute><MinibarManagement /></ProtectedRoute>} />
            <Route path="/admin/quan-ly-minibar/:stayId" element={<ProtectedRoute><MinibarManagement /></ProtectedRoute>} />
            <Route path="/admin/room-availability" element={<ProtectedRoute><RoomAvailability /></ProtectedRoute>} />
            <Route path="/admin/so-do-phong" element={<ProtectedRoute><RoomStatusManagement /></ProtectedRoute>} />
            <Route path="/admin/room-status" element={<ProtectedRoute><RoomStatusManagement /></ProtectedRoute>} />
            <Route path="/admin/le-tan" element={<ProtectedRoute><RoomStatusManagement /></ProtectedRoute>} />
            <Route path="/admin/buong-phong" element={<ProtectedRoute><RoomStatusManagement /></ProtectedRoute>} />
            
            {/* Quản lý tài khoản và phân quyền người dùng nội bộ (FEAT-USER-01 / Spec 3) - Chỉ Admin (USER_MANAGE) */}
            <Route path="/admin/staff" element={<ProtectedRoute requiredPermission="USER_MANAGE"><StaffManagement /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredPermission="USER_MANAGE"><StaffManagement /></ProtectedRoute>} />
            <Route path="/admin/quan-tri" element={<Navigate to="/admin/staff" replace />} />
            <Route path="/admin/staff-accounts" element={<Navigate to="/admin/staff" replace />} />

            <Route path="/admin/fnb/kitchen" element={<ProtectedRoute><KitchenDisplay /></ProtectedRoute>} />
            <Route path="/admin/fnb/dispatch" element={<ProtectedRoute><OrderDispatchHub /></ProtectedRoute>} />
            <Route path="/admin/fnb/room-service" element={<ProtectedRoute><RoomService /></ProtectedRoute>} />
            <Route path="/admin/fnb/history" element={<ProtectedRoute><FnbOrderHistory /></ProtectedRoute>} />
            <Route path="/admin/services" element={<ProtectedRoute><ServiceManagement /></ProtectedRoute>} />
            <Route path="/admin/services/dispatch" element={<ProtectedRoute><ServiceDispatchTerminal /></ProtectedRoute>} />
            <Route path="/admin/services/orders" element={<ProtectedRoute><ServiceOrdersKanban /></ProtectedRoute>} />
            <Route path="/admin/services/kanban" element={<ProtectedRoute><ServiceOrdersKanban /></ProtectedRoute>} />
            <Route path="/admin/loyalty" element={<ProtectedRoute><LoyaltyManagement /></ProtectedRoute>} />

            {/* tuyen/7 Operations, Smart Lock, Housekeeping & Maintenance Routes */}
            <Route path="/admin/marketing" element={<ProtectedRoute><MarketingDashboard /></ProtectedRoute>} />
            <Route path="/admin/marketing/new" element={<ProtectedRoute><CampaignComposer /></ProtectedRoute>} />
            <Route path="/admin/housekeeping" element={<ProtectedRoute><ConsumablesInventory /></ProtectedRoute>} />
            <Route path="/admin/housekeeping/inventory" element={<ProtectedRoute><ConsumablesInventory /></ProtectedRoute>} />
            <Route path="/admin/housekeeping/linen" element={<ProtectedRoute><LinenManagement /></ProtectedRoute>} />
            <Route path="/admin/housekeeping/lost-and-found" element={<ProtectedRoute><LostAndFoundManagement /></ProtectedRoute>} />
            <Route path="/admin/lost-and-found" element={<ProtectedRoute><LostAndFoundManagement /></ProtectedRoute>} />
            <Route path="/admin/engineering" element={<ProtectedRoute><MaintenanceDashboard /></ProtectedRoute>} />
            <Route path="/admin/engineering/new" element={<ProtectedRoute><MaintenanceTicketCreate /></ProtectedRoute>} />
            <Route path="/admin/security/smart-lock" element={<ProtectedRoute><SmartLockManagement /></ProtectedRoute>} />
            <Route path="/admin/smart-lock" element={<ProtectedRoute><SmartLockManagement /></ProtectedRoute>} />
            <Route path="/admin/ekey" element={<ProtectedRoute><SmartLockManagement /></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
            <Route path="/admin/roster" element={<ProtectedRoute><RosterShifts /></ProtectedRoute>} />
            <Route path="/admin/shifts" element={<ProtectedRoute><RosterShifts /></ProtectedRoute>} />
            <Route path="/admin/dieu-do-ca" element={<ProtectedRoute><RosterShifts /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
