"use client";

import React, { useState, useEffect } from "react";
import {
  Siren,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Activity,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { helpdeskEmergencyService } from "@/lib/integrations/services/helpdesk-emergency.service";
import { EmergencyRequest } from "@/lib/integrations/types/emergency";
import toast from "react-hot-toast";
import Link from "next/link";
import { useParams } from "next/navigation";

function EmergencyAccept() {
  const params = useParams() as any;
  const hospitalId = params.hospitalId as string;
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchEmergencies = async () => {
    try {
      const response = await helpdeskEmergencyService.getHospitalEmergencyRequests();
      setEmergencies(response.requests);
    } catch (error: any) {
      if (loading) toast.error("Emergency Grid Offline");
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 10000);
    return () => clearInterval(interval);
  }, []);

  // Reset to page 1 when switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      if (status === 'accepted') {
        await helpdeskEmergencyService.acceptRequest(id, "Accepted from Response Center");
        toast.success("Deployment Confirmed");
      } else if (status === 'rejected') {
        await helpdeskEmergencyService.rejectRequest(id, "Deferred by Helpdesk");
        toast.success("Request Deferred");
      }
      fetchEmergencies();
    } catch (error: any) {
      toast.error("Operation Sequence Interrupted");
    }
  };

  if (loading && emergencies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Critical Signal...</p>
        </div>
      </div>
    );
  }

  const getHospitalStatus = (e: EmergencyRequest) => {
    const rh = e.requestedHospitals?.find(h => 
        (typeof h.hospital === 'string' ? h.hospital === hospitalId : h.hospital?._id === hospitalId)
    );
    return rh?.status || "pending";
  };

  const pendingRequests = emergencies.filter(e => getHospitalStatus(e) === 'pending');
  const closedRequests = emergencies.filter(e => getHospitalStatus(e) !== 'pending');
  const displayList = activeTab === 'pending' ? pendingRequests : closedRequests;

  // Pagination logic
  const totalPages = Math.ceil(displayList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedList = displayList.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="space-y-8">

      {/* PROFESSIONAL HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 max-w-full mx-auto">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/helpdesk" className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600">
              <ArrowLeft size={16} />
            </Link>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Delta / Case Reception</span>
          </div>
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            {activeTab === 'pending' ? 'Emergency Requests' : 'Active List'}
          </h1>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">Hospital Node / Critical Dispatch Control</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex p-0.5 sm:p-1 bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-sm">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${activeTab === 'pending'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Requests ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${activeTab === 'active'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Closed ({emergencies.length - pendingRequests.length})
            </button>
          </div>
          <button onClick={fetchEmergencies} className="p-2 sm:p-2.5 bg-white border border-slate-200 text-slate-400 rounded-lg sm:rounded-xl hover:text-teal-600 shadow-sm" aria-label="Refresh Grid">
            <RefreshCw size={16} className="sm:size-[18px]" />
          </button>
        </div>
      </div>

      {/* EMERGENCY MANIFEST GRID */}
      <div className="max-w-full mx-auto space-y-4">
        {paginatedList.length > 0 ? paginatedList.map((req) => (
          <div key={req._id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-rose-200">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-md border ${req.severity === 'critical' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                  Priority: {req.severity}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Clock size={12} /> Live Pulse: {new Date(req.createdAt).toLocaleTimeString()}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{req.patientName || "IDENTITY-PENDING"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{req.patientAge}Y • {req.patientGender}</span>
                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-tight">{req.emergencyType}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                <StatusBox icon={<MapPin size={14} className="text-slate-400" />} label="Location" value={req.currentLocation} />
                <StatusBox icon={<Siren size={14} className="text-rose-600" />} label="Field Asset" value={req.ambulancePersonnel?.vehicleNumber} />
                <StatusBox icon={<Activity size={14} className="text-teal-600" />} label="Real-time Vitals" value={req.vitals ? `${req.vitals.bloodPressure || '-'} BP` : 'NO LINK'} />
              </div>
            </div>

            <div className="lg:w-72 space-y-2">
              {getHospitalStatus(req) === 'pending' ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleStatusUpdate(req._id, 'accepted')}
                    disabled={req.status === 'accepted' && req.acceptedByHospital?._id !== hospitalId}
                    className="w-full py-4 bg-rose-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-700 active:scale-95 shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {req.status === 'accepted' ? <Siren size={16} /> : <CheckCircle size={16} />}
                    {req.status === 'accepted' ? 'Handled by Other' : 'Authorize Admission'}
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(req._id, 'rejected')}
                    className="w-full py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-rose-200 hover:text-rose-600 active:scale-95"
                  >
                    Defer Signal
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 items-center">
                    {getHospitalStatus(req) === "accepted" ? (
                        <div className="w-full py-4 bg-teal-50 border border-teal-100 text-teal-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 italic">
                            <CheckCircle size={16} /> Admission Confirmed
                        </div>
                    ) : req.acceptedByHospital ? (
                        <div className="w-full py-4 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 italic">
                            <Siren size={16} /> Booked by {req.acceptedByHospital.name}
                        </div>
                    ) : (
                        <div className="w-full py-4 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 italic">
                            <XCircle size={16} /> Mission Deployed / Deferred
                        </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="py-24 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Activity size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Grid Operational. No active critical vectors.</p>
          </div>
        )}
      </div>

      {/* PAGINATION CONTROLS */}
      {displayList.length > itemsPerPage && (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Showing {startIndex + 1}-{Math.min(endIndex, displayList.length)} of {displayList.length} requests
          </div>

          <div className="flex  items-center gap-2  absolute right-25 ">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-300 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${currentPage === page
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20'
                    : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-300 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function StatusBox({ icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-[10px] font-bold text-slate-700 uppercase truncate">{value}</p>
    </div>
  );
}

export default React.memo(EmergencyAccept);
