'use client';

import React from 'react';
import { Settings, Shield, Server, Lock, Globe, Database, ListChecks } from 'lucide-react';
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

function SuperAdminSettings() {
  const settingsSections: SettingSection[] = [
    {
      title: "Core Infrastructure",
      icon: <Server className="w-5 h-5 text-purple-600" />,
      items: [
        { label: "Blockchain Protocol", desc: "Manage ledger synchronization and node health", action: "Active", status: "success" },
        { label: "Data Integrity", desc: "Verify cryptographic signatures across nodes", action: "Verify" }
      ]
    },
    {
      title: "Global Security",
      icon: <Shield className="w-5 h-5 text-rose-600" />,
      items: [
        { label: "Root Access Control", desc: "Master permission level management", action: "Configure" },
        { label: "System Firewall", desc: "Advanced threat detection and prevention", isToggle: true, value: true }
      ]
    },
    {
      title: "Network Maintenance",
      icon: <Database className="w-5 h-5 text-blue-600" />,
      items: [
        { label: "Database Optimization", desc: "Schedule automated indexing and cleanup", action: "Daily" },
        { label: "Back-up Protocols", desc: "Encrypted off-site storage synchronization", isToggle: true, value: true }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">System Core Configuration</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          <Settings className="w-4 h-4" /> Root-Level Infrastructure Controls
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {settingsSections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden group hover:border-purple-200">
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
                    <button className={`w-12 h-6 rounded-full relative ${item.value ? 'bg-purple-600' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full ${item.value ? 'right-1' : 'left-1'}`} />
                    </button>
                  ) : (
                    <button className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border active:scale-95 ${
                      item.status === 'success' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-white text-gray-600 border-gray-100 hover:border-purple-200 hover:text-purple-600'
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

      <div className="p-8 bg-black rounded-[2.5rem] text-white flex items-center justify-between group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl -mt-20 -mr-20 group-hover:scale-150"></div>
        <div className="relative z-10">
          <h4 className="text-xl font-black uppercase italic tracking-tighter">Admin Identity</h4>
          <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">Update your master administrative credentials</p>
        </div>
        <Link href="/admin/profile" className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-purple-600 hover:text-white active:scale-95 relative z-10 shadow-2xl">
          Edit Profile
        </Link>
      </div>
    </div>
  );
}

export default React.memo(SuperAdminSettings);
