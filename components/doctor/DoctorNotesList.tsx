'use client';

import React, { useState, useEffect } from 'react';
import { deleteQuickNoteAction } from '@/lib/integrations/actions/doctor.actions';
import { DoctorQuickNote } from '@/lib/integrations/types/doctor';
import { FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface DoctorNotesListProps {
    initialNotes: DoctorQuickNote[];
}

function DoctorNotesList({ initialNotes }: DoctorNotesListProps) {
    // We can use local state to instantly remove item on delete, while waiting for refresh
    const [notes, setNotes] = useState<DoctorQuickNote[]>(initialNotes);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setNotes(initialNotes);
    }, [initialNotes]);

    const handleDeleteNote = async (id: string) => {
        setIsDeleting(id);
        try {
            const res = await deleteQuickNoteAction(id);
            if (res.success) {
                setNotes((prev) => prev.filter((n) => n._id !== id));
                toast.success('Note deleted');
                router.refresh();
            } else {
                toast.error(res.error || 'Failed to delete note');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="bg-card dark:bg-card p-6 max-sm:p-4 rounded-2xl border border-border-theme dark:border-border-theme shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 max-sm:mb-4">
                <div className="flex items-center gap-2">
                    <FileText size={20} className="text-primary-theme" />
                    <h3 className="text-lg max-sm:text-sm font-bold text-foreground">My Notes</h3>
                </div>
                <button className="text-xs max-sm:text-[10px] font-bold text-red-500 hover:text-red-600 cursor-pointer">
                    Clear All
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 max-sm:space-y-3 pr-2 custom-scrollbar">
                {notes.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <div className="w-16 h-16 bg-secondary-theme rounded-full flex items-center justify-center mx-auto mb-3">
                            <FileText className="text-muted" />
                        </div>
                        <p className="text-sm font-bold text-muted">No notes yet</p>
                    </div>
                ) : (
                    notes.map((note) => (
                        <div
                            key={note._id}
                            className="p-4 max-sm:p-3 bg-card border border-border-theme rounded-xl hover:border-primary-theme group shadow-sm"
                        >
                            <p className="text-sm max-sm:text-xs font-medium text-foreground leading-relaxed">
                                {note.text}
                            </p>
                            <div className="flex items-center justify-between mt-3 max-sm:mt-2 pt-3 max-sm:pt-2 border-t border-border-theme">
                                <span className="text-[10px] max-sm:text-[9px] text-primary-theme font-bold">
                                    {new Date(note.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                                <button
                                    onClick={() => handleDeleteNote(note._id)}
                                    disabled={isDeleting === note._id}
                                    className="text-xs max-sm:text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 max-sm:opacity-100 cursor-pointer"
                                >
                                    {isDeleting === note._id ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-4 max-sm:mt-2 pt-4 max-sm:pt-2 border-t border-border-theme text-center">
                <p className="text-[10px] max-sm:text-[8px] text-muted font-medium">{notes.length} note{notes.length !== 1 ? 's' : ''} saved • Cloud storage</p>
            </div>
        </div>
    );
}

export default React.memo(DoctorNotesList);
