import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthModal from './components/AuthModal';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import AddBalancePage from './pages/AddBalancePage';
import AdminPage from './pages/AdminPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import StorePage from './pages/StorePage';

function AppLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<StorePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/add-balance" element={<AddBalancePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!isAdminRoute && <BottomNav />}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <AppLayout />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#0f1221',
                color: '#f1f5f9',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                fontSize: '13px',
                fontWeight: 600,
              },
            }}
          />
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
