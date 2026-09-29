import React from 'react';
import HourlyRecordClient from "@/app/[hospitalId]/(portals)/hospital-admin/patient-hourly-record/HourlyRecordClient";

export const metadata = {
    title: 'Patient Hourly Monitoring | CureChain Admin',
    description: 'Detailed hourly monitoring records for ICU and Emergency patients.',
};

export default function PatientHourlyRecordPage() {
    return (
        <div className="space-y-4 md:space-y-5 bg-slate-50/50 min-h-screen flex flex-col pb-12">
            <HourlyRecordClient />
        </div>
    );
}
