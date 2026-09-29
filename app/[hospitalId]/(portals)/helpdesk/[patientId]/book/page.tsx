'use client';

import React, { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, User, CheckCircle, ArrowLeft, Printer } from "lucide-react";
import { useHelpdeskStore } from "@/stores/helpdeskStore";
import toast from "react-hot-toast";

interface PageProps {
  params: Promise<{ patientId: string }>;
}

function PatientBookingPage(props: PageProps) {
  const params = use(props.params);
  const router = useRouter();
  const { getPatient, addAppointment, doctors, hospitalDetails, appointments } = useHelpdeskStore();
  const [selectedDoctor, setSelectedDoctor] = useState(doctors[0]?._id);
  const [selectedSlot, setSelectedSlot] = useState('');

  const [patient, setPatient] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<any>(null);

  // Guard to prevent double-toast (React StrictMode double-invoke / multiple renders)
  const hasChecked = React.useRef(false);

  useEffect(() => {
    // Wait until the store has loaded doctors before concluding "not found"
    // (avoids false-positive error on the initial empty-store render)
    if (doctors.length === 0) return;

    const p = getPatient(params.patientId);
    if (p) {
      setPatient(p);
    } else if (!hasChecked.current) {
      hasChecked.current = true;
      toast.error("Patient not found!");
      // setTimeout(() => router.push('/helpdesk'), 2000);
    }
  }, [params.patientId, getPatient, doctors, router]);


  useEffect(() => {
    if (doctors.length > 0 && !selectedDoctor) {
      setSelectedDoctor(doctors[0]._id);
    }
  }, [doctors, selectedDoctor]);

  const handleBooking = () => {
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }

    const doctor = doctors.find(d => d._id === selectedDoctor);
    if (!doctor) {
      toast.error("Please select a doctor");
      return;
    }
    if (!patient) return;

    // Check duplicate appointment
    const hasExisting = appointments.some(a => a.patientId === patient.id && a.status === 'Scheduled');
    if (hasExisting) {
      toast.error("This patient already has a scheduled appointment.");
      return;
    }

    const newAppointment = {
      id: `APT-${Math.floor(Math.random() * 10000)}`,
      patientName: patient.name,
      patientId: patient.id,
      doctorName: doctor.name,
      doctorId: doctor._id,
      time: new Date().toISOString(), // In real app, combine date + slot
      type: 'Consultation',
      status: 'Scheduled' as const,
      slot: selectedSlot, // Add slot to object
      date: new Date().toISOString() // Required by type
    };

    addAppointment(newAppointment);
    setBookedAppointment(newAppointment);
    setBookingSuccess(true);
    toast.success("Appointment Scheduled Successfully!");
  };

  const handlePrint = () => {
    window.print();
  };

  if (!patient) return <div className="p-10 text-center">Loading Patient Data...</div>;

  const val = (v: any) => (v && v.toString().trim() !== '') ? v : 'N/A';

  if (bookingSuccess && bookedAppointment) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        {/* On-Screen Success Message */}
        <div className="text-center space-y-4 mb-8 print:hidden">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} />
          </div>
          <h1 className="text-2xl font-bold dark:text-white">Appointment Confirmed!</h1>
          <p className="text-gray-500">The appointment has been successfully booked.</p>
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => router.push('/helpdesk')}
              className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl"
            >
              Go to Dashboard
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Printer size={18} /> Print Confirmation
            </button>
          </div>
        </div>

        {/* Printable Ticket */}
        {/* Using inline styles where Tailwind print modifiers might behave unexpectedly with specificity */}
        <div
          className="bg-white text-black p-8 rounded-2xl border border-gray-200 shadow-sm print:fixed print:inset-0 print:w-full print:h-full print:border-none print:shadow-none print:z-50 print:p-8"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {/* Header - Hospital Details */}
          <div className="text-center border-b-2 border-gray-800 pb-6 mb-6">
            <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900 leading-tight">{val(hospitalDetails.name)}</h1>
            <p className="text-sm font-bold text-gray-600 mt-2 uppercase tracking-wide">{val(hospitalDetails.address)}</p>
            <p className="text-sm font-medium text-gray-600 mt-1">
              Phone: {val(hospitalDetails.phone)} • Email: {val(hospitalDetails.email)}
            </p>
          </div>

          {/* Section 1: Appointment & Doctor */}
          <div className="flex justify-between items-start mb-8 border-b-2 border-dashed border-gray-300 pb-8">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Consultation Details</p>
              <h2 className="text-2xl font-bold text-blue-900">{val(bookedAppointment.doctorName)}</h2>
              <p className="font-semibold text-gray-800 text-lg">{doctors.find(d => d._id === bookedAppointment.doctorId)?.specialties?.[0]}</p>
              <p className="text-sm text-gray-500 mt-2">Appt ID: <span className="font-mono font-bold text-black text-base">{bookedAppointment.id}</span></p>
            </div>
            <div className="text-right">
              <div className="inline-block text-right bg-gray-50 p-4 rounded-xl border border-gray-200 print:border-gray-300">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Scheduled Slot</p>
                <p className="text-3xl font-black text-blue-600 print:text-black">{val(bookedAppointment.slot)}</p>
                <p className="text-sm font-bold text-gray-500 mt-1">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Patient Information - Comprehensive Grid */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-white bg-gray-900 p-2 uppercase tracking-widest mb-6 text-center print:bg-black print:text-white">Patient Record</h3>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-6 text-sm">
              <div className="flex border-b border-gray-100 pb-1 items-end">
                <span className="font-bold text-gray-500 w-32 shrink-0">Full Name</span>
                <span className="font-bold text-lg leading-none">{val(patient.name)}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-1 items-end">
                <span className="font-bold text-gray-500 w-32 shrink-0">MRN</span>
                <span className="font-mono font-bold text-lg leading-none">{val(patient.id)}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-1 items-end">
                <span className="font-bold text-gray-500 w-32 shrink-0">Age / Gender</span>
                <span className="font-semibold">{val(patient.age)} Yrs / {val(patient.gender)}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-1 items-end">
                <span className="font-bold text-gray-500 w-32 shrink-0">DOB</span>
                <span className="font-semibold">{val(patient.dob)}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-1 items-end">
                <span className="font-bold text-gray-500 w-32 shrink-0">Mobile</span>
                <span className="font-semibold">{val(patient.contact)}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-1 items-end">
                <span className="font-bold text-gray-500 w-32 shrink-0">Emergency</span>
                <span className="font-semibold">{val(patient.emergencyContact)}</span>
              </div>
              <div className="col-span-2 flex border-b border-gray-100 pb-1 items-end">
                <span className="font-bold text-gray-500 w-32 shrink-0">Address</span>
                <span className="font-semibold">{val(patient.address)}</span>
              </div>
            </div>

            {/* Vitals Grid */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">Clinical Vitals</h4>
            <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 print:bg-transparent print:border-gray-200">
              <div className="border-r border-gray-200 last:border-0"><p className="text-[10px] uppercase text-gray-400 font-bold">Height</p><p className="font-bold text-lg">{val(patient.vitals?.height)} <span className="text-xs font-normal text-gray-400">cm</span></p></div>
              <div className="border-r border-gray-200 last:border-0"><p className="text-[10px] uppercase text-gray-400 font-bold">Weight</p><p className="font-bold text-lg">{val(patient.vitals?.weight)} <span className="text-xs font-normal text-gray-400">kg</span></p></div>
              <div className="border-r border-gray-200 last:border-0"><p className="text-[10px] uppercase text-gray-400 font-bold">BP</p><p className="font-bold text-lg">{val(patient.vitals?.bp)}</p></div>
              <div className="border-r border-gray-200 last:border-0"><p className="text-[10px] uppercase text-gray-400 font-bold">Pulse</p><p className="font-bold text-lg">{val(patient.vitals?.pulse)}</p></div>
              <div className="border-r border-gray-200 last:border-0"><p className="text-[10px] uppercase text-gray-400 font-bold">Sugar</p><p className="font-bold text-lg">{val(patient.vitals?.sugar)}</p></div>
              <div className="border-r border-gray-200 last:border-0"><p className="text-[10px] uppercase text-gray-400 font-bold">SpO2</p><p className="font-bold text-lg">{val(patient.vitals?.spo2)} <span className="text-xs font-normal text-gray-400">%</span></p></div>
              <div className="border-r border-gray-200 last:border-0"><p className="text-[10px] uppercase text-gray-400 font-bold">Heart Rate</p><p className="font-bold text-lg">{val(patient.vitals?.heartRate)}</p></div>
              <div><p className="text-[10px] uppercase text-gray-400 font-bold">Blood Group</p><p className="font-bold text-lg">{val(patient.bloodGroup)}</p></div>
            </div>

            {/* History */}
            <div className="grid grid-cols-1 gap-y-3 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100 print:bg-transparent print:border-gray-200">
              <div className="flex">
                <span className="font-bold text-gray-500 w-32 shrink-0">Allergies:</span>
                <span className="font-medium text-red-600 print:text-black">{val(patient.history?.allergies)}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-gray-500 w-32 shrink-0">History:</span>
                <span className="font-medium">{val(patient.history?.medicalHistory)}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-gray-500 w-32 shrink-0">Symptoms:</span>
                <span className="font-medium">{patient.symptoms?.length ? patient.symptoms.join(', ') : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2 border-black flex justify-between items-end">
            <div className="text-xs text-gray-500 font-medium">
              <p>Issued: {new Date().toLocaleString()}</p>
              <p className="mt-1">Generated by CureChain Hospital Management System</p>
            </div>
            <div className="text-center w-48">
              <div className="h-12 border-b-2 border-dashed border-gray-300 mb-2"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Doctor / Staff Signature</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Book Appointment</h1>
          <p className="text-gray-500">Fix a consultation slot for the patient.</p>
        </div>
      </div>

      {/* Patient Summary Card */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-6 rounded-2xl flex items-center gap-4">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-2xl">
          {patient.name.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{patient.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            MRN: <span className="font-mono text-gray-700 dark:text-gray-300">{patient.id}</span> • {patient.age} Yrs • {patient.gender}
          </p>
          {patient.symptoms && patient.symptoms.length > 0 && (
            <div className="mt-2 flex gap-2">
              {patient.symptoms.map((s: string) => (
                <span key={s} className="px-2 py-0.5 bg-white dark:bg-gray-800 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto">
          <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
            <CheckCircle size={12} /> Verified
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Doctor Selection */}
        <div className="col-span-2 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <User size={18} className="text-blue-500" /> Select Doctor
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {doctors.map((doc) => (
              <div
                key={doc._id}
                onClick={() => setSelectedDoctor(doc._id)}
                className={`p-4 rounded-xl border cursor-pointer ${selectedDoctor === doc._id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 ring-1 ring-blue-500'
                    : 'border-gray-100 dark:border-gray-800 hover:border-blue-200'
                  }`}
              >
                <p className="font-bold text-gray-900 dark:text-white">{doc.name}</p>
                <p className="text-xs text-gray-500">{doc.specialties?.[0] || 'General'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${(doc.availability && doc.availability.length > 0) ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase">{(doc.availability && doc.availability.length > 0) ? 'Available' : 'Unavailable'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slot Selection */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Clock size={18} className="text-blue-500" /> Available Slots
          </h3>
          <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 h-full">
            <div className="space-y-3">
              {['09:00 AM', '10:30 AM', '11:15 AM', '02:00 PM', '04:30 PM'].map((slot, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full py-3 rounded-xl border text-sm font-medium ${selectedSlot === slot
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'border-gray-100 dark:border-gray-800 hover:border-blue-500 hover:text-blue-600'
                    }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleBooking}
                disabled={!selectedSlot}
                className="w-full py-4 bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 active:scale-95"
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(PatientBookingPage);
