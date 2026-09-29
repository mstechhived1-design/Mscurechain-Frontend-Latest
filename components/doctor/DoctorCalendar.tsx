"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

function DoctorCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const fullDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    
    const calendarDays = [];
    const today = new Date();

    // Empty cells for previous month
    for (let i = 0; i < startDay; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Days of the month
    for (let i = 1; i <= totalDays; i++) {
        const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        calendarDays.push(
            <div 
                key={i} 
                className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold cursor-pointer hover:bg-secondary-theme ${
                    isToday 
                        ? 'bg-primary-theme text-white shadow-md' 
                        : 'text-foreground hover:text-primary-theme'
                }`}
            >
                {i}
            </div>
        );
    }

    return calendarDays;
  };

  return (
    <div className="bg-card dark:bg-card p-5 rounded-2xl shadow-sm border border-border-theme dark:border-border-theme h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-primary-theme" />
                <div>
                    <h3 className="text-sm font-black text-foreground">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                </div>
            </div>
            <div className="flex gap-1">
                <button 
                    onClick={handlePrevMonth} 
                    className="p-1.5 hover:bg-secondary-theme rounded-lg text-muted hover:text-foreground"
                >
                    <ChevronLeft size={16} />
                </button>
                <button 
                    onClick={handleNextMonth} 
                    className="p-1.5 hover:bg-secondary-theme rounded-lg text-muted hover:text-foreground"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map((day, index) => (
                <div key={`day-${fullDays[index]}`} className="h-6 flex items-center justify-center text-[10px] font-black text-muted">
                    {day}
                </div>
            ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 place-items-center flex-1">
            {renderCalendarDays()}
        </div>
    </div>
  );
}

export default React.memo(DoctorCalendar);
