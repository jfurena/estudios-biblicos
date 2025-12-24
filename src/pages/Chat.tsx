import { useState, useEffect, useRef } from 'react';
import { Search, Send, MoreVertical, Phone, Video, Plus, MessageSquare } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: any;
}

interface Chat {
    id: string;
    participantIds: string[];
    participants: { [key: string]: { name: string, photoUrl?: string } };
    lastMessage?: string;
    lastMessageTime?: any;
}

interface Person {
    id: string;
    name: string;
    imageUrl?: string;
}



export default function Chat() {
    const { user } = useAuth();
    const location = useLocation();
    const currentUserId = user?.uid;
    const currentUserName = user?.displayName || 'Usuario';

    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [people, setPeople] = useState<Person[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Handle deep linking to chat
    useEffect(() => {
        if (location.state?.startChatWith) {
            const targetUser = location.state.startChatWith;
            // Delay slightly to ensure chats might have loaded, or rely on finding it. 
            // Ideally we'd wait for loading state, but for now allow creation.
            startNewChat({
                id: targetUser.id,
                name: targetUser.firstName || targetUser.name,
                imageUrl: targetUser.photoURL || targetUser.imageUrl
            } as Person);

            // Clear state to avoid loops on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state, chats]);

    // Fetch Chats
    useEffect(() => {
        if (!currentUserId) return;

        const q = query(
            collection(db, "chats"),
            where("participantIds", "array-contains", currentUserId),
            orderBy("lastMessageTime", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Chat));
            setChats(chatsData);
        });

        return () => unsubscribe();
    }, []);

    // Fetch Messages when chat selected
    useEffect(() => {
        if (!activeChatId) return;

        const q = query(
            collection(db, "chats", activeChatId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(msgs);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [activeChatId]);

    // Fetch People for "New Chat"
    useEffect(() => {
        if (!showNewChatModal) return;
        const q = query(collection(db, "people")); // Ideally limit or paginate
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPeople(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person)));
        });
        return () => unsubscribe();
    }, [showNewChatModal]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChatId) return;

        try {
            // Add message
            await addDoc(collection(db, "chats", activeChatId, "messages"), {
                text: newMessage,
                senderId: currentUserId,
                createdAt: serverTimestamp()
            });

            // Update chat last message
            await setDoc(doc(db, "chats", activeChatId), {
                lastMessage: newMessage,
                lastMessageTime: serverTimestamp()
            }, { merge: true });

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const startNewChat = async (person: Person) => {
        // Check if chat already exists
        const existingChat = chats.find(c => c.participantIds.includes(person.id));
        if (existingChat) {
            setActiveChatId(existingChat.id);
            setShowNewChatModal(false);
            return;
        }

        // Create new chat
        try {
            const newChatRef = await addDoc(collection(db, "chats"), {
                participantIds: [currentUserId, person.id],
                participants: {
                    [currentUserId!]: { name: currentUserName },
                    [person.id]: { name: person.name, photoUrl: person.imageUrl }
                },
                createdAt: serverTimestamp(),
                lastMessage: 'Chat iniciado',
                lastMessageTime: serverTimestamp()
            });
            setActiveChatId(newChatRef.id);
            setShowNewChatModal(false);
        } catch (error) {
            console.error("Error creating chat:", error);
        }
    };

    const activeChat = chats.find(c => c.id === activeChatId);
    const otherParticipantId = activeChat?.participantIds.find(id => id !== currentUserId);
    const otherParticipant = activeChat && otherParticipantId ? activeChat.participants[otherParticipantId] : null;

    return (
        <div className="h-[calc(100vh-2rem)] flex gap-6 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-80 flex flex-col bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm shadow-xl">
                <div className="p-4 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-white">Mensajes</h1>
                        <button
                            onClick={() => setShowNewChatModal(true)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar chats..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {chats.map(chat => {
                        const otherId = chat.participantIds.find(id => id !== currentUserId);
                        const data = otherId ? chat.participants[otherId] : { name: 'Unknown' };
                        return (
                            <button
                                key={chat.id}
                                onClick={() => setActiveChatId(chat.id)}
                                className={`w-full p-4 flex items-center gap-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 ${activeChatId === chat.id ? 'bg-slate-800/80' : ''}`}
                            >
                                <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium overflow-hidden">
                                    {data?.photoUrl ? (
                                        <img src={data.photoUrl} alt={data.name} className="h-full w-full object-cover" />
                                    ) : (
                                        data?.name?.charAt(0) || '?'
                                    )}
                                </div>
                                <div className="flex-1 text-left overflow-hidden">
                                    <h3 className="font-medium text-white truncate">{data?.name}</h3>
                                    <p className="text-sm text-slate-400 truncate">{chat.lastMessage}</p>
                                </div>
                                {chat.lastMessageTime && (
                                    <span className="text-xs text-slate-500">
                                        {new Date(chat.lastMessageTime?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    {chats.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No hay conversaciones. Inicia una nueva.
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm shadow-xl overflow-hidden">
                {activeChatId ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium overflow-hidden">
                                    {otherParticipant?.photoUrl ? (
                                        <img src={otherParticipant.photoUrl} alt={otherParticipant.name} className="h-full w-full object-cover" />
                                    ) : (
                                        otherParticipant?.name?.charAt(0) || '?'
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-bold text-white">{otherParticipant?.name}</h2>
                                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                        En línea
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                    <Phone className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                    <Video className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30">
                            {messages.map((msg) => {
                                const isMe = msg.senderId === currentUserId;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${isMe
                                            ? 'bg-emerald-600 text-white rounded-tr-none'
                                            : 'bg-slate-800 text-slate-200 rounded-tl-none'
                                            }`}>
                                            <p className="text-sm">{msg.text}</p>
                                            <div className={`text-[10px] mt-1 ${isMe ? 'text-emerald-200' : 'text-slate-500'}`}>
                                                {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Enviando...'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                        <div className="h-16 w-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="h-8 w-8 text-slate-600" />
                        </div>
                        <p className="text-lg font-medium text-slate-400">Selecciona un chat</p>
                        <p className="text-sm">o inicia una nueva conversación</p>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div onClick={() => setShowNewChatModal(false)} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-slate-800">
                            <h2 className="font-bold text-white">Nueva Conversación</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {people.map(person => (
                                <button
                                    key={person.id}
                                    onClick={() => startNewChat(person)}
                                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-800 rounded-lg transition-colors text-left"
                                >
                                    <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm">
                                        {person.imageUrl ? (
                                            <img src={person.imageUrl} alt={person.name} className="h-full w-full object-cover rounded-full" />
                                        ) : person.name?.charAt(0)}
                                    </div>
                                    <span className="text-slate-200 font-medium">{person.name}</span>
                                </button>
                            ))}
                        </div>
                        <div className="p-4 border-t border-slate-800">
                            <button onClick={() => setShowNewChatModal(false)} className="w-full py-2 text-sm text-slate-400 hover:text-white text-center">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
