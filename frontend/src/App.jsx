import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import MenuManagement from './pages/MenuManagement';
import RoomTypeManagement from './pages/RoomTypeManagement';
import RoomManagement from './pages/RoomManagement';
import StaffManagement from './pages/StaffManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<MenuManagement />} />
        <Route path="/admin/room-types" element={<RoomTypeManagement />} />
        <Route path="/admin/rooms" element={<RoomManagement />} />
        <Route path="/admin/staff" element={<StaffManagement />} />
        <Route path="/admin/staff-accounts" element={<StaffManagement />} />
        <Route path="/admin/quan-tri" element={<StaffManagement />} />
        {/* Redirect everything else to home for now */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
