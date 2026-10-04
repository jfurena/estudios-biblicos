/** Dates come from the API as ISO strings. */
export type DateValue = string | Date | null | undefined;

export type UserRole = 'user' | 'leader' | 'admin';

export interface AppUser {
    id: string;
    name?: string;
    email?: string;
    username?: string;
    phone?: string;
    photoURL?: string;
    role?: UserRole;
    createdAt?: DateValue;
}

export type PersonStatus = 'guest' | 'active' | 'pending' | 'paused' | 'completed' | 'inactive';

export interface Person {
    id: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    phone?: string;
    ministry?: string;
    group?: string;
    study?: string;
    location?: string;
    inCharge?: string;
    inChargeId?: string;
    inChargeUsername?: string;
    support?: string;
    supportId?: string;
    status?: string;
    createdBy?: string;
    createdAt?: DateValue;
}

export interface Group {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    ministry?: string;
    members?: string[];
    createdBy?: string;
    createdAt?: DateValue;
}

export type EventType = 'study' | 'service' | 'meeting' | 'social';

export interface CalendarEvent {
    id: string;
    title?: string;
    date?: DateValue;
    time?: string;
    location?: string;
    description?: string;
    type?: EventType;
    groupId?: string;
    userId?: string;
    createdBy?: string;
    personId?: string;
    personName?: string;
    companionId?: string;
    companionName?: string;
    createdAt?: DateValue;
}

export interface Announcement {
    id: string;
    text: string;
    groupId: string;
    userId?: string;
    createdBy?: string;
    createdAt?: DateValue;
}

export interface BibleStudy {
    id: string;
    name: string;
    owner: string;
    custom: boolean;
}

export interface HistoryEntry {
    id: string;
    personId: string;
    type: 'created' | 'status' | 'study' | 'note' | 'updated';
    text: string;
    userName?: string;
    createdAt?: DateValue;
}

export interface ChatParticipant {
    name: string;
    photoUrl?: string;
}

export interface Chat {
    id: string;
    participantIds: string[];
    participants: Record<string, ChatParticipant>;
    lastMessage?: string;
    lastMessageTime?: DateValue;
}

export interface Message {
    id: string;
    chatId: string;
    text: string;
    senderId: string;
    createdAt?: DateValue;
}

export interface AuditLog {
    id: string;
    action: string;
    userId?: string;
    userName?: string;
    createdAt?: DateValue;
}
