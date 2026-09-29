'use client';

import React, { useState } from 'react';
import {
  FileText,
  Shield,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderOpen,
  Eye,
  Loader2,
  Plus,
  X,
  User,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useHRDocuments, useHRStaff, useUploadHRDocument, useDeleteHRDocument } from '@/lib/integrations/hooks';
import { toast } from 'react-hot-toast';
import { DocumentViewerModal } from '@/components/common/DocumentViewerModal';

const DocumentUploadModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [docType, setDocType] = useState('degreeCertificate');
  const [file, setFile] = useState<File | null>(null);

  const { data: staffListRes } = useHRStaff({ limit: 100 });
  const uploadMutation = useUploadHRDocument();

  const handleUpload = async () => {
    if (!selectedStaff || !docType || !file) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        staffId: selectedStaff,
        documentType: docType,
        file: file,
      });
      toast.success('Document uploaded successfully');
      onClose();
    } catch (err) {
      toast.error('Upload failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-5xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Upload Document</h2>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
              Add a new credential to the vault
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Select Staff Member
            </label>
            <div className="relative">
              <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full pl-14 pr-6 py-3 border-none bg-gray-50 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
              >
                <option value="">Choose Staff...</option>
                {staffListRes?.data?.map((staff: any) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.name} ({staff.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Document Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Degree Certificate', value: 'degreeCertificate' },
                { label: 'Registration', value: 'registrationCertificate' },
                { label: 'Employment ID', value: 'employmentId' },
                { label: 'Contract', value: 'employmentContract' },
                { label: 'License', value: 'medicalLicense' },
                { label: 'Other', value: 'otherCertificate' },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setDocType(type.value)}
                  className={`px-3 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${docType === type.value
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Document File
            </label>
            <div className="relative group">
              <input
                type="file"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    if (selectedFile.size > 5 * 1024 * 1024) {
                      toast.error("File size limits 5MB. Please choose a smaller file.");
                      e.target.value = ''; // Reset input
                      setFile(null);
                      return;
                    }
                    setFile(selectedFile);
                  } else {
                    setFile(null);
                  }
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50'
                  }`}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="text-[11px] font-black text-emerald-600 uppercase tracking-tight">
                      {file.name}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase">Click to change file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      Select PDF or Image
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-gray-50/50 border-t border-gray-50 flex gap-4">
          <button
            disabled={uploadMutation.isPending}
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all"
          >
            Cancel
          </button>
          <button
            disabled={uploadMutation.isPending}
            onClick={handleUpload}
            className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen size={14} />}
            {uploadMutation.isPending ? 'Uploading...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Removed inline DocumentViewerModal in favor of centralized import

export default function DocumentVaultPage() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewer, setViewer] = useState({ isOpen: false, url: '', title: '' });

  const { data: documentResponse, isLoading } = useHRDocuments({
    category: filter,
    search: searchTerm,
    page,
    limit,
  } as any);

  const deleteMutation = useDeleteHRDocument();

  const statsData = documentResponse?.stats || {};
  const documents = documentResponse?.data || [];

  // Try to use backend pagination, otherwise fallback to stats total
  const pagination = documentResponse?.pagination || {};
  const totalPagesResp = pagination.totalPages || Math.ceil((parseInt(statsData.totalDocuments || '0', 10) || 0) / limit) || 1;
  const totalPages = Math.max(1, totalPagesResp);

  const categories = documentResponse?.categories || [
    { name: 'All Documents', value: 'all', count: 0 },
    { name: 'Contracts', value: 'contracts', count: 0 },
    { name: 'ID Proofs', value: 'ids', count: 0 },
    { name: 'Medical Licenses', value: 'licenses', count: 0 },
    { name: 'Certificates', value: 'certificates', count: 0 },
  ];

  const stats = [
    {
      label: 'Total Documents',
      value: statsData.totalDocuments?.toString() || '0',
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Compliance Status',
      value: statsData.complianceStatus || '100%',
      icon: Shield,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Expiring Soon',
      value: statsData.expiringSoon?.toString() || '0',
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Pending Review',
      value: statsData.pendingReview?.toString() || '0',
      icon: Clock,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  const handleDownload = async (url: string, title: string) => {
    if (!url) return;
    try {
      // Force Cloudinary to serve the file as an attachment (download)
      const downloadUrl = url.includes('cloudinary.com')
        ? url.replace('/upload/', '/upload/fl_attachment/')
        : url;
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = title || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open with download attribute hint
      const link = document.createElement('a');
      link.href = url;
      link.download = title || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleView = (url: string, title?: string) => {
    if (url) setViewer({ isOpen: true, url, title: title || 'Document Preview' });
  };

  const handleDelete = async (doc: any) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteMutation.mutateAsync({
        profileId: doc.profileId,
        documentKey: doc.documentKey,
        role: doc.role,
      });
      toast.success('Document deleted successfully');
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  return (
        <div className="space-y-6 bg-gray-50 min-h-screen font-sans w-full max-w-[100vw] overflow-x-hidden">
            {/* HEADER BAR */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl sm:rounded-2xl border border-slate-100 shadow-sm w-full">
                {/* LEFT: title */}
                <div className="flex flex-col justify-center shrink-0 w-full lg:w-auto">
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 tracking-tight leading-none uppercase">Document Vault</h1>
                    <p className="mt-1 text-slate-500 text-[10px] font-medium uppercase tracking-tight">Securely manage staff contracts, IDs, and medical credentials</p>
                </div>

                {/* RIGHT SIDE (Upload & Stats wrapped) */}
                <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center gap-3 sm:gap-4 w-full lg:w-auto flex-1 justify-start lg:justify-end">

                    {/* Upload button */}
                    <div className="shrink-0 w-full md:w-auto">
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="flex items-center justify-center gap-2 w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 sm:py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 text-[10px] uppercase tracking-widest"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Upload Document
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-y-3 gap-x-4 sm:gap-x-5 px-4 sm:px-5 py-3 sm:py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 w-full md:w-auto">
                        {stats.map((stat, i) => (
                            <React.Fragment key={i}>
                                <div className="flex flex-col flex-1 sm:flex-none min-w-[80px]">
                                    <div className={`flex items-center gap-1.5 mb-0.5 ${stat.color}`}>
                                        <stat.icon size={10} />
                                        <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest">{stat.label}</span>
                                    </div>
                                    <p className="text-sm sm:text-base font-black text-slate-900 leading-none">{stat.value}</p>
                                </div>
                                {i < stats.length - 1 && <div className="w-px h-6 bg-slate-200 hidden sm:block" />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-black text-xs text-gray-400 uppercase tracking-[0.2rem] mb-6">Document Categories</h3>
            <div className="space-y-1.5">
              {categories.map((cat: any) => (
                <button
                  key={cat.value}
                  onClick={() => { setFilter(cat.value); setPage(1); }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${filter === cat.value
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full ${filter === cat.value ? 'bg-white/20' : 'bg-gray-100'
                      }`}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-900 p-8 rounded-4xl text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden group">
            <div className="relative z-10">
              <Shield className="w-8 h-8 mb-4 text-indigo-400" />
              <h4 className="font-black text-xl leading-tight mb-2 uppercase italic tracking-tighter">
                Vault <br /> Compliance
              </h4>
              <p className="text-[10px] text-indigo-300 font-bold mb-6 leading-relaxed uppercase tracking-widest">
                Automated license tracking and expiry notifications for all staff.
              </p>
              <button className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2rem] transition-all border border-white/10">
                Manage Alerts
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  placeholder="Search vault by staff name or document title..."
                  className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-[11px] uppercase tracking-widest shadow-inner shadow-gray-100/50"
                />
              </div>

              {/* Pagination controls on the same line */}
              <div className="flex items-center gap-6 bg-white px-6 py-2 rounded-2xl border border-gray-100 shadow-sm shrink-0 w-full md:w-auto overflow-x-auto justify-center md:justify-start custom-scrollbar">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-all font-bold"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-[7.5px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
                    {page - 1} Prev
                  </span>
                </div>

                <span className="text-[10px] font-black px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl uppercase tracking-widest whitespace-nowrap">
                  Page {page}
                </span>

                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-all font-bold"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="text-[7.5px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
                    {Math.max(0, totalPages - page)} Next
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="p-6 pl-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">
                      Document Name
                    </th>
                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">Type</th>
                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">Staff Member</th>
                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">Status</th>
                    <th className="p-6 text-right pr-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-32 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">
                            Synchronizing Vault...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-32 text-center">
                        <div className="flex flex-col items-center gap-6 text-gray-200">
                          <FolderOpen size={64} strokeWidth={1} />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2rem] text-gray-400">
                              No documents found
                            </p>
                            <p className="text-[9px] font-bold text-gray-300 uppercase mt-1 tracking-widest">
                              Try adjusting your filters or search query
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition-all group">
                        <td className="px-5 py-3 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white shadow-sm shrink-0">
                              <FileText size={16} />
                            </div>
                            <div>
                              <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-all uppercase tracking-tight text-[11px]">
                                {doc.title}
                              </p>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15rem] mt-0.5">
                                {doc.size} • Uploaded {doc.date}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[9px] font-black text-gray-500 bg-gray-50 px-2 py-1 rounded-lg uppercase tracking-widest border border-gray-100">
                            {doc.type}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center text-[9px] font-black text-gray-400">
                              {doc.staff?.charAt(0)}
                            </div>
                            <span className="text-[10px] font-black text-gray-700 uppercase tracking-tight">{doc.staff}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.15rem] rounded-lg border flex items-center gap-1.5 w-fit ${doc.status === 'verified'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : doc.status === 'expiring'
                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : 'bg-gray-50 text-gray-600 border-gray-100'
                              }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${doc.status === 'verified' ? 'bg-emerald-500' : doc.status === 'expiring' ? 'bg-amber-500' : 'bg-gray-400'
                                }`}
                            />
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleView(doc.url, doc.title)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="View Document"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleDownload(doc.url, doc.title)}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Download Document"
                            >
                              <Download size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Delete Document"
                            >
                              <Trash2 size={15} />
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
        </div>
      </div>

      <DocumentUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
      <DocumentViewerModal
        isOpen={viewer.isOpen}
        onClose={() => setViewer({ ...viewer, isOpen: false })}
        url={viewer.url}
        title={viewer.title}
      />
    </div>
  );
}
