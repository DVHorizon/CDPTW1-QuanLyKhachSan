import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/client/Home';
import SearchRooms from './pages/SearchRooms';
import Auth from './pages/Auth';
import MenuManagement from './pages/admin/menu/MenuManagement';
import RoomTypeManagement from './pages/RoomTypeManagement';
import RoomManagement from './pages/RoomManagement';
import LoyaltyManagement from './pages/LoyaltyManagement';
import MarketingDashboard from './pages/admin/marketing/MarketingDashboard';
import CampaignComposer from './pages/admin/marketing/CampaignComposer';
import ConsumablesInventory from './pages/admin/housekeeping/ConsumablesInventory';
import LinenManagement from './pages/admin/housekeeping/LinenManagement';
import LostAndFoundManagement from './pages/admin/housekeeping/LostAndFoundManagement';
import MaintenanceDashboard from './pages/admin/engineering/MaintenanceDashboard';
import MaintenanceTicketCreate from './pages/admin/engineering/MaintenanceTicketCreate';
import AuditLogs from './pages/AuditLogs';
import RosterShifts from './pages/RosterShifts';

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
          <Route path="/admin/loyalty" element={<LoyaltyManagement />} />
          <Route path="/admin/marketing" element={<MarketingDashboard />} />
          <Route path="/admin/marketing/new" element={<CampaignComposer />} />
          <Route path="/admin/housekeeping" element={<ConsumablesInventory />} />
          <Route path="/admin/housekeeping/inventory" element={<ConsumablesInventory />} />
          <Route path="/admin/housekeeping/linen" element={<LinenManagement />} />
          <Route path="/admin/housekeeping/lost-and-found" element={<LostAndFoundManagement />} />
          <Route path="/admin/lost-and-found" element={<LostAndFoundManagement />} />
          <Route path="/admin/engineering" element={<MaintenanceDashboard />} />
          <Route path="/admin/engineering/new" element={<MaintenanceTicketCreate />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/roster" element={<RosterShifts />} />
          <Route path="/admin/shifts" element={<RosterShifts />} />
          <Route path="/admin/dieu-do-ca" element={<RosterShifts />} />
          {/* Redirect everything else to home for now */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
