export type AlertSeverity = 'emergency' | 'error' | 'warning' | 'info';

export interface ClinicalAlert {
    id: string;
    type: AlertSeverity;
    message: string;
    specialty: string;
}

export type ClinicalRule = (formData: any) => ClinicalAlert | null;

// --- Helper: Parse Blood Pressure ---
export const parseBP = (bp: string): { sys: number; dia: number } | null => {
    if (!bp || typeof bp !== 'string') return null;
    const parts = bp.split('/');
    if (parts.length !== 2) return null;
    const sys = parseInt(parts[0]);
    const dia = parseInt(parts[1]);
    return isNaN(sys) || isNaN(dia) ? null : { sys, dia };
};

// --- General Vitals Rules ---
export const generalRules: Record<string, ClinicalRule> = {
    HYPOXIA: (data) => {
        const spo2 = parseInt(data.pulmoData?.vitals?.spo2 || data.pediatricData?.temperature === undefined ? '0' : '0'); // Safety check
        // We'll use a more robust way to find SpO2 across modules
        const val = parseInt(data.pulmoData?.vitals?.spo2 || data.vitals?.spo2 || '0');
        if (val > 0 && val < 90) return { id: 'HYPOXIA_CRITICAL', type: 'emergency', message: '🚨 CRITICAL HYPOXIA — SpO2 < 90%. Urgent intervention required.', specialty: 'GENERAL' };
        if (val > 0 && val < 94) return { id: 'HYPOXIA_LOW', type: 'warning', message: '⚠️ Low Oxygen Saturation (SpO2 < 94%).', specialty: 'GENERAL' };
        return null;
    },
    TACHYPNEA: (data) => {
        const rr = parseInt(data.pulmoData?.vitals?.respRate || data.vitals?.respRate || '0');
        if (rr > 30) return { id: 'RR_DISTRESS', type: 'emergency', message: '🚨 RESPIRATORY DISTRESS — RR > 30 bpm.', specialty: 'GENERAL' };
        if (rr > 24) return { id: 'RR_TACHYPNEA', type: 'warning', message: '⚠️ Tachypnea detected (RR > 24 bpm).', specialty: 'GENERAL' };
        return null;
    }
};

// --- Cardiology Rules ---
export const cardiologyRules: Record<string, ClinicalRule> = {
    SEVERE_HTN: (data) => {
        const bp = parseBP(data.cardiologyData?.bpSystolic + '/' + data.cardiologyData?.bpDiastolic);
        if (bp && (bp.sys > 180 || bp.dia > 110)) return { id: 'HTN_CRITICAL', type: 'emergency', message: '🚨 HYPERTENSIVE CRISIS — BP > 180/110 mmHg.', specialty: 'CARDIOLOGY' };
        return null;
    },
    BRADYCARDIA: (data) => {
        const hr = parseInt(data.cardiologyData?.heartRate || '0');
        if (hr > 0 && hr < 50) return { id: 'BRADY_ALERT', type: 'warning', message: '⚠️ Bradycardia detected (HR < 50 bpm).', specialty: 'CARDIOLOGY' };
        return null;
    }
};

// --- Pulmonology Rules ---
export const pulmoRules: Record<string, ClinicalRule> = {
    RESP_FAILURE: (data) => {
        const spo2 = parseInt(data.pulmoData?.vitals?.spo2 || '0');
        const rr = parseInt(data.pulmoData?.vitals?.respRate || '0');
        if (spo2 > 0 && spo2 < 90 && rr > 30) return { id: 'RESP_FAILURE', type: 'emergency', message: '🚨 TYPE 1 RESPIRATORY FAILURE — Combined Hypoxia & Distress.', specialty: 'PULMONOLOGY' };
        return null;
    },
    HEMOPTYSIS: (data) => {
        if (data.pulmoData?.symptoms?.includes('Hemoptysis')) return { id: 'HEMOPTYSIS', type: 'emergency', message: '❗ HEMOPTYSIS — Potential pulmonary emergency (TB/Malignancy).', specialty: 'PULMONOLOGY' };
        return null;
    }
};

// --- Neurology Rules ---
export const neuroRules: Record<string, ClinicalRule> = {
    COMA_GCS: (data) => {
        const n = data.neuroData;
        if (!n?.gcs) return null;
        const total = (parseInt(n.gcs.eye) || 0) + (parseInt(n.gcs.verbal) || 0) + (parseInt(n.gcs.motor) || 0);
        if (total > 0 && total <= 8) return { id: 'NEURO_COMA', type: 'emergency', message: '🚨 SEVERE IMPAIRMENT (GCS ≤ 8). Secure airway immediately.', specialty: 'NEUROLOGY' };
        return null;
    }
};

// --- Orthopedic Rules ---
export const orthoRules: Record<string, ClinicalRule> = {
    COMPARTMENT: (data) => {
        const o = data.orthoData;
        if (o?.neurovascular?.pulse === 'Absent' || o?.motorPower < 3) return { id: 'ORTHO_EMERGENCY', type: 'emergency', message: '🚨 NEUROVASCULAR COMPROMISE — Suspected Compartment Syndrome or Nerve Injury.', specialty: 'ORTHOPEDIC' };
        return null;
    }
};


