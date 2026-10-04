import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Send, Phone, Plus, MessageSquare, ChevronLeft, MessageCircle, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { api, subscribe } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks/useData';
import { cn, normalizeText, toDate, toMillis, whatsappLink } from '../lib/utils';
import type { AppUser, Chat as ChatType, ChatParticipant, Message } from '../lib/types';

interface ChatTarget {
    id: string;
    name?: string;
    photoURL?: string;
}

/** Deterministic id so two people always share the same conversation. */
const chatIdFor = (a: string, b: string) => [a, b].sort().join('_');

function formatTime(value: Message['createdAt']) {
    const date = toDate(value);
    if (!date) return '';
    return isToday(date) ? format(date, 'HH:mm') : format(date, "d MMM", { locale: es });
}

function Avatar({ name, photo, className }: { name?: string; photo?: string; className?: string }) {
    return (
        <div className={cn("h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium overflow-hidden shrink-0", className)}>
            {photo ? <img src={photo} alt={name} className="h-full w-full object-cover" /> : (name?.charAt(0).toUpperCase() || '?')}
        </div>
    );
}

export default function Chat() {
    const { user, profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { users } = useUsers();
    const currentUserId = user?.uid || '';

    const [chats, setChats] = useState<ChatType[]>([]);
    const [chatsLoaded, setChatsLoaded] = useState(false);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [pendingTarget, setPendingTarget] = useState<ChatTarget | null>(() => {
        const target = location.state?.startChatWith as ChatTarget | undefined;
        return target && target.id !== user?.uid ? target : null;
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatSearch, setNewChatSearch] = useState('');

    const usersById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

    // Clear navigation state so refreshing doesn't re-trigger the deep link
    useEffect(() => {
        if (location.state?.startChatWith) {
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.state, location.pathname, navigate]);

    // Chats where I participate (the server only returns those)
    useEffect(() => {
        if (!currentUserId) return;
        return subscribe<ChatType>("chats", undefined, (docs) => {
            const chatsData = docs.sort((a, b) => toMillis(b.lastMessageTime) - toMillis(a.lastMessageTime));
            setChats(chatsData);
            setChatsLoaded(true);
        }, (error) => {
            console.error("Error loading chats:", error);
            setChatsLoaded(true);
        });
    }, [currentUserId]);

    const findChatWith = (otherId: string) =>
        chats.find(c => c.participantIds.length === 2 && c.participantIds.includes(otherId) && c.participantIds.includes(currentUserId));

    // Deep link (from a profile or the people list): open or create the conversation
    const deepLinkChatId = pendingTarget && chatsLoaded
        ? (findChatWith(pendingTarget.id)?.id ?? chatIdFor(currentUserId, pendingTarget.id))
        : null;
    const activeChatId = selectedChatId ?? deepLinkChatId;

    const needsDeepLinkChat = !!(pendingTarget && chatsLoaded && deepLinkChatId && !chats.some(c => c.id === deepLinkChatId));
    useEffect(() => {
        if (!needsDeepLinkChat || !pendingTarget || !currentUserId) return;
        createChat(pendingTarget).catch(error => console.error("Error creating chat:", error));
        // createChat only depends on values captured here
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsDeepLinkChat]);

    const getParticipant = (chat: ChatType): ChatParticipant & { id?: string; phone?: string } => {
        const otherId = chat.participantIds.find(id => id !== currentUserId);
        if (!otherId) return { name: 'Desconocido' };
        const live: AppUser | undefined = usersById[otherId];
        const stored = chat.participants?.[otherId];
        return {
            id: otherId,
            name: live?.name || stored?.name || 'Usuario',
            photoUrl: live?.photoURL || stored?.photoUrl,
            phone: live?.phone,
        };
    };

    async function createChat(target: ChatTarget) {
        const id = chatIdFor(currentUserId, target.id);
        const targetUser = usersById[target.id];
        await api.put('chats', id, {
            participantIds: [currentUserId, target.id],
            participants: {
                [currentUserId]: { name: profile?.name || user?.displayName || 'Usuario', photoUrl: profile?.photoURL || '' },
                [target.id]: { name: targetUser?.name || target.name || 'Usuario', photoUrl: targetUser?.photoURL || target.photoURL || '' },
            },
            lastMessage: 'Chat iniciado',
            lastMessageTime: new Date().toISOString(),
        });
        return id;
    }

    const startNewChat = async (target: AppUser) => {
        setShowNewChatModal(false);
        setNewChatSearch('');
        setPendingTarget(null);
        const existing = findChatWith(target.id);
        if (existing) {
            setSelectedChatId(existing.id);
            return;
        }
        try {
            const id = await createChat({ id: target.id, name: target.name, photoURL: target.photoURL });
            setSelectedChatId(id);
        } catch (error) {
            console.error("Error creating chat:", error);
            alert("No se pudo iniciar la conversación.");
        }
    };

    const closeChat = () => {
        setSelectedChatId(null);
        setPendingTarget(null);
    };

    const filteredChats = useMemo(() => {
        const term = normalizeText(searchTerm);
        if (!term) return chats;
        return chats.filter(c => {
            const otherId = c.participantIds.find(id => id !== currentUserId);
            const name = (otherId && (usersById[otherId]?.name || c.participants?.[otherId]?.name)) || '';
            return normalizeText(name).includes(term);
        });
    }, [chats, searchTerm, usersById, currentUserId]);

    const newChatCandidates = useMemo(() => {
        const term = normalizeText(newChatSearch);
        return users
            .filter(u => u.id !== currentUserId)
            .filter(u => !term || normalizeText(`${u.name} ${u.username} ${u.email}`).includes(term));
    }, [users, newChatSearch, currentUserId]);

    const activeChat = chats.find(c => c.id === activeChatId);
    const pendingParticipant = pendingTarget ? { name: usersById[pendingTarget.id]?.name || pendingTarget.name || 'Usuario', photoUrl: pendingTarget.photoURL } : null;
    const otherParticipant = activeChat ? getParticipant(activeChat) : pendingParticipant;

    return (
        <div className="h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-4rem)] flex gap-6 overflow-hidden">
            {/* Chat list */}
            <div className={cn(
                "w-full lg:w-80 flex-col bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm shadow-xl shrink-0",
                activeChatId ? "hidden lg:flex" : "flex"
            )}>
                <div className="p-4 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-white">Mensajes</h1>
                        <button
                            onClick={() => setShowNewChatModal(true)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                            title="Nueva conversación"
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
                    {filteredChats.map(chat => {
                        const data = getParticipant(chat);
                        return (
                            <button
                                key={chat.id}
                                onClick={() => { setPendingTarget(null); setSelectedChatId(chat.id); }}
                                className={cn(
                                    "w-full p-4 flex items-center gap-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50",
                                    activeChatId === chat.id && 'bg-slate-800/80'
                                )}
                            >
                                <Avatar name={data.name} photo={data.photoUrl} />
                                <div className="flex-1 text-left overflow-hidden">
                                    <h3 className="font-medium text-white truncate">{data.name}</h3>
                                    <p className="text-sm text-slate-400 truncate">{chat.lastMessage}</p>
                                </div>
                                <span className="text-xs text-slate-500 shrink-0">{formatTime(chat.lastMessageTime)}</span>
                            </button>
                        );
                    })}
                    {chatsLoaded && filteredChats.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            {chats.length === 0 ? 'No hay conversaciones. Inicia una nueva con el botón +.' : 'No se encontraron chats.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className={cn(
                "flex-1 min-w-0 flex-col bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm shadow-xl overflow-hidden",
                activeChatId ? "flex" : "hidden lg:flex"
            )}>
                {activeChatId ? (
                    <ChatPanel
                        key={activeChatId}
                        chatId={activeChatId}
                        ready={!!activeChat}
                        currentUserId={currentUserId}
                        participant={otherParticipant}
                        onBack={closeChat}
                        onOpenProfile={() => {
                            const id = activeChat ? getParticipant(activeChat).id : pendingTarget?.id;
                            if (id) navigate(`/profile/${id}`);
                        }}
                    />
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

            {/* New chat modal */}
            {showNewChatModal && (
                <div onClick={() => setShowNewChatModal(false)} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-white">Nueva Conversación</h2>
                                <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
                            </div>
                            <input
                                autoFocus
                                value={newChatSearch}
                                onChange={e => setNewChatSearch(e.target.value)}
                                placeholder="Buscar usuario..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {newChatCandidates.length === 0 && <p className="text-sm text-slate-500 p-4 text-center">No hay usuarios.</p>}
                            {newChatCandidates.map(person => (
                                <button
                                    key={person.id}
                                    onClick={() => startNewChat(person)}
                                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-800 rounded-lg transition-colors text-left"
                                >
                                    <Avatar name={person.name} photo={person.photoURL} />
                                    <div className="min-w-0">
                                        <p className="text-slate-200 font-medium truncate">{person.name || person.email}</p>
                                        {person.username && <p className="text-xs text-slate-500 truncate">{person.username}</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface ChatPanelProps {
    chatId: string;
    ready: boolean;
    currentUserId: string;
    participant: (ChatParticipant & { phone?: string }) | null;
    onBack: () => void;
    onOpenProfile: () => void;
}

function ChatPanel({ chatId, ready, currentUserId, participant, onBack, onOpenProfile }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ready) return;
        return subscribe<Message>("messages", { chatId }, (docs) => {
            setMessages(docs.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt)));
        }, (error) => console.error("Error loading messages:", error));
    }, [chatId, ready]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = newMessage.trim();
        if (!text || !ready) return;
        setNewMessage('');

        try {
            // The server also updates the chat's last message
            await api.create('messages', { chatId, text });
        } catch (error) {
            console.error("Error sending message:", error);
            setNewMessage(text);
            alert("No se pudo enviar el mensaje.");
        }
    };

    return (
        <>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onBack} className="lg:hidden p-1 -ml-1 text-slate-400 hover:text-white" aria-label="Volver">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button onClick={onOpenProfile} className="flex items-center gap-3 min-w-0 text-left">
                        <Avatar name={participant?.name} photo={participant?.photoUrl} />
                        <h2 className="font-bold text-white truncate hover:underline">{participant?.name || 'Usuario'}</h2>
                    </button>
                </div>
                {participant?.phone && (
                    <div className="flex gap-1 shrink-0">
                        <a href={`tel:${participant.phone}`} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Llamar">
                            <Phone className="h-5 w-5" />
                        </a>
                        <a href={whatsappLink(participant.phone)} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors" title="WhatsApp">
                            <MessageCircle className="h-5 w-5" />
                        </a>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30">
                {messages.length === 0 && (
                    <p className="text-center text-sm text-slate-500 py-8">{ready ? 'Aún no hay mensajes. ¡Saluda!' : 'Abriendo conversación...'}</p>
                )}
                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isMe
                                ? 'bg-emerald-600 text-white rounded-tr-none'
                                : 'bg-slate-800 text-slate-200 rounded-tl-none'
                                }`}>
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                <div className={`text-[10px] mt-1 ${isMe ? 'text-emerald-200' : 'text-slate-500'}`}>
                                    {formatTime(msg.createdAt) || 'Enviando...'}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={!ready}
                        placeholder={ready ? "Escribe un mensaje..." : "Abriendo conversación..."}
                        className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || !ready}
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </form>
        </>
    );
}
