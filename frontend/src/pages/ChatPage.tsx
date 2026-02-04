import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';

interface User {
    _id: string;
    email: string;
    isOnline: boolean;
    unreadCount?: number;
}

interface Message {
    _id: string;
    sender: any;
    receiver: any;
    content: string;
    isRead: boolean;
    createdAt: string;
}

const ChatPage: React.FC = () => {
    const { user, logout } = useAuth();
    const { socket } = useSocket();
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchHistory(selectedUser._id);
            // Mark as read when switching to a user
            if (socket) {
                socket.emit('markAsRead', { senderId: selectedUser._id });
            }
            // Clear unread count locally when selecting a user
            setUsers(prev => prev.map(u =>
                u._id === selectedUser._id ? { ...u, unreadCount: 0 } : u
            ));
        }
    }, [selectedUser, socket]);

    useEffect(() => {
        if (socket) {
            socket.on('receiveMessage', (message: Message) => {
                const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
                const receiverId = typeof message.receiver === 'string' ? message.receiver : message.receiver._id;
                const currentUserId = user?.id;
                const selectedId = selectedUser?._id;

                if (
                    (senderId === selectedId && receiverId === currentUserId) ||
                    (senderId === currentUserId && receiverId === selectedId)
                ) {
                    setMessages((prev) => [...prev, message]);

                    // If we receive a message from the currently selected user, mark it as read immediately
                    if (senderId === selectedId) {
                        socket.emit('markAsRead', { senderId: selectedId });
                    }
                } else if (receiverId === currentUserId) {
                    // Message for me but from someone else (not the selected chat)
                    // Increment unread count for that user in the sidebar
                    setUsers(prev => prev.map(u =>
                        u._id === senderId ? { ...u, unreadCount: (u.unreadCount || 0) + 1 } : u
                    ));
                }
            });

            socket.on('messagesRead', ({ readerId, senderId }: { readerId: string; senderId: string }) => {
                const myId = user?.id || (user as any)?._id;
                const currentSelectedId = selectedUser?._id;

                // If I am the sender of the messages (senderId === myId) 
                // AND the person who read them is the one I'm currently chatting with (readerId === currentSelectedId)
                if (String(senderId) === String(myId) && String(readerId) === String(currentSelectedId)) {
                    setMessages((prev) =>
                        prev.map(msg => ({ ...msg, isRead: true }))
                    );
                }
            });

            socket.on('userStatusChanged', ({ userId, status }: { userId: string; status: string }) => {
                setUsers((prev) =>
                    prev.map((u) => (u._id === userId ? { ...u, isOnline: status === 'online' } : u))
                );
            });

            return () => {
                socket.off('receiveMessage');
                socket.off('messagesRead');
                socket.off('userStatusChanged');
            };
        }
    }, [socket, selectedUser, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    const fetchHistory = async (otherUserId: string) => {
        try {
            const response = await api.get(`/chat/history/${otherUserId}`);
            setMessages(response.data);
        } catch (err) {
            console.error('Failed to fetch history', err);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser || !socket) return;

        socket.emit('sendMessage', {
            receiverId: selectedUser._id,
            content: newMessage,
        });

        setNewMessage('');
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden relative">
            {/* Sidebar */}
            <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${selectedUser ? 'hidden md:flex' : 'flex'
                }`}>
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">BuzzChat</span>
                        <span className="font-bold text-gray-800 truncate max-w-[140px]">{user?.email}</span>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Logout"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Recent Chats</div>
                    {users.map((u) => (
                        <div
                            key={u._id}
                            onClick={() => setSelectedUser(u)}
                            className={`px-5 py-4 cursor-pointer transition-all duration-200 flex items-center border-l-4 ${selectedUser?._id === u._id
                                ? 'bg-blue-50 border-blue-600'
                                : 'hover:bg-gray-50 border-transparent'
                                }`}
                        >
                            <div className="relative">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${selectedUser?._id === u._id ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}>
                                    {u.email[0].toUpperCase()}
                                </div>
                                <div
                                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${u.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                        }`}
                                />
                            </div>
                            <div className="ml-4 flex-1 overflow-hidden">
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className={`text-sm font-semibold truncate ${selectedUser?._id === u._id ? 'text-blue-900' : 'text-gray-700'}`}>
                                        {u.email.split('@')[0]}
                                    </span>
                                    {(u.unreadCount ?? 0) > 0 && (
                                        <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {u.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 truncate">Click to start chatting</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedUser ? (
                <div className="flex-1 flex flex-col bg-white h-full relative">
                    <div className="h-[73px] px-4 md:px-6 border-b border-gray-100 bg-white flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center min-w-0">
                            {/* Back Button for Mobile */}
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="mr-3 p-2 -ml-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg md:hidden transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                    {selectedUser.email[0].toUpperCase()}
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                            </div>
                            <div className="ml-3 md:ml-4 overflow-hidden">
                                <h3 className="font-bold text-gray-800 leading-tight truncate">{selectedUser.email.split('@')[0]}</h3>
                                <span className={`text-[10px] font-bold ${selectedUser.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                                    {selectedUser.isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></button>
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafc] custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2">
                                <p className="text-sm font-medium">No messages yet</p>
                                <p className="text-xs">Send a message to start the conversation</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender._id === user?.id || msg.sender === user?.id;
                            const prevMsg = messages[idx - 1];
                            const isSameSender = prevMsg && (prevMsg.sender._id === msg.sender._id || prevMsg.sender === msg.sender);

                            return (
                                <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-message ${isSameSender ? '-mt-2' : ''}`}>
                                    <div
                                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${isMe
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                            }`}
                                    >
                                        <p className="text-[14px] leading-relaxed">{msg.content}</p>
                                        <div className="flex items-center justify-end mt-1 space-x-1">
                                            <span className={`text-[9px] font-medium ${isMe ? 'text-blue-100 opacity-80' : 'text-gray-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isMe && (
                                                <span className={`text-[12px] flex leading-none ${msg.isRead ? 'text-blue-100' : 'text-blue-300 opacity-60'}`}>
                                                    {msg.isRead ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            <path fillRule="evenodd" d="M13.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L5 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" transform="translate(-3,0)" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-white border-t border-gray-100">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                            <button type="button" className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            </button>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white p-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95 disabled:shadow-none"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-400 bg-gray-50">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Select a chat</h2>
                    <p className="text-sm">Choose a user from the left to start messaging</p>
                </div>
            )}
        </div>
    );
};

export default ChatPage;
