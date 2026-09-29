import { SPECIALTY_RULE_MAP, ClinicalAlert } from './ClinicalRules';

/**
 * ClinicalEngine: The brain of the prescription validation system.
 * Evaluates rules based on the active specialty and patient data.
 */
export const evaluateClinicalRules = (formData: any, specialty: string): ClinicalAlert[] => {
    const alerts: ClinicalAlert[] = [];
    const normalizedSpec = specialty.toUpperCase();
    
    // 1. Get rules for the specific specialty (fallback to General)
    const ruleSet = Object.entries(SPECIALTY_RULE_MAP).find(([key]) => normalizedSpec.includes(key))?.[1] || SPECIALTY_RULE_MAP['GENERAL'];

    // 2. Execute each rule in the set
    if (ruleSet) {
        Object.values(ruleSet).forEach(rule => {
            try {
                const alert = rule(formData);
                if (alert) alerts.push(alert);
            } catch (err) {
                console.error('ClinicalRule execution failed:', err);
            }
        });
    }

    // 3. Global logic cross-checks (if needed)
    return alerts;
};
