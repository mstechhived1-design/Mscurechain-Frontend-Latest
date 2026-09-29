export type FoodTiming = 'anytime' | 'before' | 'after' | 'with';

export interface StandardFrequency {
    morning: FoodTiming | 'off';
    afternoon: FoodTiming | 'off';
    evening: FoodTiming | 'off';
    night: FoodTiming | 'off';
}

export interface CustomFrequency {
    interval: number; // in hours
    timing: FoodTiming;
}

export interface Frequency {
    type: 'standard' | 'custom';
    standard: StandardFrequency;
    custom: CustomFrequency;
}

export const INITIAL_FREQUENCY: Frequency = {
    type: 'standard',
    standard: {
        morning: 'off',
        afternoon: 'off',
        evening: 'off',
        night: 'off',
    },
    custom: {
        interval: 8,
        timing: 'after',
    },
};

/**
 * Maps old string-based frequency (e.g., "1-0-1") or legacy object-based frequency 
 * to the new Frequency object with per-slot timing.
 */
export const mapFrequency = (freq: any): Frequency => {
    // Determine the base structure
    const newFreq: Frequency = JSON.parse(JSON.stringify(INITIAL_FREQUENCY));

    if (typeof freq === 'object' && freq !== null) {
        // Handle type
        newFreq.type = freq.type === 'custom' ? 'custom' : 'standard';

        // Handle standard slots
        if (freq.standard) {
            (['morning', 'afternoon', 'evening', 'night'] as const).forEach(slot => {
                const val = freq.standard[slot];
                if (typeof val === 'string') {
                    newFreq.standard[slot] = val as any;
                } else if (typeof val === 'boolean') {
                    // Legacy boolean mapping
                    newFreq.standard[slot] = val ? (freq.foodTiming || 'anytime') : 'off';
                }
            });
        }

        // Handle custom
        if (freq.custom) {
            newFreq.custom.interval = freq.custom.interval !== undefined && freq.custom.interval !== null ? Number(freq.custom.interval) : 8;
            newFreq.custom.timing = freq.custom.timing || freq.foodTiming || 'after';
        }
        
        return newFreq;
    }

    if (typeof freq === 'string') {
        const parts = freq.split('-').map(p => p.trim());
        if (parts.length >= 3) {
            newFreq.standard = {
                morning: (parts[0] !== '0' && parts[0] !== '') ? 'anytime' : 'off',
                afternoon: (parts[1] !== '0' && parts[1] !== '') ? 'anytime' : 'off',
                evening: 'off',
                night: (parts[2] !== '0' && parts[2] !== '') ? 'anytime' : 'off',
            };
            return newFreq;
        }

        const hourlyMatch = freq.match(/every\s+(\d+)\s*h/i);
        if (hourlyMatch) {
            newFreq.type = 'custom';
            newFreq.custom = { interval: parseInt(hourlyMatch[1]), timing: 'after' };
            return newFreq;
        }
    }

    return newFreq;
};

/**
 * Formats the Frequency object into a human-readable string.
 */
export const formatFrequency = (freq: Frequency | string | any): string => {
    const f = mapFrequency(freq);

    const timingLabels: Record<FoodTiming, string> = {
        anytime: 'Any time',
        before: 'Before Food',
        after: 'After Food',
        with: 'With Food'
    };

    if (f.type === 'custom') {
        return `Every ${f.custom?.interval || 0}h (${timingLabels[f.custom.timing]})`;
    }

    const slotStrings: string[] = [];
    const slotLabels = {
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening',
        night: 'Night'
    };
    (['morning', 'afternoon', 'evening', 'night'] as const).forEach(slot => {
        const timing = f.standard[slot];
        if (timing !== 'off') {
            const label = slotLabels[slot];
            slotStrings.push(`${label}${timing !== 'anytime' ? ` (${timingLabels[timing]})` : ''}`);
        }
    });

    if (slotStrings.length === 0) return 'As needed';
    return slotStrings.join(', ');
};

/**
 * Calculates if a medicine should be administered in a specific slot (Morning, Afternoon, etc.)
 */
export const isSlotRequired = (freq: Frequency | string | any, slot: string): boolean => {
    const f = mapFrequency(freq);
    if (f.type === 'custom') return false;

    const slotKey = slot.toLowerCase() as keyof StandardFrequency;
    const timing = f.standard?.[slotKey];
    return timing !== undefined && timing !== 'off';
};
