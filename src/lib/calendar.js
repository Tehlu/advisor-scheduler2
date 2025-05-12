export function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

export function isSameMonth(date, month) {
  return date.getMonth() === month.getMonth() &&
    date.getFullYear() === month.getFullYear();
}

export function getMonthDates(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();
  
  const dates = [];
  
  // Add days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDay - 1; i >= 0; i--) {
    dates.push(new Date(year, month - 1, prevMonthLastDay - i));
  }
  
  // Add days from current month
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(new Date(year, month, i));
  }
  
  // Add days from next month
  const remainingDays = 42 - dates.length; // 6 rows * 7 days = 42
  for (let i = 1; i <= remainingDays; i++) {
    dates.push(new Date(year, month + 1, i));
  }
  
  return dates;
}

export function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function getEventsForDate(events, date) {
  return events.filter(event => {
    const eventDate = new Date(event.start_time);
    return eventDate.toDateString() === date.toDateString();
  });
}

export function validateEventTime(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (start >= end) {
    return false;
  }
  
  // Check if event is within May-June 2025
  const minDate = new Date('2025-05-01');
  const maxDate = new Date('2025-06-30');
  
  return start >= minDate && end <= maxDate;
} 