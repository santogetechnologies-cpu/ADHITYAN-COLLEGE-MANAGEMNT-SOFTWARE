export type CheckInSession = 'morning' | 'afternoon' | 'evening';

export interface IndiaTimeInfo {
  session: CheckInSession;
  title: string;
  timeRange: string;
  hour: number;
  formattedTime: string;
  formattedDate: string;
}

/**
 * Calculates current session in India Standard Time (IST - Asia/Kolkata).
 * Morning: 05:00 AM - 11:59 AM
 * Afternoon: 12:00 PM - 04:59 PM
 * Evening: 05:00 PM - 11:59 PM
 */
export function getIndiaTimeInfo(date = new Date()): IndiaTimeInfo {
  const istString = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);
  const hour = istDate.getHours();

  let session: CheckInSession = 'morning';
  let title = 'Morning Check-In';
  let timeRange = '08:00 AM - 12:00 PM';

  if (hour >= 12 && hour < 17) {
    session = 'afternoon';
    title = 'Afternoon Check-In';
    timeRange = '12:00 PM - 05:00 PM';
  } else if (hour >= 17) {
    session = 'evening';
    title = 'Evening Check-In';
    timeRange = '05:00 PM - 09:00 PM';
  }

  const formattedTime = istDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const formattedDate = istDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    session,
    title,
    timeRange,
    hour,
    formattedTime,
    formattedDate,
  };
}

