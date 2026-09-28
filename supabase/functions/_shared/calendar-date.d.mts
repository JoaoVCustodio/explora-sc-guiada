export function isCalendarDate(value: unknown): value is string;
export function addCalendarDays(value: string, offset: number): string;
export function isTripStart(value: unknown, days: number): boolean;
export function calendarWeekday(value: string): number;
export function tripCalendar(start: string | undefined, days: number): {dia:number;data:string;semana:number;dia_semana:string}[];
export function itineraryDayLabel(day: number, date?: string): string;
