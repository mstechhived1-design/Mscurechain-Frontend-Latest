'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/integrations/api/apiClient';
import toast from 'react-hot-toast';

interface VoicePrescriptionInputProps {
  onPrescriptionParsed: (medicines: any[]) => void;
}

export const VoicePrescriptionInput: React.FC<VoicePrescriptionInputProps> = ({ onPrescriptionParsed }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const transcriptRef = useRef('');
  const params = useParams() as any;
  const hospitalId = params.hospitalId;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.continuous = true;
        reco.interimResults = true;
        reco.lang = 'en-US';

        reco.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setTranscript(currentTranscript);
          transcriptRef.current = currentTranscript;
        };

        reco.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsRecording(false);
          toast.error(`Microphone error: ${event.error}`);
        };

        reco.onend = () => {
          if (isRecording) {
            // Restart if it stopped unexpectedly but we want to keep recording
            reco.start();
          }
        };

        setRecognition(reco);
      }
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      toast.error('Voice recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      transcriptRef.current = '';
      recognition.start();
      setIsRecording(true);
      toast.success('Listening... Speak your prescription naturally.');
    }
  };

  const processTranscript = async () => {
    if (!transcript.trim()) {
      toast.error('Please dictate a prescription first.');
      return;
    }

    try {
      setIsProcessing(true);
      if (isRecording) {
        recognition.stop();
        setIsRecording(false);
      }

      const response = await apiClient('/ai/voice/transcribe', {
        method: 'POST',
        body: JSON.stringify({ text: transcript, hospitalId }),
      }) as any;

      const medicines = response?.data?.medicines || response?.medicines;

      if (medicines && medicines.length > 0) {
        toast.success(`AI extracted ${medicines.length} medicines`);
        onPrescriptionParsed(medicines);
      } else {
        toast.error('Could not extract medicines from the dictation.');
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to process voice prescription.');
    } finally {
      setIsProcessing(false);
      setTranscript('');
      transcriptRef.current = '';
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 w-full">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        {/* Record Button */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <button
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isRecording 
                ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse' 
                : 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-100 dark:border-indigo-900 shadow-md hover:scale-105'
            }`}
          >
            {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {isRecording ? 'Recording' : 'Voice Input'}
          </span>
        </div>

        {/* Transcript Box */}
        <div className="flex-grow w-full relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-white dark:bg-gray-950 border border-border-theme rounded-xl p-4 min-h-[100px] flex flex-col justify-between">
            {transcript ? (
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 italic mb-4">"{transcript}"</p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground/50 italic mb-4">
                "Prescribe Paracetamol 500mg BD for 5 days after food..."
              </p>
            )}
            
            <div className="flex justify-between items-center mt-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <Sparkles size={14} className="text-purple-500" />
                <span className="uppercase tracking-wider">AI Medical NLP</span>
              </div>
              <button
                onClick={processTranscript}
                disabled={isProcessing || !transcript.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-2"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Extract Medicines
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest bg-indigo-100/50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg w-fit">
        <AlertCircle size={14} />
        Voice prescriptions are never sent automatically. You must review and confirm.
      </div>
    </div>
  );
};
