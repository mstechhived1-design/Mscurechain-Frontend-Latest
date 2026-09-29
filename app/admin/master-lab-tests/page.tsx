"use client";

import React, { useState, useEffect } from "react";
import { universalLabService, UniversalLabTest } from "@/lib/integrations/services/universalLabService";
import { Search, Plus, Edit, Trash2, Loader2, FlaskConical, Beaker, CheckCircle, XCircle, Filter, RefreshCw, AlertTriangle, Database } from "lucide-react";
import toast from "react-hot-toast";
import UniversalTestModal from "./UniversalTestModal";

const DEPARTMENTS = [
  "All Departments",
  "Hematology",
  "Biochemistry",
  "Microbiology",
  "Pathology",
  "Immunology",
  "Serology",
  "Clinical Pathology",
  "Molecular Biology",
  "Cytology",
  "Others"
];

export default function MasterLabTestsPage() {
  const [tests, setTests] = useState<UniversalLabTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<UniversalLabTest | null>(null);

  // Seed Status State
  const [seedStatus, setSeedStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const fetchTests = async () => {
    try {
      setIsLoading(true);
      const params: any = { search };
      if (department !== "All Departments") {
        params.department = department;
      }
      const res = await universalLabService.getTests(params);
      if (res.success) {
        setTests(res.data);
      }
      
      const statusRes = await universalLabService.getSeedStatus();
      if (statusRes.success) {
        setSeedStatus(statusRes.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch tests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [search, department]);

  const handleSaveTest = async (data: Partial<UniversalLabTest>) => {
    if (editingTest?._id) {
      await universalLabService.updateTest(editingTest._id, data);
      toast.success("Test updated successfully");
    } else {
      await universalLabService.createTest(data);
      toast.success("Test created successfully");
    }
    fetchTests();
  };

  const handleSyncSeed = async () => {
    try {
      setIsSyncing(true);
      const res = await universalLabService.syncUniversalSeed();
      if (res.success) {
        toast.success(res.message);
        fetchTests();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync seed data");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetSeed = async () => {
    try {
      setIsResetting(true);
      const res = await universalLabService.resetUniversalSeed();
      if (res.success) {
        toast.success(res.message);
        setShowResetConfirm(false);
        fetchTests();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset seed data");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <FlaskConical className="text-blue-500" />
            Universal Master Tests
            {seedStatus?.version && (
              <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md ml-2 border border-blue-500/20">
                {seedStatus.version}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted">Manage the global dictionary of lab tests used across all hospitals.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSyncSeed}
            disabled={isSyncing}
            className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 border border-emerald-600/20 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            Sync Master Library
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-red-600/10 hover:bg-red-600/20 text-red-600 border border-red-600/20 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
          >
            <Database size={18} />
            Full Reset
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            onClick={() => {
              setEditingTest(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={18} />
            Add Universal Test
          </button>
        </div>
      </div>

      {/* Seed Status Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-2xl border border-border-theme flex flex-col">
          <span className="text-xs font-bold text-muted uppercase tracking-widest">Total Departments</span>
          <span className="text-2xl font-black text-foreground mt-1">{seedStatus?.totalDepartments || 0}</span>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-border-theme flex flex-col">
          <span className="text-xs font-bold text-muted uppercase tracking-widest">Total Tests</span>
          <span className="text-2xl font-black text-blue-500 mt-1">{seedStatus?.totalTests || 0}</span>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-border-theme flex flex-col">
          <span className="text-xs font-bold text-muted uppercase tracking-widest">Total Parameters</span>
          <span className="text-2xl font-black text-emerald-500 mt-1">{seedStatus?.totalParameters || 0}</span>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-border-theme flex flex-col">
          <span className="text-xs font-bold text-muted uppercase tracking-widest">Total Profiles</span>
          <span className="text-2xl font-black text-purple-500 mt-1">{seedStatus?.totalProfiles || 0}</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-card p-4 rounded-2xl border border-border-theme">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            placeholder="Search by test name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border-theme rounded-xl text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="relative w-full md:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border-theme rounded-xl text-sm focus:outline-none focus:border-blue-500 appearance-none"
          >
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border-theme overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 text-muted border-b border-border-theme uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="p-4">Test Code</th>
                <th className="p-4">Test Name</th>
                <th className="p-4">Department</th>
                <th className="p-4">Result Type</th>
                <th className="p-4">Suggested Price</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-theme">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading master tests...
                  </td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    <Beaker size={32} className="mx-auto mb-2 opacity-50" />
                    No tests found. Add one to get started.
                  </td>
                </tr>
              ) : (
                tests.map((test) => (
                  <tr key={test._id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-mono text-xs font-bold">{test.testCode}</td>
                    <td className="p-4 font-bold text-foreground">{test.testName}</td>
                    <td className="p-4 text-muted">{test.departmentName}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-muted/20 text-xs rounded-md uppercase font-bold text-muted-foreground">
                        {test.resultType}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-emerald-500">₹{test.suggestedPrice}</td>
                    <td className="p-4 text-center">
                      {test.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-md">
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 text-xs font-bold bg-red-500/10 px-2 py-1 rounded-md">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingTest(test);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this master test? This may affect hospitals using it.")) {
                              try {
                                await universalLabService.deleteTest(test._id!);
                                toast.success("Test deleted");
                                fetchTests();
                              } catch (err: any) {
                                toast.error("Failed to delete");
                              }
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <UniversalTestModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTest(null);
        }}
        onSave={handleSaveTest}
        initialData={editingTest}
      />

      {/* Dangerous Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-red-500/50 p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black">Full Reset Master Library</h3>
                <p className="text-xs font-bold text-red-500/70 uppercase tracking-widest">Dangerous Operation</p>
              </div>
            </div>
            
            <p className="text-sm text-muted">
              This action will completely wipe all existing Universal Master tests and recreate them from the baseline <span className="font-bold text-foreground">{seedStatus?.version || "v1.0"}</span> seed data. 
              <br/><br/>
              <strong>Any manual edits you have made to prices, ranges, or parameters will be lost permanently.</strong>
            </p>

            <div className="flex items-center gap-3 pt-4 border-t border-border-theme">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-bold bg-muted/10 hover:bg-muted/20 transition-colors"
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                onClick={handleResetSeed}
                disabled={isResetting}
                className="flex-[2] px-4 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {isResetting ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                I understand, Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
