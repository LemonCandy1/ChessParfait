import { addDays } from './training';

// Month and duration formatting shared by the training calendar, the Training page and the coach view.

export const monthKey = (day: string) => day.slice(0, 7);
export const firstOfMonth = (month: string) => `${month}-01`;
export const lastOfMonth = (month: string) => addDays(firstOfMonth(addMonths(month, 1)), -1);

export function addMonths(month: string, delta: number): string {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    return date.toISOString().slice(0, 7);
}

export const formatDay = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString('en-AU', { ...options, timeZone: 'UTC' });

export const formatMinutes = (minutes: number) =>
    minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes}m`;

export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry focus-visible:ring-offset-2';
