import { useMemo } from 'react';
import { CalendarDay } from '@/types/calendar';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function useCalendarData(year: number) {
  const calendarData = useMemo(() => {
    const today = new Date();
    const data: CalendarDay[][] = [];

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthDays: CalendarDay[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();

        monthDays.push({
          date,
          dayOfMonth: day,
          dayOfWeek: WEEKDAYS[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isToday:
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear(),
          month,
        });
      }

      data.push(monthDays);
    }

    return data;
  }, [year]);

  return { calendarData, months: MONTHS };
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
