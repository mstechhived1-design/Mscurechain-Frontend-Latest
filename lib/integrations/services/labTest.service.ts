import { apiClient } from '../api/apiClient';
import { LabTest, LabTestPayload, TestParameter } from '../types/labTest';
import { LAB_ENDPOINTS } from '../config/endpoints';

export const LabTestService = {
    // Add a new test
    addTest: async (data: LabTestPayload): Promise<{ message: string; test: LabTest }> => {
        return apiClient<{ message: string; test: LabTest }>(LAB_ENDPOINTS.TESTS.BASE, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Get all tests
    getTests: async (): Promise<LabTest[]> => {
        return apiClient<LabTest[]>(LAB_ENDPOINTS.TESTS.BASE);
    },

    // Get single test
    getTestById: async (id: string): Promise<LabTest> => {
        return apiClient<LabTest>(LAB_ENDPOINTS.TESTS.BY_ID(id));
    },

    // Get test parameters
    getTestParameters: async (id: string): Promise<TestParameter[]> => {
        return apiClient<TestParameter[]>(LAB_ENDPOINTS.TESTS.PARAMETERS(id));
    },

    // Update a test
    updateTest: async (id: string, data: LabTestPayload): Promise<{ message: string; test: LabTest }> => {
        return apiClient<{ message: string; test: LabTest }>(LAB_ENDPOINTS.TESTS.BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Delete a test
    deleteTest: async (id: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(LAB_ENDPOINTS.TESTS.BY_ID(id), {
            method: 'DELETE',
        });
    },

    // Delete all tests
    deleteAllTests: async (): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(LAB_ENDPOINTS.TESTS.DESTROY_ALL, {
            method: 'DELETE',
        });
    },

    // Get Meta Options
    getMetaOptions: async (): Promise<any> => {
        return apiClient<any>(LAB_ENDPOINTS.META);
    },

    // Update Meta Options
    updateMetaOptions: async (data: { methods?: string[]; sampleTypes?: string[]; units?: string[] }): Promise<any> => {
        return apiClient<any>(LAB_ENDPOINTS.META, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
};
