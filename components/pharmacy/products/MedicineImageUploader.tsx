'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Eye, Star, X, SwitchCamera, AlertCircle, Image as ImageIcon } from 'lucide-react';
import ImageCropper from '@/components/ui/ImageCropper';
import { toast } from 'react-hot-toast';

interface MedicineImageUploaderProps {
    images: string[];
    onChange: (images: string[]) => void;
    maxImages?: number;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const MedicineImageUploader: React.FC<MedicineImageUploaderProps> = ({
    images = [],
    onChange,
    maxImages = 6,
}) => {
    const [cropperSrc, setCropperSrc] = useState<string | null>(null);
    const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

    // Camera State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. File Upload Handler
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (images.length >= maxImages) {
            toast.error(`Maximum ${maxImages} images allowed per product`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Validate size <= 5MB
        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`Image size is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Must be 5MB or less.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setCropperSrc(reader.result);
            }
        };
        reader.onerror = () => {
            toast.error('Failed to read image file');
        };
        reader.readAsDataURL(file);

        // Reset input value so same file can be re-selected if cropped again
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // 2. Camera Capture Handler
    const openCamera = async () => {
        if (images.length >= maxImages) {
            toast.error(`Maximum ${maxImages} images allowed per product`);
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast.error('Camera access is not supported on this device/browser');
            return;
        }

        try {
            stopCamera();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: cameraFacing,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });
            setCameraStream(stream);
            setIsCameraOpen(true);

            // Connect to video element after modal renders
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(console.error);
                }
            }, 100);
        } catch (err: any) {
            console.error('Camera access error:', err);
            toast.error('Unable to access camera. Please check browser permissions.');
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
    };

    const switchCameraFacing = async () => {
        const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
        setCameraFacing(nextFacing);
        try {
            if (cameraStream) {
                cameraStream.getTracks().forEach((track) => track.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: nextFacing,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(console.error);
            }
        } catch (err) {
            console.error('Switch camera error:', err);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        // Close camera and open Cropper
        stopCamera();
        setCropperSrc(dataUrl);
    };

    // 3. Cropping Callbacks
    const handleCropComplete = (croppedDataUrl: string) => {
        onChange([...images, croppedDataUrl]);
        setCropperSrc(null);
        toast.success('Image cropped & added');
    };

    // 4. Reorder / Delete / Primary
    const handleRemoveImage = (index: number) => {
        const next = images.filter((_, idx) => idx !== index);
        onChange(next);
    };

    const handleSetPrimary = (index: number) => {
        if (index === 0) return;
        const selected = images[index];
        const next = [selected, ...images.filter((_, idx) => idx !== index)];
        onChange(next);
        toast.success('Set as primary product image');
    };

    const getSideLabel = (index: number) => {
        if (index === 0) return 'Front View';
        if (index === 1) return 'Back View';
        if (index === 2) return 'Packaging';
        return `Side ${index + 1}`;
    };

    return (
        <div className="space-y-4">
            {/* Header / Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-50/40 dark:bg-gray-800/60 border border-blue-100 dark:border-gray-700 rounded-xl">
                <div>
                    <div className="flex items-center gap-2">
                        <ImageIcon size={16} className="text-blue-600 dark:text-blue-400" />
                        <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                            Medicine Images ({images.length}/{maxImages})
                        </h4>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                        Upload front side, back side & packaging photos. Max 5MB per image.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Camera Capture Button */}
                    <button
                        type="button"
                        onClick={openCamera}
                        disabled={images.length >= maxImages}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-xs disabled:opacity-50"
                        title="Take photo using camera"
                    >
                        <Camera size={14} />
                        <span>Camera</span>
                    </button>

                    {/* File Upload Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={images.length >= maxImages}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-xs disabled:opacity-50"
                        title="Upload from computer"
                    >
                        <Upload size={14} />
                        <span>Upload</span>
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>
            </div>

            {/* Images Grid */}
            {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {images.map((img, idx) => (
                        <div
                            key={idx}
                            className={`group relative rounded-xl overflow-hidden border-2 transition-all bg-white dark:bg-gray-800 shadow-xs flex flex-col ${
                                idx === 0
                                    ? 'border-teal-500 dark:border-teal-400 ring-2 ring-teal-500/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                            }`}
                        >
                            {/* Image Thumbnail - Shows full packaging without cropping */}
                            <div className="aspect-4/3 w-full relative overflow-hidden bg-slate-50 dark:bg-slate-900/80 p-1.5 flex items-center justify-center">
                                <img
                                    src={img}
                                    alt={`Product view ${idx + 1}`}
                                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
                                />

                                {/* Overlay Buttons on Hover */}
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewModalImg(img)}
                                        className="p-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-md transition-transform hover:scale-110"
                                        title="View full image"
                                    >
                                        <Eye size={13} />
                                    </button>
                                    {idx !== 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleSetPrimary(idx)}
                                            className="p-1.5 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-full shadow-md transition-transform hover:scale-110"
                                            title="Make Primary (Front Side)"
                                        >
                                            <Star size={13} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveImage(idx)}
                                        className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-transform hover:scale-110"
                                        title="Delete photo"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            {/* Label Tag */}
                            <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <span className={`text-[10px] font-black uppercase truncate ${idx === 0 ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500'}`}>
                                    {getSideLabel(idx)}
                                </span>
                                {idx === 0 && (
                                    <span className="text-[9px] bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.2 rounded shrink-0">
                                        Cover
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                        <ImageIcon size={20} />
                    </div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">No product images attached</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        Capture from webcam/mobile camera or upload image files (max 5MB).
                    </p>
                </div>
            )}

            {/* Existing Cropper Integration */}
            {cropperSrc && (
                <ImageCropper
                    src={cropperSrc}
                    onCrop={handleCropComplete}
                    onCancel={() => setCropperSrc(null)}
                    circular={false}
                />
            )}

            {/* Camera Live Modal */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-2">
                                <Camera size={16} className="text-blue-600" />
                                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                    Capture Medicine Photo
                                </h3>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={switchCameraFacing}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Flip Camera"
                                >
                                    <SwitchCamera size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Video Feed */}
                        <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            {/* Viewfinder crosshairs */}
                            <div className="absolute inset-8 border border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white/70 bg-black/40 px-2 py-0.5 rounded-full">
                                    Align Medicine inside box
                                </span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="p-4 bg-white dark:bg-gray-900 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={stopCamera}
                                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={capturePhoto}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                <Camera size={15} />
                                <span>Snap & Crop</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal for single image zoom */}
            {previewModalImg && (
                <div
                    className="fixed inset-0 z-999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setPreviewModalImg(null)}
                >
                    <div
                        className="relative max-w-xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl p-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setPreviewModalImg(null)}
                            className="absolute right-3 top-3 z-10 p-1.5 bg-black/50 text-white hover:bg-black/80 rounded-full transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <img
                            src={previewModalImg}
                            alt="Medicine Preview"
                            className="max-h-[80vh] w-auto mx-auto object-contain rounded-xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
