import React from 'react';
import { X, Printer, ExternalLink } from 'lucide-react';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string | null;
    title: string;
}

function DocumentPreviewModal({ isOpen, onClose, url, title }: DocumentPreviewModalProps) {
    if (!isOpen || !url) return null;

    const handlePrint = () => {
        const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.print();
            } catch (e) {
                console.error("Cross-origin print blocked, opening new window");
                window.open(url, '_blank');
            }
        } else {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <p className="text-xs text-gray-500">Previewing document</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => window.open(url, '_blank')}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                            title="Open in new tab"
                        >
                            <ExternalLink size={20} />
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                            title="Print"
                        >
                            <Printer size={20} />
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-100 relative">
                    <iframe 
                        id="preview-iframe"
                        src={url} 
                        className="w-full h-full border-none"
                        title="Document Preview"
                    />
                </div>
            </div>
        </div>
    );
}

export default React.memo(DocumentPreviewModal);