// --- Psychiatry Rules ---
export const psychiatryRules: Record<string, ClinicalRule> = {
    SUICIDE_EMERGENCY: (data) => {
        const p = data.psychiatryData;
        if (p?.suicideRisk === 'High') {
            return { id: 'SUICIDE_HIGH', type: 'emergency', message: '🚨 CRITICAL SUICIDE RISK — Immediate psychiatric intervention and safe environment required.', specialty: 'PSYCHIATRY' };
        }
        if (p?.mse?.thought?.includes('Suicidal thoughts') && p?.suicideRisk === 'None') {
            return { id: 'SUICIDE_ESCALATE', type: 'error', message: '❗ RISK MISMATCH — Suicidal ideation reported but risk level is "None". Escalating to Moderate.', specialty: 'PSYCHIATRY' };
        }
        return null;
    },
    PHQ9_DEPRESSION: (data) => {
        const phq = parseInt(data.psychiatryData?.scores?.phq9 || '0');
        if (phq >= 20) return { id: 'PHQ9_SEVERE', type: 'error', message: `🚨 SEVERE DEPRESSION (PHQ-9: ${phq}) — High clinical concern.`, specialty: 'PSYCHIATRY' };
        if (phq >= 15) return { id: 'PHQ9_MODERATE', type: 'warning', message: `⚠️ Moderately Severe Depression (PHQ-9: ${phq}).`, specialty: 'PSYCHIATRY' };
        return null;
    },
    GAD7_ANXIETY: (data) => {
        const gad = parseInt(data.psychiatryData?.scores?.gad7 || '0');
        if (gad >= 15) return { id: 'GAD7_SEVERE', type: 'warning', message: `⚠️ SEVERE ANXIETY (GAD-7: ${gad}).`, specialty: 'PSYCHIATRY' };
        return null;
    },
    PSYCHOSIS_DETECTION: (data) => {
        const t = data.psychiatryData?.mse?.thought || [];
        if (t.includes('Delusions') || t.includes('Hallucinations') || data.psychiatryData?.mse?.perception === 'Hallucinations') {
            return { id: 'PSYCHOSIS_ALERT', type: 'emergency', message: '🚨 ACTIVE PSYCHOSIS DETECTED — Evaluate for immediate medication stabilization.', specialty: 'PSYCHIATRY' };
        }
        return null;
    },
    LITHIUM_MONITORING: (data) => {
        // Find if Lithium is in medicines
        const meds = data.medicines || [];
        const hasLithium = meds.some((m: any) => m.name.toUpperCase().includes('LITHIUM'));
        if (hasLithium) {
            return { id: 'LITHIUM_SAFETY', type: 'info', message: '💡 Safety Tip: Serum Lithium monitoring and Renal/Thyroid checks required.', specialty: 'PSYCHIATRY' };
        }
        return null;
    }
};

