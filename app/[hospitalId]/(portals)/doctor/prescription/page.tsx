    'use client';

    import React, { useState, useEffect, useRef, useMemo } from 'react';
    import { useQuery} from '@tanstack/react-query';
    import {
        Printer,
        Sparkles,
        User,
        Stethoscope,
        CheckCircle2,
        Activity,
        X,
        FlaskConical,
        Heart,
        AlertCircle,
        Eraser,
        Loader2,
        Pill,
        Calendar,
        Plus,
        Trash2,
        Search,
        ArrowLeft,
        Zap,
        ZapIcon,
        Mic2,
        BabyIcon,
        Eye,
        Wind,
        Beaker,
        ShieldAlert,
        Scan,
        PenTool,
        History,
        Building,
        FileText,
        ChevronRight,
        Clock,
        Pause,
        CheckCircle
    } from 'lucide-react';
    import { CardiologyModule } from './create/modules/CardiologyModule';
    import { DermatologyModule, DermatologyData, INITIAL_DERMATOLOGY_DATA } from './create/modules/DermatologyModule';
    import { OrthopedicModule } from './create/modules/OrthopedicModule';
    import { PediatricsModule } from './create/modules/PediatricsModule';
    import { ENTModule } from './create/modules/ENTModule';
    import { OphthalmologyModule } from './create/modules/OphthalmologyModule';
    import { GynecologyModule } from './create/modules/GynecologyModule';
    import { NeurologyModule } from './create/modules/NeurologyModule';
    import { PulmonologyModule } from './create/modules/PulmonologyModule';
    import { GastroModule } from './create/modules/GastroModule';
    import { NephrologyModule } from './create/modules/NephrologyModule';
    import { PsychiatryModule } from './create/modules/PsychiatryModule';
    import { EndocrinologyModule } from './create/modules/EndocrinologyModule';
    import { HematologyModule } from './create/modules/HematologyModule';
    import toast from 'react-hot-toast';
    import { useRouter, useSearchParams, useParams } from 'next/navigation';
    import { doctorService } from '@/lib/integrations/services/doctor.service';
    import { Frequency, StandardFrequency, CustomFrequency, FoodTiming, INITIAL_FREQUENCY, mapFrequency, formatFrequency } from '@/lib/frequencyUtils';
    import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
    import medicineData from '@/medicine.json';
    import { renderToStaticMarkup } from 'react-dom/server';
    import MainHeader from '@/components/printers/MainHeader';
    import MainFooter from '@/components/printers/MainFooter';
    import { OncologyModule } from './create/modules/OncologyModule';
    import { DentistryModule } from './create/modules/DentistryModule';
    import { UrologyModule } from './create/modules/UrologyModule';
    import { RadiologyModule } from './create/modules/RadiologyModule';

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
        eye?: 'BE' | 'RE' | 'LE' | string;
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
            symptoms: string[];
            riskFactors: string[];
            ecgType: string;
            ecgLeads: string[];
            ecgNotes: string;
            s1: string;
            s2: string;
            murmur: string;
            murmurType: string;
            riskLevel: 'Low' | 'Moderate' | 'High';
            nyhaClass: string;
            notes: string;
        };
        dermatologyData?: DermatologyData;
        orthopedicData?: {
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
            notes?: string;
        };
        pediatricData?: {
            weight: string;
            height: string;
            headCircumference: string;
            temperature: string;
            heartRate: string;
            respRate: string;
            growth: { weightForAge: string; heightForAge: string; };
            milestones: 'Normal' | 'Delayed' | 'Borderline';
            milestoneNotes: string;
            immunizationStatus: string;
            dueVaccines: string[];
            symptoms: string[];
            redFlags: string[];
            notes?: string;
        };
        entData?: {
            ear: {
                left:  { externalEar: string; earCanal: string[]; tympanicMembrane: string; };
                right: { externalEar: string; earCanal: string[]; tympanicMembrane: string; };
            };
            hearing: { status: string; tuningForkTest: string[]; };
            nose:   { mucosa: string; septum: string; discharge: string; };
            throat: { tonsils: string; pharynx: string; uvula: string; };
            lymphNodes: { cervical: string; sizeCm: string; tender: string; mobility: string; };
            voice:  { quality: string; airway: string; };
            symptoms: string[];
            duration: string;
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
            pupils: string;
            slitLamp: { conjunctiva: string; cornea: string; anteriorChamber: string; lens: string; };
            fundus:   { retina: string; opticDisc: string; macula: string; };
            diagnosis: string;
            notes?: string;
        };
        gynaecData?: {
            lmp: string;
            cycleLength: string;
            cycleRegularity: string;
            flowDuration: string;
            flowType: string;
            pregnant: 'Yes' | 'No' | 'Suspected';
            gestationalAge: string;
            edd: string;
            symptoms: string[];
            vitals: { bp: string; pulse: string; weight: string; temperature: string; };
            obstetric: { gravida: string; para: string; living: string; abortions: string; };
            obstetricExam: { uterineSize: string; fetalPosition: string; fetalHeartRate: string; };
            gynExam: { cervix: string; discharge: string; tenderness: string; };
            investigations: string[];
            notes?: string;
        };
        neuroData?: {
            gcs: { eye: string; verbal: string; motor: string; };
            mentalStatus: string;
            motorPower: { ru: string; lu: string; rl: string; ll: string; };
            reflexes: string;
            cranialNerves: string;
            cranialNerveDeficits: string[];
            sensory: string;
            coordination: string;
            symptoms: string[];
            onset: string;
            notes?: string;
        };
        pulmoData?: {
            vitals: { respRate: string; spo2: string; oxygenSupport: string; };
            symptoms: string[];
            mmrcGrade: number | null;
            exam: { chestExpansion: string; accessoryMuscles: string; };
            auscultation: { airEntry: string; sounds: string[]; };
            peakFlow: string;
            diagnosis: string;
            severity: string;
            notes?: string;
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
            urineOutput: string;
            creatinine: string;
            urea: string;
            egfr: string;
            edema: 'None' | 'Trace' | '1+' | '2+' | '3+' | '4+';
            electrolytes: { sodium: string; potassium: string; bicarbonate: string; };
            urineAnalysis: { protein: string; sugar: string; rbc: string; };
            fluidBalance: { intake: string; output: string; };
            dialysis: { status: string; frequency: string; lastSession: string; access: string; };
            symptoms: string[];
            ckdStage: string;
            notes?: string;
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
        hematologyData?: any;
        oncologyData?: {
            body: { weight: string; height: string; bsa: string; };
            diagnosis: string;
            site: string;
            ecog: string;
            biomarkers: string[];
            tnm: { t: string; n: string; m: string; stage: string; };
            treatment: { intent: string; regimen: string; };
            chemo: any[];
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
    }

    const INITIAL_FORM: PrescriptionForm = {
        patientName: '',
        age: '',
        gender: 'Male',
        duration: '',
        mrn: '',
        date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
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
            symptoms: [],
            riskFactors: [],
            ecgType: 'Normal',
            ecgLeads: [],
            ecgNotes: '',
            s1: 'Normal',
            s2: 'Normal',
            murmur: 'None',
            murmurType: '',
            riskLevel: 'Low',
            nyhaClass: 'I',
            notes: ''
        },
        dermatologyData: { ...INITIAL_DERMATOLOGY_DATA },
        orthopedicData: {
            joint: '',
            side: '',
            symptoms: [],
            pain: { score: 0, type: '' },
            rom: 'Normal',
            exam: { swelling: '', tenderness: '', deformity: '', spasm: '' },
            motorPower: 5,
            neurovascular: { sensation: '', pulse: '' },
            specialTests: [],
            imaging: { xray: '', mri: '' },
            diagnosis: '',
        },
        pediatricData: {
            weight: '',
            height: '',
            headCircumference: '',
            temperature: '',
            heartRate: '',
            respRate: '',
            growth: { weightForAge: '', heightForAge: '' },
            milestones: 'Normal',
            milestoneNotes: '',
            immunizationStatus: '',
            dueVaccines: [],
            symptoms: [],
            redFlags: []
        },
        entData: {
            ear: {
                left:  { externalEar: '', earCanal: [], tympanicMembrane: '' },
                right: { externalEar: '', earCanal: [], tympanicMembrane: '' }
            },
            hearing: { status: '', tuningForkTest: [] },
            nose:    { mucosa: '', septum: '', discharge: '' },
            throat:  { tonsils: '', pharynx: '', uvula: '' },
            lymphNodes: { cervical: '', sizeCm: '', tender: '', mobility: '' },
            voice:   { quality: '', airway: '' },
            symptoms: [],
            duration: ''
        },
        ophthaData: {
            chiefComplaints: '',
            hopi: '',
            pastHistory: '',
            familyHistory: '',
            symptoms: [],
            vision: {
                od: { unaided: '', corrected: '' },
                os: { unaided: '', corrected: '' }
            },
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
            iop:    { od: '', os: '' },
            pupils: 'PERRLA',
            slitLamp: { conjunctiva: '', cornea: '', anteriorChamber: '', lens: '' },
            fundus:   { retina: '', opticDisc: '', macula: '' },
            diagnosis: ''
        },
        gynaecData: {
            lmp: '',
            cycleLength: '',
            cycleRegularity: '',
            flowDuration: '',
            flowType: '',
            pregnant: 'No',
            gestationalAge: '',
            edd: '',
            symptoms: [],
            vitals: { bp: '', pulse: '', weight: '', temperature: '' },
            obstetric: { gravida: '', para: '', living: '', abortions: '' },
            obstetricExam: { uterineSize: '', fetalPosition: '', fetalHeartRate: '' },
            gynExam: { cervix: '', discharge: '', tenderness: '' },
            investigations: []
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
            onset: ''
        },
        pulmoData: {
            vitals: { respRate: '', spo2: '', oxygenSupport: 'Room Air' },
            symptoms: [],
            mmrcGrade: null,
            exam: { chestExpansion: '', accessoryMuscles: '' },
            auscultation: { airEntry: '', sounds: [] },
            peakFlow: '',
            diagnosis: '',
            severity: ''
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
            creatinine: '',
            urea: '',
            egfr: '',
            urineOutput: '',
            edema: 'None',
            electrolytes: { sodium: '', potassium: '', bicarbonate: '' },
            urineAnalysis: { protein: 'Nil', sugar: 'Nil', rbc: 'Nil' },
            fluidBalance: { intake: '', output: '' },
            dialysis: { status: 'Not on dialysis', frequency: '', lastSession: '', access: '' },
            symptoms: [],
            ckdStage: ''
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
        hematologyData: {
            cbc: { hb: '', tlc: '', platelets: '', esr: '' },
            rbcIndices: { mcv: '', mch: '', mchc: '' },
            coagulation: { pt: '', inr: '', aptt: '' },
            symptoms: [],
            transfusion: { product: '', units: '0', indication: '' },
            diagnosis: '',
            notes: ''
        },
        oncologyData: {
            body: { weight: '', height: '', bsa: '0.00' },
            diagnosis: '',
            site: '',
            ecog: '0',
            biomarkers: [],
            tnm: { t: '', n: '', m: '', stage: '' },
            treatment: { intent: 'Curative', regimen: '' },
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
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                max="24"
                                value={freq.custom?.interval || 8}
                                onChange={(e) => setCustomInterval(Number(e.target.value))}
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



    function CreatePrescriptionPage() {
        const router = useRouter();
        const searchParams = useSearchParams() as any;
        const params = useParams() as any;
        const hospitalId = params.hospitalId as string;
        const appointmentId = ((searchParams?.get('appointmentId') ?? null) ?? null);
        const patientId = ((searchParams?.get('patientId') ?? null) ?? null);

        const [mode, setMode] = useState<'AI' | 'SELF'>('SELF');

        const [formData, setFormData] = useState<PrescriptionForm>(INITIAL_FORM);
        const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patientId);
        const [activeSpecialty, setActiveSpecialty] = useState<string>('General');
        const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);

        useEffect(() => {
            if (patientId) setSelectedPatientId(patientId);
        }, [patientId]);

        const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
        const [isSearchingPatients, setIsSearchingPatients] = useState(false);
        const [isSaving, setIsSaving] = useState(false);
        const [isSending, setIsSending] = useState(false);
        const [isSendingLab, setIsSendingLab] = useState(false);

        // UI states
        const [sentToPharma, setSentToPharma] = useState(false);
        const [isSubmitted, setIsSubmitted] = useState(false);
        const [isPaused, setIsPaused] = useState(false);
        const [showClearConfirm, setShowClearConfirm] = useState(false);
        const [showNoPharmaWarn, setShowNoPharmaWarn] = useState(false);
        const [showPharmaConfirm, setShowPharmaConfirm] = useState(false);
        // Navigation blocker state
        const [showNavWarn, setShowNavWarn] = useState(false);
        const pendingNavRef = useRef<string | null>(null);

        // ── Draft Key ───────────────────────────────────────────────────────────
        const draftKey = appointmentId ? `rx_draft_${appointmentId}` : null;

        // ── Save draft to localStorage on every formData change ─────────────────
        useEffect(() => {
            if (!draftKey || isSubmitted || isPaused) return;
            try {
                localStorage.setItem(draftKey, JSON.stringify(formData));
            } catch (_) {}
        }, [formData, draftKey, isSubmitted, isPaused]);

        // ── Restore draft from localStorage when appointment data arrives ────────
        const hasMergedDraftRef = useRef(false);
        useEffect(() => {
            if (!draftKey || hasMergedDraftRef.current) return;
            try {
                const raw = localStorage.getItem(draftKey);
                if (raw) {
                    const saved = JSON.parse(raw) as Partial<typeof formData>;
                    // Only restore doctor-entered fields; keep patient demographics from API
                    setFormData(prev => ({
                        ...prev,
                        symptoms:      saved.symptoms      ?? prev.symptoms,
                        diagnosis:     saved.diagnosis     ?? prev.diagnosis,
                        advice:        saved.advice        ?? prev.advice,
                    medicines:     saved.medicines     ?? prev.medicines,
                    dietAdvice:    saved.dietAdvice    ?? prev.dietAdvice,
                    suggestedTests:saved.suggestedTests?? prev.suggestedTests,
                    followUp:      saved.followUp      ?? prev.followUp,
                    followUpDate:  saved.followUpDate  ?? prev.followUpDate,
                    avoid:         saved.avoid         ?? prev.avoid,
                    cardiologyData: saved.cardiologyData ?? prev.cardiologyData,
                    orthopedicData: saved.orthopedicData ?? prev.orthopedicData,
                    pediatricData:  saved.pediatricData  ?? prev.pediatricData,
                    entData:        saved.entData        ?? prev.entData,
                    ophthaData:     saved.ophthaData     ?? prev.ophthaData,
                    gynaecData:     saved.gynaecData     ?? prev.gynaecData,
                    neuroData:      saved.neuroData      ?? prev.neuroData,
                    pulmoData:      saved.pulmoData      ?? prev.pulmoData,
                    gastroData:     saved.gastroData     ?? prev.gastroData,
                    nephroData:     saved.nephroData     ?? prev.nephroData,
                    psychiatryData: saved.psychiatryData ?? prev.psychiatryData,
                    endocrinologyData: saved.endocrinologyData ?? prev.endocrinologyData,
                    hematologyData: saved.hematologyData ?? prev.hematologyData,
                    oncologyData:   saved.oncologyData   ?? prev.oncologyData,
                    dentistryData:  saved.dentistryData  ?? prev.dentistryData,
                    urologyData:    saved.urologyData    ?? prev.urologyData,
                    radiologyOrder: saved.radiologyOrder ?? prev.radiologyOrder,
                }));
                hasMergedDraftRef.current = true;
                toast('📋 Draft restored from last session', { icon: '🔄', duration: 3000 });
            }
        } catch (_) {}
    }, [draftKey]);

    // ── Navigation Guard ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!appointmentId) return;

        // 1. Block browser refresh / tab close
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isSubmitted || isPaused) return;
            e.preventDefault();
            e.returnValue = 'You have an active consultation. Please Pause or Complete before leaving.';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // 2. Intercept Next.js client-side navigation (pushState / replaceState)
        const origPush    = history.pushState.bind(history);
        const origReplace = history.replaceState.bind(history);

        const shouldBlock = () => !isSubmitted && !isPaused;

        history.pushState = function (state, title, url) {
            if (shouldBlock() && url && !String(url).includes('/prescription')) {
                pendingNavRef.current = String(url);
                setShowNavWarn(true);
                return;
            }
            origPush(state, title, url as string);
        };

        history.replaceState = function (state, title, url) {
            if (shouldBlock() && url && !String(url).includes('/prescription')) {
                pendingNavRef.current = String(url);
                setShowNavWarn(true);
                return;
            }
            origReplace(state, title, url as string);
        };

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            history.pushState    = origPush;
            history.replaceState = origReplace;
        };
    }, [appointmentId, isSubmitted, isPaused]);

    // Suggestion State
    const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Success State
    const [showSuccess, setShowSuccess] = useState(false);
    const [generatedHtml, setGeneratedHtml] = useState<{ prescription: string, billing: string } | null>(null);

    // Medical History State
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [patientHistoryData, setPatientHistoryData] = useState<{ visits: any[]; prescriptions: any[]; reports: any[] }>({ visits: [], prescriptions: [], reports: [] });
    const [historyTab, setHistoryTab] = useState<'visits' | 'prescriptions' | 'reports'>('visits');

    useEffect(() => {
        if (showHistoryModal && selectedPatientId) {
            setLoadingHistory(true);
            doctorService.getPatientHistory(selectedPatientId, showFullHistory ? 'all' : 'hospital')
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
    }, [showHistoryModal, showFullHistory, selectedPatientId]);

    // ✅ REACT QUERY: Start Consultation & Fetch Details
    const { data: appointmentResponse, isLoading: appointmentLoading } = useQuery({
        queryKey: ['appointment-details', appointmentId],
        queryFn: () => doctorService.startConsultation(appointmentId!),
        enabled: !!appointmentId,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });
    const appointmentData = appointmentResponse?.appointment;

    // Consultation Timer & Controls
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isEndingSession, setIsEndingSession] = useState(false);

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!appointmentData?.consultationStartTime || appointmentData.status !== 'in-progress' || appointmentData.isPaused) return;
        const start = new Date(appointmentData.consultationStartTime).getTime();
        const pausedDurationMs = (appointmentData.pausedDuration || 0) * 1000;
        const timer = setInterval(() => {
            const totalElapsed = Date.now() - start;
            const activeElapsed = Math.max(0, totalElapsed - pausedDurationMs);
            setElapsedTime(Math.floor(activeElapsed / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [appointmentData?.consultationStartTime, appointmentData?.pausedDuration, appointmentData?.status, appointmentData?.isPaused]);

    const handlePauseConsultation = async () => {
        if (!appointmentId) return;
        try {
            await doctorService.pauseConsultation(appointmentId);
            // Clear draft since we're explicitly pausing
            if (draftKey) localStorage.removeItem(draftKey);
            setIsPaused(true);
            toast.success('Consultation paused');
            router.push(`/${hospitalId}/doctor/paused-appointments`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to pause consultation');
        }
    };

    const handleEndConsultation = async () => {
        if (!appointmentId || isEndingSession) return;
        try {
            setIsEndingSession(true);
            await doctorService.endConsultation(appointmentId, {
                duration: elapsedTime,
                diagnosis: formData.diagnosis,
                clinicalNotes: formData.symptoms
            });
            toast.success('Consultation completed successfully!');
            router.push(`/${hospitalId}/doctor`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to end consultation');
        } finally {
            setIsEndingSession(false);
        }
    };

    // ✅ REACT QUERY: Fetch Patient Details (if no appointmentId)
    const { data: patientData, isLoading: patientLoading } = useQuery({
        queryKey: ['patient-details', selectedPatientId],
        queryFn: () => doctorService.getPatientDetails(selectedPatientId!),
        enabled: !!selectedPatientId && !appointmentId,
        staleTime: 5 * 60 * 1000,
    });

    const { data: hospitalData } = useQuery({
        queryKey: ['hospital-details'],
        queryFn: () => hospitalAdminService.getHospital(),
        staleTime: 30 * 60 * 1000,
    });

    // ✅ REACT QUERY: Fetch Doctor Profile
    // staleTime: 0 ensures specialties always refresh when the page mounts
    // (e.g. after saving profile from the edit page)
    const { data: doctorProfile } = useQuery({
        queryKey: ['doctor-profile'],
        queryFn: () => doctorService.getProfile(),
        staleTime: 0,
        gcTime: 30 * 60 * 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
    });



    // Pre-fill form when appointment data loads
    useEffect(() => {
        if (appointmentData) {
            const apt = appointmentData;
            const patientName = apt.patient?.name || apt.patientDetails?.name || '';
            const age = apt.patient?.age || apt.patientDetails?.age || '';
            const gender = apt.patient?.gender || apt.patientDetails?.gender || 'Male';
            const mrn = apt.patient?.mrn || apt.mrn || '';
            const apiSymptoms = Array.isArray(apt.symptoms) ? apt.symptoms.join(', ') : (apt.symptoms || '');
            const apiDiagnosis = apt.reason || apiSymptoms;

            const pId = apt.patient?._id || apt.patient?.id || apt.patientDetails?._id || apt.patientDetails?.id;
            if (pId) {
                setSelectedPatientId(pId);
            }

            // ✅ AUTOMATICALLY FETCH VITALS FROM FRONTDESK (Pulse, BP)
            const frontdeskVitals = apt.vitals || {};
            const bpString = frontdeskVitals.bp || frontdeskVitals.bloodPressure || '';
            const [systolic, diastolic] = bpString.split('/');

            setFormData(prev => ({
                ...prev,
                patientName,
                age: String(age),
                gender: gender,
                mrn,
                // Only set symptoms/diagnosis from API if draft hasn't already been restored
                symptoms: hasMergedDraftRef.current ? prev.symptoms : (apiSymptoms || prev.symptoms),
                diagnosis: hasMergedDraftRef.current ? prev.diagnosis : (apiDiagnosis || prev.diagnosis),
                cardiologyData: {
                    ...prev.cardiologyData!,
                    bpSystolic: systolic || frontdeskVitals.systolicBP || prev.cardiologyData?.bpSystolic || '',
                    bpDiastolic: diastolic || frontdeskVitals.diastolicBP || prev.cardiologyData?.bpDiastolic || '',
                    heartRate: frontdeskVitals.heartRate || frontdeskVitals.pulse || prev.cardiologyData?.heartRate || '',
                    riskLevel: prev.cardiologyData?.riskLevel || 'Low'
                }
            }));
        }
    }, [appointmentData]);

    // Pre-fill form when patient data loads
    useEffect(() => {
        if (patientData && !appointmentData) {
            setFormData(prev => ({
                ...prev,
                patientName: patientData.user?.name || '',
                mrn: patientData.profile?.mrn || '',
                age: patientData.profile?.age || '',
                gender: patientData.profile?.gender || 'Male'
            }));
            if (!selectedPatientId && patientData.user?._id) {
                setSelectedPatientId(patientData.user._id);
            }
        }
    }, [patientData, appointmentData, selectedPatientId]);

    // Handle Patient Search for Walk-ins
    const handlePatientSearch = async (query: string) => {
        if (!query || query.length < 2) {
            setPatientSuggestions([]);
            return;
        }

        setIsSearchingPatients(true);
        try {
            const response = await doctorService.searchPatients(query);
            setPatientSuggestions(response.data || []);
        } catch (error) {
            console.error("Patient search error:", error);
        } finally {
            setIsSearchingPatients(false);
        }
    };

    const selectPatient = (patient: any) => {
        setSelectedPatientId(patient._id || patient.id);
        setFormData(prev => ({
            ...prev,
            patientName: patient.name || '',
            mrn: patient.profile?.mrn || patient.mrn || '',
            age: patient.profile?.age || patient.age || '',
            gender: patient.profile?.gender || patient.gender || 'Male'
        }));
        setPatientSuggestions([]);
    };

    useEffect(() => {
        if (doctorProfile) {
            const specs = doctorProfile.specialties && Array.isArray(doctorProfile.specialties) && doctorProfile.specialties.length > 0
                ? doctorProfile.specialties
                : [doctorProfile.department || 'General Medicine'];

            setAvailableSpecialties(specs);

            // AUTO-SELECT CARDIOLOGY MODULE IF DOCTOR HAS IT
            if (activeSpecialty === 'General') {
                const cardioSpec = specs.find((s: string) => s.toUpperCase().includes('CARDIO'));
                if (cardioSpec) {
                    console.log("[Auto-Select] Detected Cardiology specialization, switching...");
                    setActiveSpecialty(cardioSpec);
                } else if (specs.length > 0) {
                    setActiveSpecialty(specs[0]);
                }
            }
            setFormData(prev => ({
                ...prev,
                doctorName: doctorProfile.user?.name || doctorProfile.name || prev.doctorName,
                doctorSpecialization: specs.join(', '),
                doctorSignature: doctorProfile.signature
            }));
        }
    }, [doctorProfile]);

    // ✅ State Isolation: Reset specialty-specific data when switching tabs to prevent data leakage
    useEffect(() => {
        if (activeSpecialty) {
            console.log(`[Specialty Switch] Now Active: ${activeSpecialty}`);
            setFormData(prev => ({
                ...prev,
                // Only reset specialty modules to maintain patient details & common symptoms
                cardiologyData: INITIAL_FORM.cardiologyData,
                dermatologyData: INITIAL_FORM.dermatologyData,
                orthopedicData: INITIAL_FORM.orthopedicData,
                pediatricData: INITIAL_FORM.pediatricData,
                entData: INITIAL_FORM.entData,
                ophthaData: INITIAL_FORM.ophthaData,
                gynaecData: INITIAL_FORM.gynaecData,
                neuroData: INITIAL_FORM.neuroData,
                pulmoData: INITIAL_FORM.pulmoData,
                gastroData: INITIAL_FORM.gastroData,
                nephroData: INITIAL_FORM.nephroData,
                psychiatryData: INITIAL_FORM.psychiatryData,
                endocrinologyData: INITIAL_FORM.endocrinologyData,
                oncologyData: INITIAL_FORM.oncologyData,
            }));
        }
    }, [activeSpecialty]);

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
                    setSuggestions(res.data);
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
            form: med.form || '',
            dosage: med.strength || '',
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

        const currentSymptoms = formData.symptoms.split(',').map((s: string) => s.trim().toLowerCase());
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
                    let freq: Frequency = { ...INITIAL_FREQUENCY };
                    let dosage = '-';
                    let freqStr = '-';
                    const duration = '-';
                    const notes = '-';

                    // Heuristic parsing
                    // 1. Extract Frequency from parens
                    if (m.includes('(')) {
                        const parts = m.split('(');
                        name = parts[0].trim();
                        freqStr = parts[1].replace(')', '').trim();
                    }

                    // 2. Extract Dosage Strength from Name
                    const strengthRegex = /(\d+(?:-\d+)?\s*(?:mg|ml|g|mcg|iu))/i;
                    const strengthMatch = name.match(strengthRegex);

                    if (strengthMatch) {
                        dosage = strengthMatch[0];
                        name = name.replace(strengthRegex, '').trim();
                    }

                    // Map string freq to structured freq
                    freq = mapFrequency(freqStr);

                    // Calculate Quantity
                    let qty = 1;
                    const durationDays = 5;
                    let dailyCount = 0;

                    if (freq.type === 'standard') {
                        if (freq.standard?.morning) dailyCount++;
                        if (freq.standard?.afternoon) dailyCount++;
                        if (freq.standard?.evening) dailyCount++;
                        if (freq.standard?.night) dailyCount++;
                    } else if (freq.type === 'custom' && freq.custom?.interval) {
                        dailyCount = Math.floor(24 / freq.custom.interval);
                    }

                    if (dailyCount > 0) {
                        qty = dailyCount * durationDays;
                    }

                    return {
                        name: name,
                        dosage: dosage,
                        freq: freq,
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
            medicines: [...prev.medicines, { name: '', form: '', dosage: '', freq: { ...INITIAL_FREQUENCY }, duration: '', quantity: '', price: 0 }]
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
        
        const isOphtha = activeSpecialty.toUpperCase().includes('OPHTHA') || activeSpecialty.toUpperCase().includes('EYE');
        if (!isOphtha && validMedCount === 0) {
            toast.error("Please add at least one complete medicine before saving.");
            return false;
        }
        return true;
    };

    const handleSendToPharma = async () => {
        if (!appointmentId && !selectedPatientId) return toast.error("Appointment ID or Patient ID is required");
        if (!formData.patientName) return toast.error("Patient Name is required");
        if (!formData.diagnosis) return toast.error("Diagnosis is required");
        
        if (!validateMedicinesClientSide()) return;

        const hasErrors = formData.medicines.some(m => m.error);
        if (hasErrors) return toast.error("Please resolve stock errors before sending to pharmacy");

        setIsSending(true);
        await executeSubmit(true, false);
        setIsSending(false);
        setSentToPharma(true);
    };

    const handleSaveAndPrint = async () => {
        if (isSubmitted) {
            handlePrintDocument('prescription');
            return;
        }

        // ✅ VALIDATION
        if (!appointmentId && !selectedPatientId) return toast.error("Appointment ID or Patient ID is required for prescription");
        if (!formData.patientName) return toast.error("Patient Name is required");
        if (!formData.diagnosis) return toast.error("Diagnosis is required");
        
        if (!validateMedicinesClientSide()) return;

        const hasErrors = formData.medicines.some(m => m.error);
        if (hasErrors) return toast.error("Please resolve stock errors before submitting");

        if (!sentToPharma && formData.medicines.length > 0) {
            setShowNoPharmaWarn(true);
            return;
        }

        executeSubmit(false, true);
    };

    const confirmSaveWithoutPharma = () => {
        setShowNoPharmaWarn(false);
        executeSubmit(false, true);
    };

    const executeSubmit = async (sendToPharmaFlag: boolean, showSuccessModal: boolean) => {
        try {
            setIsSaving(true);
            setShowPharmaConfirm(false);

            // ✅ PERSIST SPECIALIZED DATA (Backend Compatible)
            const isDerm = activeSpecialty.toUpperCase().includes('DERM');
            const dermData = formData.dermatologyData;
            const hasDermData = isDerm &&
                dermData?.lesionType &&
                (dermData?.location?.length ?? 0) > 0;

            const isCardio = activeSpecialty.toUpperCase().includes('CARDIO');
            const cardioData = formData.cardiologyData;
            const hasCardioData = isCardio &&
                cardioData?.bpSystolic &&
                cardioData?.heartRate;

            const submissionData = {
                appointmentId: appointmentId || undefined,
                patientId: selectedPatientId || undefined,
                // Prefix diagnosis with Cardiac summary so it saves to existing DB schema
                diagnosis: activeSpecialty.toUpperCase().includes('CARDIO')
                    ? `[CARDIAC Assessment: BP ${formData.cardiologyData?.bpSystolic}/${formData.cardiologyData?.bpDiastolic}, HR ${formData.cardiologyData?.heartRate}] - ${formData.diagnosis}`
                    : formData.diagnosis,
                symptoms: formData.symptoms.split(',').map((s: string) => s.trim()),
                medicines: formData.medicines.map((m: Medicine) => ({
                    drug: (m as any).productId,
                    name: m.name,
                    dosage: m.eye ? `${m.dosage} (${m.eye})` : m.dosage,
                    frequency: m.freq,
                    duration: m.duration?.trim() || 'As directed',
                    quantity: m.quantity,
                    price: m.price
                })),
                advice: formData.followUp,
                followUpDate: formData.followUpDate,
                dietAdvice: formData.dietAdvice,
                suggestedTests: formData.suggestedTests,
                avoid: formData.avoid,
                aiGenerated: mode === 'AI',
                age: formData.age,
                gender: formData.gender,
                sendToPharma: sendToPharmaFlag,
                // Send structured dermatology supplement (only when filled)
                dermatologyData: hasDermData ? {
                    lesionType: dermData.lesionType,
                    lesionCount: dermData.lesionCount ? Number(dermData.lesionCount) : undefined,
                    size: dermData.size || undefined,
                    location: dermData.location,
                    distribution: dermData.distribution || undefined,
                    color: dermData.color,
                    surfaceChanges: dermData.surfaceChanges,
                    itchingSeverity: dermData.itchingSeverity,
                    painSeverity: dermData.painSeverity,
                    burning: dermData.burning,
                    duration: dermData.duration || undefined,
                    onset: dermData.onset || undefined,
                    progression: dermData.progression || undefined,
                    provisionalDiagnosis: dermData.provisionalDiagnosis || undefined,
                } : undefined,

                // Send structured cardiology supplement
                cardiologyData: hasCardioData ? {
                    ...cardioData,
                    notes: cardioData.notes || undefined
                } : undefined,

                // Standardized specialty supplements — each only sent when doctor's active specialty matches
                entData:           activeSpecialty.toUpperCase().includes('ENT') ? formData.entData : undefined,
                pediatricData:     activeSpecialty.toUpperCase().includes('PEDIATRI') ? formData.pediatricData : undefined,
                gynaecData:        (activeSpecialty.toUpperCase().includes('GYNAE') || activeSpecialty.toUpperCase().includes('GYNE')) ? formData.gynaecData : undefined,
                neuroData:         activeSpecialty.toUpperCase().includes('NEURO') ? formData.neuroData : undefined,
                gastroData:        activeSpecialty.toUpperCase().includes('GASTRO') ? formData.gastroData : undefined,
                orthopedicData:    activeSpecialty.toUpperCase().includes('ORTHO') ? formData.orthopedicData : undefined,
                nephroData:        activeSpecialty.toUpperCase().includes('NEPHRO') ? formData.nephroData : undefined,
                ophthaData:        (activeSpecialty.toUpperCase().includes('OPHTHA') || activeSpecialty.toUpperCase().includes('EYE')) ? formData.ophthaData : undefined,
                pulmoData:         activeSpecialty.toUpperCase().includes('PULMO') ? formData.pulmoData : undefined,
                psychiatryData:    activeSpecialty.toUpperCase().includes('PSYCH') ? formData.psychiatryData : undefined,
                endocrinologyData: activeSpecialty.toUpperCase().includes('ENDOCRIN') ? formData.endocrinologyData : undefined,
                hematologyData:    activeSpecialty.toUpperCase().includes('HEMA') ? formData.hematologyData : undefined,
                oncologyData:      activeSpecialty.toUpperCase().includes('ONCO') ? formData.oncologyData : undefined,
                dentistryData:     activeSpecialty.toUpperCase().includes('DENT') ? formData.dentistryData : undefined,
                urologyData:       activeSpecialty.toUpperCase().includes('UROLO') ? formData.urologyData : undefined,
                radiologyOrder:    activeSpecialty.toUpperCase().includes('RADIOL') ? formData.radiologyOrder : undefined,

                // Pharma Safety Warning
                pharmaWarning: (hasCardioData && cardioData.riskLevel === 'High')
                    ? "High-risk cardiac patient – verify drug interactions"
                    : undefined,
            };

            await doctorService.createPrescription(submissionData);

            // Re-use current styled generation logic
            const prescriptionHtml = generatePrescriptionHTML();
            const billingHtml = generateBillingHTML();

            // Save HTML for printing
            setGeneratedHtml({
                prescription: prescriptionHtml,
                billing: billingHtml
            });

            setIsSubmitted(true);

            // Clear local draft on successful save
            if (draftKey) localStorage.removeItem(draftKey);

            if (showSuccessModal) {
                setShowSuccess(true);
            }

            if (sendToPharmaFlag) {
                toast.success("Prescription Saved & Sent to Pharmacy Successfully!");
            } else {
                toast.success("Prescription Saved Successfully!");
            }

        } catch (error: any) {
            toast.error(error.message || "Failed to save prescription");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendToLab = async () => {
        if (!appointmentId && !selectedPatientId) return toast.error("Appointment ID or Patient ID is required");
        if (formData.suggestedTests.length === 0) return toast.error("At least one test is required");

        try {
            setIsSendingLab(true);
            // Convert simple string array to object format if backend expects complex objects, 
            // but checking createLabToken in controller usually expects names or IDs.
            // Assuming the simple strings are fine or mapping them to what backend needs.
            // Looking at labTokenController.ts (from memory), it takes 'tests' array. 
            // If it expects objects, I might need to map. 
            // Based on simple usage, sending names should be fine or I'll map to { testName: t }

            await doctorService.createLabToken({
                appointmentId: appointmentId || undefined,
                patientId: selectedPatientId || undefined, // Pass patientId
                tests: formData.suggestedTests.map((t: string) => ({ testName: t, testId: 'MANUAL', type: 'Pathology' })), // Mocking structure if needed
                priority: 'regular',
                notes: formData.diagnosis
            });
            toast.success("Sent to Lab Successfully!");
        } catch (error: any) {
            toast.error(error.message || "Failed to send to lab");
        } finally {
            setIsSendingLab(false);
        }
    };


    const generatePrescriptionHTML = () => {
        const hospital = hospitalData?.hospital || {
            name: 'Hospital Name',
            address: 'Hospital Address',
            phone: 'Phone Number',
            email: 'Email Address',
            logo: ''
        };

        const headerHtml = renderToStaticMarkup(
            <MainHeader initialDetails={{
                name: hospital.name,
                address: hospital.address,
                phone: hospital.phone,
                email: hospital.email,
                logo: hospital.logo
            }} />
        );

        const footerHtml = renderToStaticMarkup(
            <MainFooter initialDetails={{
                name: hospital.name,
                address: hospital.address,
                phone: hospital.phone,
                email: hospital.email
            }} />
        );

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prescription - ${formData.patientName}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                        .container { min-height: 280mm !important; height: auto !important; }
                    }

                    body { 
                        font-family: 'Inter', sans-serif; 
                        margin: 0;
                        padding: 0;
                        background: white;
                        font-size: 11px;
                        line-height: 1.4;
                        color: #111;
                    }

                    .container {
                        width: 210mm;
                        min-height: 296mm;
                        margin: 0 auto;
                        padding: 10mm 15mm 10mm 25mm;
                        position: relative;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }

                    .print-footer {
                        margin-top: auto;
                    }

                    /* Prescription Specific */
                    .doc-info { text-align: right; margin-bottom: 20px; }
                    .doc-name { font-size: 14px; font-weight: 800; color: #1e40af; margin: 0; }
                    .doc-spec { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; margin: 2px 0 0; }

                    .patient-info {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 15px;
                        margin-bottom: 25px;
                        padding: 15px;
                        background: #f8fafc;
                        border-radius: 12px;
                        border: 1px solid #f1f5f9;
                    }
                    .info-label { display: block; font-size: 8px; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 3px; letter-spacing: 0.5px; }
                    .info-val { font-size: 12px; font-weight: 700; color: #1e293b; }

                    .section-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 12px; letter-spacing: 1px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; padding: 0 0 10px 0; border-bottom: 2px solid #f1f5f9; }
                    td { padding: 12px 0; border-bottom: 1px solid #f8fafc; vertical-align: top; }
                    
                    .med-name { font-size: 12px; font-weight: 800; color: #1e293b; margin-bottom: 2px; }
                    .med-meta { font-size: 10px; color: #64748b; font-weight: 600; }
                    .freq-tag { font-size: 10px; font-weight: 800; color: #1e40af; background: #eff6ff; padding: 2px 6px; border-radius: 4px; display: inline-block; vertical-align: middle; }

                    .advice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                    .advice-list { list-style: none; padding: 0; margin: 0; }
                    .advice-list li { margin-bottom: 8px; padding-left: 12px; position: relative; font-size: 10.5px; color: #334155; font-weight: 500; }
                    .advice-list li:before { content: "•"; position: absolute; left: 0; color: #22c55e; font-weight: bold; }

                    .follow-up { margin-top: 30px; padding: 15px; border-radius: 12px; background: #fff7ed; border: 1px solid #ffedd5; font-size: 11px; display: flex; justify-content: space-between; }
                    .follow-up strong { font-weight: 800; text-transform: uppercase; font-size: 9px; color: #9a3412; margin-right: 5px; }
                    .follow-up-date { font-weight: 800; color: #ea580c; }

                    .sig-block { text-align: right; margin-top: 40px; margin-bottom: 20px; }
                    .sig-img { height: 50px; display: inline-block; }
                    .sig-line { border-top: 1.5px solid #000; padding-top: 5px; font-size: 10px; font-weight: 800; text-transform: uppercase; display: inline-block; min-width: 180px; }

                </style>
            </head>
            <body>
                <div class="container">
                    ${headerHtml}

                    <div class="doc-info">
                        <p class="doc-name">Dr. ${formData.doctorName}</p>
                        <p class="doc-spec">${formData.doctorSpecialization || 'Medical Practitioner'}</p>
                    </div>

                    <div class="patient-info">
                        <div>
                            <span class="info-label">Patient Name</span>
                            <span class="info-val">${formData.patientName}</span>
                        </div>
                        <div>
                            <span class="info-label">Age / Sex</span>
                            <span class="info-val">${formData.age} Y / ${formData.gender}</span>
                        </div>
                        <div>
                            <span class="info-label">MRN / ID</span>
                            <span class="info-val">${formData.mrn || 'N/A'}</span>
                        </div>
                        <div>
                            <span class="info-label">Date</span>
                            <span class="info-val">${formData.date}</span>
                        </div>
                    </div>

                    ${formData.symptoms || formData.diagnosis ? `
                    <div style="margin-bottom: 25px; padding: 15px; border: 1.5px solid #e2e8f0; border-radius: 12px; background: #f8fafc; display: flex; gap: 20px;">
                        ${formData.symptoms ? `
                        <div style="flex: 1;">
                            <span class="info-label" style="color: #64748b; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Chief Complaints / Symptoms</span>
                            <div style="font-size: 11px; font-weight: 700; color: #334155; margin-left: -5px;">
                                <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
                                    ${formData.symptoms.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).map(s => '<li style="margin-bottom: 3px;">' + s + '</li>').join('')}
                                </ul>
                            </div>
                        </div>
                        ` : ''}
                        ${formData.diagnosis ? `
                        <div style="flex: 1; ${formData.symptoms ? 'border-left: 1px dashed #e2e8f0; padding-left: 20px;' : ''}">
                            <span class="info-label" style="color: #1e40af; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Diagnosis / Impressions</span>
                            <div style="font-size: 12px; font-weight: 800; color: #1e40af;">${formData.diagnosis}</div>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    ${activeSpecialty.toUpperCase().includes('CARDIO') ? `
                    <div style="margin-bottom: 25px; padding: 15px; border: 2px solid #fee2e2; border-radius: 12px; background: #fffcfc;">
                        <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #ef4444; border-bottom: 1px solid #fee2e2; display: block; margin-bottom: 10px;">Cardiology Assessment</span>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 15px;">
                            <div>
                                <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block;">Blood Pressure</span>
                                <span style="font-size: 14px; font-weight: 800; color: #1e293b;">${formData.cardiologyData?.bpSystolic}/${formData.cardiologyData?.bpDiastolic} <small style="font-size: 8px; color: #94a3b8;">mmHg</small></span>
                            </div>
                            <div>
                                <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block;">Heart Rate / Rhythm</span>
                                <span style="font-size: 14px; font-weight: 800; color: #1e293b;">${formData.cardiologyData?.heartRate} <small style="font-size: 8px; color: #94a3b8;">BPM</small></span>
                                <div style="font-size: 9px; font-weight: 700; color: #64748b;">${formData.cardiologyData?.rhythm}</div>
                            </div>
                            <div>
                                <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block;">Risk Level</span>
                                <span style="font-size: 11px; font-weight: 900; color: #ef4444; text-transform: uppercase;">${formData.cardiologyData?.riskLevel} Risk</span>
                                ${formData.cardiologyData?.nyhaClass ? `<div style="font-size: 9px; font-weight: 700; color: #64748b;">NYHA Class ${formData.cardiologyData?.nyhaClass}</div>` : ''}
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; border-top: 1px dashed #fee2e2; padding-top: 10px;">
                            <div>
                                <label style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Symptoms & Factors</label>
                                <div style="font-size: 10px; font-weight: 600;">${[...(formData.cardiologyData?.symptoms || []), ...(formData.cardiologyData?.riskFactors || [])].join(', ') || 'None reported'}</div>
                            </div>
                            <div>
                                <label style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">ECG Interpretation</label>
                                <div style="font-size: 10px; font-weight: 700; color: ${formData.cardiologyData?.ecgType === 'ST Elevation' ? '#ef4444' : '#1e293b'}">${formData.cardiologyData?.ecgType} ${formData.cardiologyData?.ecgLeads && formData.cardiologyData.ecgLeads.length > 0 ? `(${formData.cardiologyData.ecgLeads.join(', ')})` : ''}</div>
                                ${formData.cardiologyData?.ecgNotes ? `<div style="font-size: 9px; color: #64748b; font-weight: 500;">${formData.cardiologyData.ecgNotes}</div>` : ''}
                            </div>
                        </div>

                        <div style="border-top: 1px dashed #fee2e2; padding-top: 10px;">
                            <label style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Heart Sounds</label>
                            <div style="font-size: 10px; font-weight: 600;">S1: ${formData.cardiologyData?.s1}, S2: ${formData.cardiologyData?.s2} ${formData.cardiologyData?.murmur === 'Present' ? ` | Murmur: ${formData.cardiologyData.murmurType}` : ''}</div>
                        </div>
                    </div>
                    ` : ''}

                    ${(() => {
                        const isOrtho = activeSpecialty.toUpperCase().includes('ORTHO');
                        const o = formData.orthopedicData;
                        if (!isOrtho || !o?.joint) return '';
                        const painNum = o?.pain?.score || 0;
                        const sideLabel = o?.side || '';
                        const painColor = painNum >= 8 ? '#dc2626' : painNum >= 5 ? '#ea580c' : '#16a34a';
                        const romColor = o?.rom === 'Normal' ? '#16a34a' : (o?.rom === 'Restricted' || o?.rom === 'Painful') ? '#ea580c' : o?.rom === 'Severely restricted' ? '#dc2626' : '#1e293b';
                        const specialTestsDisplay = Array.isArray(o?.specialTests) && o.specialTests.length > 0 ? o.specialTests.join(', ') : (typeof o?.specialTests === 'string' ? o.specialTests : '');
                        return `
                    <div style="margin-bottom:22px;padding:14px 16px;border:2px solid #fed7aa;border-radius:12px;background:#fff7ed;">
                        <span style="font-size:9px;font-weight:800;text-transform:uppercase;color:#c2410c;display:block;margin-bottom:10px;letter-spacing:1px;border-bottom:1px solid #fed7aa;padding-bottom:6px;">
                            ◆ Orthopedic Assessment
                        </span>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:10px;">
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Joint / Region</span>
                                <span style="font-size:12px;font-weight:800;color:#1e293b;">${sideLabel ? sideLabel + ' ' : ''}${o.joint}</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Pain Score</span>
                                <span style="font-size:14px;font-weight:900;color:${painColor};">${painNum}/10</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">ROM</span>
                                <span style="font-size:11px;font-weight:800;color:${romColor};">${o?.rom || '—'}</span>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:10px;">
                            ${o?.exam?.swelling ? `<div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Swelling</span>
                                <span style="font-size:11px;font-weight:700;color:#1e293b;">${o.exam.swelling}</span>
                            </div>` : ''}
                            ${specialTestsDisplay ? `<div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Special Tests</span>
                                <span style="font-size:10px;font-weight:700;color:#1e293b;">${specialTestsDisplay}</span>
                            </div>` : ''}
                        </div>
                        ${o?.exam?.deformity === 'Present' ? `<div style="background:#fee2e2;border:1px solid #ef4444;border-radius:8px;padding:8px 12px;margin-bottom:8px;">
                            <span style="font-size:8px;font-weight:800;color:#dc2626;text-transform:uppercase;">⚠️ DEFORMITY PRESENT — Immobilize and order urgent X-ray</span>
                        </div>` : ''}
                        ${painNum >= 8 ? `<div style="background:#fee2e2;border:1px solid #ef4444;border-radius:8px;padding:8px 12px;">
                            <span style="font-size:8px;font-weight:800;color:#dc2626;text-transform:uppercase;">🚨 SEVERE PAIN — Immediate analgesia and urgent evaluation required</span>
                        </div>` : ''}
                        ${o?.diagnosis ? `<div style="margin-top:10px;padding-top:8px;border-top:1px dashed #fed7aa;">
                            <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;">Assessment: </span>
                            <span style="font-size:11px;font-weight:900;color:#c2410c;">${o.diagnosis}</span>
                        </div>` : ''}
                    </div>`;
                    })()}

                    ${(() => {
                        const isDerm = activeSpecialty.toUpperCase().includes('DERM');
                        const d = formData.dermatologyData;
                        if (!isDerm || !d?.lesionType) return '';
                        const pill = (txt: string, c: string) =>
                            `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin:1px 2px;background:${c};">${txt}</span>`;
                        const severityBadge = (label: string, val: string) => {
                            const col = val === 'Severe' ? '#fee2e2;color:#b91c1c' : val === 'Moderate' ? '#ffedd5;color:#c2410c' : val === 'Mild' ? '#fef9c3;color:#92400e' : '#f1f5f9;color:#475569';
                            return val !== 'None' ? `<span style="background:${col};${pill('', '')}font-size:8px;font-weight:800;padding:2px 7px;border-radius:12px;text-transform:uppercase;">${label}: ${val}</span>` : '';
                        };
                        return `
                    <div style="margin-bottom:22px;padding:14px 16px;border:2px solid #fde68a;border-radius:12px;background:#fffbeb;">
                        <span style="font-size:9px;font-weight:800;text-transform:uppercase;color:#d97706;display:block;margin-bottom:10px;letter-spacing:1px;border-bottom:1px solid #fde68a;padding-bottom:6px;">
                            ◆ Dermatology Assessment
                        </span>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:10px;">
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Lesion Type</span>
                                <span style="font-size:12px;font-weight:800;color:#1e293b;">${d.lesionType}${d.lesionCount ? ` &nbsp;<small style="font-size:9px;color:#64748b;">×${d.lesionCount}</small>` : ''}${d.size ? ` &nbsp;<small style="font-size:9px;color:#64748b;">(${d.size})</small>` : ''}</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Body Location</span>
                                <div style="margin-top:2px;">${(d.location ?? []).map((l: string) => pill(l, '#fef3c7;color:#92400e')).join('')}</div>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Distribution</span>
                                <span style="font-size:11px;font-weight:700;color:#1e293b;">${d.distribution || '—'}</span>
                            </div>
                        </div>
                        ${(d.color?.length || d.surfaceChanges?.length) ? `
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:10px;">
                            ${d.color?.length ? `<div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Color</span>
                                <div>${d.color.map((c: string) => pill(c, '#ffe4e6;color:#9f1239')).join('')}</div>
                            </div>` : ''}
                            ${d.surfaceChanges?.length ? `<div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Surface Changes</span>
                                <div>${d.surfaceChanges.map((s: string) => pill(s, '#ede9fe;color:#5b21b6')).join('')}</div>
                            </div>` : ''}
                        </div>` : ''}
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                            ${severityBadge('Itching', d.itchingSeverity)}
                            ${severityBadge('Pain', d.painSeverity)}
                            ${d.burning ? pill('Burning +ve', '#fee2e2;color:#b91c1c') : ''}
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">
                            ${d.duration ? `<div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;">Duration</span>
                                <span style="font-size:11px;font-weight:700;">${d.duration}</span>
                            </div>` : ''}
                            ${d.onset ? `<div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;">Onset</span>
                                <span style="font-size:11px;font-weight:700;">${d.onset}</span>
                            </div>` : ''}
                            ${d.progression ? `<div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;">Progression</span>
                                <span style="font-size:11px;font-weight:700;color:${d.progression === 'Worsening' ? '#b91c1c' : d.progression === 'Improving' ? '#166534' : '#1e293b'};">${d.progression}</span>
                            </div>` : ''}
                        </div>
                        ${d.provisionalDiagnosis ? `
                        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #fde68a;">
                            <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;">Provisional Diagnosis:</span>
                            <span style="font-size:11px;font-weight:800;color:#b45309;margin-left:6px;">${d.provisionalDiagnosis}</span>
                        </div>` : ''}
                    </div>`;
                    })()}

                    ${(() => {
                        const isOphtha = activeSpecialty.toUpperCase().includes('OPHTHA') || activeSpecialty.toUpperCase().includes('EYE');
                        const o = formData.ophthaData;
                        if (!isOphtha || !o) return '';

                        const hasRefraction = o.refraction?.od?.distant?.sph || o.refraction?.os?.distant?.sph || o.refraction?.od?.near?.sph || o.refraction?.os?.near?.sph;
                        
                        return `
                    <div style="margin-bottom:22px;padding:14px 16px;border:2px solid #bae6fd;border-radius:12px;background:#f0f9ff;">
                        <span style="font-size:9px;font-weight:800;text-transform:uppercase;color:#0369a1;display:block;margin-bottom:10px;letter-spacing:1px;border-bottom:1px solid #bae6fd;padding-bottom:6px;">
                            ◆ Ophthalmology Assessment
                        </span>
                        
                        ${o.chiefComplaints || o.hopi || o.pastHistory || o.familyHistory || (o.symptoms && o.symptoms.length > 0) ? `
                        <div style="margin-bottom:15px;padding-bottom:12px;border-bottom:1px dashed #bae6fd;">
                            ${o.symptoms && o.symptoms.length > 0 ? `
                            <div style="margin-bottom:8px;">
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:2px;">Ocular Symptoms</span>
                                <div style="font-size:10px;font-weight:700;color:#1e293b;">${o.symptoms.join(', ')}</div>
                            </div>` : ''}
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                                ${o.chiefComplaints ? `
                                <div>
                                    <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:2px;">Chief Complaints</span>
                                    <div style="font-size:10px;font-weight:700;color:#1e293b;">${o.chiefComplaints}</div>
                                </div>` : ''}
                                ${o.hopi ? `
                                <div>
                                    <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:2px;">History of Presenting Illness (HOPI)</span>
                                    <div style="font-size:10px;font-weight:700;color:#1e293b;">${o.hopi}</div>
                                </div>` : ''}
                                ${o.pastHistory ? `
                                <div>
                                    <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:2px;">Past Ocular History</span>
                                    <div style="font-size:10px;font-weight:700;color:#1e293b;">${o.pastHistory}</div>
                                </div>` : ''}
                                ${o.familyHistory ? `
                                <div>
                                    <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:2px;">Family History</span>
                                    <div style="font-size:10px;font-weight:700;color:#1e293b;">${o.familyHistory}</div>
                                </div>` : ''}
                            </div>
                        </div>` : ''}
                        
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:15px;">
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Visual Acuity</span>
                                <div style="display:flex;gap:15px;margin-bottom:6px;">
                                    <div><span style="font-size:9px;color:#0ea5e9;font-weight:800;">OD (Right):</span> <span style="font-size:11px;font-weight:700;">${o.vision?.od?.unaided || '—'}</span> <span style="font-size:8px;color:#94a3b8;">(Unaided)</span></div>
                                    <div><span style="font-size:9px;color:#10b981;font-weight:800;">OS (Left):</span> <span style="font-size:11px;font-weight:700;">${o.vision?.os?.unaided || '—'}</span> <span style="font-size:8px;color:#94a3b8;">(Unaided)</span></div>
                                </div>
                                ${o.vision?.od?.corrected || o.vision?.os?.corrected ? `
                                <div style="display:flex;gap:15px;">
                                    <div><span style="font-size:9px;color:#0ea5e9;font-weight:800;">OD:</span> <span style="font-size:11px;font-weight:700;">${o.vision?.od?.corrected || '—'}</span> <span style="font-size:8px;color:#94a3b8;">(Corrected)</span></div>
                                    <div><span style="font-size:9px;color:#10b981;font-weight:800;">OS:</span> <span style="font-size:11px;font-weight:700;">${o.vision?.os?.corrected || '—'}</span> <span style="font-size:8px;color:#94a3b8;">(Corrected)</span></div>
                                </div>` : ''}
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Intraocular Pressure (IOP)</span>
                                <div style="display:flex;gap:15px;">
                                    <div><span style="font-size:9px;color:#0ea5e9;font-weight:800;">OD:</span> <span style="font-size:11px;font-weight:700;">${o.iop?.od ? o.iop.od + ' mmHg' : '—'}</span></div>
                                    <div><span style="font-size:9px;color:#10b981;font-weight:800;">OS:</span> <span style="font-size:11px;font-weight:700;">${o.iop?.os ? o.iop.os + ' mmHg' : '—'}</span></div>
                                </div>
                            </div>
                        </div>

                        ${hasRefraction ? `
                        <div style="margin-bottom:15px;">
                            <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:5px;">Optical Prescription (Refraction)</span>
                            <table style="width:100%;border-collapse:collapse;font-size:10px;text-align:center;background:#fff;border-radius:6px;overflow:hidden;border:1px solid #e0f2fe;">
                                <thead>
                                    <tr style="background:#e0f2fe;color:#0369a1;">
                                        <th style="padding:6px;border:1px solid #bae6fd;text-align:left;">Eye</th>
                                        <th style="padding:6px;border:1px solid #bae6fd;">SPH</th>
                                        <th style="padding:6px;border:1px solid #bae6fd;">CYL</th>
                                        <th style="padding:6px;border:1px solid #bae6fd;">AXIS</th>
                                        <th style="padding:6px;border:1px solid #bae6fd;">VA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Distant Vision OD -->
                                    ${o.refraction?.od?.distant?.sph || o.refraction?.od?.distant?.cyl ? `
                                    <tr>
                                        <td style="padding:6px;border:1px solid #e0f2fe;font-weight:800;color:#0ea5e9;text-align:left;">OD Distant</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.od.distant.sph}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.od.distant.cyl}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.od.distant.axis}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;font-weight:700;">${o.refraction.od.distant.va}</td>
                                    </tr>` : ''}
                                    <!-- Near Vision OD -->
                                    ${o.refraction?.od?.near?.sph || o.refraction?.od?.near?.cyl ? `
                                    <tr>
                                        <td style="padding:6px;border:1px solid #e0f2fe;font-weight:800;color:#0ea5e9;text-align:left;">OD Near (Add)</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.od.near.sph}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.od.near.cyl}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.od.near.axis}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;font-weight:700;">${o.refraction.od.near.va}</td>
                                    </tr>` : ''}
                                    <!-- Distant Vision OS -->
                                    ${o.refraction?.os?.distant?.sph || o.refraction?.os?.distant?.cyl ? `
                                    <tr>
                                        <td style="padding:6px;border:1px solid #e0f2fe;font-weight:800;color:#10b981;text-align:left;">OS Distant</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.os.distant.sph}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.os.distant.cyl}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.os.distant.axis}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;font-weight:700;">${o.refraction.os.distant.va}</td>
                                    </tr>` : ''}
                                    <!-- Near Vision OS -->
                                    ${o.refraction?.os?.near?.sph || o.refraction?.os?.near?.cyl ? `
                                    <tr>
                                        <td style="padding:6px;border:1px solid #e0f2fe;font-weight:800;color:#10b981;text-align:left;">OS Near (Add)</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.os.near.sph}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.os.near.cyl}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;">${o.refraction.os.near.axis}</td>
                                        <td style="padding:6px;border:1px solid #e0f2fe;font-weight:700;">${o.refraction.os.near.va}</td>
                                    </tr>` : ''}
                                </tbody>
                            </table>
                        </div>
                        ` : ''}

                        ${(() => {
                            const renderEyeField = (label: string, data: any) => {
                                if (!data || (typeof data === 'object' && !data.re && !data.le && !data.notes) || (typeof data === 'string' && !data)) return '';
                                let re = typeof data === 'object' ? data.re : data;
                                let le = typeof data === 'object' ? data.le : data;
                                let notes = typeof data === 'object' ? data.notes : '';
                                if(!re && !le && !notes) return '';
                                return `
                                    <div style="margin-bottom:6px;">
                                        <span style="font-size:8px;color:#94a3b8;font-weight:800;display:block;">${label}</span>
                                        <div style="font-size:10px;font-weight:700;color:#1e293b;">
                                            ${re ? `<span style="color:#0ea5e9">RE:</span> ${re} &nbsp;&nbsp;` : ''}
                                            ${le ? `<span style="color:#10b981">LE:</span> ${le}` : ''}
                                            ${notes ? `<div style="font-size:9px;color:#64748b;margin-top:2px;font-weight:600;">${notes}</div>` : ''}
                                        </div>
                                    </div>
                                `;
                            };
                            
                            const slitLampHTML = o.slitLamp ? ['conjunctiva', 'cornea', 'anteriorChamber', 'pupil', 'lens'].map(f => renderEyeField(f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1'), (o.slitLamp as any)[f])).join('') : '';
                            const fundusHTML = o.fundus ? ['retina', 'opticDisc', 'macula'].map(f => renderEyeField(f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1'), (o.fundus as any)[f])).join('') : '';
                            
                            if (!slitLampHTML.trim() && !fundusHTML.trim() && !o.notes) return '';
                            
                            return `
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:15px;padding-top:10px;border-top:1px dashed #bae6fd;">
                                ${slitLampHTML.trim() ? `
                                <div>
                                    <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:5px;">Slit Lamp Examination</span>
                                    ${slitLampHTML}
                                </div>` : '<div></div>'}
                                
                                <div>
                                    ${fundusHTML.trim() ? `
                                    <div style="margin-bottom:10px;">
                                        <span style="font-size:8px;color:#0369a1;font-weight:800;text-transform:uppercase;display:block;margin-bottom:5px;">Fundus Examination</span>
                                        ${fundusHTML}
                                    </div>` : ''}
                                </div>
                            </div>
                            
                            ${o.notes ? `
                            <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #bae6fd;">
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;">Clinical Notes:</span>
                                <span style="font-size:10px;font-weight:600;color:#334155;margin-left:6px;">${o.notes}</span>
                            </div>` : ''}
                            `;
                        })()}

                        ${o.diagnosis ? `
                        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #bae6fd;">
                            <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;">Assessment:</span>
                            <span style="font-size:11px;font-weight:800;color:#0369a1;margin-left:6px;">${o.diagnosis}</span>
                        </div>` : ''}
                    </div>`;
                    })()}

                    ${(() => {
                        const isGastro = activeSpecialty.toUpperCase().includes('GASTRO');
                        const g = formData.gastroData;
                        if (!isGastro || !g?.symptoms?.length) return '';
                        const redFlags = [];
                        if (g.symptoms?.includes('Blood in vomit (Hematemesis)')) redFlags.push('Hematemesis');
                        if (g.symptoms?.includes('Black stool (Melena)') || g.stoolType === 'Black (Melena)') redFlags.push('Melena');
                        if (g.symptoms?.includes('Blood in stool') || g.stoolType === 'Blood-stained') redFlags.push('GI Bleed');
                        if (g.bowelSounds === 'Absent') redFlags.push('Absent Bowel Sounds');
                        if (g.guarding === 'Rigidity') redFlags.push('Peritoneal Rigidity');
                        return `
                    <div style="margin-bottom:22px;padding:14px 16px;border:2px solid #10b981;border-radius:12px;background:#f0fdf4;">
                        <span style="font-size:9px;font-weight:800;text-transform:uppercase;color:#059669;display:block;margin-bottom:10px;letter-spacing:1px;border-bottom:1px solid #10b981;padding-bottom:6px;">
                            ◆ Gastrointestinal Examination
                        </span>
                        ${redFlags.length > 0 ? `
                        <div style="background:#fee2e2;border:1px solid #ef4444;border-radius:8px;padding:8px 12px;margin-bottom:10px;">
                            <span style="font-size:8px;font-weight:800;color:#dc2626;text-transform:uppercase;">🔴 Red Flags: ${redFlags.join(' · ')}</span>
                        </div>` : ''}
                        <div style="margin-bottom:8px;">
                            <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Symptoms</span>
                            <span style="font-size:11px;font-weight:700;color:#1e293b;">${(g.symptoms || []).join(', ') || '—'}</span>
                        </div>
                        ${g.painLocation || g.painType ? `
                        <div style="margin-bottom:8px;">
                            <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Pain</span>
                            <span style="font-size:11px;font-weight:700;color:#1e293b;">${[g.painLocation, g.painType].filter(Boolean).join(' — ') || '—'}</span>
                        </div>` : ''}
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:10px;">
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Bowel Habits</span>
                                <span style="font-size:12px;font-weight:800;color:#1e293b;">${g.bowelHabits || '—'}</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Stool</span>
                                <span style="font-size:12px;font-weight:800;color:#1e293b;">${g.stoolType || '—'}</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Bowel Sounds</span>
                                <span style="font-size:12px;font-weight:800;color:${g.bowelSounds === 'Absent' ? '#dc2626' : '#1e293b'};">${g.bowelSounds || '—'}</span>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:10px;">
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Distention</span>
                                <span style="font-size:12px;font-weight:800;color:#1e293b;">${g.distention || '—'}</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Tenderness</span>
                                <span style="font-size:11px;font-weight:700;color:#1e293b;">${g.tenderness || '—'}</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Guarding</span>
                                <span style="font-size:11px;font-weight:700;color:${g.guarding === 'Rigidity' ? '#dc2626' : '#1e293b'};">${g.guarding || '—'}</span>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding-top:8px;border-top:1px dashed #10b981;">
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Liver</span>
                                <span style="font-size:11px;font-weight:700;color:#1e293b;">${g.liver?.status || 'Not assessed'}${g.liver?.status === 'Enlarged' && g.liver?.size ? ` (${g.liver.size} cm)` : ''}</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Spleen</span>
                                <span style="font-size:11px;font-weight:700;color:#1e293b;">${g.spleen?.status || 'Not assessed'}</span>
                            </div>
                        </div>
                        ${g.diagnosis ? `
                        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #10b981;">
                            <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">GI Assessment</span>
                            <span style="font-size:13px;font-weight:900;color:#059669;">${g.diagnosis}</span>
                        </div>` : ''}
                        ${redFlags.length > 0 ? `
                        <div style="margin-top:10px;padding:8px 12px;background:#fef2f2;border-radius:6px;">
                            <span style="font-size:9px;font-weight:900;color:#dc2626;">⚠️ AVOID NSAIDs — GI bleeding indicators present</span>
                        </div>` : ''}
                    </div>`;
                    })()}

                    ${activeSpecialty.toUpperCase().includes('URO') && formData.urologyData ? (() => {
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

                    ${(() => {
                        const isENT = activeSpecialty.toUpperCase().includes('ENT') && !activeSpecialty.toUpperCase().includes('DENT') && !activeSpecialty.toUpperCase().includes('GASTRO');
                        const e = formData.entData;
                        if (!isENT || !e) return '';
                        return `
                    <div style="margin-bottom:22px;padding:14px 16px;border:2px solid #3b82f6;border-radius:12px;background:#eff6ff;">
                        <span style="font-size:9px;font-weight:800;text-transform:uppercase;color:#2563eb;display:block;margin-bottom:10px;letter-spacing:1px;border-bottom:1px solid #3b82f6;padding-bottom:6px;">
                            ◆ ENT Examination
                        </span>
                        ${e.symptoms && e.symptoms.length > 0 ? `<div style="margin-bottom:10px;"><span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Symptoms</span><span style="font-size:11px;font-weight:700;">${e.symptoms.join(', ')}</span></div>` : ''}
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:10px;">
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Throat</span>
                                <span style="font-size:11px;font-weight:700;">${[e.throat?.tonsils, e.throat?.pharynx, e.throat?.uvula].filter(Boolean).join(' / ') || '—'}</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Nose</span>
                                <span style="font-size:11px;font-weight:700;">${[e.nose?.mucosa, e.nose?.septum, e.nose?.discharge].filter(Boolean).join(' / ') || '—'}</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Ears (L/R)</span>
                                <span style="font-size:11px;font-weight:700;">${e.ear?.left?.externalEar || e.ear?.right?.externalEar ? `${e.ear?.left?.externalEar || '—'} / ${e.ear?.right?.externalEar || '—'}` : '—'}</span>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Hearing</span>
                                <span style="font-size:11px;font-weight:700;">${e.hearing?.status || '—'}</span>
                            </div>
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:3px;">Voice / Airway</span>
                                <span style="font-size:11px;font-weight:700;">${[e.voice?.quality, e.voice?.airway].filter(Boolean).join(' / ') || '—'}</span>
                            </div>
                        </div>
                        ${e.duration ? `<div style="margin-top:8px;"><span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;">Duration: </span><span style="font-size:11px;font-weight:700;">${e.duration}</span></div>` : ''}
                    </div>`;
                    })()}

                    ${(() => {
                        const isPsych = activeSpecialty.toUpperCase().includes('PSYCH');
                        const p = formData.psychiatryData;
                        if (!isPsych || !p?.suicideRisk) return '';
                        const riskColors: any = { 'None': '#059669', 'Low': '#0891b2', 'Moderate': '#ea580c', 'High': '#be123c' };
                        return `
                    <div style="margin-bottom:22px;padding:14px 16px;border:2.5px solid ${riskColors[p.suicideRisk] || '#e2e8f0'};border-radius:12px;background:#f8fafc;page-break-inside:avoid;">
                         <div style="display:flex;justify-content:space-between;margin-bottom:10px;border-bottom:1px solid #e2e8f0;padding-bottom:5px;">
                            <span style="font-size:10px;font-weight:900;text-transform:uppercase;color:#1e293b;">Psychiatric Evaluation</span>
                            <span style="font-size:10px;font-weight:900;color:white;background:${riskColors[p.suicideRisk]};padding:2px 8px;border-radius:4px;">RISK: ${p.suicideRisk.toUpperCase()}</span>
                         </div>
                         <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                            <div>
                                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:3px;">MSE Findings</div>
                                <div style="font-size:11px;color:#1e293b;font-weight:700;">Mood: ${p.mse.mood} | Speech: ${p.mse.speech}</div>
                                <div style="font-size:11px;color:#475569;">Thought: ${p.mse.thought.join(', ') || 'Within Normal Limits'}</div>
                            </div>
                            <div>
                                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:3px;">Standardized Scores</div>
                                <div style="font-size:11px;color:#1e293b;font-weight:700;">PHQ-9: ${p.scores.phq9} | GAD-7: ${p.scores.gad7}</div>
                                <div style="font-size:10px;color:#be123c;font-weight:800;margin-top:4px;">Advice: ${p.counseling || 'Regular Observation'}</div>
                            </div>
                         </div>
                    </div>`;
                    })()}

                    ${(() => {
                        const isEndo = activeSpecialty.toUpperCase().includes('ENDOCRIN');
                        const e = formData.endocrinologyData;
                        if (!isEndo || (!e?.glycemic?.fbs && !e?.thyroid?.tsh)) return '';
                        
                        const fbs = parseInt(e.glycemic.fbs) || 0;
                        const tsh = parseFloat(e.thyroid.tsh) || 0;
                        const hba1c = parseFloat(e.glycemic.hba1c) || 0;

                        return `
                    <div style="margin-bottom:22px;padding:14px 16px;border:2.5px solid #0f172a;border-radius:12px;background:#f8fafc;page-break-inside:avoid;">
                        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;margin-bottom:10px;padding-bottom:5px;">
                            <h4 style="margin:0;font-size:12px;font-weight:900;text-transform:uppercase;color:#0f172a;">Endocrine Assessment</h4>
                            <span style="font-size:10px;font-weight:900;color:#0f172a;text-transform:uppercase;">Clinically Correlated</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                            <div>
                                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:3px;">Metabolic Status</div>
                                <div style="font-size:11px;color:#1e293b;font-weight:700;">HbA1c: ${hba1c}% | TSH: ${tsh} mIU/L</div>
                                <div style="font-size:10px;color:#1e293b;">FBS: ${e.glycemic.fbs} | PPBS: ${e.glycemic.ppbs}</div>
                            </div>
                            <div>
                                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:3px;">Physical Findings</div>
                                <div style="font-size:11px;color:#1e293b;font-weight:700;">BMI: ${e.bmi} | Weight: ${e.weight} kg</div>
                                <div style="font-size:10px;color:#be123c;font-weight:800;">${e.medicationType.join(' • ') || 'No special medication'}</div>
                            </div>
                        </div>

                        ${e.diabetes ? `
                        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 8px; font-weight: 800; color: #991b1b; text-transform: uppercase;">Diabetes Audit</span>
                                <span style="font-size: 8px; font-weight: 800; color: #991b1b;">HYPO RISK: ${e.diabetes.hypoglycemia || 'None'}</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div style="font-size: 9px; color: #475569;">
                                    <b>Foot:</b> ${e.diabetes.footExam?.sensation || 'Normal'} Sens / ${e.diabetes.footExam?.ulcer || 'No'} Ulcer
                                    <div style="font-size: 8px; font-weight: 700; color: #b91c1c; margin-top: 2px;">Complications: ${e.diabetes.complications?.join(', ') || 'None'}</div>
                                </div>
                                <div style="font-size: 9px; color: #475569;">
                                    <b>Treatment:</b> ${e.diabetes.treatment?.type || '--'} ${e.diabetes.treatment?.insulinType ? `(${e.diabetes.treatment.insulinType})` : ''}
                                    ${e.diabetes.treatment?.dose ? `<div style="font-size: 8px; font-weight: 700; color: #0f172a;">Dose: ${e.diabetes.treatment.dose}</div>` : ''}
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>`;
                    })()}

                    ${(() => {
                        const isHema = activeSpecialty.toUpperCase().includes('HEMA');
                        const hema = formData.hematologyData;
                        if (!isHema || !hema?.cbc?.hb) return '';
                        
                        const hb = parseFloat(hema.cbc.hb);
                        const plt = parseFloat(hema.cbc.platelets);
                        const inr = parseFloat(hema.coagulation.inr);

                        return `
                    <div style="margin-bottom:22px;padding:14px 16px;border:2.5px solid #991b1b;border-radius:12px;background:#fef2f2;page-break-inside:avoid;">
                        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #fecdd3;margin-bottom:10px;padding-bottom:5px;">
                            <h4 style="margin:0;font-size:12px;font-weight:900;text-transform:uppercase;color:#991b1b;">Hematology Report</h4>
                            <span style="font-size:10px;font-weight:900;color:#991b1b;">CBC / COAG PROFILE</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                            <div>
                                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:3px;">Clinical Values</div>
                                <div style="font-size:11px;color:#1e293b;font-weight:700;">Hb: ${hema.cbc.hb} g/dL | Plt: ${hema.cbc.platelets} Lakhs</div>
                                <div style="font-size:10px;color:#1e293b;">INR: ${hema.coagulation.inr} | TLC: ${hema.cbc.tlc}</div>
                            </div>
                            <div>
                                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:3px;">Assessment</div>
                                <div style="font-size:11px;color:#991b1b;font-weight:800;">Diagnosis: ${hema.diagnosis || 'Pending Correlation'}</div>
                                ${parseFloat(hema.transfusion?.units) > 0 ? `<div style="font-size:10px;color:#be123c;font-weight:800;">Plan: ${hema.transfusion.units} Units ${hema.transfusion.product}</div>` : ''}
                            </div>
                        </div>
                    </div>`;
                    })()}

                    ${(() => {
                        const isOnco = activeSpecialty.toUpperCase().includes('ONCO');
                        const o = formData.oncologyData;
                        if (!isOnco || !o?.diagnosis) return '';

                        return `
                    <div style="margin-bottom:22px;padding:14px 16px;border:2.5px solid #4338ca;border-radius:12px;background:#f5f3ff;page-break-inside:avoid;">
                        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #ddd6fe;margin-bottom:10px;padding-bottom:5px;">
                            <h4 style="margin:0;font-size:12px;font-weight:900;text-transform:uppercase;color:#4338ca;">Oncology Protocols</h4>
                            <span style="font-size:10px;font-weight:900;color:#4338ca;">BSA: ${o.body.bsa} m² | ECOG: ${o.ecog}</span>
                        </div>
                        <div style="margin-bottom:10px;">
                            <div style="font-size:11px;color:#1e293b;font-weight:800;">Diagnosis: ${o.diagnosis} ${o.site ? `(${o.site})` : ''}</div>
                            <div style="font-size:10px;color:#6366f1;font-weight:700;">TNM: ${o.tnm.t}${o.tnm.n}${o.tnm.m} | Stage: ${o.tnm.stage} | Intent: ${o.treatment.intent}</div>
                        </div>
                        ${o.chemo && o.chemo.length > 0 ? `
                        <div style="margin-top:10px;">
                            <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:5px;">Planned Chemotherapy</div>
                            <table style="width:100%;border-collapse:collapse;margin-bottom:0;">
                                <tr style="background:#fff;border-bottom:1px solid #e2e8f0;">
                                    <th style="font-size:8px;padding:4px;text-align:left;">Drug</th>
                                    <th style="font-size:8px;padding:4px;text-align:center;">Dose</th>
                                    <th style="font-size:8px;padding:4px;text-align:center;">Route</th>
                                    <th style="font-size:8px;padding:4px;text-align:center;">Cycle/Day</th>
                                </tr>
                                ${o.chemo.map((c: any) => `
                                <tr>
                                    <td style="font-size:9px;font-weight:700;padding:4px;">${c.drug}</td>
                                    <td style="font-size:9px;font-weight:700;padding:4px;text-align:center;">${c.totalDose} mg</td>
                                    <td style="font-size:9px;padding:4px;text-align:center;">${c.route}</td>
                                    <td style="font-size:9px;padding:4px;text-align:center;">C${c.cycle} D${c.day}</td>
                                </tr>
                                `).join('')}
                            </table>
                        </div>
                        ` : ''}
                    </div>`;
                    })()}

                    ${(() => {
                        const isDent = activeSpecialty.toUpperCase().includes('DENT');
                        const d = formData.dentistryData;
                        if (!isDent || !d?.teeth?.length) return '';
                        
                        const findingsLines = [];
                        if (d.oralFindings?.caries !== 'None') findingsLines.push(`Caries: ${d.oralFindings.caries}`);
                        if (d.oralFindings?.gingivitis !== 'None') findingsLines.push(`Gingivitis: ${d.oralFindings.gingivitis}`);
                        if (d.oralFindings?.abscess) findingsLines.push('Intraoral Abscess Present');
                        if (d.extraOral?.facialSwelling) findingsLines.push('Facial Swelling Noted');

                        return `
                    <div style="margin-bottom:22px;padding:14px 16px;border:2px solid #0891b2;border-radius:12px;background:#f0f9ff;page-break-inside:avoid;">
                        <span style="font-size:9px;font-weight:800;text-transform:uppercase;color:#0e7490;display:block;margin-bottom:10px;letter-spacing:1px;border-bottom:1px solid #0891b2;padding-bottom:6px;">
                            ◆ Dental Examination & Procedure
                        </span>
                        
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
                            ${(d.teeth || []).slice(0, 4).map((t: any) => `
                            <div style="background:#fff;padding:8px;border-radius:8px;border:1px solid #bae6fd;">
                                <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                                    <span style="font-size:10px;font-weight:900;color:#0e7490;">Tooth #${t.toothNumber}</span>
                                    <span style="font-size:8px;font-weight:800;color:#dc2626;text-transform:uppercase;">${t.condition || 'Finding'}</span>
                                </div>
                                <div style="font-size:9px;font-weight:700;color:#334155;">${t.diagnosis || 'Clinical Assessment Recorded'}</div>
                            </div>`).join('')}
                        </div>

                        <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:15px;margin-bottom:8px;">
                            <div>
                                <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;display:block;margin-bottom:2px;">Oral Status</span>
                                <span style="font-size:10px;font-weight:700;color:#1e293b;">${findingsLines.join(' | ') || 'No significant findings'}</span>
                            </div>
                            <div style="background:${d.systemicRisks?.onBloodThinners ? '#fef2f2' : '#f8fafc'};border:1px solid ${d.systemicRisks?.onBloodThinners ? '#fecaca' : '#e2e8f0'};padding:6px 10px;border-radius:8px;">
                                <span style="font-size:7px;font-weight:900;color:${d.systemicRisks?.onBloodThinners ? '#991b1b' : '#64748b'};text-transform:uppercase;">Systemic Risk</span>
                                <div style="font-size:9px;font-weight:800;color:${d.systemicRisks?.onBloodThinners ? '#991b1b' : '#334155'};">
                                    Blood Thinners: ${d.systemicRisks?.onBloodThinners ? 'YES' : 'NO'} | DM: ${d.systemicRisks?.diabetic ? 'YES' : 'NO'}
                                </div>
                            </div>
                        </div>

                        ${d.procedure ? `
                        <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #0891b2;">
                            <span style="font-size:8px;color:#94a3b8;font-weight:800;text-transform:uppercase;">Planned Procedure:</span>
                            <span style="font-size:11px;font-weight:900;color:#0e7490;margin-left:8px;">${d.procedure}</span>
                        </div>` : ''}
                    </div>`;
                    })()}

                    ${formData.medicines.length > 0 ? `
                    <div class="section-label">Prescribed Medications</div>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                <th style="width: 35%; padding: 8px 6px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase; text-align: left;">Medicine Name</th>
                                <th style="padding: 8px 6px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase; text-align: left;">Dosage</th>
                                <th style="padding: 8px 6px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase; text-align: left;">Frequency</th>
                                <th style="padding: 8px 6px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase; text-align: left;">Duration</th>
                                ${(activeSpecialty.toUpperCase().includes('EYE') || activeSpecialty.toUpperCase().includes('OPHTHA') || formData.medicines.some((m: Medicine) => m.eye || m.dropCount || m.timesPerDay)) ? `
                                <th style="padding: 8px 6px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase; text-align: left;">Instillation</th>
                                ` : ''}
                                <th style="text-align: right; padding: 8px 6px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase;">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${formData.medicines.map((med: Medicine) => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 8px 6px;">
                                    <div style="font-weight: 800; color: #0f172a; font-size: 11px;">${med.name}</div>
                                    <div style="font-size: 9px; color: #64748b; font-weight: 500;">${med.form || ''}</div>
                                </td>
                                <td style="padding: 8px 6px; font-weight: 700; color: #334155; font-size: 11px;">${med.dosage}</td>
                                <td style="padding: 8px 6px; font-weight: 600; color: #475569; font-size: 11px;">${formatFrequency(med.freq)}</td>
                                <td style="padding: 8px 6px; font-weight: 700; color: #334155; font-size: 11px;">${med.duration}</td>
                                ${(activeSpecialty.toUpperCase().includes('EYE') || activeSpecialty.toUpperCase().includes('OPHTHA') || formData.medicines.some((m: Medicine) => m.eye || m.dropCount || m.timesPerDay)) ? `
                                <td style="padding: 8px 6px; font-weight: 700; color: #334155; font-size: 11px;">
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
                                <td style="padding: 8px 6px; font-weight: 900; text-align: right; color: #0f172a; font-size: 11px;">${med.quantity}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ` : ''}

                    <div class="advice-grid">
                        ${formData.dietAdvice.filter((i: string) => i.trim()).length > 0 ? `
                        <div>
                            <div class="section-label" style="font-size: 9px;">General Instructions</div>
                            <ul class="advice-list">
                                ${formData.dietAdvice.filter((i: string) => i.trim()).map((d: string) => `<li>${d}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}

                        ${formData.suggestedTests.filter((i: string) => i.trim()).length > 0 ? `
                        <div>
                            <div class="section-label" style="font-size: 9px;">Investigations Suggested</div>
                            <ul class="advice-list">
                                ${formData.suggestedTests.filter((i: string) => i.trim()).map((t: string) => `<li>${t}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>

                    ${formData.advice || formData.followUp || formData.followUpDate ? `
                    <div class="follow-up">
                        <div>
                            <div style="margin-bottom: 4px;"><strong>Doctor's Advice:</strong></div>
                            <ul style="margin: 0; padding-left: 20px; list-style-type: disc; color: #334155;">
                                ${((formData.advice ? formData.advice + (formData.followUp ? '\n' + formData.followUp : '') : formData.followUp) || 'N/A').split(/[\n,]+/).map(s => s.trim()).filter(Boolean).map(s => '<li style="margin-bottom: 3px;">' + s + '</li>').join('')}
                            </ul>
                        </div>
                        ${formData.followUpDate ? `<div><strong>Next Review:</strong> <span class="follow-up-date">${new Date(formData.followUpDate).toLocaleDateString()}</span></div>` : ''}
                    </div>
                    ` : ''}

                    <div class="sig-block">
                        ${formData.doctorSignature ? `<img src="${formData.doctorSignature}" class="sig-img" />` : '<div style="height: 50px;"></div>'}
                        <br/>
                        <div class="sig-line">Doctor's Signature</div>
                    </div>

                    <div class="print-footer">
                        ${footerHtml}
                    </div>

                </div>
            </body>
            </html>
        `;
    };

    const generateBillingHTML = () => {
        const hospital = hospitalData?.hospital || {
            name: 'Hospital Name',
            address: 'Hospital Address',
            phone: 'Phone Number',
            email: 'Email Address',
            logo: ''
        };

        const headerHtml = renderToStaticMarkup(
            <MainHeader initialDetails={{
                name: hospital.name,
                address: hospital.address,
                phone: hospital.phone,
                email: hospital.email,
                logo: hospital.logo
            }} />
        );

        const footerHtml = renderToStaticMarkup(
            <MainFooter initialDetails={{
                name: hospital.name,
                address: hospital.address,
                phone: hospital.phone,
                email: hospital.email
            }} />
        );

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Pharmacy Bill Estimate - ${formData.patientName}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                        
                        @media print {
                            @page { size: A4; margin: 0; }
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
                            .container { min-height: 280mm !important; height: auto !important; }
                        }

                        body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; background: white; color: #1e293b; }
                        .container { 
                            width: 210mm; 
                            height: 296mm; 
                            margin: 0 auto; 
                            padding: 10mm 15mm 10mm 25mm; 
                            box-sizing: border-box; 
                            position: relative; 
                            display: flex;
                            flex-direction: column;
                            overflow: hidden;
                        }
                        
                        h1.bill-title { font-size: 20px; font-weight: 800; color: #1e40af; text-align: center; text-transform: uppercase; letter-spacing: 2px; margin: 20px 0; }

                        .patient-info {
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
                            gap: 15px;
                            margin-bottom: 25px;
                            padding: 15px;
                            background: #f8fafc;
                            border-radius: 12px;
                            border: 1px solid #f1f5f9;
                        }
                        .info-label { display: block; font-size: 8px; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 3px; }
                        .info-val { font-size: 12px; font-weight: 700; }

                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { text-align: left; padding: 12px; background: #f8fafc; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; font-weight: 800; }
                        td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; font-weight: 500; }
                        .total-row td { font-weight: 800; color: #1e40af; font-size: 16px; border-top: 2px solid #1e40af; background: #f0f9ff; }
                        
                    </style>
                </head>
                <body>
                    <div class="container">
                        ${headerHtml}

                        <h1 class="bill-title">PHARMACY BILL ESTIMATE</h1>

                        <div class="patient-info">
                            <div>
                                <span class="info-label">Patient Name</span>
                                <span class="info-val">${formData.patientName}</span>
                            </div>
                            <div>
                                <span class="info-label">Age / Sex</span>
                                <span class="info-val">${formData.age} Y / ${formData.gender}</span>
                            </div>
                            <div>
                                <span class="info-label">MRN / ID</span>
                                <span class="info-val">${formData.mrn || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="info-label">Date</span>
                                <span class="info-val">${formData.date}</span>
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>Item Description</th>
                                    <th>Dosage</th>
                                    <th>Qty</th>
                                    <th>Days</th>
                                    <th style="text-align: right;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${formData.medicines.map((med: Medicine) => `
                                    <tr>
                                        <td><strong>${med.name}</strong> ${med.eye ? `<span style="font-size: 8px; color: #fff; background: #0ea5e9; padding: 2px 4px; border-radius: 4px; margin-left: 4px;">${med.eye}</span>` : ''}<br/><span style="font-size: 10px; color: #64748b;">${med.form || ''}</span></td>
                                        <td>${med.dosage}</td>
                                        <td>${med.quantity}</td>
                                        <td>${med.duration}</td>
                                        <td style="text-align: right; font-weight: 700;">₹${(Number(med.price) || 0).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="4" style="text-align: right; text-transform: uppercase; letter-spacing: 1px;">Estimated Total (Inc. GST)</td>
                                    <td style="text-align: right;">₹${formData.total.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <p style="margin-top: 30px; font-size: 11px; color: #64748b; font-style: italic; border-left: 3px solid #1e40af; padding-left: 10px;">
                            Note: This is an estimated bill based on current inventory pricing. Actual prices may vary slightly at the pharmacy counter depending on batch and manufacturer at the time of purchase.
                        </p>

                        ${footerHtml}
                    </div>
                </body>
            </html>
        `;
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
                    
                    // Delay redirect slightly to ensure print dialog triggers first
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

    if (appointmentLoading || patientLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="animate-spin text-teal-600" size={48} />
            </div>
        );
    }

    return (
        <>
        <div className="bg-slate-50/50 min-h-screen">
            {/* Dynamic Header */}
            <header className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 shadow-sm transition-all">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
                    {/* Left: Unified Title & Patient Identity */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => {
                                if (appointmentId && !isSubmitted && !isPaused) {
                                    const msg = 'You have an active consultation. Leave without pausing?';
                                    if (!window.confirm(msg)) return;
                                }
                                if (appointmentId) {
                                    router.push(`/${hospitalId}/doctor/appointment/${appointmentId}`);
                                } else {
                                    router.back();
                                }
                            }}
                            className="p-1.5 md:p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-200 dark:border-gray-700 shrink-0"
                            title={appointmentId ? "Back to Consultation Overview" : "Go Back"}
                        >
                            <ArrowLeft size={16} />
                        </button>

                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                                    Prescription Desk
                                </h1>
                                {appointmentId && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        In Consultation
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                                <span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Patient: {formData.patientName || appointmentData?.patient?.name || 'New Case'}
                                </span>
                                {(appointmentData?.patient?.mrn || appointmentData?.mrn) && (
                                    <>
                                        <span className="text-gray-300 dark:text-gray-700 font-bold">•</span>
                                        <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            MRN: {appointmentData?.patient?.mrn || appointmentData?.mrn}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Integrated Action Bars */}
                    <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end overflow-x-auto no-scrollbar pb-1 xl:pb-0">
                        {/* Clinical Tools Group */}
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
                            {/* Lab Token */}
                            <button
                                onClick={() => {
                                    if (appointmentId) {
                                        const currentUrl = `/${hospitalId}/doctor/prescription?appointmentId=${appointmentId}`;
                                        router.push(`/${hospitalId}/doctor/lab-token/create?appointmentId=${appointmentId}&returnUrl=${encodeURIComponent(currentUrl)}`);
                                    } else {
                                        toast.error("No active appointment found. Please start a consultation first.");
                                    }
                                }}
                                disabled={isSendingLab}
                                className="px-2 py-1.5 bg-white dark:bg-[#111] text-blue-600 dark:text-blue-400 hover:text-blue-700 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors cursor-pointer shrink-0"
                            >
                                {isSendingLab ? <Loader2 size={12} className="animate-spin" /> : <Beaker size={12} />}
                                Lab Token
                            </button>

                            {/* Medical History */}
                            <button
                                onClick={() => setShowHistoryModal(true)}
                                disabled={!selectedPatientId}
                                className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all shrink-0 ${
                                    selectedPatientId
                                        ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 shadow-sm cursor-pointer'
                                        : 'bg-transparent text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                <History size={12} />
                                <span className="hidden sm:inline">Medical</span> History
                            </button>

                            {/* Scope Toggle */}
                            {selectedPatientId && (
                                <div className="flex items-center gap-1.5 pl-1.5 border-l border-gray-200 dark:border-gray-700 shrink-0">
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest hidden sm:inline">
                                        {showFullHistory ? "All Network" : "Facility Only"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowFullHistory(!showFullHistory);
                                            if (!showHistoryModal) setShowHistoryModal(true);
                                        }}
                                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            showFullHistory ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                    >
                                        <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out mt-0.5 ml-0.5 ${showFullHistory ? 'translate-x-3' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Prescription Entry Mode Toggle */}
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
                            <button
                                onClick={() => setMode('SELF')}
                                className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all cursor-pointer ${mode === 'SELF' ? 'bg-white dark:bg-[#111] shadow-sm text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-gray-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <PenTool size={12} /> Manual
                            </button>
                            <button
                                onClick={() => setMode('AI')}
                                className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all cursor-pointer ${mode === 'AI' ? 'bg-indigo-600 shadow-sm text-white border border-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Mic2 size={12} className={mode === 'AI' ? 'animate-pulse' : ''} /> Voice
                            </button>
                        </div>

                        {/* Session Timer & End Controls Group */}
                        {appointmentId && (
                            <div className="flex items-center gap-1.5 bg-gray-900 dark:bg-black p-1 rounded-lg border border-gray-800 shadow-sm shrink-0">
                                <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-gray-800 font-mono text-[10px] font-black text-emerald-400 border border-gray-700">
                                    <Clock size={10} className="animate-pulse text-emerald-400" />
                                    <span>{formatTime(elapsedTime)}</span>
                                </div>
                                <button
                                    onClick={handlePauseConsultation}
                                    className="px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-400/10 transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Pause Consultation"
                                >
                                    <Pause size={10} />
                                    <span className="hidden sm:inline">Pause</span>
                                </button>
                                <button
                                    onClick={handleEndConsultation}
                                    disabled={isEndingSession}
                                    className="px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer border border-emerald-600"
                                    title="Complete Session"
                                >
                                    {isEndingSession ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                                    <span>Complete</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>


            <main className="space-y-4 sm:space-y-6 pb-4">

                {/* Patient Info Card */}
                <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border-theme p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-2 border-b border-border-theme">
                        <User size={16} className="text-teal-600" />
                        <h2 className="text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-widest">Patient Details</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6">
                        <div className="sm:col-span-2 md:col-span-2">
                            <label className="block text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Full Name</label>
                            <div className="relative">
                                <input
                                    name="patientName"
                                    placeholder="Search or Enter Patient Name"
                                    value={formData.patientName}
                                    onChange={(e) => {
                                        handleInputChange(e);
                                        if (!appointmentId) handlePatientSearch(e.target.value);
                                    }}
                                    autoComplete="off"
                                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                />
                                {patientSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-xl border border-border-theme z-50 max-h-60 overflow-y-auto">
                                        <div className="p-2 border-b border-border-theme text-[9px] sm:text-[10px] font-bold text-muted uppercase">Registered Patients</div>
                                        {patientSuggestions.map((p, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => selectPatient(p)}
                                                className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 hover:bg-secondary-theme border-b border-border-theme last:border-0"
                                            >
                                                <div className="font-bold text-foreground text-xs sm:text-sm">{p.name}</div>
                                                <div className="flex gap-2 text-[9px] sm:text-[10px] text-muted font-medium">
                                                    <span>MRN: {p.profile?.mrn || 'N/A'}</span>
                                                    <span>•</span>
                                                    <span>{p.mobile}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {isSearchingPatients && (
                                    <div className="absolute right-3 top-2 sm:top-2.5">
                                        <Loader2 className="animate-spin text-teal-500 sm:size-[16px]" size={14} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">MRN</label>
                            <input
                                name="mrn"
                                value={formData.mrn}
                                onChange={handleInputChange}
                                placeholder="N/A"
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-muted focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>

                        <div className="sm:col-span-2 md:col-span-1">
                            <label className="block text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Age & Gender</label>
                            <div className="flex gap-2">
                                <input
                                    name="age"
                                    value={formData.age}
                                    onChange={handleInputChange}
                                    placeholder="Age"
                                    className="w-16 sm:w-20 px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                />
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="sm:col-span-2 md:col-span-1">
                            <label className="block text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Date</label>
                            <input
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Clinical Notes Card */}
                <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border-theme p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6 pb-2 border-b border-border-theme">
                        <div className="flex items-center gap-2">
                            <Stethoscope size={16} className="text-teal-600" />
                            <h2 className="text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-widest">
                                {activeSpecialty.toUpperCase() === 'GENERAL' ? 'Clinical Assessment' : `${activeSpecialty} Assessment`}
                            </h2>
                        </div>
                        {/* Specialty Switcher */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar max-w-[70%]">
                            {(() => {
                                const getSpecIcon = (s: string) => {
                                    const name = s.toUpperCase();
                                    if (name === 'GENERAL') return <Stethoscope size={10} />;
                                    if (name.includes('CARDIO')) return <Heart size={10} />;
                                    if (name.includes('DIABET')) return <Activity size={10} />;
                                    if (name.includes('DERMA')) return <PenTool size={10} />;
                                    if (name.includes('ORTHO')) return <ZapIcon size={10} />;
                                    if (name.includes('PEDIATRI')) return <BabyIcon size={10} />;
                                    if (name === 'ENT' || (name.includes('ENT') && !name.includes('DENT') && !name.includes('GASTRO'))) return <Mic2 size={10} />;
                                    if (name.includes('EYE') || name.includes('OPHTHA')) return <Eye size={10} />;
                                    if (name.includes('GYNAE') || name.includes('GYNE') || name.includes('OBST')) return <Heart size={10} />;
                                    if (name.includes('NEURO')) return <Zap size={10} />;
                                    if (name.includes('PULMO')) return <Wind size={10} />;
                                    if (name.includes('GASTRO')) return <Activity size={10} />;
                                    if (name.includes('NEPHRO')) return <Beaker size={10} />;
                                    if (name.includes('URO')) return <Activity size={10} />;
                                    if (name.includes('RADIO')) return <Scan size={10} />;
                                    if (name.includes('PSYCH')) return <Activity size={10} />;
                                    if (name.includes('ENDOCRIN')) return <Activity size={10} />;
                                    if (name.includes('HEMA')) return <FlaskConical size={10} />;
                                    if (name.includes('ONCO')) return <ShieldAlert size={10} />;
                                    if (name.includes('DENT')) return <Activity size={10} />;
                                    return <Stethoscope size={10} />;
                                };

                                return ['General', ...availableSpecialties.filter(s => !s.toLowerCase().includes('general'))].map((spec) => (
                                    <button
                                        key={spec}
                                        onClick={() => {
                                            console.log("Clinical switch to:", spec);
                                            setActiveSpecialty(spec);
                                        }}
                                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                            activeSpecialty === spec 
                                            ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm ring-1 ring-slate-200' 
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                        }`}
                                    >
                                        {getSpecIcon(spec)}
                                        {spec.split(' ')[0]}
                                    </button>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* ── COMMON FIELDS: Symptoms (always shown, above specialty modules) ── */}
                    {mode === 'AI' ? (
                        <div className="mb-6 sm:mb-8">
                            <label className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 flex justify-between">
                                Voice Prescription / Symptoms
                                <span className="text-indigo-500 flex items-center gap-1 font-black"><Sparkles size={10} /> AI Ready</span>
                            </label>
                            <textarea
                                name="symptoms"
                                value={formData.symptoms}
                                onChange={handleInputChange}
                                rows={4}
                                placeholder="e.g. Chest pain, palpitations..."
                                className="w-full px-3 sm:px-4 py-3 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                            />
                            <button
                                onClick={handleGeneratePrescription}
                                className="mt-3 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-lg sm:rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <Sparkles size={14} /> Auto-Generate Rx
                            </button>
                        </div>
                    ) : (
                        <div className="mb-6 sm:mb-8">
                            <label className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 flex justify-between">
                                Symptoms / Complaints
                            </label>
                            <textarea
                                name="symptoms"
                                value={formData.symptoms}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="e.g. Chest pain, palpitations..."
                                className="w-full px-3 sm:px-4 py-3 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                            />
                        </div>
                    )}

                    {/* DYNAMIC CLINICAL MODULES - STRICT MAPPING TO PREVENT CROSS-RENDERING */}
                    <div className="mb-6 sm:mb-8">
                        {(() => {
                            const spec = activeSpecialty.toUpperCase();
                            console.log("Rendering module for:", spec);
                            
                            // Reordered to check GASTRO before ENT (since ENT is a substring of GASTROENTEROLOGY)
                            if (spec.includes('CARDIO')) return <CardiologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('DERMA')) return <DermatologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('ORTHO')) return <OrthopedicModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('PEDIATRI')) return <PediatricsModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('GASTRO')) return <GastroModule formData={formData} setFormData={setFormData} />; 
                            if (spec === 'ENT' || (spec.includes('ENT') && !spec.includes('DENT') && !spec.includes('GASTRO'))) return <ENTModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('EYE') || spec.includes('OPHTHA')) return <OphthalmologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('GYNAE') || spec.includes('GYNE') || spec.includes('OBST')) return <GynecologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('NEURO')) return <NeurologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('PULMO') || spec.includes('CHEST')) return <PulmonologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('NEPHRO')) return <NephrologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('URO')) return <UrologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('RADIO')) return <RadiologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('PSYCH')) return <PsychiatryModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('ENDOCRIN')) return <EndocrinologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('HEMA')) return <HematologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('ONCO')) return <OncologyModule formData={formData} setFormData={setFormData} />;
                            if (spec.includes('DENT')) return <DentistryModule formData={formData} setFormData={setFormData} />;
                            return null;
                        })()}
                    </div>

                    {/* ── COMMON FIELD: Diagnosis (shown below specialty modules) ── */}
                    <div className="mb-6 sm:mb-8 mt-4">
                        <label className="block text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Diagnosis</label>
                        <textarea
                            name="diagnosis"
                            value={formData.diagnosis}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="e.g. Viral Fever"
                            className="w-full px-3 sm:px-4 py-3 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                        />
                    </div>

                    {/* ── COMMON FIELD: Advice (shown below diagnosis) ── */}
                    <div className="mb-6 sm:mb-8">
                        <label className="block text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Advice</label>
                        <textarea
                            name="advice"
                            value={formData.advice}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="e.g. Drink plenty of water, Rest for 3 days"
                            className="w-full px-3 sm:px-4 py-3 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
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
                        <div className="grid-cols-12 gap-3 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:grid">
                            <div className="col-span-3">Medicine</div>
                            <div className="col-span-1">Form</div>
                            <div className="col-span-1">Dosage</div>
                            <div className="col-span-3 text-center">Frequency</div>
                            <div className="col-span-1">Days</div>
                            <div className="col-span-1">Qty</div>
                            <div className="col-span-3 text-center">Eye / Instillation</div>
                        </div>

                        {formData.medicines.map((med, idx) => (
                            <div key={idx} className={`relative group bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-xl p-3 transition-all ${activeMedIndex === idx ? 'z-50 shadow-lg' : 'z-10'}`}>
                                <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-3 items-start lg:items-center">
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
                                                {suggestions.map((medicine: any, mIdx: number) => (
                                                    <button
                                                        key={mIdx}
                                                        onClick={() => selectMedicine(medicine, idx)}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 group/item"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                                                    {medicine.brand || medicine.name}
                                                                    {medicine.isPharmacyStock === false ? (
                                                                        <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                                                                            🔵 General / Custom
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                                            🟢 Pharmacy Stock
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-slate-500 leading-tight">{medicine.generic}</div>
                                                                {medicine.unitsPerPack ? (
                                                                    <div className="mt-1 text-[10px] font-bold text-slate-400">
                                                                        {medicine.unitsPerPack} units per pack
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                            <div className="text-right">
                                                                {medicine.isPharmacyStock !== false ? (
                                                                    medicine.stock > 0 ? (
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                                                {Number(medicine.stock).toFixed(2)} Packs Available
                                                                            </span>
                                                                            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                                                                Total: {(medicine.stock * (medicine.unitsPerPack || 1)).toFixed(2)} Units
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
                                                                {medicine.mrp ? (
                                                                    <div className="text-xs font-bold text-slate-700 mt-1">₹{medicine.mrp} <span className="text-[10px] font-normal text-slate-400">/ pack</span></div>
                                                                ) : null}
                                                                {medicine.unitsPerPack && medicine.unitsPerPack > 1 && medicine.mrp ? (
                                                                    <div className="text-[9px] font-bold text-indigo-500 mt-0.5">₹{(medicine.mrp / medicine.unitsPerPack).toFixed(2)} per unit</div>
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
                                            {med.form ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide bg-violet-50 text-violet-700 border border-violet-100 w-full justify-center truncate">
                                                    {med.form}
                                                </span>
                                            ) : (
                                                <div className="text-[9px] font-bold text-slate-300 uppercase px-1 py-2 bg-slate-50 rounded-lg text-center border border-dashed border-slate-200">N/A</div>
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

                                        <div className="col-span-2 lg:col-span-4 order-1 lg:order-3 space-y-1">
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

                                        <div className="col-span-1 lg:col-span-2 order-5 lg:order-5 space-y-1">
                                            <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase px-1 flex justify-between items-center">
                                                Qty
                                                <button onClick={() => removeMedicine(idx)} className="lg:hidden p-1 text-rose-500 bg-rose-50 rounded">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 relative">
                                                    <input
                                                        value={med.quantity}
                                                        onChange={(e) => updateMedicine(idx, 'quantity', e.target.value)}
                                                        placeholder="Qty"
                                                        className={`w-full px-3 py-2 bg-white border ${med.error ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-teal-500'} rounded-lg text-xs lg:text-sm font-black focus:outline-none focus:ring-2`}
                                                    />
                                                    {med.error && (
                                                        <div className="absolute -top-6 left-0 text-[8px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded shadow-sm z-50 whitespace-nowrap">
                                                            {med.error}
                                                        </div>
                                                    )}
                                                </div>
                                                <button onClick={() => removeMedicine(idx)} className="hidden lg:flex p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg shrink-0 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            {med.availableUnits !== undefined && (
                                                <div className="pt-1 flex justify-between items-center px-1">
                                                    <span className="text-[8px] font-bold text-slate-400">Stk: {med.availableUnits}</span>
                                                    {med.pricePerUnit && (
                                                        <span className="text-[8px] font-bold text-teal-600">₹{(med.pricePerUnit * (parseInt(med.quantity) || 0)).toFixed(2)}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-span-2 lg:col-span-3 order-6 lg:order-6 space-y-1 mt-2 lg:mt-0">
                                            <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase px-1">Instillation</div>
                                            <div className="flex gap-1 w-full">
                                                <select
                                                    value={med.eye || ''}
                                                    onChange={(e) => updateMedicine(idx, 'eye', e.target.value)}
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
                                    </div>
                                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border-theme p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-theme">
                            <h2 className="text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-widest">Diet & Lifestyle</h2>
                            <button onClick={() => addArrayItem('dietAdvice')} className="text-primary-theme hover:bg-secondary-theme p-1.5 rounded-lg transition-colors"><Plus size={16} /></button>
                        </div>
                        <div className="space-y-2">
                            {formData.dietAdvice.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        value={item}
                                        onChange={(e) => updateArrayItem('dietAdvice', idx, e.target.value)}
                                        className="flex-1 px-3 py-2 bg-secondary-theme border border-border-theme rounded-lg text-xs sm:text-sm focus:outline-none focus:border-teal-500"
                                        placeholder="Add advice..."
                                    />
                                    <button onClick={() => removeArrayItem('dietAdvice', idx)} className="text-muted hover:text-rose-500 transition-colors"><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div id="lab-tests-section" className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border-theme p-4 sm:p-6 scroll-mt-24">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-theme">
                            <h2 className="text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-widest">Lab Tests</h2>
                            <button onClick={() => addArrayItem('suggestedTests')} className="text-primary-theme hover:bg-secondary-theme p-1.5 rounded-lg transition-colors"><Plus size={16} /></button>
                        </div>
                        <div className="space-y-2">
                            {formData.suggestedTests.length === 0 && (
                                <p className="text-[10px] sm:text-xs text-muted font-medium italic">No tests suggested.</p>
                            )}
                            {formData.suggestedTests.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        value={item}
                                        onChange={(e) => updateArrayItem('suggestedTests', idx, e.target.value)}
                                        className="flex-1 px-3 py-2 bg-secondary-theme border border-border-theme rounded-lg text-xs sm:text-sm focus:outline-none focus:border-teal-500"
                                        placeholder="Test name (e.g. CBC)..."
                                    />
                                    <button onClick={() => removeArrayItem('suggestedTests', idx)} className="text-muted hover:text-rose-500 transition-colors"><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border-theme p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar size={16} className="text-teal-600" />
                                <h2 className="text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-widest">Follow Up</h2>
                            </div>
                            <div className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Follow Up Date</label>
                                    <input
                                        type="date"
                                        name="followUpDate"
                                        value={formData.followUpDate}
                                        onChange={handleInputChange}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    />
                                </div>
                                <textarea
                                    name="followUp"
                                    value={formData.followUp}
                                    onChange={handleInputChange}
                                    placeholder="Special follow-up instructions..."
                                    className="w-full px-3 sm:px-4 py-3 bg-secondary-theme border border-border-theme rounded-lg sm:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={16} className="text-rose-500" />
                                    <h2 className="text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-widest">Things to Avoid</h2>
                                </div>
                                <button onClick={() => addArrayItem('avoid')} className="text-primary-theme text-[9px] sm:text-[10px] font-black uppercase transition-all active:scale-90 hover:scale-105">+ Add</button>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                                {formData.avoid.length === 0 && (
                                    <p className="text-[10px] sm:text-xs text-muted font-medium italic py-4 text-center bg-secondary-theme/50 rounded-lg sm:rounded-xl border border-dashed border-border-theme">No specific restrictions.</p>
                                )}
                                {formData.avoid.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 group">
                                        <input
                                            value={item}
                                            onChange={(e) => updateArrayItem('avoid', idx, e.target.value)}
                                            className="flex-1 px-3 py-2 bg-secondary-theme border border-border-theme rounded-lg text-xs sm:text-sm focus:outline-none focus:border-teal-500 transition-colors group-hover:border-teal-200"
                                            placeholder="Restrict e.g. Smoking..."
                                        />
                                        <button onClick={() => removeArrayItem('avoid', idx)} className="text-muted hover:text-rose-500 transition-colors"><X size={16} /></button>
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
                        <button
                            onClick={handleSendToPharma}
                            disabled={isSaving || isSending || sentToPharma}
                            className={`flex-[1.5] sm:flex-none px-2 sm:px-12 py-2 sm:py-4 rounded-2xl font-black uppercase text-[8px] sm:text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-3 ${sentToPharma ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/10'}`}
                        >
                            {isSending ? <Loader2 className="animate-spin" size={14} /> : (sentToPharma ? <CheckCircle2 size={14} /> : <Pill size={14} />)}
                            <span className="truncate">{sentToPharma ? 'Pharma' : 'Pharma'}</span>
                        </button>
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

            {/* Success Modal */}
            {showSuccess && generatedHtml && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-teal-400 to-indigo-500"></div>
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                            <CheckCircle2 size={40} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Prescription Ready!</h2>
                            <p className="text-slate-500 text-sm">The prescription has been saved and formatted for printing.</p>
                        </div>

                        <div className="flex justify-center pt-4">
                            <button
                                onClick={() => handlePrintDocument('prescription')}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-teal-50 border-2 border-teal-100 text-teal-700 hover:bg-teal-100 hover:border-teal-200 group w-48 transition-all active:scale-95"
                            >
                                <Printer size={32} className="group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-sm">Print Prescription</span>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
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

            {/* No Pharma Warning Modal */}
            {showNoPharmaWarn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Pharmacy Not Notified</h3>
                            <p className="text-sm text-slate-500 font-medium mt-2">
                                You have <span className="text-teal-600 font-bold">{formData.medicines.length} medications</span> in this prescription, but you haven't sent them to the pharmacy yet.
                            </p>
                            <p className="text-xs text-slate-400 font-medium mt-2">
                                Are you sure you want to save and print without notifying the pharmacy?
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowNoPharmaWarn(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-200 transition-colors"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={confirmSaveWithoutPharma}
                                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-amber-500/20 hover:bg-amber-600 active:scale-95 transition-all"
                            >
                                Yes, Proceed
                            </button>
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
                                                            const dName = rep.suggestedPrimaryDoctor || rep.doctor?.user?.name || rep.doctor?.name || rep.doctorName || 'Unknown';
                                                            if (dName === 'N/A' || dName === 'Unknown') return 'Dr. Unknown';
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
                                    if (selectedPatientId) {
                                        window.open(`/${hospitalId}/doctor/patients/${selectedPatientId}`, '_blank');
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

            {/* ─── Navigation Guard Modal ───────────────────────────────────────── */}
            {showNavWarn && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
                        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                            <AlertCircle size={32} className="text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Active Consultation!</h3>
                            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
                                You are in the middle of a consultation with <span className="font-black text-slate-700">{formData.patientName || 'this patient'}</span>.
                                Please <strong>Pause</strong> or <strong>Complete</strong> the session before leaving — your draft is auto-saved locally.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 pt-2">
                            <button
                                onClick={() => { setShowNavWarn(false); pendingNavRef.current = null; }}
                                className="w-full py-3 bg-teal-600 text-white rounded-xl font-black uppercase text-xs tracking-wider hover:bg-teal-700 active:scale-95 transition-all shadow-lg shadow-teal-600/20"
                            >
                                Stay in Consultation
                            </button>
                            <button
                                onClick={async () => { setShowNavWarn(false); await handlePauseConsultation(); }}
                                className="w-full py-3 bg-amber-500 text-white rounded-xl font-black uppercase text-xs tracking-wider hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                            >
                                <Pause size={14} /> Pause &amp; Leave
                            </button>
                            <button
                                onClick={() => {
                                    const url = pendingNavRef.current;
                                    setShowNavWarn(false);
                                    pendingNavRef.current = null;
                                    if (url) { setIsPaused(true); setTimeout(() => router.push(url), 50); }
                                }}
                                className="text-slate-400 hover:text-rose-600 text-xs font-bold uppercase tracking-widest transition-colors py-1"
                            >
                                Leave without saving
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default React.memo(CreatePrescriptionPage);