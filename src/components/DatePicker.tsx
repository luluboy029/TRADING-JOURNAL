import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format or empty string
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  isClearable?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
  isClearable = true
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial visual month/year based on value or today
  const getInitialYearMonth = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parts = value.split('-');
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10) - 1 // 0-indexed month
      };
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth()
    };
  };

  const [visibleState, setVisibleState] = useState(getInitialYearMonth());
  const { year, month } = visibleState;

  // Sync visible calendar view if value changes externally
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parts = value.split('-');
      setVisibleState({
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10) - 1
      });
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calendar math of specific month
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    // 0 = Sunday, 1 = Monday, etc. Adjust so Monday = 0, Sunday = 6 or keep standard
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 for Monday, 6 for Sunday
  };

  const daysInCurrentMonth = getDaysInMonth(year, month);
  const startDayOffset = getFirstDayOfMonth(year, month);

  // Handle month navigation
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (month === 0) {
      setVisibleState({ year: year - 1, month: 11 });
    } else {
      setVisibleState({ year, month: month - 1 });
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (month === 11) {
      setVisibleState({ year: year + 1, month: 0 });
    } else {
      setVisibleState({ year, month: month + 1 });
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVisibleState({ ...visibleState, year: parseInt(e.target.value, 10) });
  };

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVisibleState({ ...visibleState, month: parseInt(e.target.value, 10) });
  };

  // Day selection click
  const selectDay = (dayNum: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const newValue = `${year}-${formattedMonth}-${formattedDay}`;
    onChange(newValue);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleTodaySelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Year choices
  const currentYear = new Date().getFullYear();
  const selectYears: number[] = [];
  for (let y = currentYear - 15; y <= currentYear + 5; y++) {
    selectYears.push(y);
  }

  // Detect current selected day highlights
  const isSelectedDay = (d: number) => {
    if (!value) return false;
    const parts = value.split('-');
    return (
      parseInt(parts[0], 10) === year &&
      parseInt(parts[1], 10) === month + 1 &&
      parseInt(parts[2], 10) === d
    );
  };

  const isTodayDay = (d: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d
    );
  };

  // Generate grid days display
  const daysArray = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);
  const emptyOffsetCells = Array.from({ length: startDayOffset });

  return (
    <div className={`relative ${className}`} ref={containerRef} id={`date-picker-wrapper-${placeholder.replace(/\s+/g, '-').toLowerCase()}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-full bg-geo-bg border border-geo-border hover:border-slate-800 focus-within:border-blue-500 px-3 cursor-pointer select-none transition-colors"
      >
        <span className={`text-[11px] font-mono ${value ? 'text-slate-200' : 'text-slate-500'}`}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {isClearable && value && (
            <button
              onClick={handleClear}
              type="button"
              className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer bg-transparent border-0"
              title="Clear date"
            >
              <X size={12} />
            </button>
          )}
          <CalendarIcon size={12} className="text-slate-400" />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[110] left-0 mt-1.5 w-64 bg-slate-950 border border-geo-border p-3 shadow-2xl rounded-sm text-left select-none"
          >
            {/* Calendar Controls row */}
            <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b border-geo-border/50">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xs transition-colors cursor-pointer"
              >
                <ChevronLeft size={13} />
              </button>

              <div className="flex items-center gap-1 font-mono text-[10px]">
                <select
                  value={month}
                  onChange={handleMonthSelect}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-[10px] px-1 py-0.5 outline-none font-bold"
                >
                  {monthsList.map((m, idx) => (
                    <option key={m} value={idx}>{m.slice(0, 3)}</option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={handleYearChange}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-[10px] px-1 py-0.5 outline-none font-bold"
                >
                  {selectYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xs transition-colors cursor-pointer"
              >
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Weekdays Labels Header */}
            <div className="grid grid-cols-7 gap-1 text-[9px] font-mono text-slate-500 text-center font-bold uppercase mb-1">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
            </div>

            {/* Grid days layout */}
            <div className="grid grid-cols-7 gap-1 text-[10px] font-mono text-center">
              {/* Preceding empty cells for first day alignment */}
              {emptyOffsetCells.map((_, idx) => (
                <div key={`offset-${idx}`} className="h-6 w-full" />
              ))}

              {/* Real Month Days */}
              {daysArray.map((dayNum) => {
                const isSelected = isSelectedDay(dayNum);
                const isToday = isTodayDay(dayNum);

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => selectDay(dayNum)}
                    className={`h-6 w-full flex items-center justify-center rounded-xs transition-all cursor-pointer font-bold ${
                      isSelected
                        ? 'bg-blue-600 text-white font-black'
                        : isToday
                        ? 'bg-blue-950/40 text-blue-300 border border-blue-800/40 font-bold'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Helper Action Toolbar footer */}
            <div className="flex items-center justify-between border-t border-geo-border/50 mt-2.5 pt-2 text-[9.5px] font-mono">
              <button
                type="button"
                onClick={handleTodaySelect}
                className="text-blue-400 hover:text-blue-300 hover:underline bg-transparent border-0 cursor-pointer p-0 font-bold uppercase tracking-wider"
              >
                Today
              </button>
              {isClearable && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-500 hover:text-slate-300 hover:underline bg-transparent border-0 cursor-pointer p-0 font-semibold uppercase tracking-wider"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
