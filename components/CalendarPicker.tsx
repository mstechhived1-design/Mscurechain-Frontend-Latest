'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarPickerProps {
  startDate: string;
  endDate: string;
  onChange: (dates: { startDate: string; endDate: string }) => void;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ startDate, endDate, onChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const selected = useMemo(() => startDate ? new Date(startDate) : null, [startDate]);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    const firstDayIndex = date.getDay();
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex; i > 0; i--) {
      days.push({
        day: prevMonthLastDate - i + 1,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false
      });
    }

    const lastDate = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDate; i++) {
      days.push({
        day: i,
        month: month,
        year: year,
        isCurrentMonth: true
      });
    }

    const nextDays = 42 - days.length;
    for (let i = 1; i <= nextDays; i++) {
      days.push({
        day: i,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentMonth]);

  const handleDateClick = (dayObj: { day: number; month: number; year: number }) => {
    // Check if date is in the past
    if (isPastDate(dayObj)) {
      return; // Don't allow selection of past dates
    }
    
    // Construct date string manually to avoid timezone shifting with toISOString()
    const y = dayObj.year;
    const m = String(dayObj.month + 1).padStart(2, '0');
    const d = String(dayObj.day).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    // Set both start and end to the same date for single day leaves
    onChange({ startDate: dateStr, endDate: dateStr });
  };

  const isSelected = (dayObj: { day: number; month: number; year: number }) => {
    if (!startDate) return false;
    
    // Use same date string construction method for consistency
    const y = dayObj.year;
    const m = String(dayObj.month + 1).padStart(2, '0');
    const d = String(dayObj.day).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    return dateStr === startDate;
  };

  const isToday = (dayObj: { day: number; month: number; year: number }) => {
    const today = new Date();
    return (
      dayObj.day === today.getDate() &&
      dayObj.month === today.getMonth() &&
      dayObj.year === today.getFullYear()
    );
  };

  const isPastDate = (dayObj: { day: number; month: number; year: number }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dateToCheck = new Date(dayObj.year, dayObj.month, dayObj.day);
    dateToCheck.setHours(0, 0, 0, 0);
    
    return dateToCheck < today;
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${m}/${d}/${y}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="p-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/50">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
          <CalendarIcon className="w-4 h-4 text-indigo-600" />
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <div className="flex gap-1">
          <button 
            type="button"
            onClick={prevMonth}
            className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={nextMonth}
            className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-tighter py-1">
              {d}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((dayObj, i) => {
            const selected = isSelected(dayObj);
            const today = isToday(dayObj);
            const isPast = isPastDate(dayObj);
            
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDateClick(dayObj)}
                disabled={isPast}
                className={`
                  relative h-10 w-full flex items-center justify-center rounded-xl text-sm
                  ${!dayObj.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                  ${selected ? 'bg-indigo-600 text-white font-bold z-10' : ''}
                  ${!selected && dayObj.isCurrentMonth && !isPast ? 'hover:bg-gray-100' : ''}
                  ${today && !selected ? 'border border-indigo-200' : ''}
                  ${isPast && !selected ? 'text-gray-300 cursor-not-allowed opacity-40' : ''}
                  ${isPast && selected ? 'bg-gray-300 text-gray-500' : ''}
                  transition-all
                `}
              >
                {dayObj.day}
                {today && !selected && (
                  <div className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {startDate && (
        <div className="p-3 bg-indigo-50/50 border-t border-indigo-100 flex flex-col gap-1">
           <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 uppercase font-bold text-[10px]">Selected Date</span>
              <button 
                type="button"
                onClick={() => onChange({ startDate: '', endDate: '' })}
                className="text-indigo-600 hover:underline font-bold"
              >
                Clear
              </button>
           </div>
           <div className="px-3 py-2 bg-white rounded-lg border border-indigo-100 text-sm font-bold text-indigo-700 text-center">
             {formatDisplayDate(startDate)}
           </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPicker;
