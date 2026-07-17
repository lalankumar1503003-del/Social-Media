import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, Users, User, Plus, Search, Radio, Circle, Loader } from 'lucide-react';

export default function Chat() {
  const { user, token } = useAuth();
  const { socket, onlineUsers, setOnlineUsers } = useSocket();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDisabled, setGroupDisabled] = useState(false);
  
  // Typing state
  const [typingUsers, setTypingUsers] = useState({}); // userId -> isTyping
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Load chats lists and settings
  const fetchChatsAndSettings = async () => {
    try {
      // Group status
      const settingsRes = await fetch('/api/admin/settings');
      if (settingsRes.ok) {
        const config = await settingsRes.json();
        setGroupDisabled(!!config.disableGroupChat);
      }

      // User chats
      const chatsRes = await fetch('/api/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (chatsRes.ok) {
        const data = await chatsRes.json();
        setChats(data);

        // Pre-populate online statuses from populated participant lists
        const statuses = {};
        data.forEach(c => {
          c.participants.forEach(p => {
            statuses[p._id] = { online: p.online, lastSeen: p.lastSeen };
          });
        });
        setOnlineUsers(prev => ({ ...prev, ...statuses }));
      }
    } catch (err) {
      console.error('Fetch chats failure:', err);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    fetchChatsAndSettings();
  }, [token]);

  // Load message history on active chat change
  useEffect(() => {
    if (!activeChat) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/chats/${activeChat._id}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          
          // Connect to specific chat room via socket
          if (socket) {
            socket.emit('join_chat', activeChat._id);
          }
        }
      } catch (err) {
        console.error('Fetch message history failed:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();

    // Clean up: Leave chat room in Socket
    return () => {
      if (socket && activeChat) {
        socket.emit('leave_chat', activeChat._id);
      }
      setTypingUsers({});
    };
  }, [activeChat, token, socket]);

  // Scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Handle incoming live messages & typing indicators via WebSockets
  useEffect(() => {
    if (!socket) return;

    socket.on('message_received', (newMsg) => {
      // Append if message belongs to active chat
      if (activeChat && newMsg.chatId === activeChat._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
      }

      // Update chats list timestamp and bubble it to the top
      setChats(prev => {
        const match = prev.find(c => c._id === newMsg.chatId);
        if (match) {
          match.updatedAt = new Date();
          return [match, ...prev.filter(c => c._id !== newMsg.chatId)];
        }
        return prev;
      });
    });

    socket.on('typing_status', ({ chatId, userId: typistId, isTyping }) => {
      if (activeChat && chatId === activeChat._id) {
        setTypingUsers(prev => ({
          ...prev,
          [typistId]: isTyping
        }));
      }
    });

    return () => {
      socket.off('message_received');
      socket.off('typing_status');
    };
  }, [socket, activeChat]);

  // Search users for starting direct message
  const handleUsersSearch = async (e) => {
    const query = e.target.value;
    setUsersSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users?search=${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out self
        setSearchResults(data.filter(u => u._id !== user._id));
      }
    } catch (err) {
      console.error('Users search failed:', err);
    }
  };

  // Start DM channel
  const startDirectMessage = async (targetUser) => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ participantId: targetUser._id, isGroup: false })
      });
      if (res.ok) {
        const chat = await res.json();
        // Append to chats list if not there
        setChats(prev => {
          if (prev.some(c => c._id === chat._id)) return prev;
          return [chat, ...prev];
        });
        setActiveChat(chat);
        setUsersSearch('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Start DM failed:', err);
    }
  };

  // Create group chat
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || groupDisabled) return;
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: groupName, isGroup: true })
      });
      if (res.ok) {
        const newGroup = await res.json();
        setChats(prev => [newGroup, ...prev]);
        setActiveChat(newGroup);
        setShowGroupModal(false);
        setGroupName('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create group');
      }
    } catch (err) {
      console.error('Create group failed:', err);
    }
  };

  // Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;
    if (user.status === 'muted') return alert('You are muted and cannot send messages.');

    if (socket) {
      // Emit websocket message
      socket.emit('send_message', {
        chatId: activeChat._id,
        text: inputText
      });

      // Clear typing indicator
      socket.emit('typing', { chatId: activeChat._id, isTyping: false });
    }

    setInputText('');
  };

  // Handle typing key presses
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeChat) return;

    // Notify other users we are typing
    socket.emit('typing', { chatId: activeChat._id, isTyping: true });

    // Reset typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { chatId: activeChat._id, isTyping: false });
    }, 1500);
  };

  // Helper: Get direct message user info
  const getDMInfo = (chat) => {
    if (chat.isGroup) return { name: chat.name, avatar: chat.avatar };
    const peer = chat.participants.find(p => p._id !== user._id);
    return peer 
      ? { name: `@${peer.username}`, avatar: peer.avatar, peerId: peer._id }
      : { name: 'Deleted User', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=deleted' };
  };

  return (
    <div className="chat-container glass-panel animate-fade-in">
      {/* Sidebar Channels Panel */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h3>Messages</h3>
          {!groupDisabled && (
            <button 
              className="new-group-btn" 
              onClick={() => setShowGroupModal(true)} 
              title="New Group Chat"
            >
              <Plus size={16} />
              <span>Group</span>
            </button>
          )}
        </div>

        {/* User Search for DMs */}
        <div className="user-search-wrapper">
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search user to message..."
              value={usersSearch}
              onChange={handleUsersSearch}
              className="glass-input search-user-input"
            />
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="search-results-dropdown glass-panel">
              {searchResults.map(u => (
                <div key={u._id} className="search-result-item" onClick={() => startDirectMessage(u)}>
                  <img src={u.avatar} alt={u.username} className="search-avatar" />
                  <div className="search-details">
                    <span className="search-name">@{u.username}</span>
                    <span className="search-loc">{u.location || 'Gujarat'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Rooms list */}
        <div className="channels-list">
          {loadingChats ? (
            <div className="chat-sidebar-loading">
              <Loader size={20} className="spin" />
              <span>Loading rooms...</span>
            </div>
          ) : chats.length === 0 ? (
            <div className="empty-chats-banner">
              <p>No active conversations. Start one by searching a user name above!</p>
            </div>
          ) : (
            chats.map(c => {
              const info = getDMInfo(c);
              const peerStatus = info.peerId ? onlineUsers[info.peerId] : null;
              const isActive = activeChat && activeChat._id === c._id;

              return (
                <div 
                  key={c._id} 
                  className={`channel-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveChat(c)}
                >
                  <div className="channel-avatar-wrapper">
                    <img src={info.avatar} alt={info.name} className="channel-avatar" />
                    {!c.isGroup && peerStatus?.online && (
                      <span className="channel-online-dot"></span>
                    )}
                  </div>

                  <div className="channel-details">
                    <div className="channel-title-row">
                      <span className="channel-name">{info.name}</span>
                      <span className="channel-time">
                        {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="channel-meta-text">
                      {c.isGroup ? `${c.participants.length} members` : (peerStatus?.online ? 'Online' : 'Offline')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="conversation-window">
        {activeChat ? (
          <>
            {/* Conversation Header */}
            <div className="conversation-header">
              {(() => {
                const info = getDMInfo(activeChat);
                const peerStatus = info.peerId ? onlineUsers[info.peerId] : null;
                return (
                  <>
                    <img src={info.avatar} alt={info.name} className="header-avatar" />
                    <div className="header-meta">
                      <h3>{info.name}</h3>
                      <span className="header-status">
                        {activeChat.isGroup ? (
                          <span className="group-members-pill">
                            <Users size={12} />
                            {activeChat.participants.length} online-connected members
                          </span>
                        ) : peerStatus?.online ? (
                          <span className="online-indicator"><Circle size={10} fill="var(--success)" color="transparent" /> Active now</span>
                        ) : (
                          <span className="offline-indicator">Offline (last seen {peerStatus?.lastSeen ? new Date(peerStatus.lastSeen).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'recently'})</span>
                        )}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Messages Thread list */}
            <div className="messages-thread">
              {loadingMessages ? (
                <div className="messages-loading">
                  <Loader size={24} className="spin" />
                  <p>Decrypting history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="empty-thread-welcome">
                  <Users size={32} />
                  <h4>Start of Chat Room</h4>
                  <p>Send a message to start interacting in real time.</p>
                </div>
              ) : (
                messages.map(m => {
                  const isOwn = m.sender._id === user._id;
                  return (
                    <div key={m._id} className={`message-bubble-wrapper ${isOwn ? 'own' : ''}`}>
                      {!isOwn && (
                        <img src={m.sender.avatar} alt={m.sender.username} className="msg-avatar" />
                      )}
                      <div className="message-bubble-content">
                        {!isOwn && <span className="msg-author-name">@{m.sender.username}</span>}
                        <div className="message-bubble">
                          <p>{m.text}</p>
                        </div>
                        <span className="msg-time">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicators */}
              {Object.keys(typingUsers).map(typistId => {
                if (typingUsers[typistId] && typistId !== user._id) {
                  // Find typist username in chat participants
                  const p = activeChat.participants.find(part => part._id === typistId);
                  const name = p ? p.username : 'Someone';
                  return (
                    <div key={typistId} className="typing-indicator-row">
                      <div className="typing-bubble">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="typing-label">@{name} is typing...</span>
                    </div>
                  );
                }
                return null;
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Send Message Form */}
            <form onSubmit={handleSendMessage} className="message-form-container">
              <input
                type="text"
                placeholder={user.status === 'muted' ? 'You are muted and cannot send messages' : 'Write a live message...'}
                value={inputText}
                onChange={handleInputChange}
                className="glass-input chat-input-field"
                disabled={user.status === 'muted'}
                required
              />
              <button 
                type="submit" 
                className="btn-primary send-msg-btn"
                disabled={!inputText.trim() || user.status === 'muted'}
              >
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty-state">
            <Radio size={48} className="chat-empty-icon pulse-alert" />
            <h3>Real-Time Chatroom</h3>
            <p>Select an existing conversation channel on the left, or search a username to start a private live connection.</p>
          </div>
        )}
      </div>

      {/* New Group Modal */}
      {showGroupModal && (
        <div className="modal-overlay">
          <form onSubmit={handleCreateGroup} className="modal-content glass-panel animate-fade-in">
            <h3>Create Group Room</h3>
            <p className="modal-desc">Create a websocket-connected channel for group discussions.</p>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label>Group Channel Name</label>
              <input
                type="text"
                required
                className="glass-input"
                placeholder="e.g. Gujarat Developers"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => { setShowGroupModal(false); setGroupName(''); }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={!groupName.trim()}
              >
                Create Channel
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .chat-container {
          display: grid;
          grid-template-columns: 280px 1fr;
          height: calc(100vh - 110px);
          overflow: hidden;
          background: rgba(15, 23, 42, 0.45);
        }
        
        /* Left Sidebar Chats */
        .chat-sidebar {
          border-right: 1px solid var(--border-glass);
          display: flex;
          flex-direction: column;
          background: rgba(15, 23, 42, 0.2);
        }
        .sidebar-header {
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-glass);
        }
        .sidebar-header h3 {
          font-size: 1rem;
          font-weight: 700;
        }
        .new-group-btn {
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.2);
          color: var(--accent-primary);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: var(--transition-smooth);
        }
        .new-group-btn:hover {
          background: var(--accent-primary);
          color: #000;
        }
        .user-search-wrapper {
          padding: 0.75rem;
          border-bottom: 1px solid var(--border-glass);
          position: relative;
        }
        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-sm);
          padding: 0.35rem 0.5rem;
        }
        .search-icon {
          color: var(--text-muted);
        }
        .search-user-input {
          background: transparent;
          border: none;
          padding: 0;
          font-size: 0.8rem;
        }
        .search-user-input:focus {
          box-shadow: none;
          background: transparent;
          border: none;
        }
        .search-results-dropdown {
          position: absolute;
          left: 10px;
          right: 10px;
          top: 45px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1050;
          box-shadow: var(--shadow-lg);
          background: var(--bg-secondary);
        }
        .search-result-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          transition: var(--transition-smooth);
          border-bottom: 1px solid rgba(255,255,255,0.02);
        }
        .search-result-item:hover {
          background: var(--bg-glass-hover);
        }
        .search-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
        }
        .search-details {
          display: flex;
          flex-direction: column;
        }
        .search-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: #fff;
        }
        .search-loc {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        
        .channels-list {
          flex-grow: 1;
          overflow-y: auto;
        }
        .channel-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.02);
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .channel-item:hover {
          background: var(--bg-glass-hover);
        }
        .channel-item.active {
          background: rgba(0, 240, 255, 0.05);
          border-left: 3px solid var(--accent-primary);
        }
        .channel-avatar-wrapper {
          position: relative;
        }
        .channel-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }
        .channel-online-dot {
          width: 10px;
          height: 10px;
          background-color: var(--success);
          border-radius: 50%;
          position: absolute;
          bottom: 0px;
          right: 0px;
          border: 2px solid var(--bg-secondary);
          box-shadow: 0 0 6px var(--success);
        }
        .channel-details {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          overflow: hidden;
        }
        .channel-title-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.25rem;
        }
        .channel-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .channel-time {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .channel-meta-text {
          font-size: 0.75rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-sidebar-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 2rem;
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        .empty-chats-banner {
          padding: 2rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.75rem;
          line-height: 1.4;
        }

        /* Right Chat Conversation Box */
        .conversation-window {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: rgba(15, 23, 42, 0.1);
        }
        .conversation-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.9rem 1.5rem;
          border-bottom: 1px solid var(--border-glass);
          background: var(--bg-glass);
        }
        .header-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }
        .header-meta h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
        }
        .header-status {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .group-members-pill {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--accent-primary);
        }
        .online-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--success);
        }
        .offline-indicator {
          color: var(--text-muted);
        }
        
        .messages-thread {
          flex-grow: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .messages-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 4rem;
          color: var(--text-muted);
        }
        .empty-thread-welcome {
          text-align: center;
          padding: 4rem;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .empty-thread-welcome h4 {
          color: #fff;
          font-weight: 600;
        }
        .empty-thread-welcome p {
          font-size: 0.8rem;
          max-width: 250px;
        }
        
        .message-bubble-wrapper {
          display: flex;
          gap: 0.75rem;
          max-width: 75%;
          align-self: flex-start;
        }
        .message-bubble-wrapper.own {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .msg-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          align-self: flex-end;
        }
        .message-bubble-content {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .msg-author-name {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-left: 0.25rem;
        }
        .message-bubble {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-glass);
          padding: 0.65rem 0.9rem;
          border-radius: var(--radius-md) var(--radius-md) var(--radius-md) 0;
          color: #f1f5f9;
          font-size: 0.85rem;
          line-height: 1.4;
          word-break: break-word;
        }
        .message-bubble-wrapper.own .message-bubble {
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
          border-color: rgba(0, 240, 255, 0.2);
          border-radius: var(--radius-md) var(--radius-md) 0 var(--radius-md);
        }
        .msg-time {
          font-size: 0.65rem;
          color: var(--text-muted);
          align-self: flex-end;
        }
        .message-bubble-wrapper.own .msg-time {
          align-self: flex-start;
        }

        /* Typing indicator elements */
        .typing-indicator-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          animation: fadeIn 0.2s ease;
        }
        .typing-bubble {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-glass);
          padding: 0.4rem 0.6rem;
          border-radius: var(--radius-full);
        }
        .typing-bubble span {
          width: 6px;
          height: 6px;
          background-color: var(--text-secondary);
          border-radius: 50%;
          display: inline-block;
          animation: typingBlink 1.4s infinite both;
        }
        .typing-bubble span:nth-child(2) { animation-delay: 0.2s; }
        .typing-bubble span:nth-child(3) { animation-delay: 0.4s; }
        .typing-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .message-form-container {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-glass);
          background: var(--bg-glass);
        }
        .chat-input-field {
          flex-grow: 1;
        }
        .send-msg-btn {
          padding: 0.75rem;
          border-radius: var(--radius-sm);
        }
        
        .chat-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 0.5rem;
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
        }
        .chat-empty-icon {
          color: var(--accent-secondary);
          opacity: 0.6;
          margin-bottom: 0.5rem;
        }
        .chat-empty-state h3 {
          color: #fff;
          font-weight: 600;
        }
        .chat-empty-state p {
          font-size: 0.85rem;
          max-width: 320px;
          line-height: 1.4;
        }
        
        /* Utils */
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes typingBlink {
          0% { opacity: .2; }
          20% { opacity: 1; }
          100% { opacity: .2; }
        }
      `}</style>
    </div>
  );
}
