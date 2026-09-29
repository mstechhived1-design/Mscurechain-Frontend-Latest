"use client";

import React, { useState } from 'react';
import { Calendar, Clock, User } from 'lucide-react';

interface Appointment {
  patientName: string;
  time: string;
  type: string;
  status: string;
  createdAt?: string;
  date?: string;
}

interface QueueToggleProps {
  appointments: Appointment[];
  consultationDuration?: number;
}

function AppointmentsQueue({ appointments, consultationDuration = 0 }: QueueToggleProps) {
  const [showQueue, setShowQueue] = useState(false);

  // Sort appointments by creation time (queue order)
  const sortedAppointments = [...appointments].sort((a, b) => {
    return new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime();
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
      {/* Header with Toggle */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Today's Appointments</h2>
          <p className="text-xs text-gray-400 mt-1">
            {appointments.length} patient{appointments.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>

        {/* Queue Toggle */}
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600">
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Queue</span>
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`relative w-12 h-6 rounded-full cursor-pointer ${showQueue ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full cursor-pointer ${showQueue ? 'translate-x-6' : 'translate-x-0'
              }`} />
          </button>
          <span className={`text-[10px] font-black uppercase ${showQueue ? 'text-blue-600' : 'text-gray-400'
            }`}>
            {showQueue ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Appointments List */}
      <div className="p-6">
        {showQueue ? (
          appointments.length > 0 ? (
            <div className="space-y-3">
              {sortedAppointments.map((apt, idx) => {
                // Calculate estimated wait time
                const duration = consultationDuration || 15;
                const estimatedWaitMinutes = idx * duration;
                const hours = Math.floor(estimatedWaitMinutes / 60);
                const minutes = estimatedWaitMinutes % 60;
                const waitTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {/* Queue Position */}
                    <div className="shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-sm">
                      {idx + 1}
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                        {apt.patientName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {apt.type}
                        </span>
                        {idx > 0 && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
                              <Clock size={12} />
                              Wait: {waitTime}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {apt.time}
                      </p>
                      <p className="text-xs text-gray-400">~{consultationDuration || 15}min</p>
                    </div>
                  </div>
                );
              })}

              {/* Total Estimated Time */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                    Total Estimated Time
                  </span>
                  <span className="text-lg font-black text-blue-600">
                    {Math.floor((appointments.length * (consultationDuration || 15)) / 60)}h {(appointments.length * (consultationDuration || 15)) % 60}m
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400">No appointments scheduled</p>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Queue View Disabled</p>
            <p className="text-xs text-gray-400 mt-1">Toggle ON to see patient queue and wait times</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(AppointmentsQueue);
