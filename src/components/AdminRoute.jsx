import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// زي ProtectedRoute بس بيتأكد كمان إن role المستخدم admin - مطابق لنفس القاعدة
// المفروضة فعلياً على السيرفر في admin.routes.js (protect + authorize('admin'))
export default function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
