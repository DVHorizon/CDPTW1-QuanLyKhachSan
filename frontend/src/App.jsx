import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/client/Home';
import SearchRooms from './pages/SearchRooms';
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
import LoyaltyManagement from './pages/LoyaltyManagement';
import ServiceManagement from './pages/ServiceManagement';
import RoomStatusManagement from './pages/RoomStatusManagement';
import BookingManagement from './pages/BookingManagement';


function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<SearchRooms />} />
          <Route path="/rooms/search" element={<SearchRooms />} />
          <Route path="/tim-kiem" element={<SearchRooms />} />
          <Route path="/room-service" element={<RoomService />} />
          <Route path="/fnb/history" element={<GuestOrderHistory />} />
          <Route path="/lich-su-dat-mon" element={<GuestOrderHistory />} />
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
          <Route path="/admin/fnb/history" element={<FnbOrderHistory />} />
          <Route path="/admin/fnb/room-service" element={<RoomService />} />
          <Route path="/admin/services" element={<ServiceManagement />} />
          <Route path="/admin/loyalty" element={<LoyaltyManagement />} />
          {/* Redirect everything else to home for now */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
