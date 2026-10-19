import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PrintState {
    printWithHeader: boolean;
    setPrintWithHeader: (val: boolean) => void;
    showHonorificInReceipts: boolean;
    setShowHonorificInReceipts: (val: boolean) => void;
    footerTerms: string;
    setFooterTerms: (val: string) => void;
}

export const usePrintStore = create<PrintState>()(
    persist(
        (set) => ({
            printWithHeader: true,
            setPrintWithHeader: (val) => set({ printWithHeader: val }),
            showHonorificInReceipts: true,
            setShowHonorificInReceipts: (val) => set({ showHonorificInReceipts: val }),
            footerTerms: '',
            setFooterTerms: (val) => set({ footerTerms: val }),
        }),
        {
            name: 'print-settings-storage',
        }
    )
);
