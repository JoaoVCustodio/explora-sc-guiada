// Calendar arithmetic only. UTC is a fixed arithmetic frame, never a user timezone.
export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const [year,month,day]=value.split('-').map(Number);
  const d=new Date(Date.UTC(year,month-1,day));
  return d.getUTCFullYear()===year && d.getUTCMonth()===month-1 && d.getUTCDate()===day;
}
export function addCalendarDays(value,offset) {
  if (!isCalendarDate(value)||!Number.isInteger(offset)) throw new Error('INVALID_CALENDAR_DATE');
  const [y,m,d]=value.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d+offset));
  const result=date.toISOString().slice(0,10);
  if (!isCalendarDate(result)) throw new Error('INVALID_CALENDAR_DATE');
  return result;
}
export function isTripStart(value,days) {
  try { return isCalendarDate(value)&&Number.isInteger(days)&&days>=1&&days<=7&&isCalendarDate(addCalendarDays(value,days-1)); }
  catch { return false; }
}
export function calendarWeekday(value) {
  if (!isCalendarDate(value)) throw new Error('INVALID_CALENDAR_DATE');
  const [y,m,d]=value.split('-').map(Number);
  return (new Date(Date.UTC(y,m-1,d)).getUTCDay()+6)%7; // Monday=0
}
export function tripCalendar(start,days) {
  if (start===undefined) return [];
  if (!isTripStart(start,days)) throw new Error('INVALID_CALENDAR_DATE');
  const names=['segunda','terça','quarta','quinta','sexta','sábado','domingo'];
  return Array.from({length:days},(_,i)=>{const data=addCalendarDays(start,i);const semana=calendarWeekday(data);return {dia:i+1,data,semana,dia_semana:names[semana]};});
}
export function itineraryDayLabel(day,date) {
  if (!date) return `Dia ${day}`;
  const names=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
  const months=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const [,month,dateDay]=date.split('-').map(Number);
  return `Dia ${day} · ${names[calendarWeekday(date)]}, ${dateDay} ${months[month-1]}`;
}
