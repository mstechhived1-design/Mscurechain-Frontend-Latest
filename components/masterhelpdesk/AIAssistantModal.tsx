"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCcw, ChevronRight, Hash, X, Minimize2, Maximize2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

type Message = {
    id: string;
    text: string;
    sender: "bot" | "user";
    timestamp: Date;
    isTyping?: boolean;
};

const FAQ_CATEGORIES: Record<string, { question: string, answer: string }[]> = {
  "Appointments": [
    { question: "How do I manage appointments?", answer: "In CureChain, you can manage appointments by navigating to the 'Appointments' tab on the left sidebar where you oversee scheduling and workflows." },
    { question: "How to book appointment?", answer: "Patients primarily book their slots via the Patient Portal, but you can coordinate their queue standing inside your Appointments calendar view." },
    { question: "How to cancel appointment?", answer: "Go to your Appointments ledger, select the targeted queue booking, and use the options to mark it as cancelled." },
    { question: "How to reschedule appointment?", answer: "You can coordinate a reschedule by editing an existing appointment slot inside the active Appointments roster." },
    { question: "Where can I see appointment history?", answer: "Historical appointments are automatically archived and securely viewable inside the native Appointments module." },
    { question: "How to check today's appointments?", answer: "Your Dashboard actively surfaces real-time metrics, or you can open the Appointments tab to see today's immediate patient queue." },
    { question: "Can I block appointment slots?", answer: "Administrative slot-blocking protocols can be viewed securely inside your hospital's scheduler interface." },
    { question: "How to assign doctor to appointment?", answer: "In CureChain, doctors are assigned securely based on department rosters during the booking confirmation phase." },
    { question: "How to view doctor schedule?", answer: "Select any doctor in the Appointments interface to observe their assigned daily operational bandwidth." },
    { question: "How to handle emergency appointments?", answer: "Emergency priority slots can be coordinated directly with the Frontdesk or superadmins to override standard queues." },
  ],
  "Transactions": [
    { question: "Where can I see transactions?", answer: "Click 'Transactions' on the sidebar. You'll see a unified ledger of both Offline Cash settlements and Online Gateway payments." },
    { question: "How to check payment history?", answer: "Your Transactions tab permanently logs all verified payment history correlated precisely to your hospital tenant." },
    { question: "How to verify payment status?", answer: "In the Transactions table, look for the status indicator on each row—it dynamically displays Success, Failed, or Pending flags." },
    { question: "How to download invoice?", answer: "Authorized Master Helpdesks can download corresponding PDF receipts directly from the payment action menus inside Transactions." },
    { question: "How to refund payment?", answer: "Refund escalations for failed bookings can be technically requested via Superadmins or traced in the Transactions log." },
    { question: "What payment methods are supported?", answer: "CureChain securely manages Cash, UPI integration, Credit/Debit structures, and regulated online gateways." },
    { question: "Why payment failed?", answer: "Failures typically arise from bank latencies or gateway timeouts. Patients are instantly notified to retry the transaction." },
    { question: "How to track daily revenue?", answer: "Your centralized Dashboard automatically parses the day's financial offline and online collections graphically." },
    { question: "Can I export transactions?", answer: "Data exportation constraints are dynamically handled depending on your specific Master Helpdesk permission scopes." },
  ],
  "Settings": [
    { question: "How to update profile?", answer: "Click 'Settings' on the sidebar. In the 'Personal & Account' tab, you can seamlessly update your email, mobile, DOB, and core identities." },
    { question: "How to update bank details?", answer: "Inside Settings, switch to the 'Bank & Payroll' tab. There you can securely plug in your IFSC code, Account Number, and Tax Identifiers (PAN, Aadhar, UAN)." },
    { question: "How to upload profile picture?", answer: "Go to Settings > 'Personal & Account'. Hover specifically over the circular avatar at the top and upload your preferred JPG or PNG image." },
    { question: "How to change password?", answer: "System password permutations are strictly managed via forgotten password flows or high-level organizational controls for security." },
    { question: "How to update hospital details?", answer: "Global hospital constraints and identifiers can exclusively be modified from the primary Superadmin console, not Helpdesk." },
    { question: "How to change notification settings?", answer: "Alerts are natively built into CureChain to notify you upon critical failures automatically." },
  ],
  "Support": [
    { question: "How to raise support ticket?", answer: "Open the 'Support' section from the sidebar and interact with the 'Create Support Ticket' module to securely escalate system issues to your superadmin or IT." },
    { question: "Where can I see my tickets?", answer: "Every ticket you generate is systematically logged and visible chronologically inside your Support grid." },
    { question: "How to check ticket status?", answer: "Inside the Support panel, your tickets will actively display 'Open', 'In Progress', or 'Resolved' state markers." },
    { question: "How to contact support?", answer: "The most efficient operational path is utilizing the built-in Support ticket system right here in the Master Helpdesk." },
    { question: "How to reopen ticket?", answer: "If an issue persists after Resolution, a new diagnostic ticket linked to the previous constraint should be escalated." },
    { question: "How long support takes?", answer: "CureChain internal logistics aim for IT mitigation actions to reflect physically within a 24-hour cycle." },
    { question: "How to attach files in ticket?", answer: "Currently, you should thoroughly summarize diagnostic traces directly in the text payload description of your ticket." },
    { question: "How to escalate issue?", answer: "Explicitly labeling your support request with urgent terminology in the subject ensures administrators treat it with high priority." },
  ],
  "Dashboard & General": [
    { question: "What is dashboard?", answer: "The Dashboard is your main CureChain Command Center. It displays your today's appointments volume, transaction health, and broad hospital statistics." },
    { question: "What data is shown in dashboard?", answer: "It actively tracks operational velocity: total transaction flow for the day, active bookings, and multi-tenant alerts." },
    { question: "How to check daily report?", answer: "At-a-glance performance counts are visibly layered directly onto the initial Dashboard screens when you log in." },
    { question: "How to login?", answer: "You securely initiate sessions using your verified CureChain Helpdesk credentials at the primary application authentication border." },
    { question: "How to logout?", answer: "Click 'Logout' via the primary sidebar icon or through the top-right profile navigation header block." },
    { question: "Is my data secure?", answer: "CureChain runs heavily isolated multi-tenant architecture. Your hospital's transactions, support issues, and profile data live strictly decoupled from others." },
  ]
};

