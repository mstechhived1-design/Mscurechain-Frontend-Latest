"use client";

import React, { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";
import QueueDisplay from "@/components/display/QueueDisplay";
import { Monitor, QrCode } from "lucide-react";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/api\/?$/, "");

const LANGUAGE_TEMPLATES: Record<string, (token: string, patientName: string, doctorName: string) => string> = {
  'en-IN': (t, p, d) => t === "N/A" ? `Patient ${p}, please proceed to ${d}'s room.` : `Token ${t}, ${p}, please proceed to ${d}'s room.`,
  'hi-IN': (t, p, d) => t === "N/A" ? `मरीज ${p}, कृपया ${d} के कमरे में जाएं।` : `टोकन ${t}, ${p}, कृपया ${d} के कमरे में जाएं।`,
  'te-IN': (t, p, d) => t === "N/A" ? `పేషెంట్ ${p}, దయచేసి ${d} గదికి వెళ్లండి.` : `టోకెన్ ${t}, ${p}, దయచేసి ${d} గదికి వెళ్లండి.`,
  'ta-IN': (t, p, d) => t === "N/A" ? `நோயாளி ${p}, தயவுசெய்து ${d} அறைக்குச் செல்லவும்.` : `டோக்கன் ${t}, ${p}, தயவுசெய்து ${d} அறைக்குச் செல்லவும்.`,
  'kn-IN': (t, p, d) => t === "N/A" ? `ರೋಗಿ ${p}, ದಯವಿಟ್ಟು ${d} ಕೊಠಡಿಗೆ ಹೋಗಿ.` : `ಟೋಕನ್ ${t}, ${p}, ದಯವಿಟ್ಟು ${d} ಕೊಠಡಿಗೆ ಹೋಗಿ.`,
  'ml-IN': (t, p, d) => t === "N/A" ? `രോഗി ${p}, ദയവായി ${d} ന്റെ മുറിയിലേക്ക് പോകുക.` : `ടോക്കൺ ${t}, ${p}, ദയവായി ${d} ന്റെ മുറിയിലേക്ക് പോകുക.`,
  'mr-IN': (t, p, d) => t === "N/A" ? `रुग्ण ${p}, कृपया ${d} च्या खोलीत जा.` : `टोकन ${t}, ${p}, कृपया ${d} च्या खोलीत जा.`,
  'gu-IN': (t, p, d) => t === "N/A" ? `દર્દી ${p}, કૃપા કરીને ${d} ના રૂમમાં જાઓ.` : `ટોકન ${t}, ${p}, કૃપા કરીને ${d} ના રૂમમાં જાઓ.`,
  'bn-IN': (t, p, d) => t === "N/A" ? `রোগী ${p}, অনুগ্রহ করে ${d} এর রুমে যান।` : `টোকেন ${t}, ${p}, অনুগ্রহ করে ${d} এর রুমে যান।`,
  'pa-IN': (t, p, d) => t === "N/A" ? `ਮਰੀਜ਼ ${p}, ਕਿਰਪਾ ਕਰਕੇ ${d} ਦੇ ਕਮਰੇ ਵਿੱਚ ਜਾਓ।` : `ਟੋਕਨ ${t}, ${p}, ਕਿਰਪਾ ਕਰਕੇ ${d} ਦੇ ਕਮਰੇ ਵਿੱਚ ਜਾਓ।`,
};

