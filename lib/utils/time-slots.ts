/**
 * Time Slot Calculation Utility
 * Handles internal 5-minute increment logic for hourly container slots.
 */

export const calculateEffectiveSlot = (
    containerSlot: string, // e.g., "9:00 AM - 10:00 AM"
    bookedCount: number,
    incrementMinutes: number = 5
): { startTime: string; endTime: string } => {
    if (!containerSlot || !containerSlot.includes(' - ')) {
        return { startTime: '', endTime: '' };
    }

    try {
        const [startStr] = containerSlot.split(' - ');
        const normalized = startStr.trim().toLowerCase();

        // Robust parsing: matches "9:00 AM", "09:00am", "9", "9:00", "10:30" etc.
        const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/);
        if (!match) return { startTime: '', endTime: '' };

        const [_, hStr, mStr, sStr, ampm] = match;
        let hours = parseInt(hStr);
        const minutes = mStr ? parseInt(mStr) : 0;

        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        // If no AM/PM, take h as is (24h format), but sanity check
        if (!ampm && hours > 23) hours = hours % 24;

        const baseDate = new Date();
        baseDate.setHours(hours, minutes, 0, 0);

        // Add offset based on booking count
        const offsetMinutes = bookedCount * incrementMinutes;
        const effectiveStartDate = new Date(baseDate.getTime() + offsetMinutes * 60000);
        const effectiveEndDate = new Date(effectiveStartDate.getTime() + incrementMinutes * 60000);

        // Format back to "h:mm AM/PM"
        const formatTime = (date: Date) => {
            let h = date.getHours();
            const m = date.getMinutes().toString().padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            h = h ? h : 12; // 0 should be 12
            return `${h}:${m} ${ampm}`;
        };

        return {
            startTime: formatTime(effectiveStartDate),
            endTime: formatTime(effectiveEndDate)
        };

    } catch (error) {
        console.error('Error calculating effective slot:', error);
        return { startTime: '', endTime: '' };
    }
};
