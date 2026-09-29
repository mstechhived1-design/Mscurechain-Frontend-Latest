'use client';

import React, { useState, useEffect, useRef } from 'react';

import { User, RotateCcw, X, PlusCircle } from 'lucide-react';
import Image from 'next/image';
import chatDataImport from '../../data/chat-flow.json';

type Message = {
    id: string;
    type: 'user' | 'bot' | 'options';
    text?: string;
    options?: { label: string; next: string }[];
};

type ChatNode = {
    text: string;
    options: { label: string; next: string }[];
};

const chatData = chatDataImport as Record<string, ChatNode>;

// Helper for generating unique message IDs
const generateId = (type: string) => `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const SelectionChat = ({ onClose }: { onClose?: () => void }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentNode, setCurrentNode] = useState('start');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const addBotResponse = (nodeKey: string) => {
        setIsTyping(true);
        setTimeout(() => {
            const node = chatData[nodeKey];
            if (node) {
                const botMsg: Message = { id: generateId('bot'), type: 'bot', text: node.text };
                setMessages(prev => [...prev, botMsg]);

                // Show options after message
                setTimeout(() => {
                    if (node.options && node.options.length > 0) {
                        const optMsg: Message = { id: generateId('options'), type: 'options', options: node.options };
                        setMessages(prev => [...prev, optMsg]);
                    }
                    setIsTyping(false);
                }, 500);
            } else {
                setIsTyping(false);
            }
        }, 800);
    };

    useEffect(() => {
        if (messages.length === 0) {
            addBotResponse('start');
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSelection = (option: { label: string; next: string }) => {
        // Remove previous options from history to keep it clean (optional, but requested "one by one")
        // Actually, "like chatting application" usually means user clicking an option creates a message.

        // Add user message
        const userMsg: Message = {
            id: generateId('user'),
            type: 'user',
            text: option.label
        };

        setMessages(prev => prev.filter(m => m.type !== 'options').concat(userMsg));
        setCurrentNode(option.next);
        addBotResponse(option.next);
    };

    const resetChat = () => {
        setCurrentNode('start');
        setMessages([]);
        addBotResponse('start');
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-[400px] bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden font-sans">
            {/* Header */}
            <div className="p-5 bg-blue-600 flex items-center justify-between text-white shadow-lg relative z-20">
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center overflow-hidden border border-white/20">
                        <Image
                            src="/assets/logo.png"
                            alt="MSCureChain"
                            width={32}
                            height={32}
                            className="object-contain"
                        />
                    </div>
                    <div>
                        <h2 className="font-black text-xs tracking-widest uppercase">MSCureChain</h2>
                        <div className="flex items-center gap-2 text-[10px] text-blue-100 font-bold uppercase tracking-widest">
                            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                            Live Assistant
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={resetChat}
                        className="p-2 hover:bg-white/20 rounded-full active:scale-90"
                        title="Reset Chat"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full active:scale-90"
                            title="Close Chat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-grow p-5 overflow-y-auto space-y-4 scroll-smooth bg-gradient-to-b from-blue-50/30 to-white"
            >
                
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.type === 'options' ? (
                                <div className="flex flex-col gap-2 w-full ml-11">
                                    {msg.options?.map((opt) => (
                                        <button
                                            key={opt.label}
                                            onClick={() => handleSelection(opt)}
                                            className="w-fit max-w-[90%] px-5 py-3 rounded-2xl bg-white border border-blue-100 text-blue-600 text-[13px] font-bold text-left shadow-sm hover:shadow-md hover:border-blue-200 flex items-center gap-2"
                                        >
                                            <PlusCircle className="w-4 h-4 opacity-50" />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className={`flex gap-3 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {msg.type === 'bot' && (
                                        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-blue-50 border border-blue-100">
                                            <Image src="/assets/logo.png" alt="" width={18} height={18} />
                                        </div>
                                    )}
                                    <div className={`px-4 py-3 rounded-2xl text-[14px] font-medium leading-relaxed shadow-sm ${msg.type === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && (
                        <div
                            className="flex justify-start gap-3"
                        >
                            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-blue-50 border border-blue-100">
                                <Image src="/assets/logo.png" alt="" width={18} height={18} />
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-white border border-slate-100 flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            </div>
                        </div>
                    )}
                
            </div>

            {/* Bottom Input Area (Placeholder for styling) */}
            <div className="p-4 bg-white border-t border-blue-50 flex items-center justify-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                    Powered by MS Tech Hive
                </p>
            </div>
        </div>
    );
};

export default SelectionChat;
