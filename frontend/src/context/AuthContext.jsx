import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, fetchCurrentUser, loginWithGoogle, loginWithFacebook } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('hotel_token') || null;
  });

  const [user, setUser] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  // Đồng bộ hóa trạng thái tài khoản trực tiếp từ database khi khởi chạy
  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        const freshUser = await fetchCurrentUser(token);
        if (freshUser) {
          setUser(freshUser);
        } else {
          // Token không còn hợp lệ trong database
          handleLogout();
        }
      }
      setIsLoading(false);
    };

    verifyUser();
  }, [token]);

  const handleLogin = async (identifier, password) => {
    const response = await loginUser({ identifier, password });
    if (response.success && response.token) {
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('hotel_token', response.token);
    }
    return response;
  };

  const handleRegister = async (formData) => {
    const response = await registerUser(formData);
    if (response.success && response.token) {
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('hotel_token', response.token);
    }
    return response;
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('hotel_token');
    localStorage.removeItem('hotel_user');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login: handleLogin,
    register: handleRegister,
    loginGoogle: handleGoogleLogin,
    loginFacebook: handleFacebookLogin,
    logout: handleLogout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};

export default AuthContext;
