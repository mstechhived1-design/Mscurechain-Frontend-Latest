'use client';

import React, { useState, useRef } from 'react';
import { Camera, Edit2, Check, X, FileText, Loader2 } from 'lucide-react';

interface ProfileHeroCardProps {
  /** Display name */
  name: string;
  /** Role badge label (e.g. "Doctor", "Staff Nurse") */
  role?: string;
  /** Secondary badge (e.g. "Clinical Expert") */
  roleBadge?: string;
  /** Accent color class for role badge background (e.g. "bg-emerald-100 text-emerald-700") */
  roleColor?: string;
  /** Profile image URL */
  imageUrl?: string;
  /** Current bio value */
  bio?: string;
  /** Whether photo is currently uploading */
  isPhotoUploading?: boolean;
  /** Called when user selects a new photo file */
  onPhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called when user saves new bio text */
  onBioSave?: (bio: string) => Promise<void> | void;
  /** Callback to trigger edit page/modal navigation */
  onEditClick?: () => void;
  /** Text for the edit button */
  editLabel?: string;
  /** Extra className for the outer card container */
  className?: string;
}

export default function ProfileHeroCard({
  name,
  role,
  roleBadge,
  roleColor = 'bg-indigo-100 text-indigo-700',
  imageUrl,
  bio,
  isPhotoUploading = false,
  onPhotoUpload,
  onBioSave,
  onEditClick,
  editLabel = 'Edit Profile',
  className = '',
}: ProfileHeroCardProps) {
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState(bio || '');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync bio if parent updates it
  React.useEffect(() => {
    setBioValue(bio || '');
  }, [bio]);

  const handleBioSave = async () => {
    if (!onBioSave) {
      setIsEditingBio(false);
      return;
    }
    setIsSavingBio(true);
    try {
      await onBioSave(bioValue);
      setIsEditingBio(false);
    } catch {
      // error handled upstream (toast)
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleBioCancel = () => {
    setBioValue(bio || '');
    setIsEditingBio(false);
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden ${className}`}>
      {/* ── Main row: pic (left) · info (center) · edit btn (right) ── */}
      <div className="flex items-center gap-3 sm:gap-5 p-4 sm:p-5">
        {/* Profile Picture */}
        <div className="relative shrink-0">
          <div className="w-[72px] h-[72px] sm:w-24 sm:h-24 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border-2 border-white dark:border-gray-800 shadow-md overflow-hidden flex items-center justify-center">
            {imageUrl ? (
              <img
                src={
                  imageUrl.includes('t=')
                    ? imageUrl
                    : `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
                }
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 uppercase">
                {name?.charAt(0) || '?'}
              </span>
            )}

            {/* Uploading overlay */}
            {isPhotoUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                <Loader2 size={20} className="text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Camera button */}
          {onPhotoUpload && (
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 active:scale-95 transition-all cursor-pointer">
              <Camera size={13} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoUpload}
                disabled={isPhotoUploading}
              />
            </label>
          )}
        </div>

        {/* Name + Role badges */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white uppercase tracking-tight truncate leading-tight">
            {name}
          </h2>
          {(role || roleBadge) && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {role && (
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full ${roleColor}`}>
                  {role}
                </span>
              )}
              {roleBadge && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[9px] font-black uppercase tracking-widest rounded-full">
                  {roleBadge}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Edit profile button */}
        {onEditClick && (
          <button
            onClick={onEditClick}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white hover:bg-indigo-600 dark:hover:bg-indigo-600 text-white dark:text-black dark:hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow active:scale-95 whitespace-nowrap"
          >
            <Edit2 size={11} />
            <span className="hidden xs:inline">{editLabel}</span>
          </button>
        )}
      </div>

      {/* ── Bio row ── */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-3">
          {!isEditingBio ? (
            /* View mode */
            <button
              onClick={() => setIsEditingBio(true)}
              className="w-full text-left group"
              disabled={!onBioSave}
              title={onBioSave ? 'Click to add/edit bio' : undefined}
            >
              <div className="flex items-start gap-2">
                <FileText size={13} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                    Bio
                  </p>
                  {bioValue ? (
                    <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 group-hover:text-gray-800 dark:group-hover:text-white transition-colors">
                      {bioValue}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 italic group-hover:text-gray-500 transition-colors">
                      {onBioSave
                        ? 'Tap to add a short professional or personal bio...'
                        : 'No bio added yet.'}
                    </p>
                  )}
                </div>
                {onBioSave && (
                  <Edit2 size={11} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 shrink-0 mt-0.5 transition-colors" />
                )}
              </div>
            </button>
          ) : (
            /* Edit mode */
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-indigo-500 shrink-0" />
                <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex-1">
                  Bio
                </p>
                <span className={`text-[9px] font-bold tabular-nums ${bioValue.length >= 150 ? 'text-rose-500' : 'text-gray-400'}`}>
                  {bioValue.length}/150
                </span>
              </div>
              <textarea
                autoFocus
                value={bioValue}
                onChange={(e) => setBioValue(e.target.value.slice(0, 150))}
                rows={3}
                placeholder="Write a short professional or personal bio (max 150 chars)..."
                className="w-full px-3 py-2 text-[11px] sm:text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-indigo-300 dark:border-indigo-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400/40 resize-none leading-relaxed placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-all"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleBioCancel}
                  disabled={isSavingBio}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <X size={11} /> Cancel
                </button>
                <button
                  onClick={handleBioSave}
                  disabled={isSavingBio}
                  className="flex items-center gap-1 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition-all active:scale-95 disabled:opacity-60"
                >
                  {isSavingBio ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Check size={11} />
                  )}
                  Save Bio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