export default function TVDisplayPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [isPaired, setIsPaired] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [queues, setQueues] = useState<any>({});
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const queuesRef = useRef(queues);
  useEffect(() => { queuesRef.current = queues; }, [queues]);

  useEffect(() => {
    // We must initialize audio engines exactly during a user interaction
    const unlockEngines = () => {
      if (!audioUnlocked) {
        setAudioUnlocked(true);
        
        // 1. Unlock Speech Synthesis
        if ("speechSynthesis" in window) {
          const silent = new SpeechSynthesisUtterance("");
          silent.volume = 0;
          window.speechSynthesis.speak(silent);
        }
        
        // 2. Unlock Web Audio API (Chime)
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            ctx.resume();
            (window as any).globalAudioCtx = ctx;
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.01);
          }
        } catch (e) {
          console.error("Audio unlock failed", e);
        }

        // 3. Immediately announce the current patient so the user knows it works!
        setTimeout(() => {
          const currentQueues = queuesRef.current;
          const docIds = Object.keys(currentQueues);
          if (docIds.length > 0) {
            const firstQueue = currentQueues[docIds[0]];
            if (firstQueue && firstQueue.currentPatient) {
              playAnnouncement(firstQueue.currentPatient.token, firstQueue.currentPatient.name, firstQueue.doctorName);
            }
          }
        }, 500);
      }
    };

    window.addEventListener("click", unlockEngines);
    window.addEventListener("touchstart", unlockEngines);
    
    return () => {
      window.removeEventListener("click", unlockEngines);
      window.removeEventListener("touchstart", unlockEngines);
    };
  }, [audioUnlocked]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5003";
    const newSocket = io(`${socketUrl}/tv-display`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to TV Display namespace");
      const savedId = localStorage.getItem("tv_display_id");
      if (savedId) {
        newSocket.emit("identify_paired_device", { display_id: savedId });
      } else {
        newSocket.emit("request_pair_code");
      }
    });

    newSocket.on("pair_code_generated", (data) => {
      setPairCode(data.pairCode);
    });

    newSocket.on("paired_success", (data) => {
      console.log("Paired successfully:", data);
      localStorage.setItem("tv_display_id", data.display_id);
      localStorage.setItem("tv_display_lang", data.announcement_language || "en-IN");
      setIsPaired(true);
      setDeviceInfo({
        ...data,
        video_url: data.video_url || "",
        play_sound: data.play_sound || false,
      });
      // Request initial queue state
      newSocket.emit("identify_paired_device", { display_id: data.display_id });
    });

    newSocket.on("device_identified_success", (data) => {
      console.log("Device identified:", data);
      if (data.announcement_language) {
        localStorage.setItem("tv_display_lang", data.announcement_language);
      }
      setDeviceInfo({
        ...data,
        video_url: data.video_url || "",
        play_sound: data.play_sound || false,
      });
      setIsPaired(true);
    });

    newSocket.on("display_updated", (data) => {
      console.log("Display Updated:", data);
      if (data.announcement_language) {
        localStorage.setItem("tv_display_lang", data.announcement_language);
      }
      setDeviceInfo((prev: any) => ({
        ...prev,
        ...data,
        video_url: data.video_url !== undefined ? data.video_url : prev?.video_url,
        play_sound: data.play_sound !== undefined ? data.play_sound : prev?.play_sound,
      }));
    });

    newSocket.on("device_identified_failed", () => {
      localStorage.removeItem("tv_display_id");
      newSocket.emit("request_pair_code");
    });

    newSocket.on("queue_update", (data) => {
      setQueues((prev: any) => {
        const prevData = prev[data.doctorId];
        
        // Play announcement if there's a new current patient (check by name or token)
        if (data.currentPatient && 
            (!prevData || !prevData.currentPatient || 
             prevData.currentPatient.name !== data.currentPatient.name || 
             prevData.currentPatient.token !== data.currentPatient.token)) {
          playAnnouncement(data.currentPatient.token, data.currentPatient.name, data.doctorName);
        }
        
        return {
          ...prev,
          [data.doctorId]: data
        };
      });
    });

    newSocket.on("display_deleted", () => {
      localStorage.removeItem("tv_display_id");
      setIsPaired(false);
      setDeviceInfo(null);
      newSocket.emit("request_pair_code");
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const playAirportChime = () => {
    try {
      const ctx = (window as any).globalAudioCtx;
      if (!ctx) return 0;
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine'; // Pure clean tone
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + startTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      // Classic Airport PA 3-Note Ascending Chime
      playTone(523.25, 0.0, 1.5); // C5
      playTone(659.25, 0.5, 1.5); // E5
      playTone(783.99, 1.0, 2.5); // G5
      
      return 2800; // Wait for chime to completely finish before voice starts
    } catch (e) {
      console.error("Audio Context failed", e);
      return 0;
    }
  };

  const playAnnouncement = (token: string, patientName: string, doctorName: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      
      const playVoice = () => {
        const msg = new SpeechSynthesisUtterance();
        const lang = localStorage.getItem("tv_display_lang") || "en-IN";
        const template = LANGUAGE_TEMPLATES[lang] || LANGUAGE_TEMPLATES['en-IN'];
        
        msg.text = template(token, patientName, doctorName);
        msg.lang = lang;
        // Airport style: slower paced, clear enunciation, deeper professional pitch
        msg.rate = 0.75;
        msg.pitch = 0.9;
        msg.volume = 1.0;
        
        // Try to grab a premium system voice
        const voices = window.speechSynthesis.getVoices();
        const premiumVoice = voices.find(v => v.name.includes("Google") && v.lang === lang) || 
                             voices.find(v => v.name.includes("Premium") || v.name.includes("Enhanced")) ||
                             voices.find(v => v.lang === lang);
        if (premiumVoice) {
            msg.voice = premiumVoice;
        }
        
        window.speechSynthesis.speak(msg);
      };

      // Play airport chime first!
      const chimeDuration = playAirportChime();
      
      // Wait for chime to finish, then speak
      setTimeout(playVoice, chimeDuration);
    }
  };

  if (isPaired && deviceInfo) {
    return (
      <>
        {!audioUnlocked && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <div className="bg-white p-8 sm:p-10 rounded-[32px] shadow-2xl max-w-md w-full text-center mx-4 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔊</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Enable TV Sound</h2>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                Modern browsers require your permission to play automated voice announcements. Please click allow to activate the queue voice.
              </p>
              <button 
                onClick={() => setAudioUnlocked(true)} 
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-teal-900/20 active:scale-95 transition-all"
              >
                Always Allow Sound
              </button>
            </div>
          </div>
        )}
        <QueueDisplay queues={queues} deviceInfo={deviceInfo} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 relative">
      <div className="max-w-2xl w-full bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="bg-blue-600 p-8 md:w-1/3 flex flex-col items-center justify-center text-center">
          <Monitor className="w-20 h-20 text-white mb-6" />
          <h2 className="text-2xl font-bold mb-2">Display Mode</h2>
          <p className="text-blue-200 text-sm">
            Pair this TV with your hospital administration panel to start showing live queues.
          </p>
        </div>
        <div className="p-8 md:w-2/3 flex flex-col items-center justify-center text-center">
          {pairCode ? (
            <>
              <h3 className="text-gray-400 font-semibold tracking-widest uppercase mb-4 text-sm">Pairing Code</h3>
              <div className="text-6xl font-black tracking-[0.2em] text-white mb-8 bg-slate-900 px-8 py-4 rounded-xl shadow-inner font-mono">
                {pairCode}
              </div>
              
              <div className="flex items-center gap-4 text-slate-400 bg-slate-700/50 p-4 rounded-lg">
                <QrCode className="w-12 h-12 text-blue-400" />
                <div className="text-left">
                  <p className="font-semibold text-white">Scan or Enter Code</p>
                  <p className="text-xs">Go to Admin {">"} TV Displays to pair this device.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400">Connecting to server...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
