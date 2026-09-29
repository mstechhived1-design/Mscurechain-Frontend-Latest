/**
 * Clinical BMI Classification Utility
 * Based on WHO Global thresholds (default) with Asian/Indian override support.
 *
 * Usage:
 *   import { getBMICategory } from '@/lib/clinical/bmiUtils';
 *   const bmiData = getBMICategory(33.8);
 *   const bmiDataAsian = getBMICategory(23.5, 'asian');
 */

export type BMISeverity = 'low' | 'good' | 'moderate' | 'high' | 'very_high' | 'critical';
export type BMIRegion = 'global' | 'asian';

export interface BMICategory {
  label: string;
  severity: BMISeverity;
  /** Tailwind color token used for text coloring */
  color: 'blue' | 'green' | 'orange' | 'red' | 'dark_red';
  emoji: string;
  message: string;
}

/**
 * Map a severity/color to a Tailwind text class.
 * Non-Tailwind builds: use `bmiData.color` and apply your own mapping.
 */
export const bmiColorClass: Record<BMICategory['color'], string> = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  orange: 'text-orange-500',
  red: 'text-red-500',
  dark_red: 'text-red-700',
};

/**
 * Map severity to a background accent for the BMI card badge.
 */
export const bmiAccentClass: Record<BMISeverity, string> = {
  low: 'bg-blue-50 border-blue-200',
  good: 'bg-green-50 border-green-200',
  moderate: 'bg-orange-50 border-orange-200',
  high: 'bg-red-50 border-red-200',
  very_high: 'bg-red-50 border-red-300',
  critical: 'bg-red-100 border-red-400',
};

/**
 * Returns the clinical BMI category for the given value and population region.
 *
 * @param bmi    - Numeric BMI value (kg/m²)
 * @param region - 'global' (WHO default) | 'asian' (lower thresholds for South-Asian populations)
 */
export function getBMICategory(bmi: number, region: BMIRegion = 'global'): BMICategory {
  // ── Asian / Indian thresholds (WHO Asia-Pacific 2000) ──────────────────────
  if (region === 'asian') {
    if (bmi < 18.5) {
      return {
        label: 'Underweight',
        severity: 'low',
        color: 'blue',
        emoji: '⚠️',
        message: 'Possible nutritional deficiency. Evaluate diet and underlying causes.',
      };
    }
    if (bmi < 23) {
      return {
        label: 'Normal',
        severity: 'good',
        color: 'green',
        emoji: '✅',
        message: 'Healthy range for South-Asian populations. Maintain lifestyle and monitor periodically.',
      };
    }
    if (bmi < 27.5) {
      return {
        label: 'Overweight',
        severity: 'moderate',
        color: 'orange',
        emoji: '⚠️',
        message: 'Increased metabolic risk for Asian populations. Recommend lifestyle modification.',
      };
    }
    if (bmi < 32.5) {
      return {
        label: 'Obesity Class I',
        severity: 'high',
        color: 'red',
        emoji: '🚨',
        message: 'High risk of diabetes, hypertension, cardiovascular disease.',
      };
    }
    if (bmi < 37.5) {
      return {
        label: 'Obesity Class II',
        severity: 'very_high',
        color: 'red',
        emoji: '🚨',
        message: 'Severe obesity. Requires medical intervention and monitoring.',
      };
    }
    return {
      label: 'Obesity Class III',
      severity: 'critical',
      color: 'dark_red',
      emoji: '🚨',
      message: 'Extreme risk. Immediate clinical management required.',
    };
  }

  // ── Global WHO thresholds (default) ────────────────────────────────────────
  if (bmi < 18.5) {
    return {
      label: 'Underweight',
      severity: 'low',
      color: 'blue',
      emoji: '⚠️',
      message: 'Possible nutritional deficiency. Evaluate diet and underlying causes.',
    };
  }
  if (bmi <= 24.9) {
    return {
      label: 'Normal',
      severity: 'good',
      color: 'green',
      emoji: '✅',
      message: 'Healthy range. Maintain lifestyle and monitor periodically.',
    };
  }
  if (bmi <= 29.9) {
    return {
      label: 'Overweight',
      severity: 'moderate',
      color: 'orange',
      emoji: '⚠️',
      message: 'Increased risk of metabolic disorders. Recommend lifestyle modification.',
    };
  }
  if (bmi <= 34.9) {
    return {
      label: 'Obesity Class I',
      severity: 'high',
      color: 'red',
      emoji: '🚨',
      message: 'High risk of diabetes, hypertension, cardiovascular disease.',
    };
  }
  if (bmi <= 39.9) {
    return {
      label: 'Obesity Class II',
      severity: 'very_high',
      color: 'red',
      emoji: '🚨',
      message: 'Severe obesity. Requires medical intervention and monitoring.',
    };
  }
  return {
    label: 'Obesity Class III',
    severity: 'critical',
    color: 'dark_red',
    emoji: '🚨',
    message: 'Extreme risk. Immediate clinical management required.',
  };
}
