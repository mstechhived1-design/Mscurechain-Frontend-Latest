/**
 * Calculates the duration between an admission date and the current time.
 * Returns a formatted string like "2 Days 5 Hours" or "0 Days 45 Mins".
 */
export const calculateStayDuration = (admissionDate: string | Date, endDate?: string | Date): string => {
    if (!admissionDate) return 'N/A';

    const start = new Date(admissionDate).getTime();
    if (isNaN(start)) return 'Unknown';

    let end = Date.now();
    if (endDate && endDate !== 'null' && endDate !== 'undefined') {
        const parsed = new Date(endDate).getTime();
        if (!isNaN(parsed)) {
            end = parsed;
        }
    }

    const diffMs = end - start;

    if (diffMs < 0) return "0 Days 0 Mins";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
        return `${diffDays} Day${diffDays > 1 ? 's' : ''} ${diffHours} Hr${diffHours !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
        return `${diffHours} Hr${diffHours !== 1 ? 's' : ''} ${diffMins} Min${diffMins !== 1 ? 's' : ''}`;
    } else {
        return `${diffMins} Min${diffMins !== 1 ? 's' : ''}`;
    }
};

/**
 * Formats a date string or Date object to a local time string (e.g., "10:10 AM").
 * Handles UTC to Local conversion automatically.
 */
export const formatLocalTime = (dateInput: string | Date | undefined, fallback?: string): string => {
    // console.log("[formatLocalTime] Input:", { dateInput, fallback });

    if (!dateInput && !fallback) return "N/A";

    const isFormattedTime = (s: string) => /^\d{1,2}:\d{2}(?:\s*[AP]M)?$/i.test(s);

    try {
        // If we have a full timestamp (ISO or Date object), try converting it to local first.
        if (dateInput) {
            const date = new Date(dateInput);
            if (!isNaN(date.getTime())) {
                const localStr = date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                // If it's just midnight (from a date-only string), and we have a fallback, use fallback.
                if (localStr === "12:00 AM" && fallback && isFormattedTime(fallback)) {
                   return fallback;
                }
                return localStr;
            }
        }

        // Fallback to the provided time string if it's already formatted.
        if (fallback && isFormattedTime(fallback)) return fallback;
        if (typeof dateInput === 'string' && isFormattedTime(dateInput)) return dateInput;

        return fallback || "N/A";
    } catch (e) {
        console.error("[formatLocalTime] Error:", e);
        return fallback || "N/A";
    }
};

export interface ExactAge {
    years: number;
    months: number;
    days: number;
    totalDays: number;
    display: string;
    shortDisplay: string;
    primaryValue: string;
    primaryUnit: 'Years' | 'Months' | 'Days';
}

/**
 * Calculates exact age breakdown (years, months, days) from date of birth.
 * Handles infants, newborns, children, and adults dynamically.
 */
export const calculateExactAge = (dob: string | Date | undefined, asOf: Date = new Date()): ExactAge => {
    const fallback: ExactAge = {
        years: 0,
        months: 0,
        days: 0,
        totalDays: 0,
        display: "N/A",
        shortDisplay: "N/A",
        primaryValue: "",
        primaryUnit: "Years",
    };

    if (!dob) return fallback;

    try {
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return fallback;

        const target = new Date(asOf);
        if (target < birthDate) return { ...fallback, display: "0 Days", shortDisplay: "0D", primaryValue: "0", primaryUnit: "Days" };

        let years = target.getFullYear() - birthDate.getFullYear();
        let months = target.getMonth() - birthDate.getMonth();
        let days = target.getDate() - birthDate.getDate();

        if (days < 0) {
            months--;
            // Days in the previous month
            const prevMonthDate = new Date(target.getFullYear(), target.getMonth(), 0);
            days += prevMonthDate.getDate();
        }

        if (months < 0) {
            years--;
            months += 12;
        }

        const totalDiffMs = target.getTime() - birthDate.getTime();
        const totalDays = Math.max(0, Math.floor(totalDiffMs / (1000 * 60 * 60 * 24)));

        let display = "";
        let shortDisplay = "";
        let primaryValue = "";
        let primaryUnit: 'Years' | 'Months' | 'Days' = 'Years';

        if (years >= 2) {
            display = `${years} YRS`;
            shortDisplay = `${years}Y`;
            primaryValue = years.toString();
            primaryUnit = "Years";
        } else if (years === 1) {
            display = months > 0 ? `${years} YR ${months} MO` : `${years} YR`;
            shortDisplay = months > 0 ? `${years}Y ${months}M` : `${years}Y`;
            primaryValue = (12 + months).toString();
            primaryUnit = "Months";
        } else if (months > 0) {
            display = days > 0 ? `${months} MO ${days} DAYS` : `${months} MOS`;
            shortDisplay = days > 0 ? `${months}M ${days}D` : `${months}M`;
            primaryValue = months.toString();
            primaryUnit = "Months";
        } else {
            display = days === 0 ? "Newborn (0 Days)" : `${days} DAYS`;
            shortDisplay = `${days}D`;
            primaryValue = days.toString();
            primaryUnit = "Days";
        }

        return {
            years: Math.max(0, years),
            months: Math.max(0, months),
            days: Math.max(0, days),
            totalDays,
            display,
            shortDisplay,
            primaryValue,
            primaryUnit,
        };
    } catch {
        return fallback;
    }
};

/**
 * Calculates DOB (YYYY-MM-DD) from a numeric age and unit.
 */
export const calculateDobFromAge = (age: number, unit: 'Years' | 'Months' | 'Days' = 'Years', asOf: Date = new Date()): string => {
    const ageNum = Math.max(0, Number(age) || 0);
    const date = new Date(asOf);

    if (unit === 'Years') {
        date.setFullYear(date.getFullYear() - ageNum);
    } else if (unit === 'Months') {
        date.setMonth(date.getMonth() - ageNum);
    } else if (unit === 'Days') {
        date.setDate(date.getDate() - ageNum);
    }

    return date.toISOString().split('T')[0];
};

/**
 * Calculates age from date of birth.
 * Returns simple age or formatted age string.
 */
export const calculateAge = (dob: string | Date | undefined): string => {
    if (!dob) return "N/A";
    const exact = calculateExactAge(dob);
    if (exact.display === "N/A") return "N/A";
    if (exact.years >= 1) return exact.years.toString();
    return exact.shortDisplay;
};

/**
 * Calculates start and end ISO date strings (YYYY-MM-DD) for common date preset filters.
 */
export const getDateRangeForPreset = (preset: string): { start: string; end: string } => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];

    switch (preset) {
        case 'today': {
            return { start: end, end };
        }
        case 'yesterday': {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            const yStr = y.toISOString().split('T')[0];
            return { start: yStr, end: yStr };
        }
        case 'last_week':
        case 'last_7_days': {
            const start = new Date();
            start.setDate(start.getDate() - 7);
            return { start: start.toISOString().split('T')[0], end };
        }
        case 'this_month': {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            return { start: start.toISOString().split('T')[0], end };
        }
        case 'last_month': {
            const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
            return { 
                start: start.toISOString().split('T')[0], 
                end: lastMonthEnd.toISOString().split('T')[0] 
            };
        }
        case '2_months_back': {
            const start = new Date();
            start.setMonth(start.getMonth() - 2);
            return { start: start.toISOString().split('T')[0], end };
        }
        case '3_months_back': {
            const start = new Date();
            start.setMonth(start.getMonth() - 3);
            return { start: start.toISOString().split('T')[0], end };
        }
        case '6_months_back': {
            const start = new Date();
            start.setMonth(start.getMonth() - 6);
            return { start: start.toISOString().split('T')[0], end };
        }
        case '1_year_back': {
            const start = new Date();
            start.setFullYear(start.getFullYear() - 1);
            return { start: start.toISOString().split('T')[0], end };
        }
        case 'all':
        default:
            return { start: '', end: '' };
    }
};
