import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { WishlistProvider } from './context/WishlistContext';
import Home from './pages/client/Home';
import HotelsExplorer from './pages/client/HotelsExplorer';
import SearchRooms from './pages/SearchRooms';
import RoomDetail from './pages/client/RoomDetail';
import Wishlist from './pages/client/Wishlist';
import BookingEngine from './pages/client/BookingEngine';
import DepositPayment from './pages/client/DepositPayment';
import BookingConfirmation from './pages/client/BookingConfirmation';
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
import KitchenInventory from './pages/admin/fnb/KitchenInventory';
import OrderDispatchHub from './pages/admin/fnb/OrderDispatchHub';
import FnbOrderHistory from './pages/admin/fnb/FnbOrderHistory';
import TableMap from './pages/admin/fnb/TableMap';
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
import RoomReview from './pages/client/RoomReview';
import MockPaymentGateway from './pages/client/MockPaymentGateway';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ExtendStayAndMove from './pages/admin/ExtendStayAndMove';
import MinibarManagement from './pages/admin/MinibarManagement';
import BookingChargesFolio from './pages/admin/BookingChargesFolio';
import InvoiceLedger from './pages/admin/finance/InvoiceLedger';
import MasterRevenueDashboard from './pages/admin/statistics/MasterRevenueDashboard';
import AiConciergeManagement from './pages/admin/ai/AiConciergeManagement';
import FloatingAiConcierge from './components/client/FloatingAiConcierge';
import FloatingAcademicBadge from './components/common/FloatingAcademicBadge';
import ClientConcierge from './pages/client/ClientConcierge';
import RoomComparisonMatrix from './pages/client/RoomComparisonMatrix';

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
import AirportTransferManagement from './pages/admin/transportation/AirportTransferManagement';
import NightAuditManagement from './pages/admin/finance/NightAuditManagement';
import PoliceDeclarationExport from './pages/admin/security/PoliceDeclarationExport';
import ChannelManagerSync from './pages/admin/operations/ChannelManagerSync';
import BanquetMiceBooking from './pages/admin/operations/BanquetMiceBooking';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <WishlistProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/hotels" element={<HotelsExplorer />} />
              <Route path="/khach-san" element={<HotelsExplorer />} />
              <Route path="/rooms" element={<SearchRooms />} />
              <Route path="/services" element={<ServiceManagement />} />
              <Route path="/rooms/search" element={<SearchRooms />} />
              <Route path="/tim-kiem" element={<SearchRooms />} />
              <Route path="/rooms/compare" element={<RoomComparisonMatrix />} />
              <Route path="/compare" element={<RoomComparisonMatrix />} />
              <Route path="/so-sanh" element={<RoomComparisonMatrix />} />
              <Route path="/so-sanh-phong" element={<RoomComparisonMatrix />} />
              <Route path="/rooms/:id" element={<RoomDetail />} />
              <Route path="/room/:id" element={<RoomDetail />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/me/wishlist" element={<Wishlist />} />
              <Route path="/danh-sach-yeu-thich" element={<Wishlist />} />
              <Route path="/dat-phong" element={<BookingEngine />} />
            <Route path="/booking" element={<BookingEngine />} />
            <Route path="/checkout" element={<BookingEngine />} />
            <Route path="/checkout/step-1" element={<BookingEngine />} />
            <Route path="/payment" element={<DepositPayment />} />
            <Route path="/thanh-toan" element={<DepositPayment />} />
            <Route path="/checkout/payment" element={<DepositPayment />} />
            <Route path="/checkout/step-2" element={<DepositPayment />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            <Route path="/xac-nhan-dat-phong" element={<BookingConfirmation />} />
            <Route path="/mock-payment/:transactionCode" element={<MockPaymentGateway />} />
            <Route path="/room-service" element={<RoomService />} />
            <Route path="/fnb/history" element={<GuestOrderHistory />} />
            <Route path="/lich-su-dat-mon" element={<GuestOrderHistory />} />
            <Route path="/fnb/danh-gia" element={<FnbReview />} />
            <Route path="/danh-gia" element={<FnbReview />} />
            {/* FEAT-GUEST-11: Room Review & Rating (Màn hình 10 - Post-Stay Evaluation & Verified Guest Review) */}
            <Route path="/rooms/:roomId/reviews/new" element={<RoomReview />} />
            <Route path="/rooms/:roomId/review" element={<RoomReview />} />
            <Route path="/reviews/new" element={<RoomReview />} />
            <Route path="/danh-gia-phong" element={<RoomReview />} />
            <Route path="/danh-gia-phong/:roomId" element={<RoomReview />} />
            <Route path="/danh-gia-ky-nghi" element={<RoomReview />} />
            <Route path="/fnb/dat-ban" element={<TableReservation />} />
            <Route path="/dat-ban" element={<TableReservation />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/me/bookings" element={<MyBookings />} />
            <Route path="/lich-su-dat-phong" element={<MyBookings />} />
            <Route path="/client/concierge" element={<ClientConcierge />} />
            <Route path="/concierge" element={<ClientConcierge />} />
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
            <Route path="/admin/checkout" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/checkout/:stayId" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/check-out/:stayId" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/guest-check-out" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/kiem-phong" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/tra-phong" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/finance/checkout" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />
            <Route path="/admin/finance/checkout/:stayId" element={<ProtectedRoute><CheckOutDesk /></ProtectedRoute>} />

            {/* Phân hệ Tổng hợp chi phí lưu trú / Master Folio (FEAT-INVOICE-01 / C6) */}
            <Route path="/admin/charges" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />
            <Route path="/admin/charges/:bookingId" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />
            <Route path="/admin/bookings/charges" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />
            <Route path="/admin/bookings/charges/:bookingId" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />
            <Route path="/admin/booking/charges" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />
            <Route path="/admin/bang-ke-chi-phi" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />
            <Route path="/admin/bang-ke-chi-phi/:bookingId" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />
            <Route path="/admin/folio" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />
            <Route path="/admin/folio/:bookingId" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />
            <Route path="/admin/invoices/master" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />
            <Route path="/admin/invoices/master/:bookingId" element={<ProtectedRoute><BookingChargesFolio /></ProtectedRoute>} />

            {/* Phân hệ Sổ cái hoá đơn & Quản trị tài chính (FEAT-INVOICE-05 / C10 Màn 27) */}
            <Route path="/admin/tai-chinh" element={<ProtectedRoute requiredPermission="BOOKING_VIEW"><InvoiceLedger /></ProtectedRoute>} />
            <Route path="/admin/invoices" element={<ProtectedRoute requiredPermission="BOOKING_VIEW"><InvoiceLedger /></ProtectedRoute>} />
            <Route path="/admin/finance" element={<Navigate to="/admin/finance/ledger" replace />} />
            <Route path="/admin/finance/ledger" element={<ProtectedRoute requiredPermission="BOOKING_VIEW"><InvoiceLedger /></ProtectedRoute>} />
            <Route path="/admin/finance/settlement" element={<ProtectedRoute requiredPermission="BOOKING_VIEW"><InvoiceLedger /></ProtectedRoute>} />
            <Route path="/admin/finance/settlement/:invoiceId" element={<ProtectedRoute requiredPermission="BOOKING_VIEW"><InvoiceLedger /></ProtectedRoute>} />
            <Route path="/admin/so-cai" element={<ProtectedRoute requiredPermission="BOOKING_VIEW"><InvoiceLedger /></ProtectedRoute>} />

            {/* Phân hệ Báo cáo Doanh thu & Công suất phòng Thời gian thực (FEAT-REPORT-01 & FEAT-REPORT-02 / C11 & C12) */}
            <Route path="/admin/ban-lam-viec" element={<ProtectedRoute><MasterRevenueDashboard /></ProtectedRoute>} />
            <Route path="/admin/statistics" element={<ProtectedRoute><MasterRevenueDashboard /></ProtectedRoute>} />
            <Route path="/admin/statistics/revenue" element={<ProtectedRoute><MasterRevenueDashboard /></ProtectedRoute>} />
            <Route path="/admin/statistics/occupancy" element={<ProtectedRoute><MasterRevenueDashboard /></ProtectedRoute>} />
            <Route path="/admin/bao-cao" element={<ProtectedRoute><MasterRevenueDashboard /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><MasterRevenueDashboard /></ProtectedRoute>} />

            {/* Phân hệ Trợ lý ảo AI Concierge & Quản trị Cơ sở Tri thức (FEAT-AI-01 & FEAT-AI-02 / C13 & C14) */}
            <Route path="/admin/ai-concierge" element={<ProtectedRoute><AiConciergeManagement /></ProtectedRoute>} />
            <Route path="/admin/knowledge-base" element={<ProtectedRoute><AiConciergeManagement /></ProtectedRoute>} />
            <Route path="/admin/ai/knowledge" element={<ProtectedRoute><AiConciergeManagement /></ProtectedRoute>} />
            <Route path="/admin/ai/knowledge-base" element={<ProtectedRoute><AiConciergeManagement /></ProtectedRoute>} />
            <Route path="/admin/ai" element={<ProtectedRoute><AiConciergeManagement /></ProtectedRoute>} />

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
            <Route path="/admin/fnb/kitchen-inventory" element={<ProtectedRoute><KitchenInventory /></ProtectedRoute>} />
            <Route path="/admin/fnb/nguyen-lieu" element={<ProtectedRoute><KitchenInventory /></ProtectedRoute>} />
            <Route path="/admin/fnb/dispatch" element={<ProtectedRoute><OrderDispatchHub /></ProtectedRoute>} />
            <Route path="/admin/fnb/room-service" element={<ProtectedRoute><RoomService /></ProtectedRoute>} />
            <Route path="/admin/fnb/history" element={<ProtectedRoute><FnbOrderHistory /></ProtectedRoute>} />
            <Route path="/admin/fnb/table-map" element={<ProtectedRoute><TableMap /></ProtectedRoute>} />
            <Route path="/admin/fnb/tables" element={<ProtectedRoute><TableMap /></ProtectedRoute>} />
            <Route path="/admin/so-do-ban" element={<ProtectedRoute><TableMap /></ProtectedRoute>} />
            <Route path="/admin/services" element={<ProtectedRoute><ServiceManagement /></ProtectedRoute>} />
            <Route path="/admin/services/management" element={<ProtectedRoute><ServiceManagement /></ProtectedRoute>} />
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
            <Route path="/admin/transportation" element={<ProtectedRoute><AirportTransferManagement /></ProtectedRoute>} />
            <Route path="/admin/airport-transfer" element={<ProtectedRoute><AirportTransferManagement /></ProtectedRoute>} />
            <Route path="/admin/shuttle" element={<ProtectedRoute><AirportTransferManagement /></ProtectedRoute>} />
            <Route path="/admin/doi-xe" element={<ProtectedRoute><AirportTransferManagement /></ProtectedRoute>} />
            <Route path="/admin/don-tien-san-bay" element={<ProtectedRoute><AirportTransferManagement /></ProtectedRoute>} />
            <Route path="/admin/night-audit" element={<ProtectedRoute><NightAuditManagement /></ProtectedRoute>} />
            <Route path="/admin/kiem-toan-dem" element={<ProtectedRoute><NightAuditManagement /></ProtectedRoute>} />
            <Route path="/admin/tai-chinh" element={<ProtectedRoute><NightAuditManagement /></ProtectedRoute>} />
            <Route path="/admin/police-declaration" element={<ProtectedRoute><PoliceDeclarationExport /></ProtectedRoute>} />
            <Route path="/admin/khai-bao-tam-tru" element={<ProtectedRoute><PoliceDeclarationExport /></ProtectedRoute>} />
            <Route path="/admin/xuat-nhap-canh" element={<ProtectedRoute><PoliceDeclarationExport /></ProtectedRoute>} />
            <Route path="/admin/channel-manager" element={<ProtectedRoute><ChannelManagerSync /></ProtectedRoute>} />
            <Route path="/admin/ota-sync" element={<ProtectedRoute><ChannelManagerSync /></ProtectedRoute>} />
            <Route path="/admin/kenh-ban-phong" element={<ProtectedRoute><ChannelManagerSync /></ProtectedRoute>} />

            {/* tuyen/11 Banquet & MICE Event Booking Routes (Phân hệ 53) */}
            <Route path="/admin/banquet-mice" element={<ProtectedRoute><BanquetMiceBooking /></ProtectedRoute>} />
            <Route path="/admin/datsanhtiec" element={<ProtectedRoute><BanquetMiceBooking /></ProtectedRoute>} />
            <Route path="/admin/mice" element={<ProtectedRoute><BanquetMiceBooking /></ProtectedRoute>} />
            <Route path="/admin/banquet" element={<ProtectedRoute><BanquetMiceBooking /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <FloatingAiConcierge />
          <FloatingAcademicBadge />
        </Router>
        </WishlistProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
