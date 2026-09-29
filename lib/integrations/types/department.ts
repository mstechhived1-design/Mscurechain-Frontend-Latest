export interface Department {
    _id: string;
    name: string;
    description?: string;
    isActive: boolean;
    tests?: { testName: string, price: number }[];
    testCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface DepartmentPayload {
    name: string;
    description?: string;
    isActive?: boolean;
}
