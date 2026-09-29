"use client";

import React, { useState } from "react";
import { adminService } from "@/lib/integrations";
import { Radio, Send, Bell, Shield, Info, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, FormTextarea, Button } from "@/components/admin";

function Broadcast() {
  const [formData, setFormData] = useState({
    title: "",
    body: ""
  });
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"info" | "warning" | "alert">("info");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminService.broadcastClient(formData);
      toast.success("Broadcast message successfully pushed to all active sessions!");
      setFormData({ title: "", body: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to transmit broadcast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Network Broadcast"
        subtitle="Push real-time notifications to all patients, doctors, and staff members"
        icon={<Radio className="text-red-500" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card title="Compose Announcement" padding="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex gap-4 mb-2">
                        {['info', 'warning', 'alert'].map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t as any)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                                    type === t 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' 
                                    : 'bg-transparent border-gray-200 dark:border-gray-800 opacity-50'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <FormInput
                        label="Broadcast Title"
                        required
                        placeholder="e.g., System Maintenance Update"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        icon={<Bell size={18} className="text-gray-400" />}
                    />

                    <FormTextarea
                        label="Message content"
                        required
                        rows={8}
                        placeholder="Type the announcement details here..."
                        value={formData.body}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    />

                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0" size={18} />
                        <p className="text-[10px] text-red-400 leading-relaxed font-medium">
                            CAUTION: This message will be instantly visible to EVERY registered user in the network. Ensure the content is accurate and professional.
                        </p>
                    </div>

                    <Button
                        type="submit"
                        loading={loading}
                        icon={<Send size={18} />}
                        className="w-full py-4 text-lg shadow-xl shadow-blue-600/20"
                    >
                        Push Live Broadcast
                    </Button>
                </form>
            </Card>
        </div>

        <div className="space-y-6">
            <Card title="Live Preview" padding="p-6" className="bg-gray-50/50 dark:bg-gray-900/50">
                <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-4 bg-white dark:bg-gray-800 shadow-inner">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${type === 'alert' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'} text-white`}>
                            {type === 'alert' ? <Shield size={16} /> : type === 'warning' ? <AlertTriangle size={16} /> : <Info size={16} />}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">MSCureChain Official</span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">{formData.title || "Message Title Preview"}</h4>
                    <p className="text-xs opacity-70 leading-relaxed wrap-break-word">
                        {formData.body || "Your broadcast message content will appear here exactly as it will look for the end users."}
                    </p>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                        <span className="text-[9px] font-medium opacity-30">JUST NOW</span>
                    </div>
                </div>
            </Card>

            <Card title="Broadcast Stats" padding="p-6">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-xs opacity-50">Reach</span>
                        <span className="text-xs font-bold">12,450+ Users</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs opacity-50">Estimated Latency</span>
                        <span className="text-xs font-bold text-green-500">&lt; 200ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs opacity-50">Priority Level</span>
                        <span className={`text-xs font-bold uppercase ${type === 'alert' ? 'text-red-500' : 'text-blue-500'}`}>{type === 'alert' ? 'High' : 'Normal'}</span>
                    </div>
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Broadcast);
