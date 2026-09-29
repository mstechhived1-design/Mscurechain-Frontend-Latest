import { Department } from './department';

export interface NormalRange {
    min?: number | string;
    max?: number | string;
    text?: string;
}

export interface NormalRanges {
    male: NormalRange;
    female: NormalRange;
    child: NormalRange;
    newborn?: NormalRange;
    infant?: NormalRange;
    geriatric?: NormalRange;
}

export interface TestParameter {
    _id: string;
    testId: string;
    name: string;
    unit?: string;
    normalRanges: NormalRanges;
    criticalLow?: number;
    criticalHigh?: number;
    displayOrder: number;
}

export interface LabTest {
    _id: string;
    testName: string;
    testCode?: string;
    name?: string; // Compatibility
    departmentId?: Department | string;
    departmentIds?: (Department | string)[];
    departments?: Department[]; // Populated version
    sampleType: string;
    price: number;
    labPrice?: number; // Optional Lab-to-Lab discounted price
    unit?: string;
    method?: string;
    methodology?: string;
    turnaroundTime?: string;
    temporalTATCycle?: string;
    normalRanges?: NormalRanges;
    fastingRequired?: boolean;
    sampleVolume?: string;
    reportType?: 'numeric' | 'text' | 'both';
    reportFormat?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface LabTestPayload {
    testName: string;
    testCode?: string;
    departmentId?: string;
    departmentIds?: string[];
    sampleType: string;
    price: number;
    labPrice?: number; // Optional Lab-to-Lab discounted price
    unit?: string;
    method?: string;
    methodology?: string;
    turnaroundTime?: string;
    temporalTATCycle?: string;
    normalRanges?: NormalRanges;
    fastingRequired?: boolean;
    sampleVolume?: string;
    reportType?: 'numeric' | 'text' | 'both';
    reportFormat?: string;
    isActive?: boolean;
}
