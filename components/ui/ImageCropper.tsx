import React, { useRef } from 'react';
import { Cropper, CropperRef, CircleStencil, RectangleStencil, ImageRestriction } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { X, Check, Maximize2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ImageCropperProps {
    src: string;
    onCrop: (croppedImage: string) => void;
    onCancel: () => void;
    aspectRatio?: number;
    circular?: boolean;
    isUploading?: boolean;
}

const ImageCropper = ({ src, onCrop, onCancel, aspectRatio, circular = false, isUploading = false }: ImageCropperProps) => {
    const cropperRef = useRef<CropperRef>(null);

    const handleCrop = () => {
        if (cropperRef.current) {
            const canvas = cropperRef.current.getCanvas();
            if (canvas) {
                onCrop(canvas.toDataURL());
            }
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed top-0 inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-5 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Maximize2 size={16} className="text-blue-500" />
                        </div>
                        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">
                            Edit Image
                        </h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors group"
                    >
                        <X size={20} className="text-slate-500 group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                </div>

                {/* Cropper Container */}
                <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                    <Cropper
                        ref={cropperRef}
                        src={src}
                        className="h-full w-full"
                        stencilComponent={circular ? CircleStencil : RectangleStencil}
                        stencilProps={{
                            aspectRatio: circular ? aspectRatio : undefined, // Allow free-form resizing for rectangles
                            grid: true,
                            movable: true,
                            resizable: true,
                        }}
                        imageRestriction={ImageRestriction.fitArea}
                        transitions={true}
                        backgroundWrapperProps={{
                            style: {
                                backgroundColor: '#020617'
                            }
                        }}
                    />

                </div>

                {/* Footer */}
                <div className="px-6 py-5 flex gap-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
                    <button
                        onClick={onCancel}
                        disabled={isUploading}
                        className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl uppercase text-[11px] tracking-widest disabled:opacity-50 transition-all"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleCrop}
                        disabled={isUploading}
                        className="flex-[2] py-4 bg-blue-600 text-white font-black hover:bg-blue-700 rounded-2xl shadow-xl shadow-blue-500/20 uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                    >
                        {isUploading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <Check size={18} /> Apply Crop
                            </>
                        )}
                    </button>
                </div>

            </div>
            
            <style jsx global>{`
                .react-advanced-cropper-stencil-rectangle__handler {
                    background: white !important;
                    width: 8px !important;
                    height: 8px !important;
                    border-radius: 2px;
                    border: 1px solid rgba(0,0,0,0.1);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
                }
                .react-advanced-cropper__background-wrapper {
                    background: #000 !important;
                }
            `}</style>
        </div>,
        document.body
    );
};

export default ImageCropper;
