import { apiClient } from '../api/apiClient';
import { Department, DepartmentPayload } from '../types/department';
import { LAB_ENDPOINTS } from '../config/endpoints';

export const DepartmentService = {
    // Add a new department
    addDepartment: async (data: DepartmentPayload): Promise<{ message: string; department: Department }> => {
        return apiClient<{ message: string; department: Department }>(LAB_ENDPOINTS.DEPARTMENTS.BASE, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Get all departments
    getDepartments: async (): Promise<Department[]> => {
        return apiClient<Department[]>(LAB_ENDPOINTS.DEPARTMENTS.BASE);
    },

    // Update a department
    updateDepartment: async (id: string, data: Partial<DepartmentPayload>): Promise<{ message: string; department: Department }> => {
        return apiClient<{ message: string; department: Department }>(LAB_ENDPOINTS.DEPARTMENTS.BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Delete a department
    deleteDepartment: async (id: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(LAB_ENDPOINTS.DEPARTMENTS.BY_ID(id), {
            method: 'DELETE',
        });
    },

    // Get department metadata
    getMeta: async (): Promise<{ departmentNames: string[] }> => {
        return apiClient<{ departmentNames: string[] }>(LAB_ENDPOINTS.META);
    },
};
