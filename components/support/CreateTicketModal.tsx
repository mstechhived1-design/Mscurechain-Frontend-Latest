import React from "react";
import CreateTicketForm from "./CreateTicketForm";
import { X } from "lucide-react";

interface CreateTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    basePath: string;
}

export default function CreateTicketModal({ isOpen, onClose, onSuccess, basePath }: CreateTicketModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold dark:text-white">Create New Ticket</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>
                <div className="p-8 max-h-[80vh] overflow-y-auto">
                    <CreateTicketForm
                        onSuccess={onSuccess}
                        basePath={basePath}
                    />
                </div>
            </div>
        </div>
    );
}
