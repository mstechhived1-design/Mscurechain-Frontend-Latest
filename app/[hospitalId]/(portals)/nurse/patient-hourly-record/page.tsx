"use client";

import React from 'react';
import NurseHourlyRecordClient from './NurseHourlyRecordClient';

export default function NurseHourlyRecordPage() {
    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-0.5 sm:gap-2 px-1 sm:px-0 mt-2 sm:mt-0">
                <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 uppercase tracking-tighter sm:tracking-tight">Patient Hourly Monitoring</h1>
                <p className="text-[7px] md:text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Departmental Patient Monitoring History</p>
            </div>

            <NurseHourlyRecordClient />
        </div>
    );
}
