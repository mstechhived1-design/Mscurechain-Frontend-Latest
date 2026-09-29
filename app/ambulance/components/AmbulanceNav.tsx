"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AmbulanceNav() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    useEffect(() => {
        // Check auth from localStorage
        const userRole = localStorage.getItem("userRole");
        const userData = localStorage.getItem("user");

        if (userRole !== "ambulance") {
            router.push("/emergency/login");
            return;
        }

        if (userData) {
            setTimeout(() => setUser(JSON.parse(userData)), 0);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        router.push("/emergency/login");
    };

    if (!user) {
        return null; // Don't block rendering
    }

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
                            <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">
                                Emergency System
                            </h1>
                            <p className="text-xs text-gray-500">
                                {user.vehicleNumber}
                            </p>
                        </div>
                    </div>

                    {/* User Profile */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50"
                        >
                            <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {user.name.charAt(0)}
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-gray-900">
                                    {user.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {user.employeeId}
                                </div>
                            </div>
                            <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                    <svg
                                        className="w-4 h-4 inline-block mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                        />
                                    </svg>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
