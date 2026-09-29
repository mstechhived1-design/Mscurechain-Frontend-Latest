'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import {
    Printer,
    Sparkles,
    User,
    Stethoscope,
    X,
    FlaskConical,
    Droplets,
    Heart,
    Flame,
    AlertCircle,
    Eraser,
    Loader2,
    Pill,
    Calendar,
    Plus,
    Trash2,
    Search,
    ArrowLeft,
    FileText,
    PenTool,
    CheckCircle2,
    Activity,
    Zap,
    Baby,
    Mic2,
    Eye,
    Wind,
    Beaker,
    History,
    Building,
    Pause
} from 'lucide-react';
import { CardiologyModule } from './modules/CardiologyModule';
import { DermatologyModule } from './modules/DermatologyModule';
import { OrthopedicModule } from './modules/OrthopedicModule';
import { PediatricsModule } from './modules/PediatricsModule';
import { ENTModule } from './modules/ENTModule';
import { PulmonologyModule } from './modules/PulmonologyModule';
import { GastroModule } from './modules/GastroModule';
import { NephrologyModule } from './modules/NephrologyModule';
import { OphthalmologyModule } from './modules/OphthalmologyModule';
import { GynecologyModule } from './modules/GynecologyModule';
import { NeurologyModule } from './modules/NeurologyModule';
import { PsychiatryModule } from './modules/PsychiatryModule';
import { EndocrinologyModule } from './modules/EndocrinologyModule';
import { HematologyModule } from './modules/HematologyModule';
import { OncologyModule } from './modules/OncologyModule';
import { DentistryModule } from './modules/DentistryModule';
import { UrologyModule } from './modules/UrologyModule';
import { RadiologyModule } from './modules/RadiologyModule';
import { GeneralSurgeryModule } from './modules/GeneralSurgeryModule';
import { ClinicalAlertPanel } from './components/ClinicalAlertPanel';
import PrescriptionPreviewModal from './components/PrescriptionPreviewModal';
import { evaluateClinicalRules } from '@/lib/clinical/ClinicalEngine';
import { ClinicalAlert } from '@/lib/clinical/ClinicalRules';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAppointmentDetailsAction, getDoctorProfileAction } from '@/lib/integrations/actions/doctor.actions';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import medicineData from '@/medicine.json';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { Frequency, StandardFrequency, CustomFrequency, FoodTiming, INITIAL_FREQUENCY, mapFrequency, formatFrequency } from '@/lib/frequencyUtils';

// --- Types ---
interface Medicine {
    productId?: string;
    name: string;
    form: string;
    dosage: string;
    freq: Frequency;
    duration: string;
    quantity: string;
    price: number;
    unitsPerPack?: number;
    availableUnits?: number;
    pricePerUnit?: number;
    error?: string;
    // Pediatrics specific
    mgPerKg?: string;
    calculatedDose?: string;
    eye?: 'BE' | 'RE' | 'LE';
    dropCount?: string;
    timesPerDay?: string;
}


interface PrescriptionForm {
    patientName: string;
    age: string;
    gender: string;
    duration: string;
    mrn: string;
    date: string;
    time: string;
    symptoms: string;
    diagnosis: string;
    advice: string;
    medicines: Medicine[];
    dietAdvice: string[];
    suggestedTests: string[];
    followUp: string;
    followUpDate: string;
    avoid: string[];
    doctorName: string;
    doctorSpecialization: string;
    doctorSignature?: string; // URL or base64
    subtotal: number;
    tax: number;
    total: number;
    cardiologyData?: {
        bpSystolic: string;
        bpDiastolic: string;
        heartRate: string;
        rhythm: string;
        riskLevel: 'Low' | 'Moderate' | 'High';
        nyhaClass: string;
        riskFactors: string[];
        ecgType: string;
        ecgLeads: string[];
        ecgNotes: string;
        s1: string;
        s2: string;
        murmur: 'None' | 'Present';
        murmurType: string;
        notes: string;
    };
    psychiatryData?: {
        complaints: string[];
        severity: string;
        duration: string;
        mse: {
            behavior: string;
            speech: string;
            mood: string;
            thought: string[];
            perception: string;
            insight: string;
            judgment: string;
        };
        suicideRisk: string;
        scores: { phq9: string; gad7: string; };
        substanceUse: string[];
        medicationCompliance: string;
        sideEffects: string[];
        counseling: string;
        notes: string;
    };
    endocrinologyData?: {
        glycemic: { fbs: string; ppbs: string; hba1c: string; };
        thyroid: { tsh: string; t3: string; t4: string; };
        weight: string;
        height: string;
        bmi: string;
        symptoms: string[];
        pcos: { irregularCycles: boolean; hirsutism: boolean; acne: boolean; infertility: boolean; };
        complications: string[];
        medicationType: string[];
        diabetes?: {
            hypoglycemia?: string;
            footExam?: { sensation?: string; ulcer?: string; pulse?: string; };
            treatment?: { type?: string; insulinType?: string; dose?: string; };
            complications?: string[];
        };
        notes: string;
    };
    dermatologyData?: {
        lesionType: string;
        lesionCount: string;
        size: string;
        location: string[];
        distribution: string;
        color: string[];
        surfaceChanges: string[];
        itchingSeverity: 'None' | 'Mild' | 'Moderate' | 'Severe';
        painSeverity: 'None' | 'Mild' | 'Moderate' | 'Severe';
        burning: boolean;
        duration: string;
        onset: 'Acute' | 'Chronic' | '';
        progression: 'Improving' | 'Worsening' | 'Stable' | '';
        provisionalDiagnosis: string;
    };
    pediatricData?: {
        weight: string;
        height: string;
        headCircumference: string;
        temperature: string;
        heartRate: string;
        respRate: string;
        growth: {
            weightForAge: 'Normal' | 'Underweight' | 'Overweight' | '';
            heightForAge: 'Normal' | 'Stunted' | '';
        };
        milestones: 'Normal' | 'Delayed' | 'Borderline' | '';
        milestoneNotes: string;
        immunizationStatus: 'Up to date' | 'Partially immunized' | 'Not immunized' | '';
        dueVaccines: string[];
        symptoms: string[];
        redFlags: string[];
        notes: string;
    };
    entData?: {
        ear: {
            left: { externalEar?: string; earCanal?: string[]; tympanicMembrane?: string; };
            right: { externalEar?: string; earCanal?: string[]; tympanicMembrane?: string; };
        };
        hearing: { status?: string; tuningForkTest?: string[]; };
        nose: { mucosa?: string; septum?: string; discharge?: string; };
        throat: { tonsils?: string; pharynx?: string; uvula?: string; };
        lymphNodes: { cervical?: string; sizeCm?: number; tender?: string; mobility?: string; };
        voice: { quality?: string; airway?: string; };
        symptoms: string[];
        duration?: string;
        notes?: string;
    };
    ophthaData?: {
        chiefComplaints?: string;
        hopi?: string;
        pastHistory?: string;
        familyHistory?: string;
        symptoms: string[];
        vision: {
            od: { unaided: string; corrected: string; };
            os: { unaided: string; corrected: string; };
        };
        refraction: {
            od: {
                distant?: { sph: string; cyl: string; axis: string; va: string; };
                near?: { sph: string; cyl: string; axis: string; va: string; };
            };
            os: {
                distant?: { sph: string; cyl: string; axis: string; va: string; };
                near?: { sph: string; cyl: string; axis: string; va: string; };
            };
        };
        iop:    { od: string; os: string; };
        pupils:  'PERRLA' | 'Sluggish' | 'Fixed' | '';
        slitLamp: {
            conjunctiva:     { re: string, le: string, notes: string } | any;
            cornea:          { re: string, le: string, notes: string } | any;
            anteriorChamber: { re: string, le: string, notes: string } | any;
            lens:            { re: string, le: string, notes: string } | any;
        };
        fundus: {
            retina:    { re: string, le: string, notes: string } | any;
            opticDisc: { re: string, le: string, notes: string } | any;
            macula:    { re: string, le: string, notes: string } | any;
        };
        diagnosis: 'Conjunctivitis' | 'Dry Eye' | 'Cataract' | 'Glaucoma' | 'Refractive Error' | 'Corneal Ulcer' | '';
        notes:     string;
    };
    orthoData?: {
        joint: string;
        side: string;
        symptoms: string[];
        pain: { score: number; type: string; };
        rom: string;
        exam: { swelling: string; tenderness: string; deformity: string; spasm: string; };
        motorPower: number;
        neurovascular: { sensation: string; pulse: string; };
        specialTests: string[];
        imaging: { xray: string; mri: string; };
        diagnosis: string;
        notes: string;
    };
    gynaecData?: {
        lmp: string;
        cycleLength: string;
        cycleRegularity: 'Regular' | 'Irregular' | '';
        flowDuration: string;
        flowType: 'Normal' | 'Heavy (Menorrhagia)' | 'Scanty' | '';
        obstetric: {
            gravida?: number;
            para?: number;
            living?: number;
            abortions?: number;
        };
        pregnant: 'Yes' | 'No' | 'Suspected';
        gestationalAge: string;
        edd: string;
        symptoms: string[];
        vitals: {
            bp: string;
            pulse: string;
            weight: string;
            temperature: string;
        };
        obstetricExam: {
            uterineSize: string;
            fetalPosition: 'Cephalic' | 'Breech' | 'Transverse' | '';
            fetalHeartRate: string;
        };
        gynExam: {
            cervix: 'Normal' | 'Inflamed' | 'Erosion' | '';
            discharge: 'None' | 'White' | 'Foul smelling' | '';
            tenderness: 'Yes' | 'No' | '';
        };
        investigations: string[];
        notes: string;
    };
    neuroData?: {
        gcs: { eye: string; verbal: string; motor: string; };
        mentalStatus: 'Alert' | 'Drowsy' | 'Stupor' | 'Coma' | '';
        motorPower: { ru: string; lu: string; rl: string; ll: string; };
        reflexes: 'Normal (2+)' | 'Hyperreflexia (3+)' | 'Hyporeflexia (1+)' | 'Absent (0)' | '';
        cranialNerves: 'Normal' | 'Abnormal' | '';
        cranialNerveDeficits: string[];
        sensory: 'Normal' | 'Reduced' | 'Absent' | '';
        coordination: 'Normal' | 'Ataxia' | 'Positive Romberg' | '';
        symptoms: string[];
        onset: 'Sudden' | 'Gradual' | 'Chronic' | '';
        notes: string;
    };
    pulmoData?: {
        vitals: { respRate: string; spo2: string; oxygenSupport: string; };
        symptoms: string[];
        mmrcGrade: number;
        exam: { chestExpansion: string; accessoryMuscles: string; };
        auscultation: { airEntry: string; sounds: string[]; };
        peakFlow: string;
        diagnosis: string;
        severity: string;
        notes: string;
    };
    gastroData?: {
        symptoms: string[];
        painLocation: 'Epigastric' | 'RUQ' | 'RLQ' | 'LLQ' | 'Diffuse' | '';
        painType: 'Burning' | 'Colicky' | 'Sharp' | '';
        bowelHabits: 'Normal' | 'Constipation' | 'Diarrhea' | 'Alternating' | '';
        stoolType: 'Normal' | 'Loose' | 'Hard' | 'Black (Melena)' | 'Blood-stained' | '';
        bowelSounds: 'Normal' | 'Hyperactive' | 'Sluggish' | 'Absent' | '';
        distention: 'None' | 'Mild' | 'Severe' | '';
        tenderness: 'None' | 'Epigastric' | 'RUQ' | 'RLQ' | 'Diffuse' | '';
        liver: { status: 'Not palpable' | 'Enlarged' | ''; size?: number | string; };
        spleen: { status: 'Not palpable' | 'Enlarged' | ''; };
        guarding: 'None' | 'Guarding' | 'Rigidity' | 'Palpable Mass' | '';
        diagnosis: 'GERD' | 'Gastritis' | 'PUD' | 'IBS' | 'IBD' | 'Hepatitis' | 'Fatty Liver' | 'Cirrhosis' | 'Pancreatitis' | '';
        notes: string;
    };
    nephroData?: {
        creatinine: string;
        urea: string;
        egfr: string;
        electrolytes: {
            sodium: string;
            potassium: string;
            bicarbonate: string;
        };
        urineOutput: string;
        urineAnalysis: {
            protein: 'Nil' | 'Trace' | '1+' | '2+' | '3+' | '';
            sugar:   'Nil' | 'Present' | '';
            rbc:     'Nil' | 'Present' | '';
        };
        fluidBalance: {
            intake: string;
            output: string;
        };
        edema: 'None' | 'Trace' | '1+' | '2+' | '3+' | '4+' | '';
        dialysis: {
            status:      'Not on dialysis' | 'Hemodialysis' | 'Peritoneal dialysis' | '';
            frequency:   string;
            lastSession: string;
            access:      'AV fistula' | 'Catheter' | '';
        };
        symptoms:  string[];
        ckdStage:  string;
        notes:     string;
    };
    hematologyData?: {
        cbc: { hb: string; tlc: string; platelets: string; esr: string; };
        rbcIndices: { mcv: string; mch: string; mchc: string; };
        coagulation: { pt: string; inr: string; aptt: string; };
        symptoms: string[];
        transfusion: { product: string; units: string; indication: string; };
        diagnosis: string;
        notes: string;
    };
    oncologyData?: {
        body: { weight: string; height: string; bsa: string; };
        diagnosis: string;
        site: string;
        ecog: string;
        biomarkers: string[];
        tnm: { t: string; n: string; m: string; stage: string; };
        treatment: { intent: string; modality: string[]; regimen: string; };
        chemo: {
            drug: string;
            dosePerM2: string;
            totalDose: string;
            cycle: string;
            day: string;
            route: string;
            preMeds: string;
            notes: string;
        }[];
        labs: { hb: string; anc: string; platelets: string; creatinine: string; lft: string; };
        toxicity: string[];
        notes: string;
    };
    dentistryData?: {
        painScale: number;
        duration: string;
        teeth: {
            toothNumber: string;
            condition: string;
            mobilityGrade: number;
            tenderness: boolean;
            cariesDepth: 'None' | 'Mild' | 'Moderate' | 'Deep' | '';
            diagnosis: string;
        }[];
        oralFindings: {
            caries: 'None' | 'Mild' | 'Moderate' | 'Deep' | '';
            gingivitis: 'None' | 'Mild' | 'Severe' | '';
            abscess: boolean;
            mobility: 'None' | 'Grade 1' | 'Grade 2' | 'Grade 3' | '';
            plaqueIndex: 'Low' | 'Moderate' | 'High' | '';
        };
        extraOral: {
            facialSwelling: boolean;
            lymphNodes: boolean;
            tmjPain: boolean;
        };
        systemicRisks: {
            onBloodThinners: boolean;
            diabetic: boolean;
            diabetesControl: 'Controlled' | 'Uncontrolled' | 'N/A' | '';
        };
        procedure: string;
        notes: string;
    };
    urologyData?: {
        symptoms: string[];
        ipss: { score: string; };
        urine: { pusCells: string; rbc: string; protein: string; nitrite: boolean; };
        renal: { creatinine: string; urea: string; };
        stone: { size: string; location: string; };
        prostate: { size: string; consistency: string; nodules: boolean; };
        pvr: string;
        catheter: { present: boolean; type: string; duration: string; reason: string; };
        diagnosis: string;
        notes: string;
    };
    radiologyOrder?: {
        priority: string;
        modality: string;
        bodyPart: string;
        protocol: string;
        contrast: {
            requested: boolean;
            type: string;
            creatinine: string;
            allergy: boolean;
        };
        safety: {
            pregnancy: boolean;
            implants: boolean;
        };
        clinicalIndication: string;
        notes: string;
    };
    generalSurgeryData?: {
        symptoms: string[];
        abdomen: {
            distention: string;
            tenderness: string;
            guarding: string;
            masses: string;
            bowelSounds: string;
        };
        hernia: {
            present: boolean;
            site: string;
            type: string;
        };
        surgicalSite: {
            dressing: string;
            infection: boolean;
            discharge: string;
        };
        diagnosis: string;
        plan: string;
        notes: string;
    };
}

const INITIAL_FORM: PrescriptionForm = {
    patientName: '',
    age: '',
    gender: 'Male',
    duration: '',
    mrn: '',
    date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    symptoms: '',
    diagnosis: '',
    advice: '',
    medicines: [],
    dietAdvice: [],
    suggestedTests: [],
    followUp: '',
    followUpDate: '',
    avoid: [],
    doctorName: '',
    doctorSpecialization: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    cardiologyData: {
        bpSystolic: '',
        bpDiastolic: '',
        heartRate: '',
        rhythm: 'Regular',
        riskLevel: 'Low',
        nyhaClass: '',
        riskFactors: [],
        ecgType: 'Normal',
        ecgLeads: [],
        ecgNotes: '',
        s1: 'Normal',
        s2: 'Normal',
        murmur: 'None',
        murmurType: '',
        notes: ''
    },
    psychiatryData: {
        complaints: [],
        severity: '',
        duration: '',
        mse: {
            behavior: '', speech: '', mood: '',
            thought: [], perception: '',
            insight: '1', judgment: '1'
        },
        suicideRisk: 'None',
        scores: { phq9: '0', gad7: '0' },
        substanceUse: [],
        medicationCompliance: '',
        sideEffects: [],
        counseling: '',
        notes: ''
    },
    endocrinologyData: {
        glycemic: { fbs: '', ppbs: '', hba1c: '' },
        thyroid: { tsh: '', t3: '', t4: '' },
        weight: '',
        height: '',
        bmi: '',
        symptoms: [],
        pcos: { irregularCycles: false, hirsutism: false, acne: false, infertility: false },
        complications: [],
        medicationType: [],
        diabetes: {
            hypoglycemia: 'None',
            footExam: { sensation: 'Normal', ulcer: 'Absent', pulse: 'Normal' },
            treatment: { type: 'Oral', insulinType: '', dose: '' },
            complications: []
        },
        notes: ''
    },
    dermatologyData: {
        lesionType: '',
        lesionCount: '',
        size: '',
        location: [],
        distribution: '',
        color: [],
        surfaceChanges: [],
        itchingSeverity: 'None',
        painSeverity: 'None',
        burning: false,
        duration: '',
        onset: '',
        progression: '',
        provisionalDiagnosis: '',
    },
    pediatricData: {
        weight: '',
        height: '',
        headCircumference: '',
        temperature: '98.6',
        heartRate: '',
        respRate: '',
        growth: {
            weightForAge: '',
            heightForAge: ''
        },
        milestones: '',
        milestoneNotes: '',
        immunizationStatus: '',
        dueVaccines: [],
        symptoms: [],
        redFlags: [],
        notes: ''
    },
    entData: {
        ear: { left: { externalEar: '', earCanal: [], tympanicMembrane: '' }, right: { externalEar: '', earCanal: [], tympanicMembrane: '' } },
        hearing: { status: '', tuningForkTest: [] },
        nose: { mucosa: '', septum: '', discharge: '' },
        throat: { tonsils: '', pharynx: '', uvula: '' },
        lymphNodes: { cervical: '', sizeCm: undefined, tender: '', mobility: '' },
        voice: { quality: '', airway: '' },
        symptoms: [],
        duration: '',
        notes: '',
    },
    ophthaData: {
        chiefComplaints: '',
        hopi: '',
        pastHistory: '',
        familyHistory: '',
        vision:     { od: { unaided: '', corrected: '' }, os: { unaided: '', corrected: '' } },
        refraction: {
            od: {
                distant: { sph: '', cyl: '', axis: '', va: '' },
                near: { sph: '', cyl: '', axis: '', va: '' }
            },
            os: {
                distant: { sph: '', cyl: '', axis: '', va: '' },
                near: { sph: '', cyl: '', axis: '', va: '' }
            }
        },
        iop:        { od: '', os: '' },
        pupils:     '',
        symptoms:   [],
        slitLamp:   { conjunctiva: {re:'',le:'',notes:''}, cornea: {re:'',le:'',notes:''}, anteriorChamber: {re:'',le:'',notes:''}, lens: {re:'',le:'',notes:''} },
        fundus:     { retina: {re:'',le:'',notes:''}, opticDisc: {re:'',le:'',notes:''}, macula: {re:'',le:'',notes:''} },
        diagnosis:  '',
        notes:      '',
    },
    gynaecData: {
        lmp: '',
        cycleLength: '',
        cycleRegularity: '',
        flowDuration: '',
        flowType: '',
        obstetric: { gravida: undefined, para: undefined, living: undefined, abortions: undefined },
        pregnant: 'No',
        gestationalAge: '',
        edd: '',
        symptoms: [],
        vitals: { bp: '', pulse: '', weight: '', temperature: '' },
        obstetricExam: { uterineSize: '', fetalPosition: '', fetalHeartRate: '' },
        gynExam: { cervix: '', discharge: '', tenderness: '' },
        investigations: [],
        notes: '',
    },
    neuroData: {
        gcs: { eye: '', verbal: '', motor: '' },
        mentalStatus: '',
        motorPower: { ru: '', lu: '', rl: '', ll: '' },
        reflexes: '',
        cranialNerves: '',
        cranialNerveDeficits: [],
        sensory: '',
        coordination: '',
        symptoms: [],
        onset: '',
        notes: '',
    },
    gastroData: {
        symptoms: [],
        painLocation: '',
        painType: '',
        bowelHabits: '',
        stoolType: 'Normal',
        bowelSounds: 'Normal',
        distention: 'None',
        tenderness: 'None',
        liver: { status: 'Not palpable', size: '' },
        spleen: { status: 'Not palpable' },
        guarding: 'None',
        diagnosis: '',
        notes: '',
    },
    nephroData: {
        creatinine:    '',
        urea:          '',
        egfr:          '',
        electrolytes:  { sodium: '', potassium: '', bicarbonate: '' },
        urineOutput:   '',
        urineAnalysis: { protein: '', sugar: '', rbc: '' },
        fluidBalance:  { intake: '', output: '' },
        edema:         'None',
        dialysis:      { status: '', frequency: '', lastSession: '', access: '' },
        symptoms:      [],
        ckdStage:      '',
        notes:         '',
    },
    orthoData: {
        joint: '',
        side: '',
        symptoms: [],
        pain: { score: 0, type: '' },
        rom: '',
        exam: { swelling: '', tenderness: '', deformity: '', spasm: '' },
        motorPower: 5,
        neurovascular: { sensation: '', pulse: '' },
        specialTests: [],
        imaging: { xray: '', mri: '' },
        diagnosis: '',
        notes: '',
    },
    pulmoData: {
        vitals: { respRate: '', spo2: '', oxygenSupport: 'Room Air' },
        symptoms: [],
        mmrcGrade: 0,
        exam: { chestExpansion: '', accessoryMuscles: '' },
        auscultation: { airEntry: '', sounds: [] },
        peakFlow: '',
        diagnosis: '',
        severity: '',
        notes: '',
    },
    hematologyData: {
        cbc: { hb: '', tlc: '', platelets: '', esr: '' },
        rbcIndices: { mcv: '', mch: '', mchc: '' },
        coagulation: { pt: '', inr: '1.0', aptt: '' },
        symptoms: [],
        transfusion: { product: '', units: '0', indication: '' },
        diagnosis: '',
        notes: ''
    },
    oncologyData: {
        body: { weight: '', height: '', bsa: '' },
        diagnosis: '',
        site: '',
        ecog: '0',
        biomarkers: [],
        tnm: { t: '', n: '', m: '', stage: '' },
        treatment: { intent: '', modality: [], regimen: '' },
        chemo: [],
        labs: { hb: '', anc: '', platelets: '', creatinine: '', lft: '' },
        toxicity: [],
        notes: ''
    },
    dentistryData: {
        painScale: 0,
        duration: '',
        teeth: [],
        oralFindings: {
            caries: 'None',
            gingivitis: 'None',
            abscess: false,
            mobility: 'None',
            plaqueIndex: 'Low'
        },
        extraOral: {
            facialSwelling: false,
            lymphNodes: false,
            tmjPain: false
        },
        systemicRisks: {
            onBloodThinners: false,
            diabetic: false,
            diabetesControl: 'N/A'
        },
        procedure: '',
        notes: ''
    },
    urologyData: {
        symptoms: [],
        ipss: { score: '' },
        urine: { pusCells: '', rbc: '', protein: 'Nil', nitrite: false },
        renal: { creatinine: '', urea: '' },
        stone: { size: '', location: 'None' },
        prostate: { size: 'Normal', consistency: 'Fibroadenomatous', nodules: false },
        pvr: '',
        catheter: { present: false, type: '', duration: '', reason: '' },
        diagnosis: '',
        notes: ''
    },
    radiologyOrder: {
        priority: 'Routine',
        modality: '',
        bodyPart: '',
        protocol: '',
        contrast: {
            requested: false,
            type: '',
            creatinine: '',
            allergy: false
        },
        safety: {
            pregnancy: false,
            implants: false
        },
        clinicalIndication: '',
        notes: ''
    },
    generalSurgeryData: {
        symptoms: [],
        abdomen: {
            distention: 'None',
            tenderness: 'None',
            guarding: 'None',
            masses: '',
            bowelSounds: 'Normal'
        },
        hernia: {
            present: false,
            site: '',
            type: 'N/A'
        },
        surgicalSite: {
            dressing: 'N/A',
            infection: false,
            discharge: ''
        },
        diagnosis: '',
        plan: 'Conservative',
        notes: ''
    }
};

