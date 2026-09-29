import React, { useState, useEffect, useRef, memo } from "react";
import { User, Clock, Bell, MonitorPlay, Activity, Volume2, VolumeX } from "lucide-react";

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : "";
}

// Extract video player into a memoized component to prevent re-rendering when the clock ticks
const VideoPlayer = memo(({ videoUrl, playSound, isYouTube, youtubeId }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playError, setPlayError] = useState(false);

  useEffect(() => {
    if (videoRef.current && videoUrl && !isYouTube) {
      videoRef.current.src = videoUrl;
      videoRef.current.muted = !playSound;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Autoplay blocked by browser:", error);
          if (playSound) {
            setPlayError(true);
            videoRef.current!.muted = true; // Fallback to muted
            videoRef.current!.play().catch(() => {});
          }
        });
      }
    }
  }, [videoUrl, playSound, isYouTube]);

  const handleEnableAudio = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play();
      setPlayError(false);
    }
  };

  if (isYouTube) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&showinfo=0&rel=0&mute=${playSound && !playError ? 0 : 1}`}
        className="w-full h-full absolute inset-0 bg-black"
        style={{ border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        loop
        muted={!playSound}
        playsInline
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      {playError && (
        <button
          onClick={handleEnableAudio}
          className="absolute inset-0 m-auto w-56 h-16 bg-blue-600/90 hover:bg-blue-500 text-white font-bold rounded-xl shadow-[0_0_40px_rgba(37,99,235,0.5)] flex items-center justify-center gap-3 transition-all z-50 cursor-pointer backdrop-blur-sm border border-white/20 hover:scale-105 active:scale-95"
        >
          <Volume2 className="w-6 h-6" />
          Click to Enable Audio
        </button>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default function QueueDisplay({ queues, deviceInfo }: { queues: any; deviceInfo: any }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const videoUrl = deviceInfo?.video_url || "";
  const playSound = deviceInfo?.play_sound || false;
  const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const youtubeId = isYouTube ? extractYouTubeId(videoUrl) : "";
  const hasVideo = !!videoUrl;

  const assignedDoctors = deviceInfo.assigned_doctors || [];
  
  const activeQueues = Object.values(queues).filter((q: any) => 
    assignedDoctors.length === 0 || assignedDoctors.includes(q.doctorId)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden font-sans relative">
      {/* Ambient Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-900/10 blur-[150px] animate-pulse" style={{ animationDuration: '12s' }}></div>
      </div>

      {/* Header */}
      <header className="bg-slate-900/40 backdrop-blur-xl border-b border-white/5 p-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase">{deviceInfo.hospital?.name || "Horizon Hospital"}</h1>
            <h2 className="text-sm font-bold tracking-[0.2em] text-blue-400 uppercase mt-1">Live OPD Queue</h2>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="bg-slate-800/40 backdrop-blur-md px-5 py-2.5 rounded-xl flex items-center gap-3 border border-white/10 shadow-inner">
            <MonitorPlay className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-slate-200 tracking-wide">{deviceInfo.display_name}</span>
          </div>
          {hasVideo && (
            <div className="bg-slate-800/40 backdrop-blur-md px-3 py-2 rounded-xl flex items-center gap-2 border border-white/10">
              {playSound ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </div>
          )}
          <div className="text-right">
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 font-mono tracking-tight">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">
              {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Layout when video is present */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        {/* Video Section - Left Side */}
        {hasVideo && (
          <div className="w-[55%] p-6 flex items-center justify-center bg-black/30">
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-white/5 relative bg-black">
              <VideoPlayer 
                videoUrl={videoUrl} 
                playSound={playSound} 
                isYouTube={isYouTube} 
                youtubeId={youtubeId} 
              />
            </div>
          </div>
        )}

        {/* Queue Section - Right Side (or full width if no video) */}
        <div className={`${hasVideo ? 'w-[45%]' : 'w-full'} p-6 overflow-y-auto flex flex-col justify-center`}>
          {activeQueues.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                <Clock className="w-32 h-32 text-slate-600 relative z-10" />
              </div>
              <h2 className="text-4xl font-light text-slate-300">Waiting for doctor availability...</h2>
              <p className="mt-3 text-lg text-slate-500 tracking-wide">The queue will automatically start when a doctor begins consultations.</p>
            </div>
          ) : (
            <div className={`grid ${hasVideo ? 'grid-cols-1 gap-6' : getGridClass(activeQueues.length) + ' gap-8'} w-full`}>
              {activeQueues.map((q: any) => (
                <div key={q.doctorId} className={`flex flex-col bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-500 hover:border-blue-500/30 hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)]`}>
                  {/* Doctor Header */}
                  <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-5 border-b border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full -mr-10 -mt-10"></div>
                    <h3 className={`${hasVideo ? 'text-2xl' : 'text-3xl'} font-black text-white uppercase tracking-wider relative z-10`}>{q.doctorName}</h3>
                    <p className="text-blue-400 font-bold text-sm mt-1 uppercase tracking-[0.2em] relative z-10">Consulting Room</p>
                  </div>

                  {/* Current Token */}
                  <div className={`p-6 bg-gradient-to-br from-slate-900/50 to-slate-950/50 flex-1 flex flex-col justify-center border-b border-white/5 relative overflow-hidden ${!hasVideo && activeQueues.length === 1 ? 'py-16' : ''}`}>
                    {q.currentPatient ? (
                      <>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
                        <div className="text-sm font-bold text-emerald-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-3 relative z-10">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                          Currently Serving
                        </div>
                        <div className={`${hasVideo ? 'text-7xl' : (activeQueues.length === 1 ? 'text-9xl' : 'text-8xl')} font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-400 font-mono tracking-tighter mb-6 drop-shadow-lg relative z-10`}>
                          {q.currentPatient.token}
                        </div>
                        <div className="flex items-center gap-4 relative z-10 bg-slate-800/50 backdrop-blur-md p-3 rounded-2xl border border-white/5 inline-flex w-fit">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <User className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <div className={`${hasVideo ? 'text-xl' : 'text-2xl'} font-bold text-slate-100`}>{q.currentPatient.name}</div>
                            <div className="text-sm font-medium text-slate-400 mt-0.5">{q.currentPatient.time}</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-slate-500 py-8 relative z-10">
                        <div className="text-6xl font-extralight mb-4 text-slate-600">--</div>
                        <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">No Current Patient</div>
                      </div>
                    )}
                  </div>

                  {/* Next Token */}
                  <div className="p-5 bg-slate-950/80 mt-auto border-t border-white/5">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      Next in Line
                    </div>
                    {q.nextPatient ? (
                      <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-black text-slate-300 font-mono">
                            {q.nextPatient.token}
                          </div>
                          <div className="w-px h-6 bg-white/10"></div>
                          <div className="text-base font-bold text-slate-300 truncate max-w-[180px]">
                            {q.nextPatient.name}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-500 bg-slate-950 px-3 py-1 rounded-lg border border-white/5">
                          {q.nextPatient.time}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/30 p-3 rounded-xl border border-white/5 text-slate-500 text-sm font-medium flex items-center justify-center">
                        Queue is currently empty
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer / Ticker */}
      <footer className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 text-white py-3 border-t border-blue-400/30 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] relative z-20">
        <div className="overflow-hidden whitespace-nowrap flex">
          <div className="animate-[marquee_25s_linear_infinite] whitespace-nowrap font-bold tracking-widest text-sm uppercase">
            Please wait for your token number to be displayed before approaching the doctor's room. &nbsp; • &nbsp; Follow social distancing protocols. &nbsp; • &nbsp; Wear a mask at all times. &nbsp; • &nbsp; Please wait for your token number to be displayed before approaching the doctor's room. &nbsp; • &nbsp; Follow social distancing protocols. &nbsp; • &nbsp; Wear a mask at all times.
          </div>
        </div>
      </footer>
    </div>
  );
}

function getGridClass(count: number) {
  if (count === 1) return "grid-cols-1 max-w-4xl mx-auto";
  if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto";
  if (count === 3) return "grid-cols-1 md:grid-cols-3 max-w-7xl mx-auto";
  return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
}
