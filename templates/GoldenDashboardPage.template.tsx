/**
 * GOLDEN DASHBOARD PAGE TEMPLATE
 * 
 * Use this template for ALL new dashboard pages to ensure optimal performance.
 * This template implements all best practices to prevent over-fetching and slow loads.
 * 
 * Copy this file and customize the TODO sections for your specific page.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Filter, Plus } from 'lucide-react';

// TODO: Import your service
// import { yourService } from '@/lib/integrations';

// TODO: Define your data type
interface YourDataType {
  id: string;
  name: string;
  status: string; // e.g., 'active', 'inactive'
  // ... other fields
}

/**
 * PERFORMANCE RULES (READ BEFORE IMPLEMENTING):
 * 
 * ✅ DO:
 * 1. Use React Query with primitive query keys only
 * 2. Keep all data fetching in this component (single responsibility)
 * 3. Use useMemo for expensive computations
 * 4. Use primitive Zustand selectors if needed
 * 5. Implement pagination for large datasets
 * 
 * ❌ DON'T:
 * 1. Subscribe to entire user object from Zustand
 * 2. Use object-based query keys
 * 3. Fetch unrelated data (doctors, staff, etc.)
 * 4. Create multiple queries in one component
 * 5. Pass objects through React Query dependencies
 */

function YourDashboardPage() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ✅ CORRECT: Use primitive selectors from Zustand (if needed)
  // const userId = useAuthStore(state => state.user?.id);
  // const userRole = useAuthStore(state => state.user?.role);

  // ❌ WRONG: Don't do this
  // const { user } = useAuthStore();

  // ============================================================================
  // DATA FETCHING (React Query)
  // ============================================================================

  // ✅ CORRECT: Single query with primitive keys
  const { data, isLoading, error, refetch } = useQuery<any>({
    // TODO: Update query key with your primitives
    queryKey: ['your-data', currentPage, filterStatus, searchTerm],
    queryFn: async () => {
      try {
        // TODO: Replace with your actual API call
        // const response = await yourService.getData(currentPage, filterStatus, searchTerm);
        // return response;

        // Example:
        return {
          data: [],
          total: 0,
          currentPage: 1,
          totalPages: 1
        };
      } catch (error: any) {
        console.error('Failed to fetch data:', error);
        toast.error(error.message || 'Failed to load data');
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
  });

  // ============================================================================
  // DERIVED STATE (Memoized)
  // ============================================================================

  // ✅ CORRECT: Use useMemo for expensive computations
  const filteredData = useMemo(() => {
    const rawData = data?.data || [];

    return rawData.filter((item: YourDataType) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [data?.data, searchTerm, filterStatus]);

  // Statistics (memoized to avoid recalculation)
  const stats = useMemo(() => ({
    total: data?.total || 0,
    active: filteredData.filter((item: any) => item.status === 'active').length,
    inactive: filteredData.filter((item: any) => item.status === 'inactive').length,
  }), [data?.total, filteredData]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleCreate = () => {
    // TODO: Implement create logic
    console.log('Create new item');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;

    try {
      // TODO: Implement delete logic
      // await yourService.delete(id);
      toast.success('Deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-600 font-semibold">Failed to load data</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {/* TODO: Update page title */}
            Your Page Title
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {stats.total} total items
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create New
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Total</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</h3>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Active</p>
          <h3 className="text-2xl font-bold text-emerald-600">{stats.active}</h3>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Inactive</p>
          <h3 className="text-2xl font-bold text-gray-600">{stats.inactive}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 md:w-48 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Data Grid/Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg font-semibold text-gray-300">No data found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredData.map((item: YourDataType) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {data?.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(data?.totalPages, prev + 1))}
            disabled={currentPage === data?.totalPages}
            className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ✅ CRITICAL: Always export as memoized component
export default React.memo(YourDashboardPage);
