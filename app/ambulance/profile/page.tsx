"use client";
import React, { useState, useEffect } from 'react';

export default function AmbulanceProfile() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    if (!user) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-24 sm:h-32 bg-gradient-to-r from-red-600 to-orange-600"></div>
                <div className="px-4 sm:px-6 pb-6">
                    <div className="relative flex justify-between items-end -mt-10 sm:-mt-16 mb-4 sm:mb-6">
                        <div className="w-20 h-20 sm:w-32 sm:h-32 bg-white rounded-xl sm:rounded-2xl p-1 shadow-md">
                            <div className="w-full h-full bg-linear-to-br from-red-500 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-2xl sm:text-4xl font-bold">
                                {user.name.charAt(0)}
                            </div>
                        </div>
                        <div className="pb-1 sm:pb-2">
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 uppercase">
                                Active Duty
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{user.name}</h2>
                        <p className="text-sm sm:text-base text-gray-500 font-medium">Emergency Response Team</p>
                    </div>

                    <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center space-x-3 sm:space-x-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm5 3a2 2 0 100-4 2 2 0 000 4z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-bold">Personnel ID</p>
                                <p className="text-sm sm:text-base text-gray-900 font-semibold">{user.employeeId}</p>
                            </div>
                        </div>

                        <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center space-x-3 sm:space-x-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-bold">Ambulance No.</p>
                                <p className="text-sm sm:text-base text-gray-900 font-semibold">{user.vehicleNumber}</p>
                            </div>
                        </div>

                        <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center space-x-3 sm:space-x-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-bold">Contact No.</p>
                                <p className="text-sm sm:text-base text-gray-900 font-semibold">{user.mobile || "9876543210"}</p>
                            </div>
                        </div>

                        <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center space-x-3 sm:space-x-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-bold">Email Address</p>
                                <p className="text-sm sm:text-base text-gray-900 font-semibold truncate">{user.email || "response@mscurechain.com"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6 bg-red-50 rounded-xl border border-red-100 flex items-start space-x-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-sm sm:text-base font-bold text-red-900">Emergency Protocol</h4>
                    <p className="text-xs sm:text-sm text-red-700 mt-1 leading-relaxed">
                        Ensure your location services are enabled. During an active request, your GPS position will be shared with the accepting hospital to provide accurate ETA updates.
                    </p>
                </div>
            </div>
        </div>
    );
}

