import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import InTransit from "./pages/InTransit";
import PDI from "./pages/PDI";
import PendingPickup from "./pages/PendingPickup";
import PickupScheduled from "./pages/PickupScheduled";
import SoldVehicles from "./pages/SoldVehicles";
import TradeIns from "./pages/TradeIns";
import Payments from "./pages/Payments";
import Analytics from "./pages/Analytics";
import "./index.css";

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-gradient flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public Route wrapper (redirect to dashboard if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-gradient flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Main */}
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />

        {/* Status */}
        <Route path="in-transit" element={<InTransit />} />
        <Route path="pdi" element={<PDI />} />
        <Route path="pending-pickup" element={<PendingPickup />} />
        <Route path="pickup-scheduled" element={<PickupScheduled />} />
        <Route path="sold" element={<SoldVehicles />} />

        {/* Other */}
        <Route path="tradeins" element={<TradeIns />} />
        <Route path="payments" element={<Payments />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