const INITIAL_MESSAGE: Message = {
    id: "init-1",
    text: "Hello! I am your CureChain Master Helpdesk AI Assistant. Please select a module category below to view specific support questions, or type your query directly!",
    sender: "bot",
    timestamp: new Date()
};

interface AIAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AIAssistantModal({ isOpen, onClose }: AIAssistantModalProps) {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [inputValue, setInputValue] = useState("");
    const [isBotResponding, setIsBotResponding] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
        }
    }, [messages, selectedCategory, isOpen, isMinimized]);

    const generateBotResponse = (msgText: string): string => {
        const query = msgText.toLowerCase().trim();

        // 1. Exact or Partial Match from FAQ_LIST
        for (const cat of Object.values(FAQ_CATEGORIES)) {
            for (const item of cat) {
                if (item.question.toLowerCase().includes(query) || query.includes(item.question.toLowerCase())) {
                    return item.answer;
                }
            }
        }

        // 2. Keyword Fuzzy Fallbacks
        if (query.includes('transaction') || query.includes('payment') || query.includes('pay') || query.includes('online')) {
            return "Transactions sync globally! You can manage both Offline cash and Online gateway transactions from your 'Transactions' tab. Those automatically synchronize back to the Superadmin ledger.";
        }
        if (query.includes('support') || query.includes('ticket') || query.includes('raise') || query.includes('help')) {
            return "Looking for help? You can raise support tickets instantly from the 'Support' section on your sidebar. Every ticket is traced and securely logged to escalate to superadmins or IT staff.";
        }
        if (query.includes('profile') || query.includes('setting') || query.includes('bank') || query.includes('password') || query.includes('update')) {
            return "You can safely manage your full Personal Profile, along with sensitive Settlement Bank Details and Payroll identifiers (like PAN, Aadhar, and UAN), securely inside the 'Settings' tab.";
        }
        if (query.includes('appointment') || query.includes('book') || query.includes('schedule') || query.includes('doctor')) {
            return "Appointments from incoming patients can be scheduled securely within the 'Appointments' sidebar tab. You can view calendar slots, daily queues, and override schedules.";
        }
        if (query.includes('dashboard') || query.includes('home') || query.includes('analytics')) {
            return "Your Master Dashboard aggregates high-level analytics! You'll see today's incoming patient volume, gross offline/online transaction counters, and immediate notifications mapped to your hospital scope.";
        }
        
        // 3. Conversational
        if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
            return `Hello ${user?.name || "there"}! I am fully operational and ready to assist you. What module do you need help with?`;
        }
        
        return "I couldn't find an exact match for that! I'm designed to guide you through CureChain's Master Helpdesk. Try selecting one of the Module Categories below or ask explicitly about Dashboard, Settings, Transactions, Appointments, or Support.";
    };

    const handleSendMessage = (textOrEvent?: React.FormEvent | string) => {
        let textToSend = inputValue.trim();
        if (typeof textOrEvent === 'string') textToSend = textOrEvent.trim();
        else textOrEvent?.preventDefault();

        if (!textToSend || isBotResponding) return;

        const userMsg: Message = { id: Date.now().toString(), text: textToSend, sender: "user", timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsBotResponding(true);

        const typingId = "typing-" + Date.now();
        setMessages(prev => [...prev, { id: typingId, text: "", sender: "bot", timestamp: new Date(), isTyping: true }]);

        setTimeout(() => {
            const answer = generateBotResponse(userMsg.text);
            setMessages(prev => prev.map(m => m.id === typingId ? { ...m, isTyping: false, text: answer, id: Date.now().toString() } : m));
            setIsBotResponding(false);
        }, 800);
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed bottom-20 right-6 z-50 flex flex-col transition-all duration-300 ease-in-out ${isMinimized ? 'h-14 w-64' : 'h-[600px] w-[450px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)]'} shadow-2xl rounded-3xl overflow-hidden border border-slate-200 bg-white`}>
            {/* Header */}
            <div className="bg-indigo-600 p-4 flex items-center justify-between text-white shrink-0 cursor-pointer" onClick={() => isMinimized && setIsMinimized(false)}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                        <Bot size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-tight">AI Assistant</h3>
                        {!isMinimized && <p className="text-[9px] font-medium opacity-80 uppercase tracking-widest">Always Active</p>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                                        {msg.sender === 'user' ? <User size={10} /> : <Bot size={12} />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-sm'}`}>
                                        {msg.isTyping ? (
                                            <div className="flex gap-1 py-1">
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            </div>
                                        ) : (
                                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Categories/FAQs Injection */}
                        {!isBotResponding && messages[messages.length - 1].sender === 'bot' && (
                            <div className="flex flex-col gap-3 pl-8 pt-2 animate-in fade-in duration-500">
                                {!selectedCategory ? (
                                    <>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                            <Hash size={12} className="text-indigo-400" /> Browse By Category
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.keys(FAQ_CATEGORIES).map((catName) => (
                                                <button
                                                    key={catName}
                                                    onClick={() => setSelectedCategory(catName)}
                                                    className="px-4 py-2 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-xl transition-all shadow-sm active:scale-95"
                                                >
                                                    {catName}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="animate-in slide-in-from-left-4 duration-300">
                                        <div className="flex items-center gap-2 mb-3">
                                            <button 
                                                onClick={() => setSelectedCategory(null)}
                                                className="text-[10px] text-indigo-500 hover:text-indigo-600 font-black uppercase tracking-widest flex items-center transition-colors"
                                            >
                                                &larr; Back
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                                {selectedCategory}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {FAQ_CATEGORIES[selectedCategory].map((faq, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSendMessage(faq.question)}
                                                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-[11px] font-bold rounded-xl transition-all flex items-center justify-between text-left shadow-sm hover:shadow-md"
                                                >
                                                    <span>{faq.question}</span>
                                                    <ChevronRight size={12} className="opacity-50 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-100 bg-white">
                        <form onSubmit={handleSendMessage} className="relative flex items-center">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type your query here..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                disabled={isBotResponding}
                            />
                            <button type="submit" disabled={!inputValue.trim() || isBotResponding} className="absolute right-1.5 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}
