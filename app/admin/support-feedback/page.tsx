"use client";

import React, { useState, useEffect } from "react";
import { adminService } from "@/lib/integrations/services";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";

function SupportFeedback() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
    }
  }, [isAuthenticated]);

  const fetchTickets = async () => {
    try {
      const data = await adminService.getSupportRequestsClient();
      setTickets(data);
    } catch (error: any) {
      // Silently handle error - backend endpoint not implemented yet
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              User Support & Feedback
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Manage all support requests
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden w-full">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="py-4 px-3 md:px-6 text-sm font-medium text-gray-700 dark:text-gray-400">
                    User
                  </th>
                  <th className="py-4 px-3 md:px-6 text-sm font-medium text-gray-700 dark:text-gray-400 hidden md:table-cell">
                    Role
                  </th>
                  <th className="py-4 px-3 md:px-6 text-sm font-medium text-gray-700 dark:text-gray-400">
                    Subject
                  </th>
                  <th className="py-4 px-3 md:px-6 text-sm font-medium text-gray-700 dark:text-gray-400 hidden lg:table-cell">
                    Type
                  </th>
                  <th className="py-4 px-3 md:px-6 text-sm font-medium text-gray-700 dark:text-gray-400 hidden sm:table-cell">
                    Status
                  </th>
                  <th className="py-4 px-3 md:px-6 text-sm font-medium text-gray-700 dark:text-gray-400 hidden lg:table-cell">
                    Date
                  </th>
                  <th className="py-4 px-3 md:px-6 text-sm font-medium text-gray-700 dark:text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-gray-900 dark:text-white"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-gray-600 dark:text-gray-400"
                    >
                      No support requests found
                    </td>
                  </tr>
                ) : (
                  tickets.map((req) => (
                    <tr
                      key={req._id}
                      className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-4 px-3 md:px-6 text-sm max-w-[140px]">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {req.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {req.email}
                        </p>
                      </td>
                      <td className="py-4 px-3 md:px-6 text-sm capitalize font-medium text-gray-900 dark:text-white hidden md:table-cell">
                        {req.role}
                      </td>
                      <td className="py-4 px-3 md:px-6 text-sm font-medium text-gray-900 dark:text-white max-w-[120px] truncate">
                        {req.subject}
                      </td>
                      <td className="py-4 px-3 md:px-6 text-sm hidden lg:table-cell">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            req.type === "bug"
                              ? "bg-red-500/10 text-red-500"
                              : req.type === "complaint"
                              ? "bg-orange-500/10 text-orange-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          {req.type?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-3 md:px-6 text-sm hidden sm:table-cell">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            req.status === "open"
                              ? "bg-orange-500/10 text-orange-500"
                              : req.status === "in-progress"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-green-500/10 text-green-500"
                          }`}
                        >
                          {req.status?.toUpperCase().replace("-", " ") || "OPEN"}
                        </span>
                      </td>
                      <td className="py-4 px-3 md:px-6 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                        <div>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs opacity-75">
                          {new Date(req.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-3 md:px-6 text-sm">
                        <button
                          onClick={() => router.push(`/admin/support-feedback/ticket/${req._id}`)}
                          className="text-blue-500 hover:text-blue-600 font-medium text-xs px-3 py-1.5 bg-blue-500/10 rounded-lg hover:bg-blue-500/20"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(SupportFeedback);
