'use client';

import React, { useState } from 'react';
import { addQuickNoteAction, deleteQuickNoteAction } from '@/lib/integrations/actions/doctor.actions';
import { DoctorQuickNote } from '@/lib/integrations/types/doctor';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface QuickNotesWidgetProps {
    initialNotes: DoctorQuickNote[];
}

function QuickNotesWidget({ initialNotes }: QuickNotesWidgetProps) {
    const [notes, setNotes] = useState<DoctorQuickNote[]>(initialNotes);
    const [newNote, setNewNote] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        setIsAdding(true);
        try {
            const res = await addQuickNoteAction(newNote);
            if (res.success && res.data) {
                setNotes([res.data, ...notes]);
                setNewNote('');
                toast.success('Note added');
            } else {
                toast.error(res.error || 'Failed to add note');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteNote = async (id: string) => {
        setIsDeleting(id);
        try {
            const res = await deleteQuickNoteAction(id);
            if (res.success) {
                setNotes(notes.filter((n) => n._id !== id));
                toast.success('Note deleted');
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
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col min-h-[350px]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                       save Notes
                    </h3>
                    
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                {notes.length === 0 ? (
                    <div className="text-center py-8 opacity-50">
                        <p className="text-xs font-bold text-gray-400">No notes recorded.</p>
                    </div>
                ) : (
                    notes.map((note) => (
                        <div
                            key={note._id}
                            className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100/50 dark:border-gray-600/30 group relative"
                        >
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed pr-6">
                                {note.text}
                            </p>
                            <span className="text-[9px] text-gray-300 block mt-2 font-mono uppercase">
                                {new Date(note.timestamp).toLocaleDateString()}
                            </span>
                            <button
                                onClick={() => handleDeleteNote(note._id)}
                                disabled={isDeleting === note._id}
                                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                            >
                                {isDeleting === note._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="space-y-4">
                <textarea
                    className="w-full h-20 p-5 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold placeholder:text-gray-400"
                    placeholder="New insight..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNote();
                        }
                    }}
                ></textarea>
                <button
                    onClick={handleAddNote}
                    disabled={isAdding || !newNote.trim()}
                    className="w-full py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-gray-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                   save notes
                </button>
            </div>
        </div>
    );
}

export default React.memo(QuickNotesWidget);
