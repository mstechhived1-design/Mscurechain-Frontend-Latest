import React from 'react';
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
    const currentYear = new Date().getFullYear();


    return (
        <footer
            className="border-t border-slate-200/30 dark:border-slate-800/30 transition-colors duration-300"
            style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--secondary-color)'
            }}
        >
            {/* Main Footer Content */}
            <div className="max-w-7xl h-[24%] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                    {/* About Section */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <div className=" p-2 rounded-lg">
                                <img className='w-10 h-10' src="/assets/logo.png" alt="" />
                            </div>
                            <h3 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>MSCureChain</h3>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--secondary-color)' }}>
                            Providing quality healthcare services with compassion and excellence.
                            Your health and well-being are our top priorities.
                        </p>
                        <div className="flex space-x-3">
                            <a
                                href="https://www.facebook.com/profile.php?id=61585136090341"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-full transition-all duration-300 transform hover:scale-110 hover:bg-blue-600"
                                style={{ backgroundColor: 'var(--bg-color)' }}
                                aria-label="Facebook"
                            >
                                <Facebook size={18} />
                            </a>
                            <a
                                href="https://www.youtube.com/@MscureChain"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-full transition-all duration-300 transform hover:scale-110 hover:bg-blue-600"
                                style={{ backgroundColor: 'var(--bg-color)' }}
                                aria-label="Facebook"
                            >
                                <Youtube size={18} />
                            </a>
                            <a
                                href="http://x.com/Mscurechain"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-full transition-all duration-300 transform hover:scale-110 hover:bg-blue-600"
                                style={{ backgroundColor: 'var(--bg-color)' }}
                                aria-label="Twitter"
                            >
                                <Twitter size={18} />
                            </a>
        
                            <a
                                href="https://www.instagram.com/mscurechain?igsh=MXVtdXJkdmwwbGMxcQ=="
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-full transition-all duration-300 transform hover:scale-110 hover:bg-blue-600"
                                style={{ backgroundColor: 'var(--bg-color)' }}
                                aria-label="Instagram"
                            >
                                <Instagram size={18} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>Quick Links</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/solutions">Solutions</Link>
                            </li>
                            <li>
                                <Link href="/about">About Us</Link>
                            </li>
                            <li>
                                <Link href="/">Appointment</Link>
                            </li>
                            <li>
                                <Link href="/">Emergency Care</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Services */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>Our Services</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/about/helpdesk-reception">Appointment Booking</Link>
                            </li>

                            <li>
                                <Link href="/about/doctor-terminal">Digital Prescriptions</Link>
                            </li>
                            <li>
                                <Link href="/about/lab-diagnostics">Lab & Pharama Integration</Link>
                            </li>
                            <li>
                                <Link href="/about/nurse-portal">IPD Bed Management</Link>
                            </li>
                            <li>
                                <Link href="/about/hospital-admin">Hospital and Doctor Management</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>Contact Us</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start space-x-3 group">
                                <MapPin size={18} className="text-blue-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                                <a
                                    href="https://maps.app.goo.gl/xuJKp9urXsuoBeab9"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm hover:text-blue-400 transition-colors duration-200"
                                >
                                    View Location
                                </a>
                            </li>
                            <li className="flex items-center space-x-3 group">
                                <Phone size={18} className="text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                                <a href="tel:+919032223352" className="text-sm hover:text-blue-400 transition-colors duration-200">
                                    +91 9032223352
                                </a>
                            </li>
                             <li className="flex items-center space-x-3 group">
                                <Phone size={18} className="text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                                <a href="tel:+919492321619" className="text-sm hover:text-blue-400 transition-colors duration-200">
                                   +91 9492321619
                                </a>
                            </li>
                            <li className="flex items-center space-x-3 group">
                                <Mail size={18} className="text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                                <a href="mailto:info@mscurechain.com" className="text-sm hover:text-blue-400 transition-colors duration-200">
                                    info@mscurechain.com
                                </a>
                            </li>
                        </ul>

                        {/* Emergency Badge */}
                        <div className="mt-4 bg-red-600/20 border border-red-600/50 rounded-lg p-3">
                            <p className="text-red-400 font-semibold text-sm">24/7 Emergency</p>
                            <p className="text-red-300 text-xs mt-1">Call: 108</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-slate-200/30 dark:border-slate-800/30" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <p className="text-sm" style={{ color: 'var(--secondary-color)' }}>
                            © {currentYear} MS Tech Hive - Hospital Management System. All rights reserved.
                        </p>
                        <div className="flex space-x-6">
                            <Link href="/privacy-policy" className="text-sm hover:text-blue-400 transition-colors duration-200" style={{ color: 'var(--secondary-color)' }}>
                                Privacy Policy
                            </Link>
                            <Link href="/terms-of-service" className="text-sm hover:text-blue-400 transition-colors duration-200" style={{ color: 'var(--secondary-color)' }}>
                                Terms of Service
                            </Link>
                            <Link href="/delete-account" className="text-sm hover:text-blue-400 transition-colors duration-200" style={{ color: 'var(--secondary-color)' }}>
                                Delete Account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
