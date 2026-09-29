"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";

interface Room {
    _id: string;
    label: string;
    type?: string;
    [key: string]: any;
}

interface HybridRoomSearchProps {
    value: string;
    onSelect: (roomLabel: string) => void;
    rooms: Room[];
    typeFilter?: string;
    placeholder?: string;
    className?: string;
}

const HybridRoomSearch: React.FC<HybridRoomSearchProps> = ({
    value,
    onSelect,
    rooms,
    typeFilter = "",
    placeholder = "Select Room",
    className = "",
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredRooms = rooms
        .filter((r) => !typeFilter || r.type?.toLowerCase() === typeFilter.toLowerCase())
        .filter((r) => r.label.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:border-teal-500 transition-all"
            >
                <span className="truncate">{value || placeholder}</span>
                <div className="flex items-center gap-1">
                    {value && (
                        <X
                            size={12}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect("");
                            }}
                        />
                    )}
                    <ChevronDown
                        size={14}
                        className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                    />
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-full min-w-[200px] max-w-[280px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                size={14}
                            />
                            <input
                                type="text"
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-teal-500 transition-all"
                                placeholder="Search room..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        <div
                            onClick={() => {
                                onSelect("");
                                setIsOpen(false);
                                setSearchTerm("");
                            }}
                            className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer border-b border-slate-50"
                        >
                            All Rooms
                        </div>
                        {filteredRooms.length > 0 ? (
                            filteredRooms.map((room) => (
                                <div
                                    key={room._id}
                                    onClick={() => {
                                        onSelect(room.label);
                                        setIsOpen(false);
                                        setSearchTerm("");
                                    }}
                                    className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-teal-50 hover:text-teal-600 cursor-pointer transition-colors ${value === room.label
                                        ? "bg-teal-50 text-teal-600"
                                        : "text-slate-700"
                                        }`}
                                >
                                    {room.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">
                                No rooms found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HybridRoomSearch;
