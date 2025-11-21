/**
 * App Component - Example Usage
 * Ví dụ cách sử dụng Chat System
 */

import React, { useEffect, useState } from 'react';
import { ChatLayout, useSocket, socketService } from './chat';
import './chat/styles/chat.css';

function App() {
  // Mock user data - Trong thực tế lấy từ authentication system
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    token: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Initialize socket connection
  const { isConnected, socketId } = useSocket({
    token: user?.token || null,
    autoConnect: !!user,
    serverUrl: process.env.REACT_APP_API_URL,
  });

  // Simulate user login
  useEffect(() => {
    // Trong thực tế, lấy token từ localStorage hoặc authentication context
    const mockToken = localStorage.getItem('token');
    const mockUser = localStorage.getItem('user');

    if (mockToken && mockUser) {
      setUser({
        ...JSON.parse(mockUser),
        token: mockToken,
      });
    }

    setIsLoading(false);
  }, []);

  // Handle login
  const handleLogin = async (email: string, password: string) => {
    try {
      // Gọi API login của bạn
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (data.success) {
        const userData = {
          id: data.data.user.id,
          name: `${data.data.user.firstName} ${data.data.user.lastName}`,
          email: data.data.user.email,
          token: data.data.accessToken,
        };

        setUser(userData);
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('user', JSON.stringify(userData));

        // Socket sẽ tự động connect qua useSocket hook
      } else {
        alert('Login failed: ' + data.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed');
    }
  };

  // Handle logout
  const handleLogout = () => {
    socketService.disconnect();
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Login page
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Đăng nhập Chat
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleLogin(
                formData.get('email') as string,
                formData.get('password') as string
              );
            }}
          >
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Mật khẩu
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Chat page
  return (
    <div className="h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-gray-800">Chat System</h1>
            {isConnected && (
              <span className="flex items-center text-sm text-green-600">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></span>
                Connected
              </span>
            )}
            {!isConnected && (
              <span className="flex items-center text-sm text-red-600">
                <span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                Disconnected
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Chat Layout */}
      <div className="h-[calc(100vh-64px)]">
        <ChatLayout
          currentUserId={user.id}
          currentUserName={user.name}
          currentUserAvatar={undefined}
        />
      </div>
    </div>
  );
}

export default App;
