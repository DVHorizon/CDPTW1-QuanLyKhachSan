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
import LoyaltyManagement from './pages/LoyaltyManagement';


function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<SearchRooms />} />
          <Route path="/rooms/search" element={<SearchRooms />} />
          <Route path="/tim-kiem" element={<SearchRooms />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/admin" element={<Navigate to="/admin/menu" replace />} />
          <Route path="/admin/menu" element={<MenuManagement />} />
          <Route path="/admin/room-types" element={<RoomTypeManagement />} />
          <Route path="/admin/rooms" element={<RoomManagement />} />
          <Route path="/admin/room-availability" element={<RoomAvailability />} />
          <Route path="/admin/loyalty" element={<LoyaltyManagement />} />
          {/* Redirect everything else to home for now */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
