import {useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent} from 'react';
import {CalendarDays, ChevronLeft, ChevronRight, X} from 'lucide-react';
import {Button} from './ui/button';
import {addCalendarDays, calendarWeekday, isCalendarDate} from '../../supabase/functions/_shared/calendar-date.mjs';
import {calendarCells, calendarMonths, calendarNames, localCalendarToday, shiftCalendarMonth} from './calendar-utils';

const allowed=(date:string)=>isCalendarDate(date)&&date<='9999-12-25';
export function TripDatePicker({value='',onChange,id='trip-start',describedBy}:{value?:string;onChange?:(value:string)=>void;id?:string;describedBy?:string}) {
  const uid=useId(),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false),[focusDate,setFocusDate]=useState(value||localCalendarToday());
  const [direct,setDirect]=useState(''),[error,setError]=useState('');
  const today=localCalendarToday(),month=focusDate.slice(0,7);
  const cells=calendarCells(month),[year,monthNumber]=month.split('-').map(Number);
  const close=()=>{dialog.current?.close();setOpen(false);trigger.current?.focus();};
  const positionDialog=useCallback(()=>{
    const calendar=dialog.current,anchor=trigger.current;
    if(!calendar||!anchor)return;
    if(window.matchMedia('(max-width: 639px)').matches){calendar.style.removeProperty('top');calendar.style.removeProperty('left');calendar.style.removeProperty('max-height');return;}

    const margin=16,gap=8,anchorRect=anchor.getBoundingClientRect(),calendarRect=calendar.getBoundingClientRect();
    const naturalHeight=calendar.scrollHeight;
    const spaceBelow=window.innerHeight-anchorRect.bottom-margin-gap;
    const spaceAbove=anchorRect.top-margin-gap;
    const placeBelow=spaceBelow>=naturalHeight||(spaceAbove<naturalHeight&&spaceBelow>=spaceAbove);
    const availableHeight=Math.max(0,placeBelow?spaceBelow:spaceAbove);
    const height=Math.min(naturalHeight,availableHeight);
    const top=placeBelow?anchorRect.bottom+gap:anchorRect.top-height-gap;
    const left=Math.max(margin,Math.min(anchorRect.left,window.innerWidth-calendarRect.width-margin));
    calendar.style.maxHeight=`${Math.floor(availableHeight)}px`;
    calendar.style.top=`${Math.round(top)}px`;
    calendar.style.left=`${Math.round(left)}px`;
  },[]);
  useLayoutEffect(()=>{
    const calendar=dialog.current;
    if(!open||!calendar)return;
    if(!calendar.open)calendar.showModal();
    positionDialog();
    const frame=requestAnimationFrame(positionDialog);
    const observer=new ResizeObserver(positionDialog);
    observer.observe(calendar);
    window.addEventListener('resize',positionDialog);
    window.addEventListener('scroll',positionDialog,true);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',positionDialog);window.removeEventListener('scroll',positionDialog,true);};
  },[open,positionDialog]);
  useEffect(()=>{
    if(open) dialog.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  },[open,focusDate]);
  const show=()=>{
    setFocusDate(value||today);setDirect(value?value.split('-').reverse().join('/'):'');setError('');setOpen(true);
  };
  const select=(date:string)=>{onChange?.(date);close();};
  const move=(event:KeyboardEvent<HTMLButtonElement>,date:string)=>{
    let next=date;
    try {
      const offsets:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-calendarWeekday(date),End:6-calendarWeekday(date)};
      if(event.key in offsets) next=addCalendarDays(date,offsets[event.key]);
      else if(event.key==='PageUp'||event.key==='PageDown') next=shiftCalendarMonth(date,(event.key==='PageUp'?-1:1)*(event.shiftKey?12:1));
      else return;
      event.preventDefault();if(allowed(next))setFocusDate(next);
    } catch {event.preventDefault();}
  };
  const jump=()=>{
    const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(direct);
    const date=match?`${match[3]}-${match[2]}-${match[1]}`:'';
    if(!allowed(date)){setError('Use uma data válida no formato DD/MM/AAAA.');return;}
    setError('');select(date);
  };
  return <>
    <button id={id} ref={trigger} type="button" className="date-trigger" aria-label={`Quando começa sua viagem? ${value?value.split('-').reverse().join('/'):'Data opcional, ainda vou decidir'}`} aria-haspopup="dialog" aria-expanded={open} aria-describedby={describedBy} onClick={show}>
      <CalendarDays className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{value?`${Number(value.slice(8))} de ${calendarMonths[Number(value.slice(5,7))-1].toLowerCase()} de ${value.slice(0,4)}`:'Ainda vou decidir'}</span>
      <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
    </button>
    <dialog ref={dialog} className="product-ui date-dialog" aria-labelledby={`${uid}-title`} aria-describedby={`${uid}-help`} onClose={()=>{setOpen(false);trigger.current?.focus();}} onClick={event=>{
      if(event.target!==event.currentTarget)return;const r=event.currentTarget.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();
    }}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="eyebrow">Sua próxima viagem</p><h2 id={`${uid}-title`} className="editorial-title mt-1 text-2xl">Escolha o início</h2></div>
        <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Fechar calendário"><X aria-hidden="true" /></Button>
      </div>
      <div className="calendar-heading">
        <Button type="button" variant="ghost" size="icon" disabled={month==='1000-01'} onClick={()=>setFocusDate(shiftCalendarMonth(focusDate,-1))} aria-label="Mês anterior"><ChevronLeft aria-hidden="true" /></Button>
        <h3 id={`${uid}-month`} aria-live="polite">{calendarMonths[monthNumber-1]} <span className="text-muted-foreground">{year}</span></h3>
        <Button type="button" variant="ghost" size="icon" disabled={month==='9999-12'} onClick={()=>setFocusDate(shiftCalendarMonth(focusDate,1))} aria-label="Próximo mês"><ChevronRight aria-hidden="true" /></Button>
      </div>
      <table className="calendar-grid" role="grid" aria-labelledby={`${uid}-month`}>
        <thead><tr>{['S','T','Q','Q','S','S','D'].map((label,i)=><th key={i} scope="col" aria-label={calendarNames[i]}>{label}</th>)}</tr></thead>
        <tbody>{Array.from({length:6},(_,week)=><tr key={week}>{cells.slice(week*7,week*7+7).map(date=><td key={date} aria-selected={date===value}>
          <button type="button" data-date={date} data-outside={date.slice(0,7)!==month} data-selected={date===value} aria-current={date===today?'date':undefined} disabled={!allowed(date)} tabIndex={date===focusDate?0:-1} onClick={()=>select(date)} onKeyDown={event=>move(event,date)} aria-label={isCalendarDate(date)?`${calendarNames[calendarWeekday(date)]}, ${date.split('-').reverse().join('/')}`:undefined}>{Number(date.slice(8))}</button>
        </td>)}</tr>)}</tbody>
      </table>
      <p id={`${uid}-help`} className="sr-only">Use as setas para navegar pelos dias, Page Up e Page Down para meses, com Shift para anos. Enter seleciona. Escape fecha.</p>
      <div className="calendar-direct">
        <label htmlFor={`${uid}-direct`} className="text-xs font-medium">Ou digite a data</label>
        <div className="mt-1.5 flex gap-2"><input id={`${uid}-direct`} inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} value={direct} onChange={e=>{setDirect(e.target.value);setError('');}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();jump();}}} aria-invalid={Boolean(error)} aria-describedby={error?`${uid}-error`:undefined} className="min-h-11 min-w-0 flex-1 border border-input px-3 text-base" /><Button type="button" variant="outline" onClick={jump}>Aplicar</Button></div>
        {error&&<p id={`${uid}-error`} role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
      <div className="calendar-actions"><Button type="button" variant="ghost" onClick={()=>select(today)}>Hoje</Button><Button type="button" variant="ghost" onClick={()=>select('')}>Deixar em aberto</Button></div>
    </dialog>
  </>;
}