// --- Endocrinology Rules ---
export const endocrinologyRules: Record<string, ClinicalRule> = {
    HYPO_GLYCEMIA: (data) => {
        const fbs = parseInt(data.endocrinologyData?.glycemic?.fbs || '0');
        if (fbs > 0 && fbs < 70) return { id: 'ENDO_HYPO_ALERT', type: 'emergency', message: '🚨 HYPOGLYCEMIA — Treat immediately with glucose.', specialty: 'ENDOCRINOLOGY' };
        return null;
    },
    SEVERE_HYPERGLYCEMIA: (data) => {
        const fbs = parseInt(data.endocrinologyData?.glycemic?.fbs || '0');
        if (fbs > 300) return { id: 'ENDO_HYPER_SEVERE', type: 'emergency', message: '🚨 SEVERE HYPERGLYCEMIA — Evaluate for DKA/HHS.', specialty: 'ENDOCRINOLOGY' };
        return null;
    },
    THYROID_DYSFUNCTION: (data) => {
        const tsh = parseFloat(data.endocrinologyData?.thyroid?.tsh || '0');
        if (tsh > 4) return { id: 'HYPOTHYROIDISM', type: 'warning', message: `⚠️ Hypothyroidism (TSH: ${tsh}) — Consider thyroxine replacement.`, specialty: 'ENDOCRINOLOGY' };
        if (tsh > 0 && tsh < 0.4) return { id: 'HYPERTHYROIDISM', type: 'warning', message: `⚠️ Hyperthyroidism (TSH: ${tsh}) — Evaluate for Graves/Toxic nodule.`, specialty: 'ENDOCRINOLOGY' };
        return null;
    },
    PCOS_SCREENING: (data) => {
        const p = data.endocrinologyData?.pcos;
        if (p?.irregularCycles && p?.hirsutism) return { id: 'PCOS_SUGGESTION', type: 'info', message: '💡 Clinical Suggestion: PCOS suspected (Rotterdam criteria: irregular cycles + hyperandrogenism).', specialty: 'ENDOCRINOLOGY' };
        return null;
    },
    METABOLIC_SYNDROME: (data) => {
        const bmi = parseFloat(data.endocrinologyData?.bmi || '0');
        const hba1c = parseFloat(data.endocrinologyData?.glycemic?.hba1c || '0');
        if (bmi > 30 && hba1c > 6.5) return { id: 'METABOLIC_SYNDROME', type: 'warning', message: '⚠️ Metabolic Syndrome mapping (Obesity + Diabetes). High cardiovascular risk.', specialty: 'ENDOCRINOLOGY' };
        return null;
    },
    DIABETIC_FOOT_RISK: (data) => {
        const d = data.endocrinologyData?.diabetes;
        if (d?.footExam?.ulcer === 'Present') return { id: 'FOOT_ULCER_CRITICAL', type: 'emergency', message: '🚨 ACTIVE FOOT ULCER — Immediate wound care and offloading required to prevent amputation.', specialty: 'ENDOCRINOLOGY' };
        if (d?.footExam?.sensation === 'Absent') return { id: 'NEUROPATHY_SEVERE', type: 'error', message: '❗ PROTECTIVE SENSATION LOST — High risk for silent foot injury.', specialty: 'ENDOCRINOLOGY' };
        return null;
    },
    GLYCEMIC_CONTROL: (data) => {
        const hba1c = parseFloat(data.endocrinologyData?.glycemic?.hba1c || '0');
        if (hba1c >= 9) return { id: 'HBA1C_POOR', type: 'error', message: `🚨 POOR GLYCEMIC CONTROL (HbA1c: ${hba1c}%) — Consider treatment intensification.`, specialty: 'ENDOCRINOLOGY' };
        if (hba1c >= 7) return { id: 'HBA1C_SUBOPTIMAL', type: 'warning', message: `⚠️ Suboptimal Control (HbA1c: ${hba1c}%) — Goal < 7%.`, specialty: 'ENDOCRINOLOGY' };
        return null;
    }
};

// --- Oncology Rules ---
export const oncologyRules: Record<string, ClinicalRule> = {
    CRITICAL_NEUTROPENIA: (data) => {
        const anc = parseFloat(data.oncologyData?.labs?.anc || '0');
        if (anc > 0 && anc < 1500) return { id: 'ANC_CRITICAL', type: 'emergency', message: '🚨 CRITICAL NEUTROPENIA (ANC < 1500/μL) — Delay chemotherapy, risk of febrile neutropenia.', specialty: 'ONCOLOGY' };
        return null;
    },
    CRITICAL_THROMBOCYTOPENIA: (data) => {
        const plt = parseFloat(data.oncologyData?.labs?.platelets || '0');
        if (plt > 0 && plt < 100) return { id: 'PLT_CRITICAL', type: 'emergency', message: '🚨 CRITICAL THROMBOCYTOPENIA (Plt < 100k/μL) — Unsafe for cytotoxic therapy.', specialty: 'ONCOLOGY' };
        return null;
    },
    RENAL_DOSE_ADJUST: (data) => {
        const cr = parseFloat(data.oncologyData?.labs?.creatinine || '0');
        if (cr > 1.4) return { id: 'ONCO_RENAL_WARN', type: 'error', message: '❗ RENAL IMPAIRMENT — Cisplatin/Methotrexate dose adjustment required.', specialty: 'ONCOLOGY' };
        return null;
    },
    POOR_PERFORMANCE: (data) => {
        const ecog = parseInt(data.oncologyData?.ecog || '0');
        if (ecog >= 3) return { id: 'ONCO_ECOG_POOR', type: 'warning', message: '⚠️ POOR PERFORMANCE STATUS (ECOG ≥ 3) — Intensive chemo may be poorly tolerated.', specialty: 'ONCOLOGY' };
        return null;
    },
    STAGE_IV_MISMATCH: (data) => {
        const stage = data.oncologyData?.tnm?.stage;
        const intent = data.oncologyData?.treatment?.intent;
        if (stage === 'IV' && intent === 'Curative') {
            return { id: 'STAGE_INTENT_MISMATCH', type: 'info', message: '💡 Clinical Note: Stage IV usually warrants Palliative intent unless oligometastatic.', specialty: 'ONCOLOGY' };
        }
        return null;
    }
};

// --- Map Specialty to Rules ---
export const SPECIALTY_RULE_MAP: Record<string, Record<string, ClinicalRule>> = {
    'GENERAL': generalRules,
    'CARDIOLOGY': { ...generalRules, ...cardiologyRules },
    'PULMONOLOGY': { ...generalRules, ...pulmoRules },
    'NEUROLOGY': { ...generalRules, ...neuroRules },
    'ORTHOPEDICS': { ...generalRules, ...orthoRules },
    'ENDOCRINOLOGY': { ...generalRules, ...endocrinologyRules },
    'ONCOLOGY': { ...generalRules, ...oncologyRules },
};
