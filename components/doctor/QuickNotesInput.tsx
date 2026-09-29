'use client';

import React, { useState } from 'react';
import { addQuickNoteAction } from '@/lib/integrations/actions/doctor.actions';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

function QuickNotesInput() {
    const [newNote, setNewNote] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const router = useRouter();

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        setIsAdding(true);
        try {
            const res = await addQuickNoteAction(newNote);
            if (res.success) {
                setNewNote('');
                toast.success('Note added');
                router.refresh(); // Refresh server data
            } else {
                toast.error(res.error || 'Failed to add note');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="bg-card dark:bg-card p-6 rounded-2xl border border-border-theme dark:border-border-theme shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">Quick Notes</h3>
            <div className="space-y-4">
                <textarea
                    className="w-full h-24 p-4 bg-input dark:bg-input border border-border-theme rounded-xl resize-none outline-none focus:ring-2 focus:ring-primary-theme text-sm text-foreground placeholder:text-muted"
                    placeholder="Type a quick note here..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNote();
                        }
                    }}
                ></textarea>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">Press Ctrl+Enter to save</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setNewNote('')}
                            className="px-4 py-2 text-sm font-medium text-muted hover:bg-secondary-theme cursor-pointer rounded-lg border border-border-theme"
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleAddNote}
                            disabled={isAdding || !newNote.trim()}
                            className="px-6 py-2 max-sm:px-4 max-sm:py-1 bg-primary-theme text-primary-theme-foreground text-sm font-bold rounded-lg cursor-pointer hover:opacity-90 shadow-md shadow-blue-200 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isAdding ? <Loader2 size={14} className="animate-spin" /> : null}
                            Save Note
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(QuickNotesInput);