const FrequencySelector = ({ value, onChange }: { value: Frequency, onChange: (val: Frequency) => void }) => {
    const freq = mapFrequency(value);

    const toggleStandard = (slot: keyof StandardFrequency) => {
        const current = freq.standard[slot];
        const nextMap: Record<string, FoodTiming | 'off'> = {
            off: 'after',
            after: 'before',
            before: 'with',
            with: 'anytime',
            anytime: 'off'
        };
        onChange({
            ...freq,
            standard: {
                ...freq.standard,
                [slot]: nextMap[current] || 'anytime'
            }
        });
    };

    const setCustomInterval = (hours: number) => {
        onChange({
            ...freq,
            type: 'custom',
            custom: {
                ...freq.custom,
                interval: hours
            }
        });
    };

    const setCustomTiming = (timing: FoodTiming) => {
        onChange({
            ...freq,
            type: 'custom',
            custom: {
                ...freq.custom,
                timing
            }
        });
    };

    const timingColors: Record<string, string> = {
        anytime: 'bg-slate-500',
        before: 'bg-amber-500',
        after: 'bg-emerald-500',
        with: 'bg-blue-500'
    };

    const timingLabels: Record<string, string> = {
        anytime: 'Anytime',
        before: 'Before Food',
        after: 'After Food',
        with: 'With Food'
    };

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-1.5 sm:p-1 bg-white border border-slate-200 rounded-lg w-full max-w-full min-w-0 flex-1 h-auto shadow-sm transition-all relative overflow-visible">
            {/* Type Toggle */}
            <div className="flex p-0.5 bg-slate-100 rounded-md shrink-0">
                <button
                    onClick={() => onChange({ ...INITIAL_FREQUENCY, type: 'standard' })}
                    className={`px-2 py-1 text-[7px] font-black uppercase tracking-tighter rounded transition-all ${freq.type === 'standard' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Std
                </button>
                <button
                    onClick={() => onChange({ ...INITIAL_FREQUENCY, type: 'custom' })}
                    className={`px-2 py-1 text-[7px] font-black uppercase tracking-tighter rounded transition-all ${freq.type === 'custom' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Cst
                </button>
            </div>

            <div className="w-[1px] h-4 bg-slate-200 mx-1 shrink-0" />

            {freq.type === 'standard' ? (
                <div className="flex flex-wrap items-center gap-1 flex-1 px-1 overflow-visible">
                    {(['morning', 'afternoon', 'evening', 'night'] as const).map((slot) => {
                        const timing = freq.standard[slot];
                        const isActive = timing !== 'off';
                        const slotLabels = {
                            morning: 'Morning',
                            afternoon: 'Afternoon',
                            evening: 'Evening',
                            night: 'Night'
                        };
                        return (
                            <div key={slot} className="relative group/tooltip">
                                <button
                                    onClick={() => toggleStandard(slot)}
                                    className={`h-7 px-2 rounded-md border text-[7px] font-black uppercase transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${isActive ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                >
                                    <span className={isActive ? 'text-teal-600' : 'text-slate-300'}>{slotLabels[slot]}</span>
                                    {isActive && (
                                        <span className={`px-1 rounded-[3px] text-white text-[6px] py-0.5 font-bold ${timingColors[timing]}`}>
                                            {timingLabels[timing]}
                                        </span>
                                    )}
                                </button>

                                {/* Bubble Tooltip - Top Position */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-2 py-1 bg-teal-600 text-white text-[8px] font-bold rounded-lg opacity-0 invisible translate-y-1 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-hover/tooltip:translate-y-0 group-hover/tooltip:scale-100 transition-all duration-200 whitespace-nowrap shadow-lg z-[200] pointer-events-none">
                                    <div className="relative">
                                        Tap to change food timing
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-teal-600"></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[7px] font-black text-slate-400 uppercase">Every</span>
                        <input
                            type="text"
                            value={freq.custom?.interval === 0 ? '' : (freq.custom?.interval || '')}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d+$/.test(val)) {
                                    setCustomInterval(val === '' ? 0 : parseInt(val));
                                }
                            }}
                            placeholder="8"
                            className="w-8 h-6 bg-slate-50 border border-slate-200 rounded text-[9px] font-black text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        <span className="text-[7px] font-black text-slate-400 uppercase">Hrs</span>
                    </div>
                    <select
                        value={freq.custom.timing}
                        onChange={(e) => setCustomTiming(e.target.value as any)}
                        className="h-6 px-1 bg-slate-50 border border-slate-200 rounded text-[7px] font-black uppercase focus:outline-none"
                    >
                        <option value="anytime">Anytime</option>
                        <option value="before">Before Food</option>
                        <option value="after">After Food</option>
                        <option value="with">With Food</option>
                    </select>
                </div>
            )}
        </div>
    );
};

function CreatePrescriptionPage({ params }: { params: Promise<{ hospitalId: string }> }) {
    const resolvedParams = use(params);
    const hospitalId = resolvedParams.hospitalId;
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const appointmentId = ((searchParams?.get('appointmentId') ?? null) ?? null);
    const patientId = ((searchParams?.get('patientId') ?? null) ?? null);
    const admissionId = ((searchParams?.get('admissionId') ?? null) ?? null);


    const [formData, setFormData] = useState<PrescriptionForm>(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const [activeSpecialty, setActiveSpecialty] = useState<string>('General');
    const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
    const [clinicalAlerts, setClinicalAlerts] = useState<ClinicalAlert[]>([]);

    // --- Backend Driven Specialist Extraction ---
    const { data: docProfileRes, isLoading: isProfileLoading } = useQuery({
        queryKey: ['doctorProfile'],
        queryFn: () => getDoctorProfileAction(),
        staleTime: 0,
    });
    const docProfile = docProfileRes?.data;

    // --- Unified Clinical Validation Engine ---
    useEffect(() => {
        const alerts = evaluateClinicalRules(formData, activeSpecialty);
        setClinicalAlerts(alerts);
    }, [formData, activeSpecialty]);

    // Medical History State
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [patientHistoryData, setPatientHistoryData] = useState<{ visits: any[]; prescriptions: any[]; reports: any[] }>({ visits: [], prescriptions: [], reports: [] });
    const [historyTab, setHistoryTab] = useState<'visits' | 'prescriptions' | 'reports'>('visits');

    useEffect(() => {
        const targetPatientId = patientId;
        if (showHistoryModal && targetPatientId) {
            setLoadingHistory(true);
            doctorService.getPatientHistory(targetPatientId, showFullHistory ? 'all' : 'hospital')
                .then((data: any) => {
                    setPatientHistoryData({
                        visits: data?.history || [],
                        prescriptions: data?.prescriptions || [],
                        reports: data?.reports || []
                    });
                })
                .catch((err: any) => {
                    toast.error(err?.message || "Failed to load patient history");
                })
                .finally(() => setLoadingHistory(false));
        }
    }, [showHistoryModal, showFullHistory, patientId]);

    // UI states
    const [sentToPharma, setSentToPharma] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showNoPharmaWarn, setShowNoPharmaWarn] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isPausing, setIsPausing] = useState(false);

    // -- Navigation Guard: block leaving without pausing or completing --
    useEffect(() => {
        if (!appointmentId) return; // Only guard when there's an active appointment
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!isSubmitted && !isPaused) {
                const msg = 'You have not paused or completed this consultation. Are you sure you want to leave?';
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [appointmentId, isSubmitted, isPaused]);

    // Suggestion State
    const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Hospital Data ---
    const { data: hospitalDataRaw } = useQuery({
        queryKey: ['hospitalDetails', hospitalId],
        queryFn: () => hospitalAdminService.getHospital(),
        enabled: !!hospitalId
    });
    const hospitalBranding = hospitalDataRaw?.hospital;

    // Draft State
    const [showPharmaConfirm, setShowPharmaConfirm] = useState(false);
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);
    const hasLoadedDraftRef = useRef(false);

    // Success State
    const [showSuccess, setShowSuccess] = useState(false);
    const [generatedHtml, setGeneratedHtml] = useState<{ prescription: string, billing: string } | null>(null);

    // Preview Modal State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewSendToPharma, setPreviewSendToPharma] = useState(false);
    const [specialtyWarnings, setSpecialtyWarnings] = useState<string[]>([]);

    // --- Centralized Vitals Prefill Logic ---
    const applyVitalsToForm = (vitals: any, prevForm: PrescriptionForm): PrescriptionForm => {
        if (!vitals) return prevForm;

        const bp = String(vitals.bp || vitals.bloodPressure || '');
        const [sys, dia] = bp.split('/');
        const systolic = String(sys || vitals.systolicBP || '');
        const diastolic = String(dia || vitals.diastolicBP || '');
        const hr = String(vitals.heartRate || vitals.pulse || '');
        const weight = String(vitals.weight || '');
        const height = String(vitals.height || '');
        const temp = String(vitals.temperature || vitals.temp || '');
        const rr = String(vitals.respRate || '');
        const spo2 = String(vitals.spo2 || '');
        const creatinine = String(vitals.creatinine || '');

        let bmi = String(vitals.bmi || '');
        if (!bmi && weight && height) {
            const h = parseFloat(height) / 100;
            const w = parseFloat(weight);
            if (h > 0 && w > 0) bmi = (w / (h * h)).toFixed(1);
        }

        return {
            ...prevForm,
            cardiologyData: {
                ...prevForm.cardiologyData!,
                bpSystolic: systolic || prevForm.cardiologyData?.bpSystolic || '',
                bpDiastolic: diastolic || prevForm.cardiologyData?.bpDiastolic || '',
                heartRate: hr || prevForm.cardiologyData?.heartRate || ''
            },
            pediatricData: {
                ...prevForm.pediatricData!,
                weight: weight || prevForm.pediatricData?.weight || '',
                height: height || prevForm.pediatricData?.height || '',
                temperature: temp || prevForm.pediatricData?.temperature || '98.6',
                heartRate: hr || prevForm.pediatricData?.heartRate || '',
                respRate: rr || prevForm.pediatricData?.respRate || ''
            },
            endocrinologyData: {
                ...prevForm.endocrinologyData!,
                weight: weight || prevForm.endocrinologyData?.weight || '',
                height: height || prevForm.endocrinologyData?.height || '',
                bmi: bmi || prevForm.endocrinologyData?.bmi || ''
            },
            gynaecData: {
                ...prevForm.gynaecData!,
                vitals: {
                    ...prevForm.gynaecData?.vitals!,
                    bp: bp || prevForm.gynaecData?.vitals?.bp || '',
                    pulse: hr || prevForm.gynaecData?.vitals?.pulse || '',
                    weight: weight || prevForm.gynaecData?.vitals?.weight || '',
                    temperature: temp || prevForm.gynaecData?.vitals?.temperature || ''
                }
            },
            pulmoData: {
                ...prevForm.pulmoData!,
                vitals: {
                    ...prevForm.pulmoData?.vitals!,
                    respRate: rr || prevForm.pulmoData?.vitals?.respRate || '',
                    spo2: spo2 || prevForm.pulmoData?.vitals?.spo2 || ''
                }
            },
            nephroData: {
                ...prevForm.nephroData!,
                creatinine: creatinine || prevForm.nephroData?.creatinine || ''
            },
            urologyData: {
                ...prevForm.urologyData!,
                renal: {
                    ...prevForm.urologyData?.renal!,
                    creatinine: creatinine || prevForm.urologyData?.renal?.creatinine || ''
                }
            },
            radiologyOrder: {
                ...prevForm.radiologyOrder!,
                contrast: {
                    ...prevForm.radiologyOrder?.contrast!,
                    creatinine: creatinine || prevForm.radiologyOrder?.contrast?.creatinine || ''
                }
            },
            oncologyData: {
                ...prevForm.oncologyData!,
                body: {
                    ...prevForm.oncologyData?.body!,
                    weight: weight || prevForm.oncologyData?.body?.weight || '',
                    height: height || prevForm.oncologyData?.body?.height || ''
                },
                labs: {
                    ...prevForm.oncologyData?.labs!,
                    creatinine: creatinine || prevForm.oncologyData?.labs?.creatinine || ''
                }
            }
        };
    };

    // -- Fetch Appointment Details if ID present --
    useEffect(() => {
        const normalizeGender = (g: string): string => {
            if (!g) return 'Male';
            const lower = g.toLowerCase();
            if (lower.startsWith('m')) return 'Male';
            if (lower.startsWith('f')) return 'Female';
            return 'Other';
        };

        if (appointmentId) {
            const fetchDetails = async () => {
                try {
                    setLoading(true);
                    const res = await getAppointmentDetailsAction(appointmentId);

                    if (res.success && res.data) {
                        const apt = res.data;
                        const patientName = apt.patient?.name || apt.patientDetails?.name || '';
                        const age = apt.patient?.age || apt.patientDetails?.age || '';
                        const gender = normalizeGender(apt.patient?.gender || apt.patientDetails?.gender || 'Male');
                        const mrn = apt.patient?.mrn || apt.mrn || '';
                        const symptoms = Array.isArray(apt.symptoms) ? apt.symptoms.join(', ') : (apt.symptoms || '');
                        const diagnosis = apt.reason || symptoms;

                        // ✅ COMPREHENSIVE VITALS SYNC (Appointment + Patient Profile)
                        const appointmentVitals = apt.vitals || {};
                        const patientProfileVitals = apt.patient?.vitals || apt.patientDetails?.vitals || {};
                        const mergedVitals = { ...patientProfileVitals, ...appointmentVitals };

                        // ✅ SYNC SPECIALTY FROM APPOINTMENT DEPARTMENT
                        if (apt.department || apt.specialization) {
                            setActiveSpecialty(apt.department || apt.specialization);
                        }

                        setFormData(prev => {
                            const baseForm = {
                                ...prev,
                                patientName,
                                age: String(age),
                                gender: gender,
                                mrn,
                                symptoms,
                                diagnosis,
                            };
                            return applyVitalsToForm(mergedVitals, baseForm);
                        });
                    } else {
                        toast.error(res.error || "Failed to load appointment details");
                    }
                } catch (error) {
                    console.error("Failed to prefill", error);
                    toast.error("Failed to load appointment details");
                } finally {
                    setLoading(false);
                }
            };
            fetchDetails();
        } else if (patientId) {
            // Fetch Patient Details directly
            const fetchPatient = async () => {
                try {
                    setLoading(true);
                    const res = await doctorService.getPatientDetails(patientId);
                    const p = res.patient || res; // Handle both direct and nested formats
                            if (p) {
                                setFormData(prev => {
                                    const baseForm = {
                                        ...prev,
                                        patientName: p.name || '',
                                        age: String(p.age || ''),
                                        gender: normalizeGender(p.gender || 'Male'),
                                        mrn: p.mrn || '',
                                    };
                                    return applyVitalsToForm(p.vitals, baseForm);
                                });
                            }
                } catch (err) {
                    console.error("Failed to fetch patient data", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchPatient();
        }
    }, [appointmentId, patientId]);

    // -- Load / Save Draft --
    useEffect(() => {
        if (hasLoadedDraftRef.current) return;
        const saved = localStorage.getItem(`prescription_draft_${appointmentId || patientId || 'default'}`);
        if (saved && !isDraftLoaded) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(prev => {
                    // Preserve patient-fetched demographic fields if already populated
                    // to prevent draft from overwriting freshly loaded patient data (e.g. gender)
                    const protectedFields: (keyof typeof prev)[] = ['patientName', 'age', 'gender', 'mrn'];
                    const safeUpdate = { ...parsed };
                    protectedFields.forEach(field => {
                        if (prev[field]) {
                            safeUpdate[field] = prev[field];
                        }
                    });
                    return { ...prev, ...safeUpdate };
                });
                hasLoadedDraftRef.current = true;
                setIsDraftLoaded(true);
                toast.success("Resumed unsaved draft", { id: 'draft-load', icon: '📝', duration: 2000 });
            } catch (e) {
                console.error("Draft load failed", e);
            }
        }
    }, [appointmentId, patientId, isDraftLoaded]);

    useEffect(() => {
        if (formData !== INITIAL_FORM) {
            localStorage.setItem(`prescription_draft_${appointmentId || patientId || 'default'}`, JSON.stringify(formData));
        }
    }, [formData, appointmentId, patientId]);

    // -- Sync Doctor Profile Data --
    useEffect(() => {
        if (docProfile) {
            const specialization = docProfile.specialties && Array.isArray(docProfile.specialties) && docProfile.specialties.length > 0
                ? docProfile.specialties.join(', ')
                : (docProfile.department || 'Medical Practitioner');

            const specs = docProfile.specialties && Array.isArray(docProfile.specialties) && docProfile.specialties.length > 0
                ? docProfile.specialties
                : [docProfile.department || 'General Medicine'];

            setAvailableSpecialties(specs);

            // AUTO-SELECT BEST MODULE FROM BACKEND PROFILE IF NOT ALREADY SET BY APPOINTMENT
            if (activeSpecialty === 'General') {
                const cardioSpec = specs.find((s: string) => s.toUpperCase().includes('CARDIO'));
                const hemaSpec = specs.find((s: string) => s.toUpperCase().includes('HEMA'));
                const endoSpec = specs.find((s: string) => s.toUpperCase().includes('ENDOCRIN'));
                const orthoSpec = specs.find((s: string) => s.toUpperCase().includes('ORTHO'));
                const ophthaSpec = specs.find((s: string) => s.toUpperCase().includes('OPHTHA') || s.toUpperCase().includes('EYE'));
                
                if (cardioSpec) {
                    setActiveSpecialty(cardioSpec);
                } else if (hemaSpec) {
                    setActiveSpecialty(hemaSpec);
                } else if (endoSpec) {
                    setActiveSpecialty(endoSpec);
                } else if (orthoSpec) {
                    setActiveSpecialty(orthoSpec);
                } else if (ophthaSpec) {
                    setActiveSpecialty(ophthaSpec);
                } else if (specs.length > 0) {
                    setActiveSpecialty(specs[0]);
                }
            }

            setFormData(prev => ({
                ...prev,
                doctorName: docProfile.user?.name || docProfile.name || prev.doctorName,
                doctorSpecialization: specialization,
                doctorSignature: docProfile.signature
            }));
        }
    }, [docProfile, activeSpecialty]);

    // -- Fetch Hospital Branding handled by useQuery --

    // -- Medicine Search Logic --
    const handleMedicineSearch = (query: string, index: number) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        setActiveMedIndex(index);

        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        setSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await doctorService.searchMedicines(query);
                if (res.success) {
                    const results = res.data || [];
                    const q = query.toLowerCase();

                    const sortedResults = [...results].sort((a, b) => {
                        const aName = (a.brand || '').toLowerCase();
                        const bName = (b.brand || '').toLowerCase();
                        const aGen = (a.generic || '').toLowerCase();
                        const bGen = (b.generic || '').toLowerCase();

                        const getScore = (name: string, gen: string) => {
                            // 1. Exact start matches (brand or generic)
                            if (name.startsWith(q) || gen.startsWith(q)) return 1;

                            // 2. Word-start matches
                            const nameWords = name.split(/[\s\-()]+/);
                            const genWords = gen.split(/[\s\-()]+/);
                            if (nameWords.some(w => w.startsWith(q)) || genWords.some(w => w.startsWith(q))) return 2;

                            // 3. Contains matches
                            if (name.includes(q) || gen.includes(q)) return 3;

                            return 4;
                        };

                        const scoreA = getScore(aName, aGen);
                        const scoreB = getScore(bName, bGen);

                        if (scoreA !== scoreB) return scoreA - scoreB;
                        // Secondary sort by name alphabetical
                        return aName.localeCompare(bName);
                    });

                    setSuggestions(sortedResults);
                }
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setSearching(false);
            }
        }, 300); // Debounce
    };

    const selectMedicine = (med: any, index: number) => {
        const newMeds = [...formData.medicines];
        // Construct a nice name from the pharma data
        const fullName = `${med.brand} (${med.generic}) ${med.strength}`;

        const unitsPerPack = med.unitsPerPack || 1;
        const availableUnits = (med.stock || 0) * unitsPerPack;
        const pricePerUnit = (med.mrp || 0) / unitsPerPack;

        newMeds[index] = {
            ...newMeds[index],
            productId: med._id,
            name: fullName,
            form: med.form || '',              // Form type: TABLET / CAPSULE / SYRUP etc.
            dosage: med.strength || '',        // Auto-fill dosage from strength (e.g. "10mg")
            price: med.mrp || 0,
            unitsPerPack,
            availableUnits,
            pricePerUnit,
            error: ''
        };

        setFormData(prev => ({ ...prev, medicines: newMeds }));
        calculateBilling(newMeds);

        // Reset search
        setSuggestions([]);
        setActiveMedIndex(null);
    };


    const handleGeneratePrescription = () => {
        if (!formData.symptoms) {
            toast.error("No symptoms to generate prescription from");
            return;
        }

        const currentSymptoms = formData.symptoms.split(',').map(s => s.trim().toLowerCase());
        let matchedMeds: Medicine[] = [];
        let matchedDiet: string[] = [];
        let matchedTests: string[] = [];
        let matchedAvoid: string[] = [];
        let matchedFollowUp: string = '';
        let matchedDiagnosis: string[] = [];

        medicineData.symptoms_data.forEach((protocol: any) => {
            const protocolSymptomLower = protocol.symptom.toLowerCase();
            const keywords = protocol.keywords ? protocol.keywords.map((k: string) => k.toLowerCase()) : [];

            // Match against main symptom name OR any keywords
            const isMatch = currentSymptoms.some(userSym => {
                const userSymLower = userSym.toLowerCase();
                // Check if user symptom contains protocol name or vice versa
                const nameMatch = userSymLower.includes(protocolSymptomLower) || protocolSymptomLower.includes(userSymLower);
                // Check if user symptom contains any keyword or vice versa
                const keywordMatch = keywords.some((k: string) => userSymLower.includes(k) || k.includes(userSymLower));

                return nameMatch || keywordMatch;
            });

            if (isMatch) {
                matchedDiagnosis.push(protocol.symptom);
                const meds: Medicine[] = protocol.medicine.map((m: string) => {
                    // Try to parse the medicine string "Name Dosage (Frequency)"
                    let name = m;
                    let dosage = '-';
                    let freq = '-';
                    const duration = '-';
                    const notes = '-';

                    // Heuristic parsing
                    // 1. Extract Frequency from parens
                    if (m.includes('(')) {
                        const parts = m.split('(');
                        name = parts[0].trim();
                        freq = parts[1].replace(')', '').trim();
                    }

                    // 2. Extract Dosage Strength from Name (e.g. 500 mg, 650mg, 200-400mg)
                    const strengthRegex = /(\d+(?:-\d+)?\s*(?:mg|ml|g|mcg|iu))/i;
                    const strengthMatch = name.match(strengthRegex);

                    if (strengthMatch) {
                        dosage = strengthMatch[0]; // "500 mg"
                        name = name.replace(strengthRegex, '').trim(); // Remove strength from name
                    }

                    // Calculate Quantity
                    let qty = 1;
                    const durationDays = 5; // Default 5 days
                    // Parse freq e.g., "1-0-1" -> 2, "every 6 hrs" -> 4
                    let dailyCount = 1;
                    if (freq.includes('-')) {
                        // e.g. 1-0-1
                        const parts = freq.split('-').map(p => parseInt(p.trim()) || 0);
                        dailyCount = parts.reduce((a, b) => a + b, 0);
                    } else if (freq.toLowerCase().includes('hr')) {
                        const match = freq.match(/(\d+)/);
                        if (match) {
                            dailyCount = Math.floor(24 / parseInt(match[0]));
                        }
                    }

                    if (dailyCount > 0) {
                        qty = dailyCount * durationDays;
                    }

                    return {
                        name: name,
                        dosage: dosage,
                        freq: mapFrequency(freq),
                        duration: `${durationDays} days`,
                        quantity: String(qty),
                        price: 0
                    };
                });
                matchedMeds = [...matchedMeds, ...meds];
                if (protocol.diet_advice) matchedDiet = [...matchedDiet, ...protocol.diet_advice];
                if (protocol.suggested_tests) matchedTests = [...matchedTests, ...protocol.suggested_tests];
                if (protocol.avoid) matchedAvoid = [...matchedAvoid, ...protocol.avoid];
                if (protocol.follow_up) matchedFollowUp = protocol.follow_up;
            }
        });

        if (matchedMeds.length === 0) {
            toast.error("No matching protocols found for these symptoms");
            return;
        }

        matchedDiet = Array.from(new Set(matchedDiet));
        matchedTests = Array.from(new Set(matchedTests));
        matchedAvoid = Array.from(new Set(matchedAvoid));
        matchedDiagnosis = Array.from(new Set(matchedDiagnosis));

        setFormData(prev => ({
            ...prev,
            diagnosis: matchedDiagnosis.join(', '),
            medicines: matchedMeds,
            dietAdvice: matchedDiet,
            suggestedTests: matchedTests,
            avoid: matchedAvoid,
            followUp: matchedFollowUp || prev.followUp,
            followUpDate: matchedFollowUp ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : prev.followUpDate
        }));

        toast.success("Prescription Generated Successfully");
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addMedicine = () => {
        setFormData(prev => ({
            ...prev,
            medicines: [...prev.medicines, { name: '', form: '', dosage: '', freq: INITIAL_FREQUENCY, duration: '', quantity: '', price: 0 }]
        }));
    };

    const updateMedicine = (index: number, field: string, value: any) => {
        const newMeds = [...formData.medicines];
        const med = newMeds[index] as Medicine;
        (newMeds[index] as any)[field] = value;

        // Real-time validation for quantity
        if (field === 'quantity') {
            const qty = parseInt(String(value)) || 0;
            if (med.availableUnits !== undefined && qty > med.availableUnits) {
                med.error = `Only ${med.availableUnits} available`;
            } else {
                med.error = '';
            }
        }

        setFormData(prev => ({ ...prev, medicines: newMeds }));

        if (field === 'name') {
            handleMedicineSearch(value as string, index);
        }

        if (field === 'price' || field === 'quantity') {
            calculateBilling(newMeds);
        }
    };

    const calculateBilling = (meds = formData.medicines) => {
        const subtotal = meds.reduce((sum, med) => {
            if (med.pricePerUnit && med.quantity) {
                return sum + (med.pricePerUnit * (parseInt(med.quantity) || 0));
            }
            return sum + (Number(med.price) || 0);
        }, 0);
        const tax = 0; // Tax removed
        const total = subtotal;
        setFormData(prev => ({ ...prev, subtotal, tax, total }));
    };


    const removeMedicine = (index: number) => {
        const newMeds = formData.medicines.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            medicines: newMeds
        }));
        calculateBilling(newMeds);
    };

    const addArrayItem = (field: 'dietAdvice' | 'suggestedTests' | 'avoid') => {
        setFormData(prev => ({
            ...prev,
            [field]: [...prev[field], '']
        }));
    };

    const updateArrayItem = (field: 'dietAdvice' | 'suggestedTests' | 'avoid', index: number, value: string) => {
        const newArr = [...formData[field]];
        newArr[index] = value;
        setFormData(prev => ({ ...prev, [field]: newArr }));
    };

    const removeArrayItem = (field: 'dietAdvice' | 'suggestedTests' | 'avoid', index: number) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };


    const generatePrescriptionHTML = (prescriptionId?: string) => {
        const initialHospitalDetails = {
            name: hospitalBranding?.name || 'KADAPA MULTI-SPECIALITY',
            address: hospitalBranding?.address || 'RIMS ROAD, PUTLAMPALLI, KADAPA, AP',
            phone: hospitalBranding?.phone || '+91 8562 245555',
            email: hospitalBranding?.email || 'hospital@example.com',
            logo: hospitalBranding?.logo
        };

        const headerHtml = renderToStaticMarkup(<MainHeader initialDetails={hospitalBranding} />);
        const footerHtml = renderToStaticMarkup(<MainFooter initialDetails={hospitalBranding} />);

        const scanUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${hospitalId}/pharmacy/billing?orderId=${prescriptionId || ''}`;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prescription - ${formData.patientName}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                    
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                        .container { min-height: 280mm !important; height: auto !important; }
                    }
                    body { 
                        font-family: 'Inter', Arial, sans-serif; 
                        background: white; 
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0 auto;
                        padding: 10mm 25mm 10mm 25mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        background: white;
                        position: relative;
                    }
                    .content { 
                        flex: 1; 
                        display: flex;
                        flex-direction: column;
                    }
                    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
                    .title { color: #1e40af; margin: 0; font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; }
                    .doctor-info { text-align: right; }
                    .doctor-name { font-size: 14px; font-weight: 800; color: #1e293b; margin: 0; }
                    .doctor-spec { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 2px 0 0; }

                    .sig-line { border-top: 1.5px solid #1e293b; width: 180px; margin-left: auto; padding-top: 5px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
                    .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; letter-spacing: 1px; }
                    
                    .specialty-section { page-break-inside: avoid; margin-bottom: 25px; }
                    .info-grid { page-break-inside: avoid; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #eef2f6; }
                    .follow-up-box { page-break-inside: avoid; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 30px; border-radius: 0 12px 12px 0; display: flex; justify-content: space-between; align-items: center; }
                    .signature-area { page-break-inside: avoid; margin-top: 40px; text-align: right; }
                    .advice-grid { page-break-inside: avoid; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 10px; }
                    .print-footer { page-break-inside: avoid; margin-top: auto; }
                    .sig-img { height: 45px; margin-bottom: 5px; }
                    .sig-line { border-top: 1.5px solid #1e293b; width: 180px; margin-left: auto; padding-top: 5px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${headerHtml}
                    <div class="content">
                        <div class="header-row">
                            <h1 class="title">Rx Prescription</h1>
                            <div class="doctor-info">
                                <p class="doctor-name">${formData.doctorName}</p>
                                <p class="doctor-spec">${formData.doctorSpecialization || 'Medical Practitioner'}</p>
                            </div>
                        </div>

                        <div style="margin: 8px 0 24px 0; display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                            <div style="padding: 16px; background: white; border-right: 1px solid #f1f5f9;">
                                <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Patient Name</div>
                                <div style="font-size: 11px; font-weight: 900; color: #1e293b; text-transform: uppercase;">${formData.patientName}</div>
                            </div>
                            <div style="padding: 16px; background: #f8fafc; border-right: 1px solid #f1f5f9;">
                                <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Age / Gender</div>
                                <div style="font-size: 11px; font-weight: 900; color: #1e293b;">${formData.age || '--'} Y / ${formData.gender}</div>
                            </div>
                            <div style="padding: 16px; background: white; border-right: 1px solid #f1f5f9;">
                                <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">MRN / ID</div>
                                <div style="font-size: 11px; font-weight: 900; color: #1e293b; text-transform: uppercase;">${formData.mrn || 'N/A'}</div>
                            </div>
                            <div style="padding: 16px; background: #f8fafc;">
                                <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Printed Time</div>
                                <div style="font-size: 11px; font-weight: 900; color: #1e293b;">${formData.date} <span style="color: #64748b; font-weight: 700; margin-left: 4px;">${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span></div>
                            </div>
                        </div>

                        ${formData.symptoms || formData.diagnosis ? `
                        <div style="margin-bottom: 25px; padding: 15px; border: 1.5px solid #e2e8f0; border-radius: 12px; background: #f8fafc; display: flex; gap: 20px;">
                            ${formData.symptoms ? `
                            <div style="flex: 1;">
                                <span class="info-label" style="color: #64748b; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Chief Complaints / Symptoms</span>
                                <div style="font-size: 12px; font-weight: 700; color: #334155; margin-left: -5px;">
                                    <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
                                        ${formData.symptoms.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).map(s => '<li style="margin-bottom: 3px;">' + s + '</li>').join('')}
                                    </ul>
                                </div>
                            </div>
                            ` : ''}
                            ${formData.diagnosis ? `
                            <div style="flex: 1; ${formData.symptoms ? 'border-left: 1px dashed #e2e8f0; padding-left: 20px;' : ''}">
                                <span class="info-label" style="color: #1e40af; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Diagnosis / Impressions</span>
                                <div style="font-size: 13px; font-weight: 800; color: #1e40af;">${formData.diagnosis}</div>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}

                        ${activeSpecialty.toUpperCase().includes('CARDIO') && formData.cardiologyData ? (() => {
                            const c = formData.cardiologyData;
                            return `
                        <div style="margin-bottom: 25px; padding: 18px; border: 2px solid #fee2e2; border-radius: 16px; background: #fffcfc; page-break-inside: avoid;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #fecaca; margin-bottom: 15px; padding-bottom: 8px;">
                                <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #dc2626; letter-spacing: 1px;">Cardiac Evaluation Report</span>
                                <span style="font-size: 11px; font-weight: 900; color: #dc2626; background: #fee2e2; padding: 4px 12px; border-radius: 6px;">Risk: ${c.riskLevel?.toUpperCase()}</span>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
                                <div>
                                    <span style="font-size: 8px; color: #991b1b; font-weight: 800; text-transform: uppercase; display: block;">Blood Pressure</span>
                                    <span style="font-size: 16px; font-weight: 900; color: #1e293b;">${c.bpSystolic}/${c.bpDiastolic} <small style="font-size: 9px; font-weight: 600; color: #64748b;">mmHg</small></span>
                                </div>
                                <div>
                                    <span style="font-size: 8px; color: #991b1b; font-weight: 800; text-transform: uppercase; display: block;">Heart Rate</span>
                                    <span style="font-size: 16px; font-weight: 900; color: #1e293b;">${c.heartRate} <small style="font-size: 9px; font-weight: 600; color: #64748b;">BPM</small></span>
                                </div>
                                <div>
                                    <span style="font-size: 8px; color: #991b1b; font-weight: 800; text-transform: uppercase; display: block;">Rhythm</span>
                                    <span style="font-size: 13px; font-weight: 800; color: #1e293b;">${c.rhythm || 'Normal'}</span>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-top: 1px dashed #fecaca; padding-top: 12px; margin-bottom: 12px;">
                                <div>
                                    <span style="font-size: 8px; font-weight: 800; color: #dc2626; text-transform: uppercase; display: block; margin-bottom: 4px;">Clinical Profile</span>
                                    <div style="font-size: 10px; font-weight: 700; color: #334155;">NYHA Class: <span style="font-weight: 900; color: #dc2626;">${c.nyhaClass || 'N/A'}</span></div>
                                    <div style="font-size: 9px; font-weight: 700; color: #334155; margin-top: 2px;">Risk Factors: ${c.riskFactors?.join(', ') || 'None reported'}</div>
                                </div>
                                <div>
                                    <span style="font-size: 8px; font-weight: 800; color: #dc2626; text-transform: uppercase; display: block; margin-bottom: 4px;">ECG Findings</span>
                                    <div style="font-size: 11px; font-weight: 900; color: #1e1b4b;">${c.ecgType || 'Normal Sinus'}</div>
                                    <div style="font-size: 9px; font-weight: 700; color: #475569;">Leads: ${c.ecgLeads?.join(', ') || 'N/A'}</div>
                                </div>
                            </div>

                            <div style="border-top: 1px dashed #fecaca; padding-top: 10px;">
                                <span style="font-size: 8px; color: #991b1b; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Auscultation & Physical Exam</span>
                                <div style="font-size: 10px; font-weight: 700; color: #1e293b;">
                                    S1: ${c.s1} | S2: ${c.s2} | Murmur: ${c.murmur === 'Present' ? (c.murmurType || 'Yes') : 'None'}
                                </div>
                                ${c.notes ? `<div style="margin-top: 6px; font-size: 9px; color: #64748b; font-style: italic;">Notes: ${c.notes}</div>` : ''}
                            </div>
                        </div>`;
                        })() : ''}

                        ${activeSpecialty.toUpperCase().includes('HEMA') && formData.hematologyData ? (() => {
                            const hema = formData.hematologyData;
                            const cbc = hema.cbc || {};
                            const coag = hema.coagulation || {};
                            const rbc = hema.rbcIndices || {};
                            const hb = parseFloat(cbc.hb);
                            const plt = parseFloat(cbc.platelets);
                            const inr = parseFloat(coag.inr);
                            
                            const getAlertClass = (val: number, type: 'hb'|'plt'|'inr') => {
                                if (type === 'hb' && val < 7) return 'color: #ef4444; font-weight: 900;';
                                if (type === 'plt' && val < 50) return 'color: #ef4444; font-weight: 900;';
                                if (type === 'inr' && val > 3) return 'color: #ef4444; font-weight: 900;';
                                return 'color: #1e293b;';
                            };

                            return `
                        <div style="margin-bottom: 25px; padding: 18px; border: 2px solid #fee2e2; border-radius: 16px; background: #fffcfc; page-break-inside: avoid;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #fecdd3; margin-bottom: 14px; padding-bottom: 8px;">
                                <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #991b1b; letter-spacing: 1px;">Hematology Assessment Report</span>
                                <span style="font-size: 11px; font-weight: 900; color: #b91c1c;">CBC & Coagulation Status</span>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 15px;">
                                <div style="background: #fff; padding: 8px; border-radius: 8px; border: 1px solid #fecdd3;">
                                    <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block;">Hemoglobin</span>
                                    <span style="font-size: 14px; ${getAlertClass(hb, 'hb')}">${cbc.hb || '--'} <small style="font-size: 8px;">g/dL</small></span>
                                </div>
                                <div style="background: #fff; padding: 8px; border-radius: 8px; border: 1px solid #fecdd3;">
                                    <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block;">Platelets</span>
                                    <span style="font-size: 14px; ${getAlertClass(plt, 'plt')}">${cbc.platelets || '--'} <small style="font-size: 8px;">Lakhs</small></span>
                                </div>
                                <div style="background: #fff; padding: 8px; border-radius: 8px; border: 1px solid #fecdd3;">
                                    <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block;">INR</span>
                                    <span style="font-size: 14px; ${getAlertClass(inr, 'inr')}">${coag.inr || '--'}</span>
                                </div>
                                <div style="background: #fff; padding: 8px; border-radius: 8px; border: 1px solid #fecdd3;">
                                    <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block;">TLC</span>
                                    <span style="font-size: 14px; font-weight: 800;">${cbc.tlc || '--'}</span>
                                </div>
                            </div>

                            ${rbc.mcv ? `
                            <div style="font-size: 9px; margin-bottom: 10px; display: flex; gap: 15px; color: #475569; font-weight: 700;">
                                <span>MCV: ${rbc.mcv} fL</span>
                                <span>MCH: ${rbc.mch} pg</span>
                                <span>MCHC: ${rbc.mchc} g/dL</span>
                            </div>
                            ` : ''}

                            ${hema.transfusion?.product && parseFloat(hema.transfusion?.units) > 0 ? `
                            <div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 10px; border-radius: 10px; margin-top: 10px;">
                                <div style="font-size: 8px; font-weight: 900; color: #b91c1c; text-transform: uppercase;">Transfusion Plan</div>
                                <div style="font-size: 11px; font-weight: 800; color: #b91c1c; margin-top: 2px;">
                                    ${hema.transfusion.units} Units of ${hema.transfusion.product}
                                    ${hema.transfusion.indication ? ` | Indication: ${hema.transfusion.indication}` : ''}
                                </div>
                            </div>
                            ` : ''}

                            ${hema.diagnosis ? `
                            <div style="margin-top: 10px; border-top: 1px dashed #fecdd3; padding-top: 8px;">
                                <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Hematological Impression</span>
                                <div style="font-size: 12px; font-weight: 800; color: #991b1b;">${hema.diagnosis}</div>
                            </div>
                            ` : ''}
                        </div>`;
                        })() : ''}

                        ${(activeSpecialty.toUpperCase().includes('ONCO')) && formData.oncologyData ? (() => {
                             const onco = formData.oncologyData;
                             const body = onco.body || {};
                             const labs = onco.labs || {};
                             const tnm = onco.tnm || {};
                             const treat = onco.treatment || {};
                             const chemo = onco.chemo || [];
                             
                             const anc = parseFloat(labs.anc);
                             const plt = parseFloat(labs.platelets);
                             
                             return `
                        <div style="margin-bottom: 25px; padding: 22px; border: 2.5px solid #1e1b4b; border-radius: 24px; background: #f8fafc; page-break-inside: avoid;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; margin-bottom: 18px; padding-bottom: 10px;">
                                <h4 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #1e1b4b; letter-spacing: 1.5px;">Oncology Treatment Summary</h4>
                                <span style="font-size: 11px; font-weight: 900; color: #4338ca; background: #e0e7ff; padding: 6px 14px; border-radius: 10px;">BSA: ${body.bsa || '--'} m²</span>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                                <div>
                                    <span style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Diagnosis & Clinical Stage</span>
                                    <div style="font-size: 13px; font-weight: 800; color: #1e1b4b;">${onco.diagnosis || 'Solid Tumor'} ${tnm.stage ? '(Stage ' + tnm.stage + ')' : ''}</div>
                                    <div style="font-size: 10px; color: #475569; margin-top: 2px;"><b>Site:</b> ${onco.site || 'N/A'} | <b>ECOG:</b> ${onco.ecog || '0'}</div>
                                    ${onco.biomarkers?.length ? `<div style="font-size: 9px; color: #4338ca; font-weight: 700; margin-top: 4px;">Biomarkers: ${onco.biomarkers.join(' • ')}</div>` : ''}
                                </div>
                                <div style="background: white; padding: 10px; border-radius: 14px; border: 1px solid #e2e8f0;">
                                    <span style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px;">Chemo Safety Dashboard</span>
                                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                                        <div>
                                            <span style="font-size: 7px; color: #94a3b8; display: block;">ANC</span>
                                            <span style="font-size: 12px; font-weight: 900; color: ${anc < 1500 ? '#dc2626' : '#16a34a'};">${labs.anc || '--'}</span>
                                        </div>
                                        <div>
                                            <span style="font-size: 7px; color: #94a3b8; display: block;">Platelets</span>
                                            <span style="font-size: 12px; font-weight: 900; color: ${plt < 100 ? '#dc2626' : '#16a34a'};">${labs.platelets || '--'}<small>k</small></span>
                                        </div>
                                        <div>
                                            <span style="font-size: 7px; color: #94a3b8; display: block;">Creatinine</span>
                                            <span style="font-size: 12px; font-weight: 900; color: ${parseFloat(labs.creatinine) > 1.4 ? '#d97706' : '#1e293b'};">${labs.creatinine || '--'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            ${chemo.length > 0 ? `
                            <div style="margin-top: 15px;">
                                <span style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 8px;">Cytotoxic Regimen: ${treat.regimen || 'Protocol'} (${treat.intent || 'Curative'})</span>
                                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                                    <thead>
                                        <tr style="background: #f1f5f9;">
                                            <th style="font-size: 8px; padding: 8px; text-align: left; color: #475569;">DRUG</th>
                                            <th style="font-size: 8px; padding: 8px; text-align: center; color: #475569;">MG/M²</th>
                                            <th style="font-size: 8px; padding: 8px; text-align: center; color: #4338ca;">TOTAL DOSE</th>
                                            <th style="font-size: 8px; padding: 8px; text-align: center; color: #475569;">ROUTE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${chemo.map((c: any) => `
                                        <tr>
                                            <td style="padding: 10px; font-size: 11px; font-weight: 800; border-bottom: 1px solid #f1f5f9;">${c.drug}</td>
                                            <td style="padding: 10px; font-size: 10px; text-align: center; border-bottom: 1px solid #f1f5f9; color: #64748b;">${c.dosePerM2}</td>
                                            <td style="padding: 10px; font-size: 12px; text-align: center; border-bottom: 1px solid #f1f5f9; font-weight: 900; color: #1e1b4b;">${c.totalDose} mg</td>
                                            <td style="padding: 10px; font-size: 10px; text-align: center; border-bottom: 1px solid #f1f5f9; color: #64748b;">${c.route}</td>
                                        </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>` : ''}

                            ${onco.toxicity?.length ? `
                            <div style="margin-top: 12px; padding: 10px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px;">
                                <span style="font-size: 8px; font-weight: 900; color: #be123c; text-transform: uppercase;">Observed Toxicities (Grade ≥2)</span>
                                <div style="font-size: 11px; font-weight: 800; color: #9f1239; margin-top: 4px;">${onco.toxicity.join(' • ')}</div>
                            </div>` : ''}
                        </div>`;
                        })() : ''}

                        ${activeSpecialty.toUpperCase().includes('ENT') && !activeSpecialty.toUpperCase().includes('DENT') && !activeSpecialty.toUpperCase().includes('GASTRO') && formData.entData ? (() => {
                            const ent = formData.entData;
                            const earL = ent.ear?.left || {};
                            const earR = ent.ear?.right || {};
                            const lines: string[] = [];
                            // Ear
                            if (earL.externalEar || (earL.earCanal || []).length || earL.tympanicMembrane)
                                lines.push(`Left Ear: ${[earL.externalEar, (earL.earCanal || []).join(', '), earL.tympanicMembrane].filter(Boolean).join(' | ')}`);
                            if (earR.externalEar || (earR.earCanal || []).length || earR.tympanicMembrane)
                                lines.push(`Right Ear: ${[earR.externalEar, (earR.earCanal || []).join(', '), earR.tympanicMembrane].filter(Boolean).join(' | ')}`);
                            // Hearing
                            if (ent.hearing?.status) lines.push(`Hearing: ${ent.hearing.status}${ent.hearing.tuningForkTest?.length ? ' | ' + ent.hearing.tuningForkTest.join(', ') : ''}`);
                            // Nose
                            if (ent.nose?.mucosa || ent.nose?.septum || ent.nose?.discharge)
                                lines.push(`Nose: ${[ent.nose.mucosa, ent.nose.septum && ent.nose.septum !== 'Midline' ? 'DNS' : ent.nose.septum, ent.nose.discharge].filter(Boolean).join(' | ')}`);
                            // Throat
                            if (ent.throat?.tonsils || ent.throat?.pharynx || ent.throat?.uvula)
                                lines.push(`Throat: Tonsils ${ent.throat.tonsils || 'Normal'} | Pharynx ${ent.throat.pharynx || 'Normal'}${ent.throat.uvula ? ' | Uvula ' + ent.throat.uvula : ''}`);
                            // Lymph
                            if (ent.lymphNodes?.cervical) {
                                const ln = [`Cervical LN: ${ent.lymphNodes.cervical}`];
                                if (ent.lymphNodes.cervical === 'Enlarged') {
                                    if (ent.lymphNodes.sizeCm) ln.push(`${ent.lymphNodes.sizeCm}cm`);
                                    if (ent.lymphNodes.tender) ln.push(`Tender: ${ent.lymphNodes.tender}`);
                                    if (ent.lymphNodes.mobility) ln.push(ent.lymphNodes.mobility);
                                }
                                lines.push(ln.join(' | '));
                            }
                            // Voice
                            if (ent.voice?.quality || ent.voice?.airway)
                                lines.push(`Voice: ${[ent.voice.quality, ent.voice.airway].filter(Boolean).join(' | ')}`);
                            // Symptoms & Duration
                            if ((ent.symptoms || []).length) lines.push(`Symptoms: ${ent.symptoms.join(', ')}`);
                            if (ent.duration) lines.push(`Duration: ${ent.duration}`);
                            if (!lines.length) return '';
                            return `
                        <div style="margin-bottom: 25px; padding: 15px; border: 2px solid #e0f2fe; border-radius: 12px; background: #f0f9ff;">
                            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0284c7; border-bottom: 1px solid #bae6fd; display: block; margin-bottom: 10px; padding-bottom: 6px;">ENT Examination</span>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                ${lines.map(l => `<div style="font-size: 11px; font-weight: 600; color: #1e293b; padding-left: 10px; border-left: 3px solid #38bdf8;">${l}</div>`).join('')}
                            </div>
                        </div>`;
                        })() : ''}

                        ${activeSpecialty.toUpperCase().includes('PEDIATRI') && formData.pediatricData ? (() => {
                            const peds = formData.pediatricData;
                            const growth = peds.growth || {};
                            return `
                        <div style="margin-bottom: 25px; padding: 18px; border: 2px solid #fdf2f8; border-radius: 16px; background: #fff1f2;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #fecdd3; margin-bottom: 15px; padding-bottom: 8px;">
                                <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #be123c; letter-spacing: 1px;">Pediatric Growth & Assessment</span>
                                <span style="font-size: 12px; font-weight: 900; color: #e11d48; background: #ffe4e6; padding: 4px 10px; border-radius: 6px;">Weight: ${peds.weight} kg</span>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
                                <div>
                                    <span style="font-size: 8px; color: #9f1239; font-weight: 800; text-transform: uppercase; display: block;">Temperature</span>
                                    <span style="font-size: 13px; font-weight: 800; color: #1e293b;">${peds.temperature}°F</span>
                                </div>
                                <div>
                                    <span style="font-size: 8px; color: #9f1239; font-weight: 800; text-transform: uppercase; display: block;">Heart Rate</span>
                                    <span style="font-size: 13px; font-weight: 800; color: #1e293b;">${peds.heartRate || '--'} <small style="font-size: 8px; font-weight: 600;">BPM</small></span>
                                </div>
                                <div>
                                    <span style="font-size: 8px; color: #9f1239; font-weight: 800; text-transform: uppercase; display: block;">Resp. Rate</span>
                                    <span style="font-size: 13px; font-weight: 800; color: #1e293b;">${peds.respRate || '--'} <small style="font-size: 8px; font-weight: 600;">min</small></span>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-top: 1px dashed #fecdd3; padding-top: 12px; margin-bottom: 12px;">
                                <div>
                                    <div style="font-size: 8px; font-weight: 800; color: #be123c; text-transform: uppercase; margin-bottom: 5px;">Development & Growth</div>
                                    <div style="font-size: 11px; font-weight: 700; color: #334155;">Milestones: <span style="color: #e11d48;">${peds.milestones || 'Appropriate'}</span></div>
                                    <div style="font-size: 11px; font-weight: 700; color: #334155;">Weight-for-Age: <span style="color: #e11d48;">${growth.weightForAge || 'Normal'}</span></div>
                                </div>
                                <div>
                                    <div style="font-size: 8px; font-weight: 800; color: #be123c; text-transform: uppercase; margin-bottom: 5px;">Immunization Status</div>
                                    <div style="font-size: 11px; font-weight: 800; color: #0f172a;">${peds.immunizationStatus || 'Up-to-Date'}</div>
                                    ${peds.dueVaccines?.length ? `<div style="font-size: 9px; font-weight: 600; color: #e11d48; margin-top: 2px;">Due: ${peds.dueVaccines.join(', ')}</div>` : ''}
                                </div>
                            </div>

                            ${peds.symptoms?.length ? `
                            <div style="margin-bottom: 12px;">
                                <span style="font-size: 8px; color: #9f1239; font-weight: 800; text-transform: uppercase;">Presenting Symptoms: </span>
                                <span style="font-size: 11px; font-weight: 700; color: #1e293b;">${peds.symptoms.join(', ')}</span>
                            </div>` : ''}

                            ${peds.redFlags?.length ? `
                            <div style="margin-top: 12px; background: #fff; border: 1.5px solid #fda4af; padding: 8px 12px; border-radius: 8px;">
                                <span style="font-size: 8px; font-weight: 900; color: #e11d48; text-transform: uppercase; display: block;">Critical Attention Required</span>
                                <div style="font-size: 11px; font-weight: 800; color: #be123c; margin-top: 2px;">Red Flags: ${peds.redFlags.join(', ')}</div>
                            </div>
                            ` : ''}
                        </div>
                        `;
                        })() : ''}

                        ${(activeSpecialty.toUpperCase().includes('GYNAE') || activeSpecialty.toUpperCase().includes('GYNE') || activeSpecialty.toUpperCase().includes('OBST')) && formData.gynaecData && formData.gynaecData.lmp ? (() => {
                            const gyn = formData.gynaecData;
                            const obs = gyn.obstetric || {};
                            const gpla = `G${obs.gravida ?? 0} P${obs.para ?? 0} L${obs.living ?? 0} A${obs.abortions ?? 0}`;
                            const vitals = gyn.vitals || {};
                            const obsEx = gyn.obstetricExam || {};
                            const gynEx = gyn.gynExam || {};
                            const syms = gyn.symptoms || [];
                            const invs = gyn.investigations || [];
                            const fhr = parseInt(obsEx.fetalHeartRate);
                            const fhrStatus = fhr ? (fhr < 110 ? '🚨 Bradycardia' : fhr > 160 ? '⚠️ Tachycardia' : '✓ Normal') : '';
                            return `
                        <div style="margin-bottom: 25px; padding: 18px; border: 2px solid #fce7f3; border-radius: 16px; background: #fdf2f8; page-break-inside: avoid;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f9a8d4; margin-bottom: 14px; padding-bottom: 8px;">
                                <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #9d174d; letter-spacing: 1px;">Gynecology / Obstetric Assessment</span>
                                <span style="font-size: 11px; font-weight: 900; color: #db2777; background: #fce7f3; padding: 4px 10px; border-radius: 6px;">${gyn.pregnant === 'Yes' ? `Pregnant — ${gyn.gestationalAge ? gyn.gestationalAge + ' wks' : 'Age N/A'}` : 'Pregnancy: ' + gyn.pregnant}</span>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 12px;">
                                <div>
                                    <span style="font-size: 8px; color: #9d174d; font-weight: 800; text-transform: uppercase; display: block;">LMP</span>
                                    <span style="font-size: 12px; font-weight: 800; color: #1e293b;">${gyn.lmp ? new Date(gyn.lmp).toLocaleDateString('en-GB') : 'N/A'}</span>
                                </div>
                                <div>
                                    <span style="font-size: 8px; color: #9d174d; font-weight: 800; text-transform: uppercase; display: block;">Cycle</span>
                                    <span style="font-size: 12px; font-weight: 800; color: #1e293b;">${gyn.cycleRegularity || 'N/A'} ${gyn.cycleLength ? '/ ' + gyn.cycleLength + ' days' : ''}</span>
                                </div>
                                <div>
                                    <span style="font-size: 8px; color: #9d174d; font-weight: 800; text-transform: uppercase; display: block;">Obstetric History</span>
                                    <span style="font-size: 13px; font-weight: 900; color: #9d174d;">${gpla}</span>
                                </div>
                            </div>

                            ${gyn.pregnant === 'Yes' ? `
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 12px; background: #fff; border-radius: 10px; padding: 10px;">
                                <div>
                                    <span style="font-size: 8px; color: #6b21a8; font-weight: 800; text-transform: uppercase; display: block;">EDD</span>
                                    <span style="font-size: 12px; font-weight: 800; color: #1e293b;">${gyn.edd ? new Date(gyn.edd).toLocaleDateString('en-GB') : 'N/A'}</span>
                                </div>
                                ${obsEx.fetalPosition ? `
                                <div>
                                    <span style="font-size: 8px; color: #6b21a8; font-weight: 800; text-transform: uppercase; display: block;">Fetal Position</span>
                                    <span style="font-size: 12px; font-weight: 800; color: #1e293b;">${obsEx.fetalPosition}</span>
                                </div>` : ''}
                                ${obsEx.fetalHeartRate ? `
                                <div>
                                    <span style="font-size: 8px; color: #6b21a8; font-weight: 800; text-transform: uppercase; display: block;">FHR</span>
                                    <span style="font-size: 12px; font-weight: 800; color: ${fhr < 110 ? '#dc2626' : fhr > 160 ? '#d97706' : '#16a34a'};">${obsEx.fetalHeartRate} bpm ${fhrStatus}</span>
                                </div>` : ''}
                            </div>` : ''}

                            ${vitals.bp || vitals.pulse || vitals.weight ? `
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
                                ${vitals.bp ? `<div><span style="font-size: 8px; color: #9d174d; font-weight: 800; display: block;">BP</span><span style="font-size: 12px; font-weight: 800;">${vitals.bp}</span></div>` : ''}
                                ${vitals.pulse ? `<div><span style="font-size: 8px; color: #9d174d; font-weight: 800; display: block;">Pulse</span><span style="font-size: 12px; font-weight: 800;">${vitals.pulse} bpm</span></div>` : ''}
                                ${vitals.weight ? `<div><span style="font-size: 8px; color: #9d174d; font-weight: 800; display: block;">Weight</span><span style="font-size: 12px; font-weight: 800;">${vitals.weight} kg</span></div>` : ''}
                                ${vitals.temperature ? `<div><span style="font-size: 8px; color: #9d174d; font-weight: 800; display: block;">Temp</span><span style="font-size: 12px; font-weight: 800;">${vitals.temperature}°F</span></div>` : ''}
                            </div>` : ''}

                            ${syms.length ? `<div style="margin-bottom: 8px;"><span style="font-size: 8px; color: #9d174d; font-weight: 800; text-transform: uppercase;">Symptoms: </span><span style="font-size: 11px; font-weight: 700; color: #1e293b;">${syms.join(', ')}</span></div>` : ''}
                            ${(gynEx.cervix || gynEx.discharge || gynEx.tenderness) ? `<div style="margin-bottom: 8px;"><span style="font-size: 8px; color: #9d174d; font-weight: 800; text-transform: uppercase;">P/V Exam: </span><span style="font-size: 11px; font-weight: 700; color: #1e293b;">${[gynEx.cervix ? 'Cervix: ' + gynEx.cervix : '', gynEx.discharge ? 'Discharge: ' + gynEx.discharge : '', gynEx.tenderness ? 'Tenderness: ' + gynEx.tenderness : ''].filter(Boolean).join(' | ')}</span></div>` : ''}
                            ${invs.length ? `<div><span style="font-size: 8px; color: #9d174d; font-weight: 800; text-transform: uppercase;">Investigations: </span><span style="font-size: 11px; font-weight: 700; color: #1e293b;">${invs.join(', ')}</span></div>` : ''}
                        </div>`;
                        })() : ''}

                        ${(activeSpecialty.toUpperCase().includes('NEURO')) && formData.neuroData && (formData.neuroData.symptoms || []).length > 0 ? (() => {
                            const neuro = formData.neuroData;
                            const gcsE = parseInt(neuro.gcs?.eye) || 0;
                            const gcsV = parseInt(neuro.gcs?.verbal) || 0;
                            const gcsM = parseInt(neuro.gcs?.motor) || 0;
                            const gcsTotal = gcsE + gcsV + gcsM;
                            const gcsValid = gcsE >= 1 && gcsV >= 1 && gcsM >= 1;
                            const gcsLabel = gcsValid ? (gcsTotal >= 13 ? 'Mild' : gcsTotal >= 9 ? 'Moderate' : 'SEVERE COMA') : '';
                            const gcsColor = gcsValid ? (gcsTotal >= 13 ? '#16a34a' : gcsTotal >= 9 ? '#d97706' : '#dc2626') : '#64748b';
                            const mp = neuro.motorPower || {};
                            const rightWeak = (!isNaN(parseInt(mp.ru)) && parseInt(mp.ru) < 5) || (!isNaN(parseInt(mp.rl)) && parseInt(mp.rl) < 5);
                            const leftWeak  = (!isNaN(parseInt(mp.lu)) && parseInt(mp.lu) < 5) || (!isNaN(parseInt(mp.ll)) && parseInt(mp.ll) < 5);
                            const strokeSuspect = neuro.onset === 'Sudden' && (neuro.symptoms || []).includes('Weakness') && (neuro.symptoms || []).includes('Speech difficulty');
                            const comaAlert = gcsValid && gcsTotal <= 8;
                            return `
                        <div style="margin-bottom: 25px; padding: 18px; border: 2px solid #ede9fe; border-radius: 16px; background: #faf5ff; page-break-inside: avoid;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #ddd6fe; margin-bottom: 14px; padding-bottom: 8px;">
                                <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #6d28d9; letter-spacing: 1px;">Neurological Examination</span>
                                ${gcsValid ? `<span style="font-size: 12px; font-weight: 900; color: ${gcsColor}; background: #ede9fe; padding: 4px 12px; border-radius: 6px;">GCS: ${gcsTotal} (E${gcsE} V${gcsV} M${gcsM}) — ${gcsLabel}</span>` : ''}
                            </div>

                            ${(strokeSuspect || comaAlert) ? `
                            <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 8px 14px; margin-bottom: 12px;">
                                <span style="font-size: 10px; font-weight: 900; color: #991b1b; text-transform: uppercase;">
                                    🚨 ${strokeSuspect ? 'Suspected Stroke — Immediate CT Brain Required' : ''}${strokeSuspect && comaAlert ? ' | ' : ''}${comaAlert ? 'Airway Protection Required' : ''}
                                </span>
                            </div>` : ''}

                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 12px;">
                                <div>
                                    <span style="font-size: 8px; color: #7c3aed; font-weight: 800; text-transform: uppercase; display: block;">Mental Status</span>
                                    <span style="font-size: 13px; font-weight: 800; color: #1e293b;">${neuro.mentalStatus || 'N/A'}</span>
                                </div>
                                <div>
                                    <span style="font-size: 8px; color: #7c3aed; font-weight: 800; text-transform: uppercase; display: block;">Reflexes</span>
                                    <span style="font-size: 13px; font-weight: 800; color: #1e293b;">${neuro.reflexes || 'N/A'}</span>
                                </div>
                            </div>

                            <div style="margin-bottom: 12px;">
                                <span style="font-size: 8px; color: #7c3aed; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 6px;">Motor Power (0–5 per limb)</span>
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                                    <div style="text-align:center; background:#fff; padding:8px; border-radius:8px; border:1px solid #ddd6fe;">
                                        <span style="font-size:8px; color:#7c3aed; font-weight:800; display:block;">Right Upper</span>
                                        <span style="font-size:18px; font-weight:900; color:${parseInt(mp.ru) < 5 ? '#dc2626' : '#16a34a'};">${mp.ru !== '' && mp.ru !== undefined ? mp.ru + '/5' : 'N/A'}</span>
                                    </div>
                                    <div style="text-align:center; background:#fff; padding:8px; border-radius:8px; border:1px solid #ddd6fe;">
                                        <span style="font-size:8px; color:#7c3aed; font-weight:800; display:block;">Left Upper</span>
                                        <span style="font-size:18px; font-weight:900; color:${parseInt(mp.lu) < 5 ? '#dc2626' : '#16a34a'};">${mp.lu !== '' && mp.lu !== undefined ? mp.lu + '/5' : 'N/A'}</span>
                                    </div>
                                    <div style="text-align:center; background:#fff; padding:8px; border-radius:8px; border:1px solid #ddd6fe;">
                                        <span style="font-size:8px; color:#7c3aed; font-weight:800; display:block;">Right Lower</span>
                                        <span style="font-size:18px; font-weight:900; color:${parseInt(mp.rl) < 5 ? '#dc2626' : '#16a34a'};">${mp.rl !== '' && mp.rl !== undefined ? mp.rl + '/5' : 'N/A'}</span>
                                    </div>
                                    <div style="text-align:center; background:#fff; padding:8px; border-radius:8px; border:1px solid #ddd6fe;">
                                        <span style="font-size:8px; color:#7c3aed; font-weight:800; display:block;">Left Lower</span>
                                        <span style="font-size:18px; font-weight:900; color:${parseInt(mp.ll) < 5 ? '#dc2626' : '#16a34a'};">${mp.ll !== '' && mp.ll !== undefined ? mp.ll + '/5' : 'N/A'}</span>
                                    </div>
                                </div>
                                ${rightWeak && !leftWeak ? '<p style="font-size:10px; font-weight:800; color:#dc2626; margin-top:6px;">→ Right-sided weakness — Possible left hemisphere lesion</p>' : leftWeak && !rightWeak ? '<p style="font-size:10px; font-weight:800; color:#dc2626; margin-top:6px;">→ Left-sided weakness — Possible right hemisphere lesion</p>' : ''}
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;">
                                ${neuro.sensory ? `<div><span style="font-size:8px; color:#7c3aed; font-weight:800; text-transform:uppercase; display:block;">Sensory</span><span style="font-size:12px; font-weight:800;">${neuro.sensory}</span></div>` : ''}
                                ${neuro.coordination ? `<div><span style="font-size:8px; color:#7c3aed; font-weight:800; text-transform:uppercase; display:block;">Coordination</span><span style="font-size:12px; font-weight:800;">${neuro.coordination}</span></div>` : ''}
                                ${neuro.onset ? `<div><span style="font-size:8px; color:#7c3aed; font-weight:800; text-transform:uppercase; display:block;">Onset</span><span style="font-size:12px; font-weight:800; color:${neuro.onset === 'Sudden' ? '#dc2626' : '#1e293b'};">${neuro.onset}</span></div>` : ''}
                            </div>

                            ${neuro.cranialNerves ? `<div style="margin-bottom:8px;"><span style="font-size:8px; color:#7c3aed; font-weight:800; text-transform:uppercase;">Cranial Nerves: </span><span style="font-size:11px; font-weight:700;">${neuro.cranialNerves}${neuro.cranialNerves === 'Abnormal' && (neuro.cranialNerveDeficits || []).length > 0 ? ' — ' + neuro.cranialNerveDeficits.join(', ') : ''}</span></div>` : ''}
                            ${(neuro.symptoms || []).length > 0 ? `<div><span style="font-size:8px; color:#7c3aed; font-weight:800; text-transform:uppercase;">Symptoms: </span><span style="font-size:11px; font-weight:700;">${neuro.symptoms.join(', ')}</span></div>` : ''}

                            ${strokeSuspect ? `
                            <div style="margin-top:10px; border-top:1px dashed #ddd6fe; padding-top:8px;">
                                <span style="font-size:9px; font-weight:900; color:#7c3aed; text-transform:uppercase;">Clinical Assessment:</span>
                                <p style="font-size:11px; font-weight:800; color:#dc2626; margin-top:2px;">Possible Stroke — Urgent CT Brain, Thrombolysis evaluation within window period</p>
                            </div>` : ''}
                            ${(neuro.symptoms || []).includes('Seizures') ? `
                            <div style="margin-top:6px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:6px 10px;">
                                <span style="font-size:9px; font-weight:900; color:#b45309;">⚠️ Pharma Note: Ensure compliance with anti-epileptic drugs (AEDs)</span>
                            </div>` : ''}
                        </div>`;
                        })() : ''}

                        ${(activeSpecialty.toUpperCase().includes('NEPHRO')) && formData.nephroData && formData.nephroData.creatinine ? (() => {
                            const n = formData.nephroData;
                            const creat   = parseFloat(n.creatinine) || 0;
                            const egfr    = parseFloat(n.egfr) || 0;
                            const k       = parseFloat(n.electrolytes?.potassium) || 0;
                            const uo      = parseFloat(n.urineOutput) || 0;
                            const intake  = parseFloat(n.fluidBalance?.intake) || 0;
                            const outfl   = parseFloat(n.fluidBalance?.output) || 0;
                            const ckdStage = n.ckdStage || (egfr >= 90 ? 'Stage 1' : egfr >= 60 ? 'Stage 2' : egfr >= 30 ? 'Stage 3' : egfr >= 15 ? 'Stage 4' : egfr > 0 ? 'Stage 5' : '');
                            const assessments: string[] = [];
                            if (creat > 5)              assessments.push('Severe Renal Failure');
                            else if (creat > 1.5)       assessments.push('Renal Impairment');
                            if (egfr > 0 && egfr < 15)        assessments.push('ESRD — Dialysis evaluation required');
                            else if (egfr > 0 && egfr < 60)   assessments.push(`CKD ${ckdStage}`);
                            if (k > 6)                  assessments.push('⚠️ EMERGENCY — Hyperkalemia (K+ > 6.0)');
                            else if (k > 5.5)           assessments.push('Hyperkalemia — Avoid K+ sparing drugs');
                            if (uo > 0 && uo < 100)     assessments.push('Anuria (<100 ml/day)');
                            else if (uo > 0 && uo < 400)assessments.push('Oliguria (<400 ml/day)');
                            if (intake > 0 && outfl > 0 && intake > outfl * 1.25) assessments.push('Fluid Overload');
                            if ((n.symptoms || []).includes('Confusion') && creat > 1.5) assessments.push('Uremic Encephalopathy — CRITICAL');
                            return `
                        <div style="margin-bottom:25px;padding:18px;border:2px solid #e0e7ff;border-radius:16px;background:#f5f7ff;page-break-inside:avoid;">
                            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #c7d2fe;margin-bottom:14px;padding-bottom:8px;">
                                <span style="font-size:10px;font-weight:900;text-transform:uppercase;color:#3730a3;letter-spacing:1px;">Renal Evaluation</span>
                                ${ckdStage ? `<span style="font-size:11px;font-weight:900;color:#4f46e5;background:#e0e7ff;padding:4px 12px;border-radius:6px;">CKD ${ckdStage}</span>` : ''}
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:12px;">
                                <div>
                                    <span style="font-size:8px;color:#3730a3;font-weight:800;text-transform:uppercase;display:block;">Creatinine</span>
                                    <span style="font-size:14px;font-weight:800;color:${creat > 5 ? '#dc2626' : creat > 1.5 ? '#d97706' : '#16a34a'};">${n.creatinine} <small style="font-size:9px;font-weight:600;color:#64748b;">mg/dL</small></span>
                                </div>
                                <div>
                                    <span style="font-size:8px;color:#3730a3;font-weight:800;text-transform:uppercase;display:block;">Blood Urea</span>
                                    <span style="font-size:14px;font-weight:800;color:#1e293b;">${n.urea || '--'} <small style="font-size:9px;font-weight:600;color:#64748b;">mg/dL</small></span>
                                </div>
                                <div>
                                    <span style="font-size:8px;color:#3730a3;font-weight:800;text-transform:uppercase;display:block;">eGFR</span>
                                    <span style="font-size:14px;font-weight:800;color:${egfr < 15 && egfr > 0 ? '#dc2626' : egfr < 60 && egfr > 0 ? '#d97706' : '#16a34a'};">${n.egfr} <small style="font-size:9px;font-weight:600;color:#64748b;">ml/min</small></span>
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:10px;">
                                <div>
                                    <span style="font-size:8px;color:#3730a3;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Electrolytes</span>
                                    <span style="font-size:11px;font-weight:700;color:#1e293b;">
                                        ${n.electrolytes?.sodium      ? `Na+: ${n.electrolytes.sodium} &nbsp;` : ''}
                                        ${n.electrolytes?.potassium   ? `K+: <span style="color:${k > 6 ? '#dc2626' : k > 5.5 ? '#d97706' : '#1e293b'};font-weight:900;">${n.electrolytes.potassium} mEq/L</span> &nbsp;` : ''}
                                        ${n.electrolytes?.bicarbonate ? `HCO3: ${n.electrolytes.bicarbonate} mEq/L` : ''}
                                    </span>
                                    ${k > 5.5 ? `<div style="font-size:9px;font-weight:900;color:#dc2626;margin-top:2px;">${k > 6 ? '🚨 EMERGENCY — Cardiac arrest risk' : '⚠️ Hyperkalemia — Avoid K+ sparing drugs'}</div>` : ''}
                                </div>
                                <div>
                                    <span style="font-size:8px;color:#3730a3;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Fluid Status</span>
                                    <div style="font-size:11px;font-weight:800;color:${uo > 0 && uo < 100 ? '#dc2626' : uo > 0 && uo < 400 ? '#d97706' : '#1e293b'};">Urine: ${n.urineOutput} ml/24h ${uo > 0 && uo < 100 ? '(ANURIA)' : uo > 0 && uo < 400 ? '(Oliguria)' : ''}</div>
                                    ${intake > 0 && outfl > 0 ? `<div style="font-size:10px;font-weight:700;color:#64748b;">In: ${n.fluidBalance?.intake} ml | Out: ${n.fluidBalance?.output} ml</div>` : ''}
                                </div>
                            </div>
                            ${(n.urineAnalysis?.protein && n.urineAnalysis.protein !== 'Nil') || n.urineAnalysis?.sugar === 'Present' || n.urineAnalysis?.rbc === 'Present' ? `
                            <div style="margin-bottom:8px;">
                                <span style="font-size:8px;color:#3730a3;font-weight:800;text-transform:uppercase;">Urine Analysis: </span>
                                <span style="font-size:11px;font-weight:700;color:#1e293b;">Protein: ${n.urineAnalysis?.protein || 'Nil'} | Sugar: ${n.urineAnalysis?.sugar || 'Nil'} | RBC: ${n.urineAnalysis?.rbc || 'Nil'}</span>
                            </div>` : ''}
                            ${n.dialysis?.status && n.dialysis.status !== 'Not on dialysis' ? `
                            <div style="margin-bottom:8px;">
                                <span style="font-size:8px;color:#3730a3;font-weight:800;text-transform:uppercase;">Dialysis: </span>
                                <span style="font-size:11px;font-weight:800;color:#4f46e5;">${n.dialysis.status}${n.dialysis.frequency ? ' | Freq: ' + n.dialysis.frequency : ''}${n.dialysis.access ? ' | Access: ' + n.dialysis.access : ''}</span>
                            </div>` : ''}
                            ${assessments.length > 0 ? `
                            <div style="background:#fff;border:1.5px solid #c7d2fe;border-radius:10px;padding:10px 14px;margin-top:8px;">
                                <span style="font-size:8px;font-weight:900;color:#3730a3;text-transform:uppercase;display:block;margin-bottom:5px;">Assessment</span>
                                ${assessments.map(a => `<div style="font-size:11px;font-weight:800;color:${a.includes('EMERGENCY') || a.includes('CRITICAL') || a.includes('Anuria') ? '#dc2626' : a.includes('Failure') || a.includes('ESRD') || a.includes('Oliguria') ? '#d97706' : '#334155'};margin-bottom:2px;">&rarr; ${a}</div>`).join('')}
                            </div>` : ''}
                            ${creat > 1.5 || (egfr > 0 && egfr < 60) ? `
                            <div style="margin-top:8px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
                                <span style="font-size:9px;font-weight:900;color:#b45309;">Pharma Note: </span>
                                <span style="font-size:10px;font-weight:700;color:#92400e;">Dose adjustment required.${creat > 1.5 ? ' Avoid NSAIDs &amp; nephrotoxic agents.' : ''}${k > 5.5 ? ' AVOID K+ sparing drugs.' : ''}</span>
                            </div>` : ''}
                        </div>`;
                        })() : ''}

                        ${(formData.urologyData && (formData.urologyData.ipss?.score || formData.urologyData.renal?.creatinine || formData.urologyData.diagnosis)) ? (() => {
                            const u = formData.urologyData;
                            const ipss = parseInt(u.ipss?.score) || 0;
                            const creat = parseFloat(u.renal?.creatinine) || 0;
                            const pvr = parseFloat(u.pvr) || 0;
                            const stone = u.stone || {};
                            const pros = u.prostate || {};
                            
                            const cat = ipss <= 7 ? 'Mild' : ipss <= 19 ? 'Moderate' : 'Severe';
                            const assessments: string[] = [];
                            if (ipss > 19) assessments.push('Severe LUTS symptomatic');
                            if (creat > 1.5) assessments.push('Renal Impairment noted');
                            if (pvr > 100) assessments.push('Urinary Retention / Obstructed Flow');
                            if ((parseInt(u.urine?.rbc) || 0) > 0 || (u.symptoms || []).includes('Hematuria')) assessments.push('Hematuria — Evaluation required');

                            return `
                        <div style="margin-bottom:25px;padding:18px;border:2px solid #e0f2fe;border-radius:16px;background:#f0f9ff;page-break-inside:avoid;">
                            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #bae6fd;margin-bottom:14px;padding-bottom:8px;">
                                <span style="font-size:10px;font-weight:900;text-transform:uppercase;color:#0369a1;letter-spacing:1px;">Urology Evaluation</span>
                                <span style="font-size:11px;font-weight:900;color:#0369a1;background:#e0f2fe;padding:4px 12px;border-radius:6px;">IPSS: ${ipss} (${cat})</span>
                            </div>

                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:12px;">
                                <div>
                                    <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;">Creatinine</span>
                                    <span style="font-size:14px;font-weight:800;color:${creat > 1.5 ? '#dc2626' : '#16a34a'};">${u.renal?.creatinine || '--'} <small style="font-size:8px;">mg/dL</small></span>
                                </div>
                                <div>
                                    <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;">PVR Volume</span>
                                    <span style="font-size:14px;font-weight:800;color:${pvr > 100 ? '#dc2626' : '#1e293b'};">${u.pvr || '--'} <small style="font-size:8px;">ml</small></span>
                                </div>
                                <div>
                                    <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;">Urea</span>
                                    <span style="font-size:14px;font-weight:800;color:#1e293b;">${u.renal?.urea || '--'}</span>
                                </div>
                            </div>

                            <div style="margin-bottom:10px;">
                                <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Clinical Symptoms (LUTS)</span>
                                <div style="font-size:10px;font-weight:700;color:#334155;">${(u.symptoms || []).join(' • ') || 'No symptoms reported'}</div>
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:10px;">
                                <div>
                                    <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Prostate Findings</span>
                                    <div style="font-size:10px;font-weight:700;color:#334155;">
                                        Size: ${pros.size || 'Normal'} | ${pros.consistency || 'Normal'} ${pros.nodules ? '| Nodules Present' : ''}
                                    </div>
                                </div>
                                <div>
                                    <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Urine Analysis</span>
                                    <div style="font-size:10px;font-weight:700;color:#334155;">
                                        Pus: ${u.urine?.pusCells || '0'} | RBC: ${u.urine?.rbc || '0'} | Pro: ${u.urine?.protein || 'Nil'} ${u.urine?.nitrite ? '| Nitrite+' : ''}
                                    </div>
                                </div>
                            </div>

                            ${stone.size ? `
                            <div style="margin-bottom:10px;background:#fff;padding:8px;border-radius:10px;border:1px dashed #bae6fd;">
                                <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;">Calculus Details: </span>
                                <span style="font-size:11px;font-weight:800;color:#1e293b;">${stone.size}mm at ${stone.location}</span>
                            </div>` : ''}

                            ${assessments.length > 0 ? `
                            <div style="background:#fff;border:1.5px solid #bae6fd;border-radius:10px;padding:10px 14px;margin-top:10px;">
                                <span style="font-size:8px;font-weight:900;color:#0369a1;text-transform:uppercase;display:block;margin-bottom:5px;">Urological Impressions</span>
                                ${assessments.map(a => `<div style="font-size:10px;font-weight:800;color:${a.includes('Hematuria') || a.includes('Severe') ? '#dc2626' : '#334155'};margin-bottom:2px;">&rarr; ${a}</div>`).join('')}
                            </div>` : ''}

                            ${u.diagnosis ? `
                            <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #bae6fd;">
                                <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;">Assessment: </span>
                                <span style="font-size:11px;font-weight:900;color:#0369a1;">${u.diagnosis}</span>
                            </div>` : ''}
                        </div>`;
                        })() : ''}

                        ${activeSpecialty.toUpperCase().includes('RADIO') && formData.radiologyOrder ? (() => {
                            const r = formData.radiologyOrder;
                            const isHighCreat = (parseFloat(r.contrast?.creatinine) || 0) > 1.5;
                            
                            return `
                        <div style="margin-bottom:25px;padding:20px;border:2px solid #e0e7ff;border-radius:20px;background:#f8faff;page-break-inside:avoid;">
                            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #c7d2fe;margin-bottom:15px;padding-bottom:10px;">
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <span style="font-size:11px;font-weight:900;text-transform:uppercase;color:#4338ca;letter-spacing:1.5px;">Radiology Requisition</span>
                                </div>
                                <span style="font-size:10px;font-weight:900;color:${r.priority === 'Emergency' ? '#dc2626' : '#4338ca'};background:${r.priority === 'Emergency' ? '#fef2f2' : '#e0e7ff'};padding:5px 15px;border-radius:8px;border:1px solid ${r.priority === 'Emergency' ? '#fecaca' : '#c7d2fe'};">
                                    ${r.priority.toUpperCase()}
                                </span>
                            </div>

                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:15px;">
                                <div>
                                    <span style="font-size:8px;color:#6366f1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Modality & Body Part</span>
                                    <span style="font-size:15px;font-weight:900;color:#1e1b4b;">${r.modality} ${r.bodyPart}</span>
                                    <div style="font-size:10px;font-weight:700;color:#4338ca;margin-top:2px;">Protocol: ${r.protocol || 'Standard'}</div>
                                </div>
                                <div style="text-align:right;">
                                    <span style="font-size:8px;color:#6366f1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Safety Status</span>
                                    <div style="display:flex;justify-content:flex-end;gap:5px;">
                                        ${r.safety?.pregnancy ? '<span style="font-size:8px;font-weight:900;background:#fef2f2;color:#dc2626;padding:2px 6px;border-radius:4px;border:1px solid #fecaca;">PREGNANT</span>' : ''}
                                        ${r.safety?.implants ? '<span style="font-size:8px;font-weight:900;background:#fef2f2;color:#dc2626;padding:2px 6px;border-radius:4px;border:1px solid #fecaca;">IMPLANTS+</span>' : ''}
                                        ${!r.safety?.pregnancy && !r.safety?.implants ? '<span style="font-size:8px;font-weight:900;background:#f0fdf4;color:#16a34a;padding:2px 6px;border-radius:4px;border:1px solid #bbf7d0;">SAFETY CLEARED</span>' : ''}
                                    </div>
                                </div>
                            </div>

                            <div style="margin-bottom:15px;padding:12px;background:#fff;border-radius:12px;border:1.5px solid #e0e7ff;">
                                <span style="font-size:8px;color:#6366f1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:6px;">Clinical Indication</span>
                                <div style="font-size:11px;font-weight:700;color:#1e293b;line-height:1.4;">${r.clinicalIndication || 'No clinical justification provided.'}</div>
                            </div>

                            ${r.contrast?.requested ? `
                            <div style="padding:15px;background:#fff;border-radius:15px;border:1.5px solid #fde68a;margin-bottom:12px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                    <span style="font-size:9px;font-weight:900;color:#92400e;text-transform:uppercase;">Contrast Study Information</span>
                                    <span style="font-size:10px;font-weight:900;color:${isHighCreat ? '#dc2626' : '#16a34a'};">Creatinine: ${r.contrast.creatinine || 'N/A'} mg/dL</span>
                                </div>
                                <div style="font-size:10px;font-weight:700;color:#92400e;">
                                    Type: ${r.contrast.type || 'Standard'} ${r.contrast.allergy ? ' | <span style="color:#dc2626;">ALLERGY HISTORY+</span>' : ''}
                                </div>
                            </div>` : ''}

                            ${r.notes ? `
                            <div style="font-size:10px;font-style:italic;color:#64748b;padding-top:10px;border-top:1px dashed #c7d2fe;">
                                <strong>Notes:</strong> ${r.notes}
                            </div>` : ''}
                        </div>`;
                        })() : ''}

                        ${(activeSpecialty.toUpperCase().includes('OPHTHAL') || activeSpecialty.toUpperCase().includes('EYE')) ? (() => {
                            const o = formData.ophthaData || {
                                chiefComplaints: '',
                                hopi: '',
                                pastHistory: '',
                                familyHistory: '',
                                vision: { od: { unaided: '', corrected: '' }, os: { unaided: '', corrected: '' } },
                                refraction: {
                                    od: { distant: { sph: '', cyl: '', axis: '', va: '' }, near: { sph: '', cyl: '', axis: '', va: '' } },
                                    os: { distant: { sph: '', cyl: '', axis: '', va: '' }, near: { sph: '', cyl: '', axis: '', va: '' } }
                                },
                                iop: { od: '', os: '' },
                                pupils: '',
                                symptoms: [],
                                slitLamp: { conjunctiva: {re:'',le:'',notes:''}, cornea: {re:'',le:'',notes:''}, anteriorChamber: {re:'',le:'',notes:''}, lens: {re:'',le:'',notes:''} },
                                fundus: { retina: {re:'',le:'',notes:''}, opticDisc: {re:'',le:'',notes:''}, macula: {re:'',le:'',notes:''} },
                                diagnosis: '',
                                notes: '',
                            };
                            const iopOD = parseFloat(o.iop?.od) || 0;
                            const iopOS = parseFloat(o.iop?.os) || 0;
                            const maxIOP = Math.max(iopOD, iopOS);
                            const assessments: string[] = [];
                            
                            // Visual acuity severity logic for print
                            const getSev = (v: string) => {
                                if (['HM','PL+','NPL','6/60','6/36'].includes(v)) return 'Reduced';
                                if (v === '6/6') return 'Normal';
                                return '';
                            };
                            
                            if (o.symptoms?.includes('Sudden Vision Loss')) assessments.push('EMERGENCY: Sudden Vision Loss — Urgent Review');
                            if (maxIOP > 30) assessments.push('CRITICAL: Extremely High IOP — Glaucoma Emergency');
                            else if (maxIOP > 21) assessments.push('High Intraocular Pressure — Glaucoma Suspect');
                            
                            const isMatch = (field: any, val: string) => typeof field === 'string' ? field.includes(val) : (field?.re?.includes(val) || field?.le?.includes(val));
                            const getExactMatch = (field: any, val: string) => typeof field === 'string' ? field === val : (field?.re === val || field?.le === val);

                            if (getExactMatch(o.slitLamp?.cornea, 'Ulcer')) assessments.push('Active Corneal Ulcer — Urgent Treatment');
                            if (getExactMatch(o.fundus?.retina, 'Detachment')) assessments.push('Retinal Detachment — Surgical Emergency');
                            if (getExactMatch(o.fundus?.opticDisc, 'Cupping increased')) assessments.push('Increased C/D Ratio — Glaucomatous Disc');
                            if (isMatch(o.slitLamp?.lens, 'Cataract')) assessments.push(getExactMatch(o.slitLamp?.lens, 'Mature cataract') ? 'Mature Cataract — Surgical Evaluation' : 'Cataract detected');
                            
                            const printEyeRow = (label: string, data: any) => {
                                if (!data || (typeof data === 'object' && !data.re && !data.le && !data.notes) || (typeof data === 'string' && !data)) return '';
                                let re = typeof data === 'object' ? data.re : data;
                                let le = typeof data === 'object' ? data.le : data;
                                let notes = typeof data === 'object' ? data.notes : '';
                                if (!re && !le && !notes) return '';
                                return `
                                <tr style="border-bottom: 1px solid #000;">
                                    <td style="border-right: 1px solid #000; padding: 4px; font-weight:bold; background:#f1f5f9; text-align:center;">${label}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${re || '--'}</td>
                                    <td style="padding: 4px;">${le || '--'} ${notes ? `<br/><span style="font-size:7px;color:#666;">${notes}</span>` : ''}</td>
                                </tr>`;
                            };

                            return `
                        <div style="margin-bottom:15px; page-break-inside:avoid; font-family: sans-serif; color: #000;">
                            ${(o.chiefComplaints || o.hopi || o.pastHistory || o.familyHistory) ? `
                            <div style="font-size:10px; margin-bottom: 10px; line-height: 1.4;">
                                ${(o.chiefComplaints || o.hopi) ? `<div><b>Complaints / HOPI:</b> ${[o.chiefComplaints, o.hopi].filter(Boolean).join(' | ')}</div>` : ''}
                                ${o.pastHistory ? `<div><b>Past History:</b> ${o.pastHistory}</div>` : ''}
                                ${o.familyHistory ? `<div><b>Family History:</b> ${o.familyHistory}</div>` : ''}
                            </div>
                            ` : ''}

                            <!-- VISUAL ACUITY & REFRACTION TABLE -->
                            <div style="font-size:9px; font-weight:bold; margin-bottom: 2px;">Visual Acuity & Refraction</div>
                            <table style="width:100%; border-collapse:collapse; font-size:9px; text-align:center; margin-bottom:15px; border: 1px solid #000;">
                                <tr style="background:#e2e8f0; border-bottom: 1px solid #000;">
                                    <th style="border-right: 1px solid #000; padding: 4px;">Eye</th>
                                    <th style="border-right: 1px solid #000; padding: 4px;">Vision (Unaided)</th>
                                    <th style="border-right: 1px solid #000; padding: 4px;">Vision (Corrected)</th>
                                    <th style="border-right: 1px solid #000; padding: 4px;">Type</th>
                                    <th style="border-right: 1px solid #000; padding: 4px;">SPH</th>
                                    <th style="border-right: 1px solid #000; padding: 4px;">CYL</th>
                                    <th style="border-right: 1px solid #000; padding: 4px;">AXIS</th>
                                    <th style="padding: 4px;">VA</th>
                                </tr>
                                <tr style="border-bottom: 1px dotted #ccc;">
                                    <td rowspan="2" style="border-right: 1px solid #000; padding: 4px; font-weight:bold; background:#f1f5f9; border-bottom: 1px solid #000;">Right Eye (OD)</td>
                                    <td rowspan="2" style="border-right: 1px solid #000; padding: 4px; border-bottom: 1px solid #000;">${o.vision?.od?.unaided || '--'}</td>
                                    <td rowspan="2" style="border-right: 1px solid #000; padding: 4px; border-bottom: 1px solid #000;">${o.vision?.od?.corrected || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px; font-weight:bold; background:#f1f5f9;">DV</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.od?.distant?.sph || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.od?.distant?.cyl || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.od?.distant?.axis || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.od?.distant?.va || '--'}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #000;">
                                    <td style="border-right: 1px solid #000; padding: 4px; font-weight:bold; background:#f1f5f9;">NV</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.od?.near?.sph || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.od?.near?.cyl || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.od?.near?.axis || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.od?.near?.va || '--'}</td>
                                </tr>
                                <tr style="border-bottom: 1px dotted #ccc;">
                                    <td rowspan="2" style="border-right: 1px solid #000; padding: 4px; font-weight:bold; background:#f1f5f9;">Left Eye (OS)</td>
                                    <td rowspan="2" style="border-right: 1px solid #000; padding: 4px;">${o.vision?.os?.unaided || '--'}</td>
                                    <td rowspan="2" style="border-right: 1px solid #000; padding: 4px;">${o.vision?.os?.corrected || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px; font-weight:bold; background:#f1f5f9;">DV</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.os?.distant?.sph || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.os?.distant?.cyl || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.os?.distant?.axis || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.os?.distant?.va || '--'}</td>
                                </tr>
                                <tr>
                                    <td style="border-right: 1px solid #000; padding: 4px; font-weight:bold; background:#f1f5f9;">NV</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.os?.near?.sph || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.os?.near?.cyl || '--'}</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.refraction?.os?.near?.axis || '--'}</td>
                                    <td style="padding: 4px;">${o.refraction?.os?.near?.va || '--'}</td>
                                </tr>
                            </table>

                            <div style="font-size:9px; font-weight:bold; margin-bottom: 2px;">Examination</div>
                            <table style="width:100%; border-collapse:collapse; font-size:9px; text-align:center; margin-bottom:15px; border: 1px solid #000;">
                                <tr style="background:#e2e8f0; border-bottom: 1px solid #000;">
                                    <th style="border-right: 1px solid #000; padding: 4px; width:20%;"></th>
                                    <th style="border-right: 1px solid #000; padding: 4px; font-weight:bold; width:40%;">Right Eye</th>
                                    <th style="padding: 4px; font-weight:bold; width:40%;">Left Eye</th>
                                </tr>
                                ${printEyeRow('Conjunctiva', o.slitLamp?.conjunctiva)}
                                ${printEyeRow('Cornea', o.slitLamp?.cornea)}
                                ${printEyeRow('Anterior Chamber', o.slitLamp?.anteriorChamber)}
                                <tr style="border-bottom: 1px solid #000;">
                                    <td style="border-right: 1px solid #000; padding: 4px; font-weight:bold; background:#f1f5f9;">Pupil</td>
                                    <td colspan="2" style="padding: 4px;">${o.pupils || '--'}</td>
                                </tr>
                                ${printEyeRow('Lens', o.slitLamp?.lens)}
                                ${printEyeRow('Retina', o.fundus?.retina)}
                                ${printEyeRow('Optic Disc', o.fundus?.opticDisc)}
                                ${printEyeRow('Macula', o.fundus?.macula)}
                                <tr>
                                    <td style="border-right: 1px solid #000; padding: 4px; font-weight:bold; background:#f1f5f9;">IOP (mmHg)</td>
                                    <td style="border-right: 1px solid #000; padding: 4px;">${o.iop?.od || '--'}</td>
                                    <td style="padding: 4px;">${o.iop?.os || '--'}</td>
                                </tr>
                            </table>

                            ${o.diagnosis ? `<div style="font-size:10px; margin-bottom: 10px;"><b><u>Diagnosis:</u></b> <span style="text-transform:uppercase;">${o.diagnosis}</span></div>` : ''}
                            
                            ${assessments.length > 0 ? `
                            <div style="margin-bottom: 10px;">
                                ${assessments.map(a => `<div style="font-size:10px;font-weight:bold;color:${a.includes('EMERGENCY') || a.includes('CRITICAL') || a.includes('Urgent') ? '#000' : '#000'};margin-bottom:2px;">&#9888; ${a}</div>`).join('')}
                            </div>` : ''}

                            ${o.notes ? `
                            <div style="font-size:10px; margin-bottom: 10px;">
                                <b>Notes:</b> ${o.notes}
                            </div>` : ''}
                        </div>`;
                        })() : ''}


                        ${(activeSpecialty.toUpperCase().includes('ORTHO')) && formData.orthoData && formData.orthoData.joint ? (() => {
                            const o = formData.orthoData;
                            const pain = o.pain?.score || 0;
                            const motor = o.motorPower || 5;
                            const assessments: string[] = [];
                            
                            if (pain >= 8) assessments.push('SEVERE PAIN — Urgent analgesia titration');
                            if (o.exam?.deformity === 'Present') assessments.push('DEFORMITY DETECTED — Possible Fracture');
                            if (o.neurovascular?.pulse !== 'Normal') assessments.push('🚨 NEUROVASCULAR ALERT: Check distal distal circulation');
                            if (motor < 5) assessments.push(`Motor Deficit: Grade ${motor}/5`);
                            if (o.joint === 'Spine' && o.pain?.type === 'Radiating') assessments.push('Spinal Nerve Root Compression suspected');

                            return `
                        <div style="margin-bottom:25px;padding:18px;border:2px solid #ffedd5;border-radius:16px;background:#fffaf5;page-break-inside:avoid;">
                            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #fed7aa;margin-bottom:14px;padding-bottom:8px;">
                                <span style="font-size:10px;font-weight:900;text-transform:uppercase;color:#9a3412;letter-spacing:1px;">Orthopedic Examination</span>
                                <span style="font-size:11px;font-weight:900;color:#c2410c;background:#ffedd5;padding:4px 12px;border-radius:6px;">${o.side} ${o.joint}</span>
                            </div>

                            ${o.symptoms?.length ? `
                            <div style="margin-bottom: 12px;">
                                <span style="font-size: 8px; color: #9a3412; font-weight: 800; text-transform: uppercase;">Affected Area Symptoms: </span>
                                <span style="font-size: 11px; font-weight: 700; color: #1e293b;">${o.symptoms.join(', ')}</span>
                            </div>` : ''}
                            
                            <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:20px;margin-bottom:15px;">
                                <div style="background:#fff;padding:12px;border-radius:12px;border:1px solid #fed7aa;">
                                    <span style="font-size:8px;color:#9a3412;font-weight:800;text-transform:uppercase;display:block;margin-bottom:8px;">Clinical Presentation</span>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                        <div>
                                            <span style="font-size:8px;font-weight:700;color:#64748b;display:block;">Pain Score</span>
                                            <div style="font-size:16px;font-weight:900;color:${pain >= 8 ? '#dc2626' : pain >= 5 ? '#ea580c' : '#0f172a' };">${pain}/10 <small style="font-size:9px;color:${o.pain.type ? '#ea580c' : '#64748b'};">${o.pain.type}</small></div>
                                        </div>
                                        <div>
                                            <span style="font-size:8px;font-weight:700;color:#64748b;display:block;">Range of Motion</span>
                                            <div style="font-size:11px;font-weight:800;color:${o.rom === 'Normal' ? '#059669' : '#dc2626'};">${o.rom}</div>
                                        </div>
                                    </div>
                                </div>
                                <div style="background:#fff;padding:12px;border-radius:12px;border:1px solid #fed7aa;">
                                    <span style="font-size:8px;color:#9a3412;font-weight:800;text-transform:uppercase;display:block;margin-bottom:8px;">Motor & Vascular</span>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                        <div>
                                            <span style="font-size:8px;font-weight:700;color:#64748b;display:block;">Motor Power</span>
                                            <div style="font-size:16px;font-weight:900;color:${motor < 5 ? '#dc2626' : '#059669'};">${motor}/5</div>
                                        </div>
                                        <div>
                                            <span style="font-size:8px;font-weight:700;color:#64748b;display:block;">Pulses</span>
                                            <div style="font-size:11px;font-weight:800;color:${o.neurovascular.pulse === 'Normal' ? '#059669' : '#dc2626'};">${o.neurovascular.pulse}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:12px;">
                                <div style="text-align:center;">
                                    <span style="font-size:7px;color:#94a3b8;font-weight:800;text-transform:uppercase;">Swelling</span>
                                    <div style="font-size:10px;font-weight:800;">${o.exam.swelling || 'No'}</div>
                                </div>
                                <div style="text-align:center;">
                                    <span style="font-size:7px;color:#94a3b8;font-weight:800;text-transform:uppercase;">Tenderness</span>
                                    <div style="font-size:10px;font-weight:800;">${o.exam.tenderness || 'None'}</div>
                                </div>
                                <div style="text-align:center;">
                                    <span style="font-size:7px;color:#94a3b8;font-weight:800;text-transform:uppercase;">Deformity</span>
                                    <div style="font-size:10px;font-weight:800;">${o.exam.deformity || 'Absent'}</div>
                                </div>
                                <div style="text-align:center;">
                                    <span style="font-size:7px;color:#94a3b8;font-weight:800;text-transform:uppercase;">Spasm</span>
                                    <div style="font-size:10px;font-weight:800;">${o.exam.spasm || 'No'}</div>
                                </div>
                            </div>

                            ${(o.specialTests?.length > 0 || o.imaging?.xray || o.imaging?.mri) ? `
                            <div style="background:#fff;padding:12px;border-radius:12px;border:1px dashed #fed7aa;margin-bottom:12px;">
                                ${o.specialTests?.length > 0 ? `<div style="margin-bottom:8px;"><span style="font-size:8px;color:#9a3412;font-weight:800;text-transform:uppercase;">Tests: </span><span style="font-size:11px;font-weight:700;">${o.specialTests.join(', ')}</span></div>` : ''}
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                                    ${o.imaging.xray ? `<div><span style="font-size:8px;color:#9a3412;font-weight:800;text-transform:uppercase;">X-Ray: </span><span style="font-size:11px;font-weight:700;">${o.imaging.xray}</span></div>` : ''}
                                    ${o.imaging.mri ? `<div><span style="font-size:8px;color:#9a3412;font-weight:800;text-transform:uppercase;">MRI: </span><span style="font-size:11px;font-weight:700;">${o.imaging.mri}</span></div>` : ''}
                                </div>
                            </div>` : ''}

                            ${assessments.length > 0 ? `
                            <div style="background:#fff1f2;border:1.5px solid #fecdd3;border-radius:10px;padding:10px 14px;margin-top:10px;">
                                <span style="font-size:8px;font-weight:900;color:#be123c;text-transform:uppercase;display:block;margin-bottom:6px;">Orthopedic Assessment</span>
                                ${assessments.map(a => `<div style="font-size:11px;font-weight:800;color:${a.includes('SEVERE') || a.includes('🚨') ? '#be123c' : '#9f1239'};margin-bottom:2px;">&rarr; ${a}</div>`).join('')}
                            </div>` : ''}

                            <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-size:11px;font-weight:900;color:#1e293b;">Impression: ${o.diagnosis || 'Clinical evaluation pending'}</span>
                                ${o.notes ? `<span style="font-size:9px;color:#64748b;font-style:italic;">Notes: ${o.notes}</span>` : ''}
                            </div>
                        </div>`;
                        })() : ''}

                        ${(activeSpecialty.toUpperCase().includes('PULMO')) && formData.pulmoData && formData.pulmoData.vitals ? (() => {
                            const p = formData.pulmoData;
                            const spo2 = parseInt(p.vitals.spo2) || 0;
                            const rr = parseInt(p.vitals.respRate) || 0;
                            const assessments: string[] = [];

                            if (spo2 < 90) assessments.push('🚨 CRITICAL HYPOXIA — Immediate Oxygen required');
                            else if (spo2 < 94) assessments.push('Low Oxygen Saturation');
                            
                            if (rr > 30) assessments.push('🚨 RESPIRATORY DISTRESS — Rapid breathing');
                            else if (rr > 24) assessments.push('Tachypnea');

                            if (p.symptoms?.includes('Hemoptysis')) assessments.push('🚨 Hemoptysis — Possible pulmonary pathology/TB');
                            if (p.auscultation?.sounds?.includes('Stridor')) assessments.push('🚨 Stridor — Upper Airway Obstruction');

                            return `
                        <div style="margin-bottom:25px;padding:18px;border:2px solid #e0f2fe;border-radius:16px;background:#f0fafb;page-break-inside:avoid;">
                            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #bae6fd;margin-bottom:14px;padding-bottom:8px;">
                                <span style="font-size:10px;font-weight:900;text-transform:uppercase;color:#0369a1;letter-spacing:1px;">Pulmonology Assessment</span>
                                <span style="font-size:11px;font-weight:900;color:#0369a1;background:#e0f2fe;padding:4px 12px;border-radius:6px;">${p.severity} ${p.diagnosis}</span>
                            </div>
                            
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:15px;">
                                <div style="background:#fff;padding:12px;border-radius:12px;border:1px solid #bae6fd;">
                                    <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:8px;">Vital Statistics</span>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                        <div>
                                            <span style="font-size:8px;font-weight:700;color:#64748b;display:block;">SpO2 (%)</span>
                                            <div style="font-size:18px;font-weight:900;color:${spo2 < 90 ? '#dc2626' : spo2 < 94 ? '#ea580c' : '#0369a1'};">${spo2}%</div>
                                        </div>
                                        <div>
                                            <span style="font-size:8px;font-weight:700;color:#64748b;display:block;">Resp Rate</span>
                                            <div style="font-size:18px;font-weight:900;color:${rr > 30 ? '#dc2626' : rr > 24 ? '#ea580c' : '#0369a1'};">${rr} <small style="font-size:8px;">bpm</small></div>
                                        </div>
                                    </div>
                                    <div style="margin-top:10px;font-size:10px;font-weight:800;color:#0c4a6e;background:#bae6fd/30;padding:4px 8px;border-radius:6px;">
                                        Support: ${p.vitals.oxygenSupport}
                                    </div>
                                </div>
                                <div style="background:#fff;padding:12px;border-radius:12px;border:1px solid #bae6fd;">
                                    <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:8px;">Examination</span>
                                    <div style="font-size:11px;font-weight:800;color:#1e293b;margin-bottom:4px;">Air Entry: ${p.auscultation.airEntry}</div>
                                    <div style="font-size:11px;font-weight:800;color:#1e293b;margin-bottom:4px;">Chest Expansion: ${p.exam.chestExpansion}</div>
                                    ${p.auscultation.sounds?.length > 0 ? `<div style="font-size:9px;font-weight:700;color:#dc2626;">Added Sounds: ${p.auscultation.sounds.join(', ')}</div>` : ''}
                                </div>
                            </div>

                            ${assessments.length > 0 ? `
                            <div style="background:#fff1f2;border:1.5px solid #fecdd3;border-radius:10px;padding:10px 14px;margin-top:10px;">
                                <span style="font-size:8px;font-weight:900;color:#be123c;text-transform:uppercase;display:block;margin-bottom:6px;">Respiratory Alert Monitor</span>
                                ${assessments.map(a => `<div style="font-size:10px;font-weight:800;color:#9f1239;margin-bottom:2px;">&rarr; ${a}</div>`).join('')}
                            </div>` : ''}

                            <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;background:#fff;padding:8px 12px;border-radius:10px;border:1px solid #bae6fd;">
                                <span style="font-size:11px;font-weight:900;color:#0c4a6e;">mMRC Grade: ${p.mmrcGrade}/4</span>
                                ${p.peakFlow ? `<span style="font-size:11px;font-weight:900;color:#0c4a6e;">Peak Flow: ${p.peakFlow} L/min</span>` : ''}
                            </div>
                        </div>`;
                        })() : ''}

                        ${(activeSpecialty.toUpperCase().includes('ENDOCRIN')) && formData.endocrinologyData && (formData.endocrinologyData.glycemic.fbs || formData.endocrinologyData.thyroid.tsh) ? (() => {
                            const e = formData.endocrinologyData;
                            const fbs = parseInt(e.glycemic.fbs) || 0;
                            const tsh = parseFloat(e.thyroid.tsh) || 0;
                            const hba1c = parseFloat(e.glycemic.hba1c) || 0;
                            const bmi = parseFloat(e.bmi) || 0;

                            const getStatus = () => {
                                let statusList = [];
                                if (fbs > 126 || hba1c > 6.5) statusList.push("Glycemic Disorder");
                                if (tsh > 4) statusList.push("Hypothyroidism");
                                if (tsh > 0 && tsh < 0.4) statusList.push("Hyperthyroidism");
                                return statusList.length > 0 ? statusList.join(" + ") : "Endocrine Monitoring";
                            };

                            return `
                        <div style="margin-bottom:25px;padding:22px;border:2.5px solid #0f172a;border-radius:28px;background:#f8fafc;page-break-inside:avoid;box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #e2e8f0;margin-bottom:18px;padding-bottom:10px;">
                                <h4 style="margin:0;font-size:14px;font-weight:900;text-transform:uppercase;color:#0f172a;letter-spacing:1.5px;">Endocrine Evaluation</h4>
                                <span style="font-size:11px;font-weight:900;color:#0f172a;background:#fff;padding:5px 14px;border-radius:10px;border:1px solid #e2e8f0;">${getStatus()}</span>
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px;">
                                <div>
                                    <span style="font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;display:block;margin-bottom:12px;letter-spacing:1px;">Lab Dashboard</span>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                                        <div style="background:white;padding:12px;border-radius:14px;border:1px solid #e2e8f0;">
                                            <span style="font-size:8px;font-weight:800;color:#94a3b8;display:block;">HbA1c</span>
                                            <span style="font-size:16px;font-weight:900;color:${hba1c > 6.5 ? '#be123c' : '#0f172a'};">${hba1c}%</span>
                                        </div>
                                        <div style="background:white;padding:12px;border-radius:14px;border:1px solid #e2e8f0;">
                                            <span style="font-size:8px;font-weight:800;color:#94a3b8;display:block;">TSH</span>
                                            <span style="font-size:16px;font-weight:900;color:${tsh > 4 || (tsh > 0 && tsh < 0.4) ? '#be123c' : '#0f172a'};">${tsh} <small style="font-size:7px;">mIU/L</small></span>
                                        </div>
                                    </div>
                                    <div style="margin-top:12px;font-size:10px;font-weight:800;color:#334155;background:#fff;padding:8px 12px;border-radius:10px;border:1px solid #e2e8f0;">
                                        FBS: ${fbs} mg/dL | PPBS: ${e.glycemic.ppbs} mg/dL
                                    </div>
                                </div>
                                <div>
                                    <span style="font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;display:block;margin-bottom:12px;letter-spacing:1px;">Hormonal / Physical</span>
                                    <div style="font-size:11px;font-weight:800;color:#1e293b;margin-bottom:6px;">BMI: ${bmi} (${bmi > 30 ? 'Obese' : bmi > 25 ? 'Overweight' : 'Normal'})</div>
                                     <div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:8px;line-height:1.4;">
                                        <b>Symptoms:</b> ${e.symptoms.join(', ') || 'Normal'}
                                    </div>
                                    ${Object.entries(e.pcos).filter(([_,v])=>v).length > 0 ? `
                                    <div style="font-size:9px;font-weight:800;color:#be123c;background:#fff1f2;padding:6px 10px;border-radius:8px;border:1px solid #fee2e2;">
                                        PCOS Signs: ${Object.entries(e.pcos).filter(([_,v])=>v).map(([k])=>k).join(', ')}
                                    </div>` : ''}
                                </div>
                            </div>

                            ${e.diabetes ? `
                            <div style="margin-bottom: 20px; padding: 16px; border: 1.5px solid #e2e8f0; border-radius: 20px; background: #fff;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;">
                                    <span style="font-size: 9px; font-weight: 900; color: #991b1b; text-transform: uppercase;">Clinically Audited Diabetes Profile</span>
                                    <span style="font-size: 10px; font-weight: 800; color: #991b1b;">Hypo Risk: ${e.diabetes.hypoglycemia || 'None'}</span>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                    <div>
                                        <span style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Foot Examination</span>
                                        <div style="font-size: 10px; font-weight: 700; color: #1e293b;">Sensation: ${e.diabetes.footExam?.sensation || 'Normal'} | Ulcers: ${e.diabetes.footExam?.ulcer || 'Absent'}</div>
                                        <div style="font-size: 9px; font-weight: 800; color: #991b1b; margin-top: 4px;">Complications: ${e.diabetes.complications?.join(', ') || 'None Detected'}</div>
                                    </div>
                                    <div>
                                        <span style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Protocol Adherence</span>
                                        <div style="font-size: 10px; font-weight: 700; color: #1e293b;">Type: ${e.diabetes.treatment?.type || '--'} ${e.diabetes.treatment?.insulinType ? `(${e.diabetes.treatment.insulinType})` : ''}</div>
                                        ${e.diabetes.treatment?.dose ? `<div style="font-size: 10px; font-weight: 900; color: #0f172a;">Dose: ${e.diabetes.treatment.dose}</div>` : ''}
                                    </div>
                                </div>
                            </div>
                            ` : ''}

                            <div style="background:#fff;padding:12px;border-radius:16px;border:1px solid #e2e8f0;">
                                <span style="font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;display:block;margin-bottom:8px;">Protocol ADHERENCE</span>
                                <div style="font-size:11px;font-weight:900;color:#1e293b;">${e.medicationType.join(' • ') || 'Lifestyle Management Only'}</div>
                            </div>
                        </div>`;
                        })() : ''}

                        ${(activeSpecialty.toUpperCase().includes('DENT')) && formData.dentistryData && formData.dentistryData.teeth?.length > 0 ? (() => {
                            const d = formData.dentistryData;
                            const findingsLines = [];
                            if (d.oralFindings?.caries !== 'None') findingsLines.push(`Caries: ${d.oralFindings.caries}`);
                            if (d.oralFindings?.gingivitis !== 'None') findingsLines.push(`Gingivitis: ${d.oralFindings.gingivitis}`);
                            if (d.oralFindings?.abscess) findingsLines.push('Intraoral Abscess Present');
                            if (d.extraOral?.facialSwelling) findingsLines.push('Facial Swelling Noted');
                            
                            return `
                        <div style="margin-bottom: 25px; padding: 18px; border: 2px solid #e0f2fe; border-radius: 16px; background: #f0f9ff; page-break-inside: avoid;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #bae6fd; margin-bottom: 12px; padding-bottom: 8px;">
                                <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0369a1; letter-spacing: 1.5px;">Dental Examination & Procedure</span>
                                ${d.procedure ? `<span style="font-size: 11px; font-weight: 900; color: #0284c7; background: #e0f2fe; padding: 4px 12px; border-radius: 6px;">Plan: ${d.procedure}</span>` : ''}
                            </div>
                            
                            <div style="margin-bottom: 12px;">
                                <span style="font-size: 8px; color: #0369a1; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 6px;">Tooth-Level Assessment</span>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                    ${(d.teeth || []).map((t: any) => `
                                    <div style="background: white; padding: 10px; border-radius: 10px; border: 1px solid #bae6fd;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                            <span style="font-size: 12px; font-weight: 900; color: #0369a1;">Tooth #${t.toothNumber}</span>
                                            <span style="font-size: 8px; font-weight: 800; color: #ef4444; text-transform: uppercase;">${t.condition || 'Finding'}</span>
                                        </div>
                                        <div style="font-size: 10px; font-weight: 700; color: #334155;">
                                            ${t.diagnosis || 'No specific diagnosis notes'}
                                            ${t.mobilityGrade > 0 ? `<div style="color: #991b1b; font-size: 8px; margin-top: 2px;">Mobility Grade: ${t.mobilityGrade}</div>` : ''}
                                        </div>
                                    </div>`).join('')}
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 15px;">
                                <div>
                                    <span style="font-size: 8px; color: #0369a1; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">General Oral Findings</span>
                                    <div style="font-size: 10px; font-weight: 800; color: #1e293b;">
                                        ${findingsLines.join(' | ') || 'No significant generalized findings'}
                                    </div>
                                </div>
                                <div style="background: ${d.systemicRisks?.onBloodThinners ? '#fef2f2' : '#f8fafc'}; border: 1px solid ${d.systemicRisks?.onBloodThinners ? '#fca5a5' : '#e2e8f0'}; padding: 8px; border-radius: 8px;">
                                    <span style="font-size: 7px; font-weight: 900; color: ${d.systemicRisks?.onBloodThinners ? '#991b1b' : '#64748b'}; text-transform: uppercase;">Systemic Alert</span>
                                    <div style="font-size: 9px; font-weight: 800; color: ${d.systemicRisks?.onBloodThinners ? '#991b1b' : '#334155'};">
                                        Blood Thinners: ${d.systemicRisks?.onBloodThinners ? '⚠️ YES' : 'NO'}<br/>
                                        Diabetes: ${d.systemicRisks?.diabetic ? `YES (${d.systemicRisks.diabetesControl})` : 'NO'}
                                    </div>
                                </div>
                            </div>
                            
                            ${d.notes ? `<div style="margin-top: 10px; border-top: 1px dashed #bae6fd; padding-top: 8px; font-size: 9px; color: #64748b; font-style: italic;">Notes: ${d.notes}</div>` : ''}
                        </div>`;
                        })() : ''}

                        ${activeSpecialty.toUpperCase().includes('GASTRO') && formData.gastroData ? (() => {
                            const g = formData.gastroData;
                            const syms = g.symptoms || [];
                            const liver = g.liver || {};
                            return `
                        <div style="margin-bottom:25px;padding:18px;border:2px solid #ecfdf5;border-radius:16px;background:#f0fdf4;page-break-inside:avoid;">
                            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #bbf7d0;margin-bottom:12px;padding-bottom:8px;">
                                <span style="font-size:10px;font-weight:900;text-transform:uppercase;color:#047857;letter-spacing:1px;">Gastroenterology Profile</span>
                                ${g.diagnosis ? `<span style="font-size:11px;font-weight:900;color:#047857;background:#d1fae5;padding:4px 12px;border-radius:6px;">${g.diagnosis}</span>` : ''}
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:10px;">
                                <div>
                                    <span style="font-size:8px;color:#047857;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Symptoms & Habits</span>
                                    <div style="font-size:10px;font-weight:700;color:#1e293b;">${syms.join(', ') || 'Normal'}</div>
                                    <div style="margin-top:4px;font-size:10px;font-weight:700;color:#047857;">Habits: ${g.bowelHabits || 'Normal'} | Stool: ${g.stoolType || 'Normal'}</div>
                                </div>
                                <div>
                                    <span style="font-size:8px;color:#047857;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Physical Exam</span>
                                    <div style="font-size:10px;font-weight:700;color:#1e293b;">
                                        Liver: ${liver.status || 'Normal'}${liver.size ? ` (${liver.size}cm)` : ''} | Spleen: ${g.spleen?.status || 'Normal'}<br/>
                                        Bowel Sounds: ${g.bowelSounds || 'Normal'} | Distention: ${g.distention || 'None'}
                                    </div>
                                </div>
                            </div>
                            ${g.painLocation ? `
                            <div style="background:#fff;padding:8px;border-radius:8px;border:1px dashed #bbf7d0;">
                                <span style="font-size:8px;color:#047857;font-weight:800;text-transform:uppercase;">Pain Profile: </span>
                                <span style="font-size:10px;font-weight:700;color:#1e293b;">${g.painLocation} (${g.painType || 'Diffuse'}) | Tenderness: ${g.tenderness || 'None'}</span>
                            </div>` : ''}
                        </div>`;
                        })() : ''}

                        ${activeSpecialty.toUpperCase().includes('PSYCH') && formData.psychiatryData ? (() => {
                            const p = formData.psychiatryData;
                            const mse = p.mse || {};
                            return `
                        <div style="margin-bottom:25px;padding:18px;border:2px solid #eef2ff;border-radius:16px;background:#f5f3ff;page-break-inside:avoid;">
                            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #ddd6fe;margin-bottom:12px;padding-bottom:8px;">
                                <span style="font-size:10px;font-weight:900;text-transform:uppercase;color:#4338ca;letter-spacing:1px;">Psychiatric Assessment</span>
                                <span style="font-size:11px;font-weight:900;color:#4338ca;background:#ede9fe;padding:4px 12px;border-radius:6px;">Risk: ${p.suicideRisk || 'None'}</span>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:10px;">
                                <div>
                                    <span style="font-size:8px;color:#4338ca;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Clinical Presentation</span>
                                    <div style="font-size:10px;font-weight:700;color:#1e293b;">${(p.complaints || []).join(', ') || 'Normal'}</div>
                                    <div style="font-size:10px;font-weight:700;color:${p.severity === 'Severe' ? '#dc2626' : '#4338ca'};">Severity: ${p.severity || 'Mild'}</div>
                                </div>
                                <div>
                                    <span style="font-size:8px;color:#4338ca;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Mental Status (MSE)</span>
                                    <div style="font-size:9px;font-weight:700;color:#1e293b;">
                                        Mood: ${mse.mood || 'Euthymic'} | Speech: ${mse.speech || 'Normal'}<br/>
                                        Insight: ${mse.insight}/5 | Judgment: ${mse.judgment}/5
                                    </div>
                                </div>
                            </div>
                            ${mse.thought?.length ? `
                            <div style="background:#fff;padding:8px;border-radius:8px;border:1px dashed #ddd6fe;">
                                <span style="font-size:8px;color:#dc2626;font-weight:800;text-transform:uppercase;">Thought / Perception Alerts: </span>
                                <span style="font-size:10px;font-weight:700;color:#1e293b;">${mse.thought.join(', ')}</span>
                            </div>` : ''}
                        </div>`;
                        })() : ''}

                        ${activeSpecialty.toUpperCase().includes('DERMA') && formData.dermatologyData ? (() => {
                            const d = formData.dermatologyData;
                            const locationStr = (Array.isArray(d.location) ? d.location : (d.location ? [d.location] : [])).join(', ');
                            const colorStr = (Array.isArray(d.color) ? d.color : (d.color ? [d.color] : [])).join(', ');
                            const surfaceStr = (Array.isArray(d.surfaceChanges) ? d.surfaceChanges : (d.surfaceChanges ? [d.surfaceChanges] : [])).join(', ');

                            return `
                        <div style="margin-bottom:25px;padding:18px;border:2px solid #fff1f2;border-radius:16px;background:#fff5f5;page-break-inside:avoid;">
                            <div style="border-bottom:1.5px solid #fecdd3;margin-bottom:12px;padding-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-size:10px;font-weight:900;text-transform:uppercase;color:#be123c;letter-spacing:1px;">Dermatological Findings Portfolio</span>
                                <span style="font-size:10px;font-weight:900;color:white;background:#be123c;padding:3px 10px;border-radius:6px;">${locationStr || 'Diffuse'}</span>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                                <div>
                                    <span style="font-size:8px;color:#be123c;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Lesion Profile</span>
                                    <div style="font-size:12px;font-weight:900;color:#1e1b4b;">${d.lesionType || 'No lesions'}${d.lesionCount ? ' (' + d.lesionCount + ')' : ''}</div>
                                    <div style="font-size:10px;font-weight:700;color:#be123c;">Size: ${d.size || 'N/A'}</div>
                                </div>
                                <div>
                                    <span style="font-size:8px;color:#be123c;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Characteristics</span>
                                    <div style="font-size:10px;font-weight:700;color:#1e293b;">
                                        Pattern: ${d.distribution || 'Standard'}<br/>
                                        Color: ${colorStr || 'N/A'}<br/>
                                        Changes: ${surfaceStr || 'None'}
                                    </div>
                                </div>
                            </div>
                            ${d.provisionalDiagnosis ? `
                            <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #fecdd3;">
                                <span style="font-size:8px;color:#be123c;font-weight:800;text-transform:uppercase;display:block;margin-bottom:2px;">Provisional Diagnosis</span>
                                <div style="font-size:11px;font-weight:900;color:#be123c;">${d.provisionalDiagnosis}</div>
                            </div>
                            ` : ''}
                        </div>`;
                        })() : ''}

                        ${activeSpecialty.toUpperCase().includes('SURGERY') && formData.generalSurgeryData ? (() => {
                            const s = formData.generalSurgeryData;
                            const abd = s.abdomen || {};
                            return `
                        <div style="margin-bottom:25px;padding:18px;border:2px solid #ecfeff;border-radius:16px;background:#f0f9ff;page-break-inside:avoid;">
                            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #bae6fd;margin-bottom:12px;padding-bottom:8px;">
                                <span style="font-size:10px;font-weight:900;text-transform:uppercase;color:#0369a1;letter-spacing:1px;">General Surgery Profile</span>
                                <span style="font-size:11px;font-weight:900;color:#0369a1;background:#e0f2fe;padding:4px 12px;border-radius:6px;">Plan: ${s.plan || 'Conservative'}</span>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:10px;">
                                <div>
                                    <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Abdominal Exam</span>
                                    <div style="font-size:10px;font-weight:700;color:#1e293b;">Tenderness: ${abd.tenderness || 'None'} | Guarding: ${abd.guarding || 'None'}</div>
                                    <div style="font-size:10px;font-weight:700;color:#0369a1;">Bowel Sounds: ${abd.bowelSounds || 'Normal'}</div>
                                </div>
                                <div>
                                    <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Special Findings</span>
                                    <div style="font-size:10px;font-weight:700;color:#1e293b;">Hernia: ${s.hernia?.present ? `${s.hernia.type} (${s.hernia.site})` : 'None'}</div>
                                    <div style="font-size:10px;font-weight:800;color:${s.surgicalSite?.infection ? '#dc2626' : '#16a34a'};">Surgical Site: ${s.surgicalSite?.dressing || 'N/A'}</div>
                                </div>
                            </div>
                        </div>`;
                        })() : ''}

                        <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; letter-spacing: 1px;">Medications & Dosage</div>

                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                    <th style="width: ${activeSpecialty.toUpperCase().includes('PEDIATRI') ? '30%' : '35%'}; padding: 12px 10px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase;">Medicine Name</th>
                                    <th style="padding: 12px 10px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase;">Dosage</th>
                                    <th style="padding: 12px 10px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase;">Frequency</th>
                                    <th style="padding: 12px 10px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase;">Duration</th>
                                    ${activeSpecialty.toUpperCase().includes('PEDIATRI') ? `
                                    <th style="font-size: 8px; padding: 12px 5px; color: #be123c;">mg/kg</th>
                                    <th style="font-size: 8px; padding: 12px 5px; color: #be123c;">Calc. Dose</th>
                                    ` : ''}
                                    ${(activeSpecialty.toUpperCase().includes('EYE') || activeSpecialty.toUpperCase().includes('OPHTHA') || formData.medicines.some((m: Medicine) => m.eye || m.dropCount || m.timesPerDay)) ? `
                                    <th style="padding: 12px 10px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase;">Instillation</th>
                                    ` : ''}
                                    <th style="text-align: right; padding: 12px 10px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase;">Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${formData.medicines.map(med => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 14px 10px;">
                                        <div style="font-weight: 800; color: #0f172a; font-size: 13px;">${med.name} ${med.eye ? `<span style="font-size: 10px; color: #fff; background: #0ea5e9; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">${med.eye}</span>` : ''}</div>
                                        <div style="font-size: 10px; color: #64748b; font-weight: 500;">${med.form}</div>
                                    </td>
                                    <td style="padding: 14px 10px; font-weight: 700; color: #334155; font-size: 12px;">${med.dosage}</td>
                                    <td style="padding: 14px 10px; font-weight: 600; color: #475569; font-size: 12px;">${formatFrequency(med.freq)}</td>
                                    <td style="padding: 14px 10px; font-weight: 700; color: #334155; font-size: 12px;">${med.duration}</td>
                                    ${activeSpecialty.toUpperCase().includes('PEDIATRI') ? `
                                    <td style="padding: 14px 5px; font-size: 11px; font-weight: 700; color: #be123c;">${med.mgPerKg || '--'}</td>
                                    <td style="padding: 14px 5px; font-size: 11px; font-weight: 800; color: #0f172a;">${med.calculatedDose || '--'} <small>mg</small></td>
                                    ` : ''}
                                    ${(activeSpecialty.toUpperCase().includes('EYE') || activeSpecialty.toUpperCase().includes('OPHTHA') || formData.medicines.some((m: Medicine) => m.eye || m.dropCount || m.timesPerDay)) ? `
                                    <td style="padding: 14px 10px; font-weight: 700; color: #334155; font-size: 12px;">
                                        ${(() => {
                                            if (!med.eye && !med.dropCount && !med.timesPerDay) return '--';
                                            const eyeTag = med.eye ? `<span style="font-size: 9px; color: #fff; background: #0ea5e9; padding: 2px 6px; border-radius: 4px; font-weight: 800; margin-right: 6px;">${med.eye === 'BE' ? 'BE (Both)' : med.eye === 'RE' ? 'RE (Right)' : med.eye === 'LE' ? 'LE (Left)' : med.eye}</span>` : '';
                                            const drops = med.dropCount ? (/drop/i.test(med.dropCount) ? med.dropCount : `${med.dropCount} Drop${parseInt(med.dropCount) > 1 ? 's' : ''}`) : '';
                                            const times = med.timesPerDay ? (/time|day|daily/i.test(med.timesPerDay) ? med.timesPerDay : `${med.timesPerDay} Times/Day`) : '';
                                            const details = [drops, times].filter(Boolean).join(' &bull; ');
                                            return `<div style="display: inline-flex; align-items: center;">${eyeTag}<span style="color: #0f172a; font-weight: 800;">${details}</span></div>`;
                                        })()}
                                    </td>
                                    ` : ''}
                                    <td style="padding: 14px 10px; font-weight: 900; text-align: right; color: #0f172a; font-size: 13px;">${med.quantity}</td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="advice-grid">
                            ${formData.dietAdvice.length > 0 ? `
                            <div>
                                <div class="section-title" style="margin-top: 0;">Clinical Advice</div>
                                <ul class="advice-list">
                                    ${formData.dietAdvice.filter(i => i.trim()).map(d => `<li>${d}</li>`).join('')}
                                </ul>
                            </div>
                            ` : ''}
                            
                            ${formData.suggestedTests.length > 0 ? `
                            <div>
                                <div class="section-title" style="margin-top: 0;">Requested Tests</div>
                                <ul class="advice-list">
                                    ${formData.suggestedTests.filter(i => i.trim()).map(t => `<li>${t}</li>`).join('')}
                                </ul>
                            </div>
                            ` : ''}
                        </div>

                        ${formData.advice || formData.followUp || formData.followUpDate ? `
                        <div class="follow-up-box">
                            <div>
                                <span class="follow-up-label">Doctor's Advice:</span>
                                <div style="font-weight: 700; color: #92400e; margin-top: 4px; margin-left: -5px;">
                                    <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
                                        ${((formData.advice ? formData.advice + (formData.followUp ? '\n' + formData.followUp : '') : formData.followUp) || 'Follow Standard Protocol').split(/[\n,]+/).map(s => s.trim()).filter(Boolean).map(s => '<li style="margin-bottom: 3px;">' + s + '</li>').join('')}
                                    </ul>
                                </div>
                            </div>
                            ${formData.followUpDate ? `
                            <div style="text-align: right;">
                                <span class="follow-up-label">Scheduled Date:</span>
                                <div class="follow-up-date">${new Date(formData.followUpDate).toLocaleDateString('en-GB')}</div>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}

                        <div style="page-break-inside: avoid; margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end;">
                            ${prescriptionId ? `
                            <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-start; gap: 8px;">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(scanUrl)}" style="width: 90px; height: 90px; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 4px;" alt="Scan to enter prescription" />
                                <span style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Scan to Enter Prescription</span>
                            </div>
                            ` : '<div style="width: 90px; height: 90px;"></div>'}
                            <div class="signature-area" style="margin-top: 0; text-align: right;">
                                ${formData.doctorSignature ? `<img src="${formData.doctorSignature}" class="sig-img" />` : '<div style="height: 50px;"></div>'}
                                <div class="sig-line">Doctor's Signature</div>
                            </div>
                        </div>
                        <div class="print-footer" style="margin-top: auto;">
                            ${footerHtml}
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    const generateBillingHTML = () => {
        const initialHospitalDetails = {
            name: hospitalBranding?.name || 'KADAPA MULTI-SPECIALITY',
            address: hospitalBranding?.address || 'RIMS ROAD, PUTLAMPALLI, KADAPA, AP',
            phone: hospitalBranding?.phone || '+91 8562 245555',
            email: hospitalBranding?.email || 'hospital@example.com',
            logo: hospitalBranding?.logo
        };

        const headerHtml = renderToStaticMarkup(<MainHeader initialDetails={hospitalBranding} />);
        const footerHtml = renderToStaticMarkup(<MainFooter initialDetails={hospitalBranding} />);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pharmacy Bill Estimate</title>
                <meta charset="UTF-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { margin: 0; padding: 0; }
                    }
                    body { 
                        font-family: 'Inter', Arial, sans-serif; 
                        background: white; 
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0 auto;
                        padding: 10mm 22mm 10mm 22mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        background: white;
                    }
                    .content { 
                        flex: 1; 
                        display: flex;
                        flex-direction: column;
                    }
                    .title { color: #1e40af; margin: 20px 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
                    
                    .bill-info { display: flex; justify-content: space-between; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #eef2f6; }
                    .info-group { display: flex; flex-direction: column; gap: 4px; }
                    .info-label { font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
                    .info-value { font-size: 13px; font-weight: 700; color: #1e293b; }

                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    thead tr { background: #f8fafc; }
                    th { text-align: left; font-size: 9px; font-weight: 900; color: #475569; text-transform: uppercase; padding: 12px 10px; border-bottom: 2.5px solid #e2e8f0; }
                    td { padding: 14px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
                    .med-name { font-weight: 800; color: #1e293b; }
                    .amount { font-weight: 800; text-align: right; font-family: monospace; }

                    .summary-box { margin-left: auto; width: 280px; margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #eef2f6; }
                    .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
                    .summary-total { border-top: 2px solid #eef2f6; margin-top: 15px; padding-top: 15px; color: #16a34a; font-size: 20px; font-weight: 900; }
                    .print-footer { page-break-inside: avoid; margin-top: auto; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${headerHtml}
                    <div class="content">
                        <h1 class="title">Pharmacy Bill Estimate</h1>
                        
                        <div class="bill-info">
                            <div class="info-group">
                                <span class="info-label">Patient Details</span>
                                <span class="info-value">${formData.patientName}</span>
                                <span style="font-size: 11px; color: #64748b;">MRN: ${formData.mrn || 'N/A'}</span>
                            </div>
                            <div class="info-group" style="text-align: right;">
                                <span class="info-label">Doctor</span>
                                <span class="info-value">${formData.doctorName}</span>
                                <span style="font-size: 11px; color: #64748b;">Date: ${new Date().toLocaleDateString('en-GB')}</span>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Item Description</th>
                                    <th>Qty</th>
                                    <th style="text-align: right;">Unit Price</th>
                                    <th style="text-align: right;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${formData.medicines.map(med => `
                                <tr>
                                    <td>
                                        <div class="med-name">${med.name} ${med.eye ? `<span style="font-size: 8px; color: #fff; background: #0ea5e9; padding: 2px 4px; border-radius: 4px; margin-left: 4px;">${med.eye}</span>` : ''}</div>
                                        <div style="font-size: 10px; color: #64748b;">${med.form}</div>
                                    </td>
                                    <td style="font-weight: 700;">${med.quantity}</td>
                                    <td class="amount">₹${((med as any).pricePerUnit || med.price || 0).toFixed(2)}</td>
                                    <td class="amount">₹${((parseFloat(med.quantity) || 0) * ((med as any).pricePerUnit || med.price || 0)).toFixed(2)}</td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="summary-box">
                            <div class="summary-row">
                                <span style="color: #64748b; font-weight: 600;">Gross Amount</span>
                                <span style="font-weight: 700;">₹${formData.subtotal.toFixed(2)}</span>
                            </div>
                            <div class="summary-row">
                                <span style="color: #64748b; font-weight: 600;">Tax (0%)</span>
                                <span style="font-weight: 700;">₹0.00</span>
                            </div>
                            <div class="summary-row summary-total">
                                <span>Total Payable</span>
                                <span>₹${formData.total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div style="margin-top: 50px; text-align: center; border: 1px dashed #e2e8f0; padding: 15px; border-radius: 12px;">
                            <p style="font-size: 12px; color: #64748b; font-weight: 600; margin: 0;">This is an estimated bill generated by the clinical system. Actual prices may vary at the pharmacy counter.</p>
                        </div>
                    </div>
                    ${footerHtml}
                </div>
            </body>
            </html>
        `;
    };

    const handleClearForm = () => {
        setShowClearConfirm(true);
    };

    const confirmClearForm = () => {
        setFormData(INITIAL_FORM);
        setSentToPharma(false);
        setIsSubmitted(false);
        setGeneratedHtml(null);
        setShowClearConfirm(false);
        toast.success("Form cleared");
    };

    const handlePauseConsultation = async () => {
        if (!appointmentId) return toast.error("No active appointment to pause");
        try {
            setIsPausing(true);
            await doctorService.pauseConsultation(appointmentId);
            setIsPaused(true);
            // Clear draft from local storage on pause (server has the state)
            localStorage.removeItem(`prescription_draft_${appointmentId || patientId || 'default'}`);
            toast.success('Consultation paused successfully. You can resume from Paused Sessions.');
            setTimeout(() => router.push(`/${hospitalId}/doctor`), 1200);
        } catch (error: any) {
            toast.error(error.message || 'Failed to pause consultation');
        } finally {
            setIsPausing(false);
        }
    };

    const validateMedicinesClientSide = (): boolean => {
        let validMedCount = 0;
        for (let i = 0; i < formData.medicines.length; i++) {
            const m = formData.medicines[i];
            const isPartiallyFilled = m.name?.trim() || m.dosage?.trim() || m.duration?.trim() || m.quantity?.toString().trim() || m.eye || m.dropCount || m.timesPerDay;
            
            if (isPartiallyFilled) {
                if (!m.name || m.name.trim() === '') {
                    toast.error(`Medicine row #${i + 1} has details entered (like quantity or duration) but you missed the Medicine Name!`);
                    return false;
                }
                
                const isEyeDrop = !!m.eye || !!m.dropCount || !!m.timesPerDay;
                
                if (isEyeDrop) {
                    if (!m.dropCount || m.dropCount.trim() === '') {
                        toast.error(`You missed the drop count for Medicine #${i + 1} ("${m.name}").`);
                        return false;
                    }
                    if (!m.timesPerDay || m.timesPerDay.trim() === '') {
                        toast.error(`You missed the frequency for Medicine #${i + 1} ("${m.name}").`);
                        return false;
                    }
                    if (!m.eye) {
                        toast.error(`You missed the eye selection (BE/RE/LE) for Medicine #${i + 1} ("${m.name}").`);
                        return false;
                    }
                } else {
                    if (!m.dosage || m.dosage.trim() === '') {
                        toast.error(`You missed the dosage for Medicine #${i + 1} ("${m.name}").`);
                        return false;
                    }
                }

                if (!m.duration || m.duration.trim() === '') {
                    toast.error(`You missed the duration/days for Medicine #${i + 1} ("${m.name}").`);
                    return false;
                }
                if (!m.quantity || m.quantity.toString().trim() === '') {
                    toast.error(`You missed the quantity for Medicine #${i + 1} ("${m.name}").`);
                    return false;
                }
                validMedCount++;
            }
        }
        
        if (validMedCount === 0) {
            toast.error("Please add at least one complete medicine before saving.");
            return false;
        }
        return true;
    };

    const handleSendToPharma = async () => {
        if (!appointmentId && !patientId) return toast.error("Appointment ID or Patient ID is required");
        if (!formData.patientName) return toast.error("Patient Name is required");
        if (!formData.diagnosis) return toast.error("Diagnosis is required");
        
        if (!validateMedicinesClientSide()) return;

        const hasErrors = formData.medicines.some(m => m.error);
        if (hasErrors) return toast.error("Please resolve stock errors before sending to pharmacy");

        // Submit the prescription and send to pharma
        setIsSending(true);
        await executeSubmit(true, true);
        setIsSending(false);
        setSentToPharma(true);
    };

    const handleSaveAndPrint = async () => {
        if (isSubmitted) {
            handlePrintDocument('prescription');
            return;
        }

        if (!appointmentId && !patientId) return toast.error("Appointment ID or Patient ID is required");
        if (!formData.patientName) return toast.error("Patient Name is required");
        if (!formData.diagnosis) return toast.error("Diagnosis is required");
        
        if (!validateMedicinesClientSide()) return;

        const hasErrors = formData.medicines.some(m => m.error);
        if (hasErrors) return toast.error("Please resolve stock errors before submitting");

        // Open preview modal instead of submitting directly
        setPreviewSendToPharma(false);
        setShowPreviewModal(true);
    };

    const confirmSaveWithoutPharma = () => {
        setShowNoPharmaWarn(false);
        // If preview is open, finalize from there; otherwise go direct
        if (showPreviewModal) {
            setShowPreviewModal(false);
        }
        executeSubmit(false, true);
    };

    // Called from Preview Modal's "Finalize Prescription" button
    const handleFinalizeFromPreview = () => {
        if (!sentToPharma && formData.medicines.length > 0) {
            setShowNoPharmaWarn(true);
            return;
        }
        setShowPreviewModal(false);
        executeSubmit(false, true);
    };

    const executeSubmit = async (sendToPharmaFlag: boolean, showSuccessModal: boolean) => {
        try {
            setIsSaving(true);
            setShowPharmaConfirm(false);

            // ✅ Filter out completely empty medicine rows
            const validMedicines = formData.medicines.filter((m: Medicine) => m.name && m.name.trim() !== '');
            
            if (validMedicines.length === 0 && formData.medicines.length > 0) {
                 toast.error("Please enter at least one valid medicine or remove empty rows.");
                 setIsSaving(false);
                 return;
            }

            // ✅ PERSIST SPECIALIZED DATA (Backend Compatible)
            const submissionData = {
                appointmentId,
                patientId, // Pass patientId
                admissionId, // Pass admissionId if present
                diagnosis: formData.diagnosis,
                symptoms: formData.symptoms.split(',').map((s: string) => s.trim()),
                medicines: validMedicines.map((m: Medicine) => {
                    const isEyeDrop = !!m.eye || !!m.dropCount || !!m.timesPerDay;
                    return {
                        drug: (m as any).productId,
                        name: m.name || 'Unnamed Medicine',
                        dosage: isEyeDrop ? `${m.dropCount || ''} Drops (${m.eye || 'Eye'})` : (m.dosage?.trim() || 'As directed'),
                        frequency: isEyeDrop ? `${m.timesPerDay || ''} Times/Day` : (m.freq || [1, 0, 1, 0]),
                        duration: m.duration?.trim() || 'As directed',
                        quantity: m.quantity,
                        price: m.price
                    };
                }),
                advice: formData.advice || formData.followUp,
                followUpDate: formData.followUpDate,
                dietAdvice: formData.dietAdvice,
                suggestedTests: formData.suggestedTests,
                avoid: formData.avoid,
                aiGenerated: false,
                age: formData.age,
                gender: formData.gender,
                sendToPharma: sendToPharmaFlag,
                // ── Specialty module payloads (persisted as linked documents) ──
                cardiologyData: activeSpecialty.toUpperCase().includes('CARDIO') ? (() => {
                    const c = { ...formData.cardiologyData };
                    if (!c.murmurType || c.murmur !== 'Present') {
                        delete c.murmurType;
                    }
                    return c;
                })() : undefined,
                dermatologyData: activeSpecialty.toUpperCase().includes('DERMA') ? formData.dermatologyData : undefined,
                entData: activeSpecialty.toUpperCase().includes('ENT') && !activeSpecialty.toUpperCase().includes('DENT') && !activeSpecialty.toUpperCase().includes('GASTRO') ? formData.entData : undefined,
                pediatricData: activeSpecialty.toUpperCase().includes('PEDIATRI') ? formData.pediatricData : undefined,
                gynaecData: (activeSpecialty.toUpperCase().includes('GYNAE') || activeSpecialty.toUpperCase().includes('GYNE') || activeSpecialty.toUpperCase().includes('OBST')) ? formData.gynaecData : undefined,
                neuroData: (activeSpecialty.toUpperCase().includes('NEURO')) ? formData.neuroData : undefined,
                gastroData: (activeSpecialty.toUpperCase().includes('GASTRO')) ? formData.gastroData : undefined,
                nephroData:  (activeSpecialty.toUpperCase().includes('NEPHRO')) ? formData.nephroData : undefined,
                urologyData: (activeSpecialty.toUpperCase().includes('URO')) ? formData.urologyData : undefined,
                ophthaData:  (activeSpecialty.toUpperCase().includes('OPHTHAL') || activeSpecialty.toUpperCase().includes('EYE')) ? formData.ophthaData : undefined,
                orthopedicData: (activeSpecialty.toUpperCase().includes('ORTHO')) ? formData.orthoData : undefined,
                pulmoData:   (activeSpecialty.toUpperCase().includes('PULMO'))   ? formData.pulmoData   : undefined,
                psychiatryData: (activeSpecialty.toUpperCase().includes('PSYCH')) ? formData.psychiatryData : undefined,
                endocrinologyData: (activeSpecialty.toUpperCase().includes('ENDOCRIN')) ? formData.endocrinologyData : undefined,
                hematologyData: (activeSpecialty.toUpperCase().includes('HEMA')) ? formData.hematologyData : undefined,
                oncologyData: (activeSpecialty.toUpperCase().includes('ONCO')) ? formData.oncologyData : undefined,
                dentistryData: (activeSpecialty.toUpperCase().includes('DENT')) ? formData.dentistryData : undefined,
                radiologyOrder: (activeSpecialty.toUpperCase().includes('RADIO')) ? formData.radiologyOrder : undefined,
                generalSurgeryData: (activeSpecialty.toUpperCase().includes('SURGERY')) ? formData.generalSurgeryData : undefined,
            };

            // Psychiatry Safety Interlock
            if (activeSpecialty.toUpperCase().includes('PSYCH')) {
                const ps = formData.psychiatryData;
                if (ps?.suicideRisk === 'High') {
                    if (!confirm("🚨 HIGH SUICIDE RISK DETECTED. Have you secured an emergency follow-up and informed family?")) {
                        setIsSaving(false);
                        return;
                    }
                    if (!formData.followUpDate) {
                        toast.error("Emergency: Follow-up date is mandatory for High Risk suicide patients.");
                        setIsSaving(false);
                        return;
                    }
                }
            }

            const apiResponse = await doctorService.createPrescription(submissionData);

            // ── Surface specialty save warnings from backend ──────────────────
            const warnings: string[] = apiResponse?.specialtyWarnings || [];
            setSpecialtyWarnings(warnings);

            if (warnings.length > 0) {
                // Individual toast per failed module so doctor knows exactly what didn't save
                warnings.forEach((w: string) => {
                    toast.error(`⚠ Specialty save failed — ${w}`, { duration: 6000 });
                });
                toast(`Main prescription saved ✓, but ${warnings.length} specialty module(s) had errors. Check above.`, { 
                    duration: 8000,
                    icon: '⚠️',
                    style: {
                        borderRadius: '10px',
                        background: '#fff7ed',
                        color: '#9a3412',
                        fontWeight: 'bold'
                    }
                });
            }

            // Re-use current styled generation logic
            const prescriptionHtml = generatePrescriptionHTML(apiResponse?.prescription?._id);
            const billingHtml = generateBillingHTML();

            // Save HTML for printing
            setGeneratedHtml({
                prescription: prescriptionHtml,
                billing: billingHtml
            });

            setIsSubmitted(true);

            if (showSuccessModal) {
                setShowSuccess(true);
            }

            if (warnings.length === 0) {
                if (sendToPharmaFlag) {
                    setSentToPharma(true);
                    toast.success("Prescription Saved & Sent to Pharmacy Successfully!");
                } else {
                    toast.success("Prescription Saved Successfully!");
                }
            }

            // Clear Draft
            localStorage.removeItem(`prescription_draft_${appointmentId || patientId || 'default'}`);

        } catch (error: any) {
            toast.error(error.message || "Failed to save prescription");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintDocument = async (type: 'prescription' | 'billing') => {
        if (!generatedHtml) return;
        const html = type === 'prescription' ? generatedHtml.prescription : generatedHtml.billing;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 500);

            // Automatically complete the consultation and redirect to dashboard
            if (appointmentId) {
                try {
                    await doctorService.endConsultation(appointmentId, {
                        duration: 0,
                        diagnosis: formData.diagnosis,
                        clinicalNotes: formData.symptoms
                    });
                    toast.success("Consultation Completed Successfully!");
                    
                    setTimeout(() => {
                        router.push(`/${hospitalId}/doctor`);
                    }, 1500);
                } catch (error) {
                    console.error("Failed to complete consultation", error);
                }
            }
        } else {
            toast.error('Please allow popups to print documents');
        }
    };

    if (loading || isProfileLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-teal-600" size={48} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Specialist Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50/50 relative min-h-screen">
            {/* Header */}
            <header className="bg-white border-b border-border-theme py-4 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                if (appointmentId && !isSubmitted && !isPaused) {
                                    const msg = 'You have not stopped this consultation. Leave without pausing?';
                                    if (!window.confirm(msg)) return;
                                }
                                router.back();
                            }}
                            className="p-2 hover:bg-secondary-theme rounded-full text-muted hover:text-foreground transition-colors shrink-0"
                        >
                            <ArrowLeft size={18} className="sm:size-[20px]" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2 truncate uppercase tracking-tight">
                                <FileText size={18} className="text-teal-600 shrink-0" />
                                Prescription Desk
                            </h1>
                            <p className="text-[10px] sm:text-xs text-muted font-bold uppercase tracking-widest mt-0.5">Patient: {formData.patientName || 'New Case'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">

                    </div>
                </div>
            </header>

            <main className="space-y-4 sm:space-y-6 pb-4">

                {/* Patient Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <User size={18} className="text-teal-600" />
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Patient Details</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowHistoryModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                        >
                            <History size={14} /> View Medical History
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                            <input
                                name="patientName"
                                value={formData.patientName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">MRN</label>
                            <input
                                name="mrn"
                                value={formData.mrn}
                                onChange={handleInputChange}
                                placeholder="N/A"
                                className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Age & Gender</label>
                            <div className="flex gap-2">
                                <input
                                    name="age"
                                    value={formData.age}
                                    onChange={handleInputChange}
                                    placeholder="Age"
                                    className="w-20 px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                />
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date</label>
                            <input
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Clinical Notes Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-8 pb-3 border-b-2 border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-teal-50 p-2 rounded-xl text-teal-600">
                                <Stethoscope size={20} />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                    {activeSpecialty.toUpperCase() === 'GENERAL' ? 'Clinical Assessment' : `${activeSpecialty} Assessment`}
                                </h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Specialty-specific analysis</p>
                            </div>
                        </div>

                        {/* Specialty Switcher */}
                        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar max-w-[70%]">
                            {(() => {
                                const getSpecIcon = (s: string) => {
                                    const name = s.toUpperCase();
                                    if (name === 'GENERAL') return <Stethoscope size={10} />;
                                    if (name.includes('CARDIO')) return <Heart size={10} />;
                                    if (name.includes('DIABET')) return <Activity size={10} />;
                                    if (name.includes('DERMA')) return <PenTool size={10} />;
                                    if (name.includes('ORTHO')) return <Zap size={10} />;
                                    if (name.includes('PEDIATRI')) return <Baby size={10} />;
                                    if (name.includes('ENT') && !name.includes('DENT') && !name.includes('GASTRO')) return <Mic2 size={10} />;
                                    if (name.includes('DENT')) return <Activity size={10} />;
                                    if (name.includes('EYE') || name.includes('OPHTHA')) return <Eye size={10} />;
                                    if (name.includes('GYNAE') || name.includes('GYNE') || name.includes('OBST')) return <Heart size={10} />;
                                    if (name.includes('NEURO')) return <Zap size={10} />;
                                    if (name.includes('PULMO')) return <Wind size={10} />;
                                    if (name.includes('GASTRO')) return <Activity size={10} />;
                                    if (name.includes('NEPHRO')) return <Beaker size={10} />;
                                    if (name.includes('ENDOCRIN')) return <Activity size={10} />;
                                    if (name.includes('ONCO')) return <Zap size={10} />;
                                    return <Stethoscope size={10} />;
                                };

                                return (availableSpecialties.length > 0 ? availableSpecialties : ['General']).map((spec) => (
                                    <button
                                        key={spec}
                                        onClick={() => setActiveSpecialty(spec)}
                                        className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                                            activeSpecialty === spec 
                                            ? 'bg-white text-teal-600 shadow-sm ring-1 ring-slate-200' 
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                        }`}
                                    >
                                        {getSpecIcon(spec)}
                                        {spec}
                                    </button>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* ── CONDITIONAL SPECIALTY HEADERS ── */}
                    {(activeSpecialty.toUpperCase().includes('EYE') || activeSpecialty.toUpperCase().includes('OPHTHA')) && (
                        <div className="bg-lime-50 border border-lime-100 rounded-2xl p-4 flex items-center justify-between shadow-sm mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-lime-500/10 rounded-xl flex items-center justify-center">
                                    <Eye size={20} className="text-lime-600 animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-lime-700">Ophthalmology Assessment</h2>
                                    <p className="text-[9px] font-bold text-lime-600/60 uppercase tracking-widest">Vision & Ocular Health Profile</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── COMMON FIELDS: Symptoms (always shown, above specialty modules) ── */}
                    <div className="mb-8">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between">
                            Symptoms / Complaints
                        </label>
                        <textarea
                            name="symptoms"
                            value={formData.symptoms}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="e.g. Fever, Cough, Headache..."
                            className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                        />
                    </div>

                    {/* DYNAMIC CLINICAL MODULES - STREAMLINED RENDERING */}
                    <div className="mb-8">
                        {(() => {
                            const spec = activeSpecialty.toUpperCase();
                            if (spec.includes('CARDIO')) return <CardiologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('DERMA')) return <DermatologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('ORTHO')) return <OrthopedicModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('PEDIATRI')) return <PediatricsModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('ENT') && !spec.includes('DENT') && !spec.includes('GASTRO')) return <ENTModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('EYE') || spec.includes('OPHTHA')) return <OphthalmologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('GYNAE') || spec.includes('GYNE') || spec.includes('OBST')) return <GynecologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('NEURO')) return <NeurologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('PULMO') || spec.includes('CHEST')) return <PulmonologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('GASTRO')) return <GastroModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('NEPHRO')) return <NephrologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('URO')) return <UrologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('RADIO')) return <RadiologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('PSYCH')) return <PsychiatryModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('ENDOCRIN')) return <EndocrinologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('HEMA')) return <HematologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('ONCO')) return <OncologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('DENT')) return <DentistryModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('SURGERY')) return <GeneralSurgeryModule formData={formData} setFormData={setFormData} />;
                            if (spec === 'GENERAL') return (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center">
                                            <Stethoscope size={20} className="text-teal-600 animate-pulse" />
                                        </div>
                                        <div>
                                            <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-slate-700">General Assessment</h2>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Common clinical evaluation</p>
                                        </div>
                                    </div>
                                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-teal-600">
                                        Active Module: General
                                    </div>
                                </div>
                            );
                            return null;
                        })()}
                    </div>

                    {/* ── COMMON FIELD: Diagnosis (always shown, below specialty modules) ── */}
                    <div className="mb-8">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Diagnosis</label>
                        <textarea
                            name="diagnosis"
                            value={formData.diagnosis}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="e.g. Viral Fever"
                            className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                        />
                    </div>

                    {/* ── COMMON FIELD: Advice (always shown, below diagnosis) ── */}
                    <div className="mb-8">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Advice</label>
                        <textarea
                            name="advice"
                            value={formData.advice}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="e.g. Drink plenty of water, Rest for 3 days"
                            className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                        />
                    </div>

                </div>

                {/* Medicines Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[300px]">
                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Pill size={18} className="text-teal-600" />
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Medications</h2>
                        </div>
                        <button
                            onClick={addMedicine}
                            className="bg-teal-50 text-teal-600 hover:bg-teal-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                        >
                            <Plus size={12} /> Add Medicine
                        </button>
                    </div>
                    <div className="overflow-visible pb-4">
                      <div className="w-full space-y-3">
                        {/* Column Headers */}
                        <div className={`gap-3 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:grid ${activeSpecialty.toUpperCase().includes('PEDIATRI') ? 'lg:grid-cols-[15]' : 'lg:grid-cols-12'}`}>
                            <div className="col-span-3">Medicine</div>
                            <div className="col-span-1">Form</div>
                            <div className="col-span-1">Dosage</div>
                            <div className="col-span-2 text-center">Frequency</div>
                            <div className="col-span-1 text-center">Days</div>
                            <div className="col-span-1 text-center">Qty</div>
                            {activeSpecialty.toUpperCase().includes('PEDIATRI') && (
                                <>
                                    <div className="col-span-1 text-center">mg/kg</div>
                                    <div className="col-span-2 text-center">Calc. Dose</div>
                                </>
                            )}
                            <div className="col-span-3 text-center">Eye / Instillation</div>
                        </div>

                        {formData.medicines.map((med, idx) => (
                            <div key={idx} className={`relative group bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-xl p-3 transition-all ${activeMedIndex === idx ? 'z-50 shadow-lg' : 'z-10'}`}>
                                <div className={`grid grid-cols-2 ${activeSpecialty.toUpperCase().includes('PEDIATRI') ? 'lg:grid-cols-[15]' : 'lg:grid-cols-12'} gap-4 lg:gap-3 items-start lg:items-center`}>
                                    <div className="col-span-2 lg:col-span-3 relative">
                                        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-slate-400">
                                            <Search size={12} className="sm:size-[14px]" />
                                        </div>
                                        <input
                                            type="text"
                                            value={med.name}
                                            onChange={(e) => updateMedicine(idx, 'name', e.target.value)}
                                            onFocus={() => setActiveMedIndex(idx)}
                                            placeholder="Search medicine..."
                                            className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-800 placeholder:font-normal focus:outline-none focus:border-teal-500 uppercase"
                                        />

                                        {/* Suggestions Dropdown */}
                                        {activeMedIndex === idx && suggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 z-[200] max-h-72 overflow-y-auto ring-1 ring-black/5">
                                                <div className="p-2 border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50 flex justify-between items-center">
                                                    <span>Medicine Catalog & Inventory</span>
                                                    <span className="text-[9px] text-teal-600 font-bold lowercase">🟢 Pharmacy Stock &nbsp;|&nbsp; 🔵 General Catalog</span>
                                                </div>
                                                {suggestions.map((s, sIdx) => (
                                                    <button
                                                        key={sIdx}
                                                        onClick={() => selectMedicine(s, idx)}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 group/item"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                                                    {s.brand || s.name}
                                                                    {s.isPharmacyStock === false ? (
                                                                        <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                                                                            🔵 General / Custom
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                                            🟢 Pharmacy Stock
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-slate-500">{s.generic}</div>
                                                                {s.unitsPerPack ? (
                                                                    <div className="mt-1 text-[10px] font-bold text-slate-400">
                                                                        {s.unitsPerPack} units per pack
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                            <div className="text-right">
                                                                {s.isPharmacyStock !== false ? (
                                                                    s.stock > 0 ? (
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                                                {Number(s.stock).toFixed(2)} Packs Available
                                                                            </span>
                                                                            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                                                                Total: {(s.stock * (s.unitsPerPack || 1)).toFixed(2)} Units
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                                                            Out of Stock
                                                                        </span>
                                                                    )
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                                                        Non-Pharmacy Item
                                                                    </span>
                                                                )}
                                                                {s.mrp ? (
                                                                    <div className="text-xs font-bold text-slate-700 mt-1">₹{s.mrp} <span className="text-[10px] font-normal text-slate-400">/ pack</span></div>
                                                                ) : null}
                                                                {s.unitsPerPack && s.unitsPerPack > 1 && s.mrp ? (
                                                                    <div className="text-[9px] font-bold text-indigo-500 mt-0.5">₹{(s.mrp / s.unitsPerPack).toFixed(2)} per unit</div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                    </div>

                                    {/* Responsive fields container */}
                                    <div className="grid grid-cols-2 lg:contents gap-4 lg:gap-3 col-span-2 lg:col-span-9 items-start lg:items-center">
                                        <div className="col-span-1 lg:col-span-1 order-2 lg:order-1">
                                            <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase px-1 mb-1">Form</div>
                                            {med.productId && med.form ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide bg-violet-50 text-violet-700 border border-violet-100 w-full justify-center truncate" title={med.form}>
                                                    {med.form}
                                                </span>
                                            ) : (
                                                <select
                                                    value={med.form || ''}
                                                    onChange={(e) => updateMedicine(idx, 'form', e.target.value)}
                                                    className="w-full px-1 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wide text-slate-700 focus:outline-none focus:border-teal-500 text-center"
                                                >
                                                    <option value="">N/A</option>
                                                    <option value="Tablet">Tablet</option>
                                                    <option value="Syrup">Syrup</option>
                                                    <option value="Drops">Drops</option>
                                                    <option value="Capsule">Capsule</option>
                                                    <option value="Injection">Injection</option>
                                                    <option value="Ointment">Ointment</option>
                                                    <option value="Cream">Cream</option>
                                                    <option value="Gel">Gel</option>
                                                    <option value="Powder">Powder</option>
                                                    <option value="Spray">Spray</option>
                                                    <option value="Inhaler">Inhaler</option>
                                                    <option value="Sachet">Sachet</option>
                                                    <option value="Suppository">Suppository</option>
                                                    <option value="Lotion">Lotion</option>
                                                </select>
                                            )}
                                        </div>

                                        <div className="col-span-1 lg:col-span-1 order-3 lg:order-2 space-y-1">
                                            <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase px-1">Dosage</div>
                                            <input
                                                value={med.dosage}
                                                onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                                                placeholder="Dosage"
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-teal-500"
                                            />
                                        </div>

                                        <div className={`col-span-2 lg:col-span-${activeSpecialty.toUpperCase().includes('PEDIATRI') ? '2' : '4'} order-1 lg:order-3 space-y-1`}>
                                            <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase px-1">Frequency</div>
                                            <div className="w-full relative">
                                                <FrequencySelector
                                                    value={med.freq}
                                                    onChange={(val) => updateMedicine(idx, 'freq', val)}
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-1 lg:col-span-1 order-4 lg:order-4 space-y-1">
                                            <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase px-1">Days</div>
                                            <input
                                                value={med.duration}
                                                onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                                                placeholder="Days"
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-teal-500 text-center"
                                            />
                                        </div>

                                        <div className="col-span-1 lg:col-span-1 order-5 lg:order-5 space-y-1">
                                            <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase px-1">Qty</div>
                                            <div className="relative">
                                                <input
                                                    value={med.quantity}
                                                    onChange={(e) => updateMedicine(idx, 'quantity', e.target.value)}
                                                    placeholder="Qty"
                                                    className={`w-full px-3 py-2 bg-white border ${med.error ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-slate-200 focus:border-teal-500'} rounded-lg text-xs font-bold focus:outline-none focus:ring-2`}
                                                />
                                                {med.error && (
                                                    <div className="text-[9px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 mt-1 rounded shadow-xs whitespace-nowrap animate-in fade-in slide-in-from-top-1">
                                                        {med.error}
                                                    </div>
                                                )}
                                                {med.availableUnits !== undefined && !med.error && (
                                                    <div className="text-[8px] font-bold text-slate-400 mt-1 px-1">
                                                        Stk: {med.availableUnits}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {activeSpecialty.toUpperCase().includes('PEDIATRI') && (
                                            <>
                                                <div className="col-span-1 lg:col-span-1 order-6 lg:order-6 space-y-1">
                                                    <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase px-1">mg/kg</div>
                                                    <input
                                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                        value={med.mgPerKg || ''}
                                                        onChange={(e) => {
                                                            const mgKg = e.target.value;
                                                            const weight = parseFloat(formData.pediatricData?.weight || '0');
                                                            const calculated = weight > 0 ? (weight * parseFloat(mgKg || '0')).toFixed(2) : '';
                                                            updateMedicine(idx, 'mgPerKg', mgKg);
                                                            updateMedicine(idx, 'calculatedDose', calculated);
                                                        }}
                                                        placeholder="mg/kg"
                                                        className="w-full px-2 py-2 bg-rose-50 border border-rose-100 rounded-lg text-xs font-bold text-rose-700 focus:outline-none focus:border-rose-500 text-center"
                                                    />
                                                </div>
                                                <div className="col-span-2 lg:col-span-2 order-7 lg:order-7 space-y-1">
                                                    <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase px-1">Calc. Dose</div>
                                                    <div className="relative group/dose">
                                                        <input
                                                            value={med.calculatedDose || ''}
                                                            readOnly
                                                            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 text-center cursor-not-allowed"
                                                            placeholder="Calc..."
                                                        />
                                                        {med.calculatedDose && med.dosage && !med.dosage.includes(med.calculatedDose) && (
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/dose:block bg-rose-600 text-white text-[8px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-[100]">
                                                                Dose Mis-match! Expected: {med.calculatedDose} mg
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div className="col-span-2 lg:col-span-3 order-8 lg:order-8 space-y-1">
                                                <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase px-1">Instillation</div>
                                                <div className="flex gap-1 w-full">
                                                    <select
                                                        value={med.eye || ''}
                                                        onChange={(e) => updateMedicine(idx, 'eye', e.target.value as 'BE'|'RE'|'LE')}
                                                        className="w-1/3 px-1 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:outline-none focus:border-teal-500 text-center"
                                                    >
                                                        <option value="">Eye</option>
                                                        <option value="BE">BE (Both)</option>
                                                        <option value="RE">RE (Right)</option>
                                                        <option value="LE">LE (Left)</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={med.dropCount || ''}
                                                        onChange={(e) => updateMedicine(idx, 'dropCount', e.target.value)}
                                                        placeholder="Drops"
                                                        className="w-1/3 px-1 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-center focus:outline-none focus:border-teal-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={med.timesPerDay || ''}
                                                        onChange={(e) => updateMedicine(idx, 'timesPerDay', e.target.value)}
                                                        placeholder="Times"
                                                        className="w-1/3 px-1 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-center focus:outline-none focus:border-teal-500"
                                                    />
                                                </div>
                                            </div>


                                        <div className="col-span-1 lg:col-span-1 order-9 lg:order-9 flex items-center justify-center pt-1 lg:pt-0">
                                            <button onClick={() => removeMedicine(idx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg shrink-0 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                </div>
                                {med.availableUnits !== undefined && (
                                    <div className="pt-1 flex justify-end items-center px-4 mt-1 border-t border-slate-50">
                                        {/* Stk info moved to Qty field column */}
                                        {med.pricePerUnit && (
                                            <span className="text-[8px] font-bold text-teal-600">Total: ₹{(med.pricePerUnit * (parseInt(med.quantity) || 0)).toFixed(2)}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {formData.medicines.length === 0 && (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm font-medium">No medicines prescribed yet.</p>
                                <button onClick={addMedicine} className="mt-2 text-teal-600 text-xs font-bold uppercase hover:underline">Click to add first medicine</button>
                            </div>
                        )}
                      </div>
                    </div>
                </div>

                {/* Additional Advice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Diet & Lifestyle</h2>
                            <button onClick={() => addArrayItem('dietAdvice')} className="text-teal-600 hover:bg-teal-50 p-1.5 rounded-lg"><Plus size={14} /></button>
                        </div>
                        <div className="space-y-2">
                            {formData.dietAdvice.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        value={item}
                                        onChange={(e) => updateArrayItem('dietAdvice', idx, e.target.value)}
                                        className="flex-1 px-3 py-2 bg-slate-50 border-slate-200 border rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        placeholder="Add advice..."
                                    />
                                    <button onClick={() => removeArrayItem('dietAdvice', idx)} className="text-slate-300 hover:text-rose-500"><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Suggested Tests */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Lab Tests</h2>
                            <button onClick={() => addArrayItem('suggestedTests')} className="text-teal-600 hover:bg-teal-50 p-1.5 rounded-lg"><Plus size={14} /></button>
                        </div>
                        <div className="space-y-2">
                            {formData.suggestedTests.length === 0 && (
                                <p className="text-xs text-slate-400 font-medium italic">No tests suggested.</p>
                            )}
                            {formData.suggestedTests.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        value={item}
                                        onChange={(e) => updateArrayItem('suggestedTests', idx, e.target.value)}
                                        className="flex-1 px-3 py-2 bg-slate-50 border-slate-200 border rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        placeholder="Test name (e.g. CBC)..."
                                    />
                                    <button onClick={() => removeArrayItem('suggestedTests', idx)} className="text-slate-300 hover:text-rose-500"><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar size={16} className="text-teal-600" />
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Follow Up</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Follow Up Date</label>
                                    <input
                                        type="date"
                                        name="followUpDate"
                                        value={formData.followUpDate}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    />
                                </div>
                                <textarea
                                    name="followUp"
                                    value={formData.followUp}
                                    onChange={handleInputChange}
                                    placeholder="Special follow-up instructions..."
                                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={16} className="text-rose-500" />
                                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Things to Avoid</h2>
                                </div>
                                <button onClick={() => addArrayItem('avoid')} className="text-teal-600 text-[10px] font-bold uppercase transition-transform active:scale-90 hover:scale-110">+ Add Item</button>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {formData.avoid.length === 0 && (
                                    <p className="text-xs text-slate-400 font-medium italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No specific restrictions added.</p>
                                )}
                                {formData.avoid.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 group">
                                        <input
                                            value={item}
                                            onChange={(e) => updateArrayItem('avoid', idx, e.target.value)}
                                            className="flex-1 px-3 py-2 bg-slate-50 border-slate-200 border rounded-lg text-sm focus:outline-none focus:border-teal-500 transition-colors group-hover:border-teal-200"
                                            placeholder="Restrict e.g. Smoking, Heavy Exercise..."
                                        />
                                        <button onClick={() => removeArrayItem('avoid', idx)} className="text-slate-300 hover:text-rose-500 transition-colors"><X size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pb-4 !mt-2">
                    <div className="flex justify-center sm:justify-end gap-2 sm:gap-4 p-3 sm:p-6 bg-card border border-border-theme rounded-3xl">
                        <button
                            onClick={handleClearForm}
                            className="flex-1 sm:flex-none px-2 sm:px-10 py-2 sm:py-4 bg-secondary-theme text-muted rounded-2xl font-black uppercase text-[8px] sm:text-xs tracking-widest border border-border-theme hover:bg-card transition-all active:scale-95 text-center shadow-xs"
                        >
                            Reset Form
                        </button>
                        {appointmentId && !isSubmitted && (
                            <button
                                onClick={handlePauseConsultation}
                                disabled={isPausing || isSaving || isPaused}
                                className={`flex-[1.5] sm:flex-none px-2 sm:px-10 py-2 sm:py-4 rounded-2xl font-black uppercase text-[8px] sm:text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-3 ${
                                    isPaused
                                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                        : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20'
                                }`}
                                title={isPaused ? 'Consultation is paused' : 'Pause and return later'}
                            >
                                {isPausing ? <Loader2 className="animate-spin" size={14} /> : <Pause size={14} />}
                                <span className="truncate">{isPaused ? 'Paused' : 'Pause'}</span>
                            </button>
                        )}
                        <button
                            onClick={handleSendToPharma}
                            disabled={isSaving || isSending || sentToPharma}
                            className={`flex-[1.5] sm:flex-none px-2 sm:px-12 py-2 sm:py-4 rounded-2xl font-black uppercase text-[8px] sm:text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-3 ${sentToPharma ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/10'}`}
                        >
                            {isSending ? <Loader2 className="animate-spin" size={14} /> : (sentToPharma ? <CheckCircle2 size={14} /> : <Pill size={14} />)}
                            <span className="truncate">{sentToPharma ? 'Pharma' : 'Pharma'}</span>
                        </button>
                        {/* <button
                            onClick={() => {
                                // Preview: open modal only (do not submit)
                                if (!formData.patientName) return toast.error("Patient Name is required");
                                if (!formData.diagnosis) return toast.error("Diagnosis is required");
                                if (formData.medicines.length === 0) return toast.error("At least one medicine is required");
                                const emptyDurationIndex = formData.medicines.findIndex((m: Medicine) => !m.duration || m.duration.trim() === '');
                                if (emptyDurationIndex !== -1) {
                                    toast.error(`Medicine #${emptyDurationIndex + 1} "${formData.medicines[emptyDurationIndex].name || 'Unnamed'}" is missing a duration.`);
                                    return;
                                }
                                setPreviewSendToPharma(false);
                                setShowPreviewModal(true);
                            }}
                            disabled={isSaving || isSending}
                            className="flex-1 sm:flex-none px-2 sm:px-10 py-2 sm:py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-black uppercase text-[8px] sm:text-xs tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95 text-center shadow-xs flex items-center justify-center gap-1 sm:gap-2"
                        >
                            <Search size={14} />
                            Preview
                        </button> */}

                        <button
                            onClick={handleSaveAndPrint}
                            disabled={isSaving || isSending}
                            className="flex-[2] sm:flex-none px-2 sm:px-12 py-2 sm:py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-[8px] sm:text-xs tracking-widest hover:bg-teal-700 active:scale-95 flex items-center justify-center gap-1 sm:gap-3 transition-all shadow-lg shadow-teal-600/10"
                        >
                            {isSaving && !isSending ? <Loader2 className="animate-spin" size={14} /> : <Printer size={14} />}
                            <span className="truncate">Finalize & Print</span>
                        </button>
                    </div>
                </div>
            </main>

            {showSuccess && generatedHtml && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-teal-400 to-indigo-500"></div>
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                            <CheckCircle2 size={40} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Prescription Ready!</h2>
                            <p className="text-slate-500 text-sm mb-4">The prescription has been saved and formatted for printing.</p>
                            
                            {(formData.symptoms || formData.diagnosis) && (
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3 mb-6">
                                    {formData.symptoms && (
                                        <div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Symptoms Recorded</span>
                                            <p className="text-xs font-bold text-slate-700 line-clamp-2">{formData.symptoms}</p>
                                        </div>
                                    )}
                                    {formData.diagnosis && (
                                        <div className={formData.symptoms ? "pt-3 border-t border-slate-200/60" : ""}>
                                            <span className="text-[8px] font-black text-teal-600 uppercase tracking-widest block mb-1">Final Diagnosis</span>
                                            <p className="text-xs font-black text-teal-700 bg-teal-50 px-2 py-1 rounded-md inline-block">{formData.diagnosis}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center pt-2">
                            <button
                                onClick={() => handlePrintDocument('prescription')}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-teal-50 border-2 border-teal-100 text-teal-700 hover:bg-teal-100 hover:border-teal-200 group w-48 transition-all active:scale-95 shadow-sm"
                            >
                                <Printer size={32} className="group-hover:scale-110 transition-transform text-teal-600" />
                                <span className="font-bold text-sm tracking-tight">Print Prescription</span>
                            </button>
                        </div>
                        <button
                            onClick={() => { setShowSuccess(false); router.back(); }}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest mt-4 transition-colors"
                        >
                            Close & Return
                        </button>
                    </div>
                </div>
            )}

            {/* Clear Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Eraser size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Clear Prescription?</h3>
                            <p className="text-sm text-slate-500 font-medium mt-2">
                                Are you sure you want to clear all entered data? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmClearForm}
                                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* ═══════════════════════════════════════════
              PRESCRIPTION PREVIEW MODAL (PRINT MATCHING)
            ═══════════════════════════════════════════ */}
            <PrescriptionPreviewModal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                formData={formData}
                activeSpecialty={activeSpecialty}
                hospitalBranding={hospitalBranding}
                handlePrintDocument={handlePrintDocument}
                handleFinalizeFromPreview={handleFinalizeFromPreview}
                handleSendToPharma={handleSendToPharma}
                sentToPharma={sentToPharma}
            />

            {showNoPharmaWarn && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-6">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Pharmacy Integration</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                You haven't sent this prescription to the hospital pharmacy. In-house patients might face delays in medication acquisition.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setShowNoPharmaWarn(false);
                                        handleSendToPharma();
                                    }}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    Send to Pharma First
                                </button>
                                <button
                                    onClick={confirmSaveWithoutPharma}
                                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Continue Without Pharma
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Medical History Drawer Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 h-full w-full sm:max-w-2xl sm:ml-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-border-theme">
                        {/* Drawer Header */}
                        <div className="p-4 sm:p-6 border-b border-border-theme flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                                    <History size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-gray-900 dark:text-white">Medical History</h3>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Past visits, prescriptions & lab reports</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-muted-foreground shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Full History Toggle Pill Inside Modal */}
                        <div className="p-3 sm:p-4 border-b border-border-theme bg-amber-50/50 dark:bg-amber-950/10">
                            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showFullHistory ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <Building size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-tight text-foreground">View Full Patient History</h4>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">
                                            {showFullHistory ? 'Accessing complete medical records across network' : 'Showing records from current facility only'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowFullHistory(!showFullHistory)}
                                    className={`w-12 h-6 rounded-full transition-all relative p-1 ${showFullHistory ? 'bg-amber-500 shadow-sm shadow-amber-500/30' : 'bg-gray-200 dark:bg-gray-800'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-all transform ${showFullHistory ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-border-theme px-3 sm:px-6 bg-white dark:bg-gray-900 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setHistoryTab('visits')}
                                className={`py-3.5 px-3 sm:px-4 font-bold text-[10px] sm:text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${historyTab === 'visits' ? 'border-amber-500 text-amber-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                <Stethoscope size={14} /> Visits ({patientHistoryData.visits.length})
                            </button>
                            <button
                                onClick={() => setHistoryTab('prescriptions')}
                                className={`py-3.5 px-3 sm:px-4 font-bold text-[10px] sm:text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${historyTab === 'prescriptions' ? 'border-amber-500 text-amber-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                <FileText size={14} /> Prescriptions ({patientHistoryData.prescriptions.length})
                            </button>
                            <button
                                onClick={() => setHistoryTab('reports')}
                                className={`py-3.5 px-3 sm:px-4 font-bold text-[10px] sm:text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${historyTab === 'reports' ? 'border-amber-500 text-amber-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                <FlaskConical size={14} /> Lab Reports ({patientHistoryData.reports.length})
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Fetching medical records...</span>
                                </div>
                            ) : (
                                <>
                                    {historyTab === 'visits' && (
                                        patientHistoryData.visits.length === 0 ? (
                                            <div className="text-center py-16 text-muted-foreground text-xs font-bold uppercase tracking-widest">No previous visits found</div>
                                        ) : (
                                            patientHistoryData.visits.map((visit: any, idx: number) => (
                                                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-border-theme space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-xs font-black text-foreground">{visit.diagnosis || visit.reason || 'General Consultation'}</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground">
                                                            {(visit.consultationStartTime || visit.createdAt || visit.date) ? new Date(visit.consultationStartTime || visit.createdAt || visit.date).toLocaleDateString('en-GB') : 'N/A'}
                                                            {visit.time && ` at ${visit.time}`}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-1">
                                                        <Stethoscope size={10} /> {(() => {
                                                            const dName = visit.doctor?.user?.name || visit.doctor?.name || visit.doctorName || 'Unknown';
                                                            return dName.toLowerCase().startsWith('dr') ? dName : `Dr. ${dName}`;
                                                        })()} {visit.department && `(${visit.department})`}
                                                        {(visit.hospital?.name || visit.hospitalName) && (
                                                            <>
                                                                <span className="mx-1 text-gray-300">•</span>
                                                                <Building size={10} className="text-gray-400" />
                                                                <span className="text-gray-500">{visit.hospital?.name || visit.hospitalName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {visit.symptoms && (
                                                        <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 p-2 rounded-lg bg-white dark:bg-slate-900/50">
                                                            <span className="font-bold text-slate-800 dark:text-slate-300">SYMPTOMS:</span> {Array.isArray(visit.symptoms) ? visit.symptoms.join(', ') : visit.symptoms}
                                                        </div>
                                                    )}
                                                    {visit.vitals && Object.keys(visit.vitals).length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {Object.entries(visit.vitals).map(([k, v]) => (
                                                                v ? <span key={k} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-semibold text-slate-500 uppercase">{k}: {v as string}</span> : null
                                                            ))}
                                                        </div>
                                                    )}
                                                    {visit.clinicalNotes && <p className="text-xs text-muted-foreground line-clamp-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">{visit.clinicalNotes}</p>}
                                                </div>
                                            ))
                                        )
                                    )}
                                    {historyTab === 'prescriptions' && (
                                        patientHistoryData.prescriptions.length === 0 ? (
                                            <div className="text-center py-16 text-muted-foreground text-xs font-bold uppercase tracking-widest">No prescriptions found</div>
                                        ) : (
                                            patientHistoryData.prescriptions.map((rx: any, idx: number) => (
                                                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-border-theme space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-xs font-black text-foreground">{rx.diagnosis || 'Prescription'}</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground">{(rx.createdAt || rx.date) ? new Date(rx.createdAt || rx.date).toLocaleDateString('en-GB') : 'N/A'}</span>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-1">
                                                        <Stethoscope size={10} /> {(() => {
                                                            const dName = rx.doctor?.user?.name || rx.doctor?.name || rx.doctorName || 'Unknown';
                                                            return dName.toLowerCase().startsWith('dr') ? dName : `Dr. ${dName}`;
                                                        })()}
                                                        {(rx.hospital?.name || rx.hospitalName) && (
                                                            <>
                                                                <span className="mx-1 text-gray-300">•</span>
                                                                <Building size={10} className="text-gray-400" />
                                                                <span className="text-gray-500">{rx.hospital?.name || rx.hospitalName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                                        {(rx.medicines || []).map((m: any, mIdx: number) => {
                                                            let freqDisplay = 'Directed';
                                                            if (m.freq) {
                                                                if (typeof m.freq === 'string') freqDisplay = m.freq;
                                                                else if (m.freq.type === 'custom') freqDisplay = `Every ${m.freq.custom?.interval} hrs`;
                                                                else if (m.freq.standard) freqDisplay = Object.values(m.freq.standard).filter(v => v !== 'off').length + ' times/day';
                                                            }
                                                            return (
                                                                <div key={mIdx} className="flex flex-col p-2 bg-white dark:bg-gray-900 border border-border-theme rounded-lg">
                                                                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                                                        <Pill size={12} className="text-amber-500 shrink-0" />
                                                                        <span className="truncate">{m.name}</span> <span className="text-muted-foreground font-medium text-[10px] whitespace-nowrap">({m.dosage})</span>
                                                                    </span>
                                                                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
                                                                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded truncate">{m.form || 'Tab'}</span>
                                                                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded truncate">{freqDisplay}</span>
                                                                        <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded truncate">{m.duration}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    )}
                                    {historyTab === 'reports' && (
                                        patientHistoryData.reports.length === 0 ? (
                                            <div className="text-center py-16 text-muted-foreground text-xs font-bold uppercase tracking-widest">No lab reports found</div>
                                        ) : (
                                            patientHistoryData.reports.map((rep: any, idx: number) => (
                                                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-border-theme flex flex-col">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="min-w-0 flex-1 pr-4">
                                                            <span className="text-xs font-black text-foreground block break-words">
                                                                {(() => {
                                                                    const rawName = rep.name || rep.testName || 'Lab Investigation Order';
                                                                    const parts = rawName.split(',').map((s: any) => s.trim()).filter(Boolean);
                                                                    return Array.from(new Set(parts)).join(', ');
                                                                 })()}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full ${rep.status?.toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    {rep.status || 'Pending'}
                                                                </span>
                                                                <span className="text-[9px] font-mono text-muted-foreground">#{rep.tokenNumber || rep._id?.slice(-6).toUpperCase()}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-muted-foreground shrink-0">{(rep.createdAt || rep.date) ? new Date(rep.createdAt || rep.date).toLocaleDateString('en-GB') : 'N/A'}</span>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0 flex flex-wrap items-center gap-1 mb-2">
                                                        <Stethoscope size={10} /> {(() => {
                                                            const dName = rep.suggestedPrimaryDoctor || rep.doctor?.user?.name || rep.doctor?.name || rep.doctorName;
                                                            if (!dName || dName === 'N/A' || dName === 'Unknown') return 'Ordered Physician';
                                                            return dName.toLowerCase().startsWith('dr') ? dName : `Dr. ${dName}`;
                                                        })()}
                                                        {(rep.hospital?.name || rep.hospitalName) && (
                                                            <>
                                                                <span className="mx-1 text-gray-300">•</span>
                                                                <Building size={10} className="text-gray-400" />
                                                                <span className="text-gray-500">{rep.hospital?.name || rep.hospitalName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    
                                                    {rep.results && rep.results.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border-theme">
                                                            {rep.results.map((test: any, tIdx: number) => (
                                                                <span key={tIdx} className={`px-2 py-1 border rounded-md text-[9px] font-bold flex items-center gap-1 ${test.result ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20' : 'bg-white dark:bg-gray-900 border-border-theme text-foreground'}`}>
                                                                    <FlaskConical size={10} className={test.result ? 'text-emerald-500' : 'text-gray-400'} />
                                                                    {test.testName}
                                                                    {test.result && (
                                                                        <span className="ml-1 pl-1 border-l border-emerald-200 text-emerald-800 dark:text-emerald-400">{test.result}</span>
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {rep.status?.toLowerCase() === 'completed' && (
                                                        <div className="mt-3 flex justify-end">
                                                            <button 
                                                                onClick={() => window.open(`/${hospitalId}/doctor/lab-results/${rep._id || rep.id}`, '_blank')}
                                                                className="px-3 py-1.5 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                                            >
                                                                <FileText size={12} /> View Report
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )
                                    )}
                                </>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-border-theme bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                            <button
                                onClick={() => {
                                    const targetPatientId = patientId;
                                    if (targetPatientId) {
                                        window.open(`/${hospitalId}/doctor/patients/${targetPatientId}`, '_blank');
                                    }
                                }}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all"
                            >
                                Open Full Profile Page
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default React.memo(CreatePrescriptionPage);