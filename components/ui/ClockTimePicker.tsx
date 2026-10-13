"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check } from "lucide-react";

interface ClockTimePickerProps {
    isOpen: boolean;
    initialHour24?: number;
    initialMinute?: number;
    onSave: (hour24: number, minute: number) => void;
    onClose: () => void;
}

export default function ClockTimePicker({
    isOpen,
    initialHour24 = 9,
    initialMinute = 0,
    onSave,
    onClose,
}: ClockTimePickerProps) {
    const [period, setPeriod] = useState<"AM" | "PM">("AM");
    const [hour12, setHour12] = useState<number>(9);
    const [minute, setMinute] = useState<number>(0);
    const [mode, setMode] = useState<"hour" | "minute">("hour");
    const dialRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const h = initialHour24 ?? 9;
            const m = initialMinute ?? 0;
            setPeriod(h >= 12 ? "PM" : "AM");
            const h12 = h % 12 === 0 ? 12 : h % 12;
            setHour12(h12);
            setMinute(m);
            setMode("hour");
        }
    }, [isOpen, initialHour24, initialMinute]);

    if (!isOpen) return null;

    // Radius and center for dial
    const dialSize = 250;
    const center = dialSize / 2; // 125
    const radius = 95;

    // Compute pointer position
    const getPointerCoords = () => {
        let angleDeg = 0;
        if (mode === "hour") {
            angleDeg = (hour12 * 30 - 90);
        } else {
            angleDeg = (minute * 6 - 90);
        }
        const rad = (angleDeg * Math.PI) / 180;
        return {
            x: center + radius * Math.cos(rad),
            y: center + radius * Math.sin(rad),
        };
    };

    const pointer = getPointerCoords();

    const handleDialClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dialRef.current) return;
        const rect = dialRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left - center;
        const clickY = e.clientY - rect.top - center;

        // Angle in degrees (0 at top, clockwise)
        let angleDeg = (Math.atan2(clickY, clickX) * 180) / Math.PI + 90;
        if (angleDeg < 0) angleDeg += 360;

        if (mode === "hour") {
            let h = Math.round(angleDeg / 30);
            if (h === 0) h = 12;
            setHour12(h);
            // After selecting hour, smoothly switch to minute
            setTimeout(() => setMode("minute"), 250);
        } else {
            // Snap to nearest 5 or allow exact minute
            let m = Math.round(angleDeg / 6) % 60;
            // Snap to nearest 5 min for user convenience
            m = Math.round(m / 5) * 5;
            if (m === 60) m = 0;
            setMinute(m);
        }
    };

    const handleConfirm = () => {
        let h24 = hour12 % 12;
        if (period === "PM") h24 += 12;
        onSave(h24, minute);
        onClose();
    };

    const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            {/* Click outside backdrop to close */}
            <div className="fixed inset-0" onClick={onClose} />

            <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 w-full max-w-[320px] flex flex-col items-center gap-4 z-10 animate-in zoom-in-95 duration-150">
                {/* Header: Digital Display + AM/PM Toggles */}
                <div className="w-full flex items-center justify-between gap-3">
                    {/* Digital display pill */}
                    <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl py-2 px-3 flex items-center justify-center gap-1 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setMode("hour")}
                            className={`text-2xl font-black px-1.5 py-0.5 rounded-lg transition-all ${
                                mode === "hour"
                                    ? "text-emerald-500 bg-emerald-50 scale-105"
                                    : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            {String(hour12).padStart(2, "0")}
                        </button>
                        <span className="text-xl font-black text-slate-300">:</span>
                        <button
                            type="button"
                            onClick={() => setMode("minute")}
                            className={`text-2xl font-black px-1.5 py-0.5 rounded-lg transition-all ${
                                mode === "minute"
                                    ? "text-emerald-500 bg-emerald-50 scale-105"
                                    : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            {String(minute).padStart(2, "0")}
                        </button>
                    </div>

                    {/* AM / PM Toggle Pills */}
                    <div className="flex flex-col gap-1">
                        <button
                            type="button"
                            onClick={() => setPeriod("AM")}
                            className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                                period === "AM"
                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-102"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            AM
                        </button>
                        <button
                            type="button"
                            onClick={() => setPeriod("PM")}
                            className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                                period === "PM"
                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-102"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            PM
                        </button>
                    </div>
                </div>

                {/* Subtitle / Mode Indicator */}
                <div className="w-full flex items-center justify-between px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>{mode === "hour" ? "Select Hour" : "Select Minute"}</span>
                    <button
                        type="button"
                        onClick={() => setMode(mode === "hour" ? "minute" : "hour")}
                        className="text-emerald-600 hover:text-emerald-700 normal-case font-semibold text-xs"
                    >
                        Switch to {mode === "hour" ? "Minutes" : "Hours"}
                    </button>
                </div>

                {/* Analog Clock Dial */}
                <div
                    ref={dialRef}
                    onClick={handleDialClick}
                    style={{ width: dialSize, height: dialSize }}
                    className="relative rounded-full border-2 border-slate-100 bg-slate-50/50 shadow-inner select-none cursor-pointer flex items-center justify-center"
                >
                    {/* SVG Pointer Hand & Center Pivot */}
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        width={dialSize}
                        height={dialSize}
                    >
                        {/* Dial Minute Ticks around circumference */}
                        {Array.from({ length: 60 }).map((_, i) => {
                            const isMajor = i % 5 === 0;
                            const tickAngle = (i * 6 - 90) * (Math.PI / 180);
                            const rInner = isMajor ? 114 : 117;
                            const rOuter = 120;
                            const x1 = center + rInner * Math.cos(tickAngle);
                            const y1 = center + rInner * Math.sin(tickAngle);
                            const x2 = center + rOuter * Math.cos(tickAngle);
                            const y2 = center + rOuter * Math.sin(tickAngle);
                            return (
                                <line
                                    key={i}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke={isMajor ? "#cbd5e1" : "#e2e8f0"}
                                    strokeWidth={isMajor ? 1.5 : 1}
                                />
                            );
                        })}

                        {/* Clock hand line */}
                        <line
                            x1={center}
                            y1={center}
                            x2={pointer.x}
                            y2={pointer.y}
                            stroke="#10b981"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                        />
                    </svg>

                    {/* Center Pivot Hub */}
                    <div className="absolute w-3 h-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/40 pointer-events-none z-10 flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full" />
                    </div>

                    {/* Clock Dial Numbers */}
                    {mode === "hour" ? (
                        hours.map((num) => {
                            const angle = (num * 30 - 90) * (Math.PI / 180);
                            const x = center + radius * Math.cos(angle);
                            const y = center + radius * Math.sin(angle);
                            const isSelected = hour12 === num;

                            return (
                                <button
                                    key={`hour-${num}`}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setHour12(num);
                                        setTimeout(() => setMode("minute"), 250);
                                    }}
                                    style={{
                                        position: "absolute",
                                        left: `${x}px`,
                                        top: `${y}px`,
                                        transform: "translate(-50%, -50%)",
                                    }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                        isSelected
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-110 z-20"
                                            : "text-slate-700 hover:bg-slate-200/70 hover:text-slate-900"
                                    }`}
                                >
                                    {num}
                                </button>
                            );
                        })
                    ) : (
                        minutes.map((mVal) => {
                            const angle = (mVal * 6 - 90) * (Math.PI / 180);
                            const x = center + radius * Math.cos(angle);
                            const y = center + radius * Math.sin(angle);
                            const isSelected = minute === mVal;

                            return (
                                <button
                                    key={`min-${mVal}`}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMinute(mVal);
                                    }}
                                    style={{
                                        position: "absolute",
                                        left: `${x}px`,
                                        top: `${y}px`,
                                        transform: "translate(-50%, -50%)",
                                    }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                        isSelected
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-110 z-20"
                                            : "text-slate-700 hover:bg-slate-200/70 hover:text-slate-900"
                                    }`}
                                >
                                    {String(mVal).padStart(2, "0")}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Confirm / Done Button */}
                <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-black py-2.5 rounded-2xl shadow-lg shadow-emerald-500/25 transition-all text-sm flex items-center justify-center gap-1.5"
                >
                    <Check size={16} strokeWidth={3} />
                    Done
                </button>
            </div>
        </div>
    );
}
