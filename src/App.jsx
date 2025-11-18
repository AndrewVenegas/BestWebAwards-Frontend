import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import IntroGuide from './pages/IntroGuide';
import HelperDashboard from './pages/HelperDashboard';
import AdminDashboard from './pages/AdminDashboard';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.type) && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      
      <Route
        path="/intro"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <IntroGuide />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            {user?.type === 'student' && <StudentDashboard />}
            {user?.type === 'helper' && <HelperDashboard />}
            {user?.type === 'admin' && <AdminDashboard />}
          </PrivateRoute>
        }
      />
      
      <Route
        path="/votaciones"
        element={
          <PrivateRoute allowedRoles={['student', 'helper', 'admin']}>
            <StudentDashboard readOnly={user?.type !== 'student'} />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/profile"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentProfile />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/helper/teams"
        element={
          <PrivateRoute allowedRoles={['helper']}>
            <HelperDashboard />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/admin/*"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Navbar />
            <AppRoutes />
            <Toast />
          </div>
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;

