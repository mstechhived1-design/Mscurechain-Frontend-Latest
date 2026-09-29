"use client";

import React from 'react';
import HourlyRecordClient from '../../hospital-admin/patient-hourly-record/HourlyRecordClient';

export default function DoctorHourlyRecordPage() {
    return (
        <div className="space-y-6">
            <HourlyRecordClient />
        </div>
    );
}
