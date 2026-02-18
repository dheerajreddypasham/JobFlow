import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (location.state?.user) {
        setUser(location.state.user);
        setIsAuthenticated(true);
        setIsChecking(false);
        return;
      }

      try {
        const response = await authAPI.getMe();
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [location.pathname, location.state]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <Loader2 className="w-8 h-8 animate-spin text-[#064E3B]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
