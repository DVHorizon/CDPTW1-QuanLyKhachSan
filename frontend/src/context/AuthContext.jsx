import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, fetchCurrentUser, loginWithGoogle, loginWithFacebook, refreshAuthToken, logoutUserSession } from '../api/authApi';
import { getAccessToken, setAccessToken, clearAccessToken } from '../utils/tokenStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    return getAccessToken() || null;
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('hotel_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Đồng bộ hóa trạng thái tài khoản khi khởi chạy qua accessToken memory hoặc HttpOnly refresh cookie
  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        const freshUser = await fetchCurrentUser(token);
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('hotel_user', JSON.stringify(freshUser));
        } else {
          handleLogout();
        }
      } else {
        const refreshed = await refreshAuthToken();
        if (refreshed?.success && refreshed.token) {
          setAccessToken(refreshed.token);
          setToken(refreshed.token);
          if (refreshed.user) {
            setUser(refreshed.user);
            localStorage.setItem('hotel_user', JSON.stringify(refreshed.user));
          }
        } else {
          // Nếu có legacy hotel_token trong localStorage thì dọn sạch để tuân thủ in-memory accessToken
          localStorage.removeItem('hotel_token');
          localStorage.removeItem('hotel_user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    verifyUser();
  }, [token]);

  const handleLogin = async (identifier, password, expectedRole) => {
    const response = await loginUser({ identifier, password, expectedRole });
    if (response.success && response.token) {
      setAccessToken(response.token);
      setToken(response.token);
      setUser(response.user);
      localStorage.removeItem('hotel_token');
      localStorage.setItem('hotel_user', JSON.stringify(response.user));
    }
    return response;
  };

  const handleRegister = async (formData) => {
    const response = await registerUser(formData);
    if (response.success && response.token) {
      setAccessToken(response.token);
      setToken(response.token);
      setUser(response.user);
      localStorage.removeItem('hotel_token');
      localStorage.setItem('hotel_user', JSON.stringify(response.user));
    }
    return response;
  };

  const handleGoogleLogin = async (payload) => {
    const response = await loginWithGoogle(payload);
    if (response.success && response.token) {
      setAccessToken(response.token);
      setToken(response.token);
      setUser(response.user);
      localStorage.removeItem('hotel_token');
      localStorage.setItem('hotel_user', JSON.stringify(response.user));
    }
    return response;
  };

  const handleFacebookLogin = async (payload) => {
    const response = await loginWithFacebook(payload);
    if (response.success && response.token) {
      setAccessToken(response.token);
      setToken(response.token);
      setUser(response.user);
      localStorage.removeItem('hotel_token');
      localStorage.setItem('hotel_user', JSON.stringify(response.user));
    }
    return response;
  };

  const handleUpdateUser = (updatedData) => {
    setUser((prev) => {
      const merged = typeof updatedData === 'function' ? updatedData(prev) : { ...(prev || {}), ...updatedData };
      localStorage.setItem('hotel_user', JSON.stringify(merged));
      return merged;
    });
  };

  const handleLogout = () => {
    logoutUserSession().catch(() => {});
    clearAccessToken();
    setToken(null);
    setUser(null);
    localStorage.removeItem('hotel_token');
    localStorage.removeItem('hotel_user');
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
    updateUser: handleUpdateUser,
    logout: handleLogout
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
