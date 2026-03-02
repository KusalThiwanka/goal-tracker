import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // If Admin tries to access User route, redirect to admin
    if (user.role === 'Admin') return <Navigate to="/admin" replace />;
    // If User tries to access Admin route, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              user.role === 'Admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRole="User">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="Admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
