"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Monitor, RefreshCw, AlertCircle, CheckCircle2, Video, Volume2, VolumeX, X, Save, Film, Link2, Upload } from "lucide-react";
import { apiClient } from "@/lib/integrations/api";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function TVDisplaysAdminPage() {
  const { hospitalId } = useParams() as any;
  const [displays, setDisplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPairing, setIsPairing] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [editingDisplay, setEditingDisplay] = useState<any>(null);
  
  // Form State
  const [pairCode, setPairCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [announcementLanguage, setAnnouncementLanguage] = useState("en-IN");
  const [videoUrl, setVideoUrl] = useState("");
  const [playSound, setPlaySound] = useState(false);
  const [error, setError] = useState("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video file is too large (max 50MB)");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);

    setIsUploadingVideo(true);
    try {
      const res = await apiClient<any>('/admin/tv-displays/upload-video', {
        method: 'POST',
        body: formData
      });
      if (res?.url || res?.data?.url) {
        setVideoUrl(res.url || res.data.url);
        toast.success("Video uploaded successfully!");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload video");
      console.error("Video upload error:", err);
    } finally {
      setIsUploadingVideo(false);
      // Reset input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  const LANGUAGES = [
    { code: 'en-IN', name: 'English (India)' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'te-IN', name: 'Telugu' },
    { code: 'ta-IN', name: 'Tamil' },
    { code: 'kn-IN', name: 'Kannada' },
    { code: 'ml-IN', name: 'Malayalam' },
    { code: 'mr-IN', name: 'Marathi' },
    { code: 'gu-IN', name: 'Gujarati' },
    { code: 'bn-IN', name: 'Bengali' },
    { code: 'pa-IN', name: 'Punjabi' },
  ];

  useEffect(() => {
    fetchDisplays();
    fetchDoctors();
  }, []);

  const fetchDisplays = async () => {
    try {
      const res = await apiClient<any>(`/admin/tv-displays`);
      setDisplays(res?.data || res || []);
    } catch (err) {
      console.error("Error fetching displays", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await apiClient<any>(`/helpdesk/doctors?limit=100`);
      setDoctors(res?.data || res || []);
    } catch (err) {
      console.error("Error fetching doctors", err);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const payload = {
        pair_code: pairCode,
        display_name: displayName,
        assigned_doctors: selectedDoctors,
        announcement_language: announcementLanguage,
        video_url: videoUrl,
        play_sound: playSound,
        hospitalId
      };
      
      await apiClient(`/admin/tv-displays/pair`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      toast.success("TV Display paired successfully!");
      setIsPairing(false);
      resetForm();
      fetchDisplays();
    } catch (err: any) {
      console.error("Pairing error:", err);
      setError(err.message || err.data?.message || "Failed to pair device. Check the pair code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPairCode("");
    setDisplayName("");
    setSelectedDoctors([]);
    setAnnouncementLanguage("en-IN");
    setVideoUrl("");
    setPlaySound(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this TV display?")) {
      try {
        await apiClient(`/admin/tv-displays/${id}`, { method: "DELETE" });
        toast.success("Display removed");
        fetchDisplays();
      } catch (err) {
        console.error("Failed to delete", err);
      }
    }
  };

  const handleEditDisplay = (display: any) => {
    setEditingDisplay(display);
    setDisplayName(display.display_name);
    setVideoUrl(display.video_url || "");
    setPlaySound(display.play_sound || false);
    setAnnouncementLanguage(display.announcement_language || "en-IN");
    setSelectedDoctors(display.assigned_doctors?.map((d: any) => d._id || d) || []);
  };

  const handleUpdateDisplay = async () => {
    if (!editingDisplay) return;
    setIsSubmitting(true);
    try {
      await apiClient(`/admin/tv-displays/${editingDisplay._id}`, {
        method: "PUT",
        body: JSON.stringify({
          display_name: displayName,
          assigned_doctors: selectedDoctors,
          announcement_language: announcementLanguage,
          video_url: videoUrl,
          play_sound: playSound,
        })
      });
      toast.success("Display updated successfully!");
      setEditingDisplay(null);
      resetForm();
      fetchDisplays();
    } catch (err: any) {
      toast.error(err.message || "Failed to update display");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDoctorSelection = (doctorId: string) => {
    setSelectedDoctors(prev => 
      prev.includes(doctorId) ? prev.filter(id => id !== doctorId) : [...prev, doctorId]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-500 text-sm">Loading TV displays...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4">
          
          <div className="shrink-0 flex items-center gap-2 px-1">
            <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
              <Monitor className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                TV Displays
              </h1>
              <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
                Manage wireless OPD queue screens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto">
            <button
              onClick={() => { resetForm(); setIsPairing(true); setEditingDisplay(null); }}
              className="flex items-center justify-center gap-2 w-full xl:w-auto px-3 md:px-6 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shrink-0 h-[34px] shadow-sm"
            >
              <Plus size={14} className="shrink-0" /> Pair New TV
            </button>
          </div>
          
        </div>
      </div>

      {/* Pair / Edit Form */}
      {(isPairing || editingDisplay) && (
        <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {editingDisplay ? <Edit className="w-5 h-5 text-blue-500" /> : <Monitor className="w-5 h-5 text-blue-500" />}
              {editingDisplay ? `Edit Display: ${editingDisplay.display_name}` : 'Pair a new Display'}
            </h2>
            <button onClick={() => { setIsPairing(false); setEditingDisplay(null); resetForm(); }} className="text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <form onSubmit={editingDisplay ? (e) => { e.preventDefault(); handleUpdateDisplay(); } : handlePair} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!editingDisplay && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pairing Code (Shown on TV)
                  </label>
                  <input
                    type="text"
                    required
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                    placeholder="E.G. X7K2"
                    className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 uppercase font-mono tracking-widest text-lg"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ground Floor Reception"
                  className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Announcement Voice Language
              </label>
              <select
                value={announcementLanguage}
                onChange={(e) => setAnnouncementLanguage(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 bg-white"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            {/* Video URL Section */}
            <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800/50">
              <div className="flex items-center gap-2 mb-4">
                <Film className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Custom Video Playback</h3>
              </div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-4">
                Add a video URL to play hospital promotions, health tips, or announcements on the TV when idle. Supports YouTube, direct MP4 links, or any embeddable video URL.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Link2 className="w-4 h-4 inline mr-1" />
                    Video URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
                      className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 text-sm"
                    />
                    <div className="relative flex-shrink-0">
                      <input 
                        type="file" 
                        accept="video/mp4,video/webm" 
                        onChange={handleVideoUpload}
                        disabled={isUploadingVideo}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                      />
                      <button 
                        type="button" 
                        disabled={isUploadingVideo}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 h-[46px]"
                      >
                        {isUploadingVideo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isUploadingVideo ? 'Uploading...' : 'Upload'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    {playSound ? (
                      <Volume2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Video Sound</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {playSound ? "Sound will play on the TV" : "Video will play silently (muted)"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlaySound(!playSound)}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${playSound ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${playSound ? 'left-[26px]' : 'left-0.5'}`} />
                  </button>
                </div>

                {videoUrl && (
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Preview</p>
                    {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
                      <div className="aspect-video rounded-lg overflow-hidden bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${extractYouTubeId(videoUrl)}?autoplay=0`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg overflow-hidden bg-black">
                        <video
                          src={videoUrl}
                          className="w-full h-full object-contain"
                          controls
                          muted
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign Doctors (Leave empty to show all)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900/50">
                {doctors.map(doc => {
                  const isSelected = selectedDoctors.includes(doc._id);
                  return (
                    <div 
                      key={doc._id}
                      onClick={() => toggleDoctorSelection(doc._id)}
                      className={`cursor-pointer p-3 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                        isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                        : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate">{doc.user?.name || doc.name || 'Unknown Doctor'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 gap-3">
              <button
                type="button"
                onClick={() => { setIsPairing(false); setEditingDisplay(null); resetForm(); }}
                className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 font-medium border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : editingDisplay ? (
                  <Save className="w-5 h-5" />
                ) : null}
                {editingDisplay ? 'Save Changes' : 'Connect TV Display'}
              </button>
            </div>
          </form>
        </div>
      )}

      {displays.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No TV Displays Paired</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            To get started, open <span className="font-mono bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">mscurechain.com/display</span> on your smart TV and enter the pairing code above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displays.map(display => (
            <div key={display._id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${display.status === 'online' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`}>
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{display.display_name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${display.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{display.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEditDisplay(display)} 
                    className="text-gray-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Edit Display"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(display._id)} 
                    className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete Display"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Video Status */}
              {display.video_url && (
                <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700/50">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Custom Video Active</span>
                    {display.play_sound ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 truncate">{display.video_url}</p>
                </div>
              )}

              <div className="space-y-3 mt-4 border-t border-gray-100 dark:border-slate-700 pt-4">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Assigned Doctors</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                    {display.assigned_doctors?.length > 0 
                      ? display.assigned_doctors.map((d: any) => d.user?.name || d.name).join(", ")
                      : "All Doctors"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Last Seen</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {new Date(display.last_seen).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : "";
}
