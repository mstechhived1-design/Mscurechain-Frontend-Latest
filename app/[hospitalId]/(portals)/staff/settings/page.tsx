'use client';

import React from 'react';
import { Settings, Shield, Bell, Eye, Lock, Smartphone, Globe, Moon } from 'lucide-react';
import Link from 'next/link';

interface SettingItem {
  label: string;
  desc: string;
  action?: string;
  status?: string;
  isToggle?: boolean;
  value?: boolean;
}

interface SettingSection {
  title: string;
  icon: React.ReactNode;
  items: SettingItem[];
}

function SettingsPage() {
  const settingsSections: SettingSection[] = [
    {
      title: "Security & Access",
      icon: <Shield className="w-5 h-5 text-blue-600" />,
      items: [
        { label: "Credentials Management", desc: "Update your biometric and digital keys", action: "Configure" },
        { label: "Identity Verification", desc: "Verify your credentials for advanced nodes", action: "Verified", status: "success" }
      ]
    },
    {
      title: "User Interface",
      icon: <Eye className="w-5 h-5 text-indigo-600" />,
      items: [
        { label: "Visual Aesthetics", desc: "Toggle dark mode and visual protocols", isToggle: true, value: true },
        { label: "Language Selection", desc: "Select your primary communication protocol", action: "English" }
      ]
    },
    {
      title: "Communications",
      icon: <Bell className="w-5 h-5 text-rose-600" />,
      items: [
        { label: "Event Notifications", desc: "Receive real-time system pings", isToggle: true, value: true },
        { label: "Audit Reports", desc: "Frequency of activity logging", action: "Weekly" }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900  uppercase ">Configuration1</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            System Integration & Preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {settingsSections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-[0.5rem] border border-gray-100 shadow-sm overflow-hidden group hover:border-blue-200">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4 bg-gray-50/30">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50">
                {section.icon}
              </div>
              <h3 className="font-black text-gray-900 uppercase tracking-tighter">{section.title}</h3>
            </div>
            
            <div className="divide-y divide-gray-50">
              {section.items.map((item, i) => (
                <div key={i} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50/50">
                  <div>
                    <p className="font-black text-gray-900 uppercase text-sm">{item.label}</p>
                    <p className="text-xs text-gray-400 font-bold mt-1 tracking-wide">{item.desc}</p>
                  </div>
                  
                  {item.isToggle ? (
                    <button className={`w-12 h-6 rounded-full relative ${item.value ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full ${item.value ? 'right-1' : 'left-1'}`} />
                    </button>
                  ) : (
                    <button className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border active:scale-95 ${
                      item.status === 'success' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-white text-gray-600 border-gray-100 hover:border-blue-200 hover:text-blue-600'
                    }`}>
                      {item.action}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(SettingsPage);
