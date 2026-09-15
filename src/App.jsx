import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import ShopsListPage from './pages/ShopsListPage';
import ShopDetailPage from './pages/ShopDetailPage';
import PlansPage from './pages/PlansPage';
import ModulesPage from './pages/ModulesPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/shops" replace />} />
          <Route path="/shops" element={<ShopsListPage />} />
          <Route path="/shops/:shopId" element={<ShopDetailPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/modules" element={<ModulesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
