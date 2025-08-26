/**
 * Malaysian Time Utilities
 * 
 * This file provides consistent Malaysian timezone (GMT+8) handling
 * for the BetaMe app. All date/time operations should use these utilities
 * to ensure consistency across the application.
 */

export class MalaysianTimeUtils {
  // Malaysian timezone (GMT+8)
  private static readonly MALAYSIAN_TIMEZONE = 'Asia/Kuala_Lumpur';
  private static readonly MALAYSIAN_LOCALE = 'en-MY';

  /**
   * Get current date/time in Malaysian timezone
   */
  static getCurrentMalaysianTime(): Date {
    return new Date();
  }

  /**
   * Format date for Malaysian locale
   */
  static formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: this.MALAYSIAN_TIMEZONE,
      ...options
    };

    return dateObj.toLocaleDateString(this.MALAYSIAN_LOCALE, defaultOptions);
  }

  /**
   * Format time for Malaysian locale
   */
  static formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: this.MALAYSIAN_TIMEZONE,
      ...options
    };

    return dateObj.toLocaleTimeString(this.MALAYSIAN_LOCALE, defaultOptions);
  }

  /**
   * Format date and time for Malaysian locale
   */
  static formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: this.MALAYSIAN_TIMEZONE,
      ...options
    };

    return dateObj.toLocaleString(this.MALAYSIAN_LOCALE, defaultOptions);
  }

  /**
   * Format date for timeline display (Today, Yesterday, or full date)
   */
  static formatTimelineDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    // Set timezone for comparison
    const dateInMY = new Date(dateObj.toLocaleString('en-US', { timeZone: this.MALAYSIAN_TIMEZONE }));
    const nowInMY = new Date(now.toLocaleString('en-US', { timeZone: this.MALAYSIAN_TIMEZONE }));
    
    // Compare dates (ignoring time)
    const dateDate = new Date(dateInMY.getFullYear(), dateInMY.getMonth(), dateInMY.getDate());
    const nowDate = new Date(nowInMY.getFullYear(), nowInMY.getMonth(), nowInMY.getDate());
    
    const diffTime = nowDate.getTime() - dateDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return this.formatDate(dateObj, { weekday: 'long' });
    } else {
      return this.formatDate(dateObj, { 
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  /**
   * Format relative time (e.g., "2 hours ago", "3 days ago")
   */
  static formatRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return this.formatDate(dateObj, { 
        month: 'short',
        day: 'numeric'
      });
    }
  }

  /**
   * Create a Malaysian timezone date string for database storage
   */
  static toMalaysianISOString(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Convert to Malaysian timezone and format as ISO string
    const malaysianDate = new Date(dateObj.toLocaleString('en-US', { timeZone: this.MALAYSIAN_TIMEZONE }));
    return malaysianDate.toISOString();
  }

  /**
   * Parse a date string and convert to Malaysian timezone
   */
  static parseMalaysianDate(dateString: string): Date {
    const date = new Date(dateString);
    
    // Adjust for Malaysian timezone if the date is in UTC
    const utcOffset = date.getTimezoneOffset();
    const malaysianOffset = -480; // GMT+8 in minutes
    
    if (utcOffset !== malaysianOffset) {
      const offsetDiff = malaysianOffset - utcOffset;
      date.setMinutes(date.getMinutes() + offsetDiff);
    }
    
    return date;
  }

  /**
   * Get Malaysian timezone offset in minutes
   */
  static getMalaysianTimezoneOffset(): number {
    return -480; // GMT+8 in minutes
  }

  /**
   * Check if a date is today in Malaysian timezone
   */
  static isToday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    const dateInMY = new Date(dateObj.toLocaleString('en-US', { timeZone: this.MALAYSIAN_TIMEZONE }));
    const nowInMY = new Date(now.toLocaleString('en-US', { timeZone: this.MALAYSIAN_TIMEZONE }));
    
    return dateInMY.toDateString() === nowInMY.toDateString();
  }

  /**
   * Check if a date is yesterday in Malaysian timezone
   */
  static isYesterday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    const dateInMY = new Date(dateObj.toLocaleString('en-US', { timeZone: this.MALAYSIAN_TIMEZONE }));
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayInMY = new Date(yesterday.toLocaleString('en-US', { timeZone: this.MALAYSIAN_TIMEZONE }));
    
    return dateInMY.toDateString() === yesterdayInMY.toDateString();
  }

  /**
   * Format date for database queries (YYYY-MM-DD format)
   */
  static formatDateForDatabase(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Format datetime for database queries (YYYY-MM-DD HH:MM:SS format)
   */
  static formatDateTimeForDatabase(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

// Export commonly used functions for convenience
export const formatMalaysianDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
    ...options
  };

  return dateObj.toLocaleDateString('en-MY', defaultOptions);
};

export const formatMalaysianTime = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kuala_Lumpur',
    ...options
  };

  return dateObj.toLocaleTimeString('en-MY', defaultOptions);
};

export const formatMalaysianDateTime = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Ensure the date string is treated as UTC if it doesn't have timezone info
    if (date.endsWith('Z')) {
      dateObj = new Date(date);
    } else {
      // If no timezone indicator, assume it's UTC and add Z
      dateObj = new Date(date + 'Z');
    }
  } else {
    dateObj = date;
  }
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kuala_Lumpur',
    ...options
  };

  return dateObj.toLocaleString('en-MY', defaultOptions);
};

export const formatTimelineDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Set timezone for comparison
  const dateInMY = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
  const nowInMY = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
  
  // Compare dates (ignoring time)
  const dateDate = new Date(dateInMY.getFullYear(), dateInMY.getMonth(), dateInMY.getDate());
  const nowDate = new Date(nowInMY.getFullYear(), nowInMY.getMonth(), nowInMY.getDate());
  
  const diffTime = nowDate.getTime() - dateDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return formatMalaysianDate(dateObj, { weekday: 'long' });
  } else {
    return formatMalaysianDate(dateObj, { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
};

export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatMalaysianDate(dateObj, { 
      month: 'short',
      day: 'numeric'
    });
  }
};

export const getCurrentMalaysianTime = (): Date => {
  return new Date();
};
