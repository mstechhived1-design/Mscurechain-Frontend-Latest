'use client';

import React, { useState } from 'react';
import ImageCropper from '@/components/ui/ImageCropper';
import { Upload, X, Images, Trash2, Info, ZoomIn } from 'lucide-react';
import { Button, Modal } from '@/components/admin';
import toast from 'react-hot-toast';

interface HospitalImagesManagerProps {
  currentImages?: string[];
  onUpdate: (images: string[]) => Promise<void>;
  readOnly?: boolean;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB limit

export const HospitalImagesManager: React.FC<HospitalImagesManagerProps> = ({
  currentImages = [],
  onUpdate,
  readOnly = false,
}) => {
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFileInfo, setPendingFileInfo] = useState<{ name: string; size: string } | null>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    e.target.value = '';

    // Step 1: Validate file size < 5 MB
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`"${file.name}" exceeds 5 MB limit. Please choose a smaller image.`);
      return;
    }

    const sizeLabel =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    // Step 2: Show file info briefly before opening cropper
    setPendingFileInfo({ name: file.name, size: sizeLabel });

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Brief delay to display file info, then activate the existing ImageCropper and dismiss info
      setTimeout(() => {
        setCropperSrc(dataUrl);
        setPendingFileInfo(null);
      }, 700);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImage: string) => {
    setUploading(true);
    try {
      const updated = [...(currentImages || []), croppedImage];
      await onUpdate(updated);
      toast.success('Hospital building image added successfully!');
      setCropperSrc(null);
    } catch (err: any) {
      console.error('[HospitalImagesManager] Failed to save image:', err);
      toast.error('Failed to save image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (indexToRemove: number) => {
    try {
      const updated = (currentImages || []).filter((_, idx) => idx !== indexToRemove);
      await onUpdate(updated);
      toast.success('Building image removed.');
    } catch (err: any) {
      console.error('[HospitalImagesManager] Failed to remove image:', err);
      toast.error('Failed to remove image.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing ImageCropper from @/components/ui/ImageCropper */}
      {cropperSrc && (
        <ImageCropper
          src={cropperSrc}
          onCrop={handleCropComplete}
          onCancel={() => {
            setCropperSrc(null);
            setPendingFileInfo(null);
          }}
          aspectRatio={16 / 9}
          circular={false}
          isUploading={uploading}
        />
      )}

      {/* Header and Upload Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Images size={16} className="text-indigo-600" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Hospital Building Images
            </h4>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              {currentImages.length} photo{currentImages.length !== 1 ? 's' : ''} attached &bull; Max 5 MB each
            </p>
          </div>
        </div>

        {!readOnly && (
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm">
              <Upload size={13} /> Add Building Photo
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={onSelectFile}
            />
          </label>
        )}
      </div>

      {/* Size Limit Notice Before Upload */}
      {!readOnly && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200/60 rounded-xl">
          <Info size={14} className="text-amber-600 shrink-0" />
          <p className="text-[11px] font-medium text-amber-800">
            Please upload building photos <strong>less than 5 MB</strong>. JPG, PNG or WebP supported.
          </p>
        </div>
      )}

      {/* Brief File Info Display Before Image Cropper Activates */}
      {pendingFileInfo && (
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>
              Selected: <strong>{pendingFileInfo.name}</strong> ({pendingFileInfo.size}) &mdash; Opening cropper...
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPendingFileInfo(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Grid of Existing Building Images */}
      {currentImages && currentImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {currentImages.map((imgUrl, idx) => (
            <div
              key={idx}
              className="group relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm"
            >
              <img
                src={imgUrl}
                alt={`Hospital Building ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewUrl(imgUrl);
                    setPreviewModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-white hover:text-indigo-600 transition-colors"
                  title="View full size"
                >
                  <ZoomIn size={14} />
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                    title="Remove image"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-semibold">
                #{idx + 1}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
          <Images size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-500">No building images added yet</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Add exterior and interior photos of the facility (max 5 MB each)
          </p>
        </div>
      )}

      {/* Full Size Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setPreviewUrl(null);
        }}
        title="Building Photo Preview"
      >
        <div className="p-4 space-y-3">
          {previewUrl && (
            <div className="max-h-[70vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Hospital Building Preview"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          )}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setPreviewModalOpen(false);
                setPreviewUrl(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
