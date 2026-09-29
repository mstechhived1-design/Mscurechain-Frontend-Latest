'use client';

import React, { useState, useRef } from 'react';
import { Cropper, CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { Upload, X, Check, Eye } from 'lucide-react';
import { Button, Modal } from '@/components/admin';
import toast from 'react-hot-toast';

interface LogoManagerProps {
    currentLogo?: string;
    onUpload: (base64: string) => Promise<void>;
}

export const LogoManager: React.FC<LogoManagerProps> = ({ currentLogo, onUpload }) => {
    const [src, setSrc] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const cropperRef = useRef<CropperRef>(null);

    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            // Reset input value to allow selecting the same file again
            e.target.value = '';

            const maxSize = 5 * 1024 * 1024; // 5MB Limit

            if (file.size > maxSize) {
                toast.error('File size exceeds 5MB limit');
                return;
            }

            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setSrc(reader.result as string);
                setIsModalOpen(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const handleCrop = async () => {
        if (cropperRef.current) {
            const canvas = cropperRef.current.getCanvas();
            if (canvas) {
                setUploading(true);
                // Convert canvas to base64 string directly
                const base64String = canvas.toDataURL('image/png');

                try {
                    await onUpload(base64String);
                    // Toast is handled by the parent
                    setIsModalOpen(false);
                } catch (error) {
                    toast.error('Failed to upload logo');
                } finally {
                    setUploading(false);
                }
            }
        }
    };

    // Prevent caching issues by adding a timestamp to the logo URL (only if not base64)
    const logoUrl = currentLogo
        ? (currentLogo.startsWith('data:')
            ? currentLogo
            : (currentLogo.includes('?') ? `${currentLogo}&t=${Date.now()}` : `${currentLogo}?t=${Date.now()}`))
        : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-white shadow-inner relative group">
                    {logoUrl ? (
                        <>
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setIsViewModalOpen(true)}
                                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white backdrop-blur-md"
                                >
                                    <Eye size={14} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <Upload size={24} className="text-slate-300" />
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <label className="cursor-pointer">
                        <span className="px-4 py-2 bg-primary-theme text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-theme/80 transition-all shadow-lg shadow-slate-200 inline-block">
                            Upload New Logo
                        </span>
                        <input type="file" className="hidden" accept="image/*" onChange={onSelectFile} />
                    </label>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                        Recommended: Square PNG/SVG<br />Max size: 10MB
                    </p>
                </div>
            </div>

            {/* Cropping Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Crop Hospital Logo"
            >
                <div className="space-y-6">
                    <div className="max-h-[400px] overflow-hidden rounded-2xl border border-slate-100 shadow-inner bg-slate-50">
                        {src && (
                            <Cropper
                                ref={cropperRef}
                                src={src}
                                className="cropper"
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <Button
                            variant="primary"
                            onClick={handleCrop}
                            loading={uploading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white border-none rounded-xl text-[10px] font-black uppercase tracking-widest px-6"
                        >
                            <Check size={14} className="mr-2" /> Save & Update
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* View Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="Logo Preview"
            >
                <div className="flex items-center justify-center p-8 bg-slate-50 rounded-3xl border border-slate-100">
                    <img src={logoUrl || ''} alt="Full Logo" className="max-w-full max-h-[60vh] object-contain" />
                </div>
            </Modal>
        </div>
    );
};
