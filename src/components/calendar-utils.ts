import {calendarWeekday, isCalendarDate} from '../../supabase/functions/_shared/calendar-date.mjs';
export const calendarMonths=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const calendarNames=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
export function calendarCells(month: string) {
  const [y,m]=month.split('-').map(Number);
  const first=`${month}-01`,offset=calendarWeekday(first);
  return Array.from({length:42},(_,i)=>new Date(Date.UTC(y,m-1,1-offset+i)).toISOString().slice(0,10));
}
export function shiftCalendarMonth(date: string, amount: number) {
  const [y,m,d]=date.split('-').map(Number);
  const first=new Date(Date.UTC(y,m-1+amount,1));
  const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  const next=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(d,last))).toISOString().slice(0,10);
  return isCalendarDate(next)?next:date;
}
export function localCalendarToday() {
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
