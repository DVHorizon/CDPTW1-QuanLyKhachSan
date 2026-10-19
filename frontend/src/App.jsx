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
import RoomTypeManagement from './pages/RoomTypeManagement';
import RoomManagement from './pages/RoomManagement';
import RoomAvailability from './pages/admin/menu/RoomAvailability';
import StaffManagement from './pages/StaffManagement';
import RoomService from './pages/client/RoomService';
import Profile from './pages/client/Profile';
import KitchenDisplay from './pages/admin/fnb/KitchenDisplay';
import OrderDispatchHub from './pages/admin/fnb/OrderDispatchHub';
import FnbOrderHistory from './pages/admin/fnb/FnbOrderHistory';
import GuestOrderHistory from './pages/client/GuestOrderHistory';
import TableReservation from './pages/client/TableReservation';
import LoyaltyManagement from './pages/LoyaltyManagement';
import ServiceManagement from './pages/ServiceManagement';
import RoomStatusManagement from './pages/RoomStatusManagement';
import BookingManagement from './pages/BookingManagement';
import RoomAssignment from './pages/admin/RoomAssignment';
import CheckInDesk from './pages/admin/CheckInDesk';


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
            <Route path="/room-service" element={<RoomService />} />
            <Route path="/fnb/history" element={<GuestOrderHistory />} />
            <Route path="/lich-su-dat-mon" element={<GuestOrderHistory />} />
            <Route path="/fnb/dat-ban" element={<TableReservation />} />
            <Route path="/dat-ban" element={<TableReservation />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/admin" element={<Navigate to="/admin/menu" replace />} />
            <Route path="/admin/menu" element={<MenuManagement />} />
            <Route path="/admin/room-types" element={<RoomTypeManagement />} />
            <Route path="/admin/rooms" element={<RoomManagement />} />
            <Route path="/admin/bookings" element={<BookingManagement />} />
            <Route path="/admin/dat-phong" element={<BookingManagement />} />
            <Route path="/admin/danh-sach-dat-phong" element={<BookingManagement />} />
            <Route path="/admin/room-assignment" element={<RoomAssignment />} />
            <Route path="/admin/room-assignment/:bookingId" element={<RoomAssignment />} />
            <Route path="/admin/room-allocation" element={<RoomAssignment />} />
            <Route path="/admin/gan-phong" element={<RoomAssignment />} />
            <Route path="/admin/check-in" element={<CheckInDesk />} />
            <Route path="/admin/check-in/:bookingId" element={<CheckInDesk />} />
            <Route path="/admin/guest-check-in" element={<CheckInDesk />} />
            <Route path="/admin/room-availability" element={<RoomAvailability />} />
            <Route path="/admin/so-do-phong" element={<RoomStatusManagement />} />
            <Route path="/admin/room-status" element={<RoomStatusManagement />} />
            <Route path="/admin/le-tan" element={<RoomStatusManagement />} />
            <Route path="/admin/buong-phong" element={<RoomStatusManagement />} />
            <Route path="/admin/staff" element={<StaffManagement />} />
            <Route path="/admin/staff-accounts" element={<StaffManagement />} />
            <Route path="/admin/quan-tri" element={<StaffManagement />} />
            <Route path="/admin/fnb/kitchen" element={<KitchenDisplay />} />
            <Route path="/admin/fnb/dispatch" element={<OrderDispatchHub />} />
            <Route path="/admin/fnb/room-service" element={<RoomService />} />
            <Route path="/admin/fnb/history" element={<FnbOrderHistory />} />
            <Route path="/admin/services" element={<ServiceManagement />} />
            <Route path="/admin/loyalty" element={<LoyaltyManagement />} />
            {/* Redirect everything else to home for now */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
