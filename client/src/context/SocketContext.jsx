import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [notifications, setNotifications] = useState([]);

  // Fetch initial notifications list
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated || !token) {
        setNotifications([]);
        return;
      }
      try {
        const response = await fetch('/api/notifications', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error('Fetch notifications failed:', err);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, token]);

  // Connect to Socket.io when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = window.location.origin; // Dev proxy redirects relative URLs
    const newSocket = io(socketUrl, {
      auth: { token }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    // Listen for presence updates from other users
    newSocket.on('presence_update', ({ userId, online, lastSeen }) => {
      setOnlineUsers(prev => ({
        ...prev,
        [userId]: { online, lastSeen }
      }));
    });

    // Listen for incoming notifications
    newSocket.on('notification_received', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
    });

    // Load initial user lists or presence details (handled dynamically or fallback to HTTP checks)
    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  const markAllNotificationsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Clear notifications failed:', err);
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket, 
      onlineUsers, 
      setOnlineUsers,
      notifications, 
      setNotifications,
      markAllNotificationsRead,
      clearAllNotifications
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
