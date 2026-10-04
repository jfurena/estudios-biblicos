import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DateValue, Person } from "./types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

/**
 * Resizes an image file and returns it as a JPEG data URL small enough to be
 * stored inside a database record.
 */
export const compressImage = async (file: File, maxSize = 320, quality = 0.8): Promise<string> => {
    const dataUrl = await convertFileToBase64(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
    });

    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
};

export function toDate(value: DateValue): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

export function toMillis(value: DateValue): number {
    return toDate(value)?.getTime() ?? 0;
}

export function getPersonName(person: Pick<Person, 'firstName' | 'lastName'>) {
    return `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Sin Nombre';
}

export function getInitials(name?: string) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export function normalizeText(text?: string) {
    return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function whatsappLink(phone: string) {
    return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

function escapeCsvValue(value: unknown) {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n\r;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCSV(headers: string[], rows: unknown[][]) {
    return [headers, ...rows].map(row => row.map(escapeCsvValue).join(',')).join('\r\n');
}

export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
    // BOM so Excel opens accented characters correctly
    const blob = new Blob(['﻿' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/** Minimal CSV parser supporting quoted values, commas or semicolons as separators. */
export function parseCSV(text: string): string[][] {
    const clean = text.replace(/^\uFEFF/, '');
    const firstLine = clean.split(/\r?\n/)[0] || '';
    const separator = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ';' : ',';

    const rows: string[][] = [];
    let row: string[] = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < clean.length; i++) {
        const char = clean[i];
        if (inQuotes) {
            if (char === '"') {
                if (clean[i + 1] === '"') {
                    value += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                value += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === separator) {
            row.push(value);
            value = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && clean[i + 1] === '\n') i++;
            row.push(value);
            rows.push(row);
            row = [];
            value = '';
        } else {
            value += char;
        }
    }
    if (value !== '' || row.length > 0) {
        row.push(value);
        rows.push(row);
    }
    return rows.filter(r => r.some(cell => cell.trim() !== ''));
}
