import React, { useState, useEffect, useCallback } from 'react';
import { Home, AlertCircle, CalendarCheck, CheckCircle2, RadioTower, Lock, Check } from 'lucide-react';
import { Booking } from './types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, query } from 'firebase/firestore';

const REGULAR_SLOTS = ["06:00 AM - 08:00 AM", "08:00 AM - 10:00 AM", "10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM", "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM", "06:00 PM - 08:00 PM"];
const MAY_27_SLOTS = ["09:00 AM - 11:00 AM", "11:00 AM - 01:00 PM", "01:00 PM - 03:00 PM", "03:00 PM - 05:00 PM", "05:00 PM - 07:00 PM", "07:00 PM - 08:00 PM"];
const DATES = ["2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30"];

export default function App() {
  
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Booking Form State
  const [house, setHouse] = useState('');
  const [subUnit, setSubUnit] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  
  // Dashboard State
  const [activeDashboardDate, setActiveDashboardDate] = useState(DATES[0]);

  const fetchBookingsData = useCallback(() => {
    setIsLoadingBookings(true);
    setErrorMsg(null);
    const q = query(collection(db, 'bookings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData: Booking[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        let dStr = data.date;
        if (dStr && dStr.includes('T')) {
          const d = new Date(dStr);
          dStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
        bookingsData.push({
          timestamp: data.timestamp,
          house: data.house,
          subUnit: data.subUnit,
          date: dStr,
          slot: data.slot,
        });
      });
      setAllBookings(bookingsData);
      setIsLoadingBookings(false);
    }, (error) => {
      setIsLoadingBookings(false);
      handleFirestoreError(error, OperationType.LIST, 'bookings');
      setErrorMsg('Failed to sync bookings. Check connection.');
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchBookingsData();
    return () => unsubscribe();
  }, [fetchBookingsData]);

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Validation
  let validationError = null;
  if (house && subUnit) {
    const existing = allBookings.find(b => b.house === house && b.subUnit === subUnit);
    if (existing) {
      validationError = `${house} (${subUnit}) already booked on ${existing.date} at ${existing.slot}. Only one slot allowed.`;
    }
  }

  const activeSlots = selectedDate === '2026-05-27' ? MAY_27_SLOTS : REGULAR_SLOTS;
  const takenSlotsForDate = allBookings.filter(b => b.date === selectedDate).map(b => b.slot);
  const remainingSlotsCount = activeSlots.filter(s => !takenSlotsForDate.includes(s)).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!house || !subUnit || !selectedDate || !selectedSlot) return;
    if (validationError) return;
    
    // Check if slot taken
    if (allBookings.find(b => b.date === selectedDate && b.slot === selectedSlot)) {
      alert("This slot was just taken. Please select another.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newBooking: Omit<Booking, 'createdAt'> & { createdAt: any } = {
        timestamp: new Date().toISOString(),
        house,
        subUnit,
        date: selectedDate,
        slot: selectedSlot,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookings'), newBooking);
      setSuccessBooking(newBooking as any);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, 'bookings');
      alert("Failed to submit booking. Check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ecfccb] to-[#f0fdf4] py-4 sm:py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* LEFT PANE */}
        <div className="lg:col-span-5 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-full relative">

          <div className="bg-gradient-to-br from-green-600 to-lime-500 px-5 sm:px-6 py-6 sm:py-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-lime-300 opacity-30 blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-inner">
                  <Home className="text-white w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Light House Estate</h1>
              </div>
              <div className="text-green-50 text-sm mt-3 leading-relaxed">
                <strong className="text-white text-base block mb-1">Salam Alaykum.</strong>
                <p className="mb-3">Strictly available from <strong>May 27 - May 30, 2026</strong>. Opens at <strong>9:00 AM on May 27th</strong>, and <strong>6:00 AM daily</strong>. Closes at 8:00 PM.</p>
                <ul className="list-disc ml-5 mb-4 text-green-50 text-sm space-y-1.5 opacity-90">
                  <li>Each Sub-Unit is entitled to exactly <strong>ONE 2-hour slot</strong>.</li>
                  <li>Select your House and Sub-Unit carefully.</li>
                  <li>Once a slot is booked, it cannot be changed or re-booked.</li>
                </ul>
                <p className="italic text-lime-100 border-t border-lime-400/30 pt-3 mt-2 text-xs sm:text-sm">
                  - Light House Estate, Environment Committee
                </p>
              </div>
            </div>
          </div>

          {!successBooking ? (
            <div className="p-5 sm:p-8 flex-grow">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">House Number <span className="text-red-500">*</span></label>
                    <select value={house} onChange={e => setHouse(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lime-500 focus:outline-none">
                      <option value="" disabled>Select House</option>
                      {Array.from({length: 100}, (_, i) => i + 1).map(n => (
                        <option key={n} value={`House ${n}`}>House {n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sub-Unit <span className="text-red-500">*</span></label>
                    <select value={subUnit} onChange={e => setSubUnit(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lime-500 focus:outline-none">
                      <option value="" disabled>Select Unit</option>
                      <option value="Main House">Main House</option>
                      <option value="First Floor">First Floor</option>
                      <option value="Ground Floor">Ground Floor</option>
                      <option value="BQ">BQ</option>
                    </select>
                  </div>
                </div>

                {validationError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 shrink-0" />
                    <span className="text-sm font-medium text-red-800" dangerouslySetInnerHTML={{ __html: validationError }} />
                  </div>
                )}
                
                {errorMsg && (
                  <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 flex items-start">
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 mr-3 shrink-0" />
                    <div className="text-sm font-medium text-orange-800 flex flex-col items-start">
                      <span>{errorMsg}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Select Date <span className="text-red-500">*</span></label>
                  <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(''); }} required min="2026-05-27" max="2026-05-30" disabled={!!validationError} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lime-500 focus:outline-none disabled:bg-gray-100 disabled:opacity-70" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Available 2-Hour Slot <span className="text-red-500">*</span></label>
                  <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} required disabled={!selectedDate || !!validationError || remainingSlotsCount === 0} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lime-500 focus:outline-none disabled:bg-gray-100 disabled:opacity-70">
                    {!selectedDate ? (
                      <option value="" disabled>Please select a date first</option>
                    ) : remainingSlotsCount === 0 ? (
                      <option value="" disabled>All slots full on this date</option>
                    ) : (
                      <>
                        <option value="" disabled>Select a 2-hour slot</option>
                        {activeSlots.map(slot => {
                          const isBooked = takenSlotsForDate.includes(slot);
                          return (
                            <option key={slot} value={slot} disabled={isBooked}>
                              {slot} {isBooked ? '(Booked)' : ''}
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                </div>

                <button type="submit" disabled={isSubmitting || !!validationError || !selectedDate || !selectedSlot || remainingSlotsCount === 0} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl shadow-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all font-medium">
                  <CalendarCheck className="w-5 h-5" />
                  {isSubmitting ? 'Securing...' : 'Secure My Slot'}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Booking Confirmed!</h2>
              <p className="text-gray-600 mb-8 max-w-sm">
                <strong>{successBooking.house} ({successBooking.subUnit})</strong> reserved on {formatFullDate(successBooking.date)} between {successBooking.slot}.
              </p>
              <button onClick={() => setSuccessBooking(null)} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors">
                Make Another Booking
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANE: LIVE DASHBOARD */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-full max-h-[85vh]">
          <div className="p-5 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <RadioTower className={`w-5 h-5 text-lime-500 ${isLoadingBookings ? 'animate-pulse' : ''}`} /> 
                Live Availability
              </h2>
              <p className="text-sm text-gray-500">Real-time slot status</p>
            </div>
            <div className="flex gap-4 text-sm font-medium">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Open</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Booked</span>
            </div>
          </div>
          
          <div className="bg-gray-50/50 border-b py-4 px-5 flex justify-between items-center sticky top-[89px] z-10">
            <h3 className="text-sm font-semibold uppercase text-gray-600 tracking-wider">Select Day to View</h3>
            <span className="text-sm font-bold text-green-700 bg-lime-100 px-3 py-1 rounded-full">{formatFullDate(activeDashboardDate)}</span>
          </div>
          
          <div className="flex overflow-x-auto hide-scrollbar px-5 py-3 gap-3 border-b border-gray-100 bg-white sticky top-[146px] z-10">
            {DATES.map(dateStr => {
              const isActive = dateStr === activeDashboardDate;
              return (
                <button 
                  key={dateStr}
                  onClick={() => setActiveDashboardDate(dateStr)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold border whitespace-nowrap transition-all ${
                    isActive ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-lime-400'
                  }`}
                >
                  <span className="block text-xs font-normal opacity-80">May</span> 
                  {dateStr.split('-')[2]}
                </button>
              );
            })}
          </div>
          
          <div className="p-5 overflow-y-auto flex-1">
            {isLoadingBookings && allBookings.length === 0 ? (
              <div className="flex items-center justify-center p-12 text-gray-400">
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-lime-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing with Firestore...
              </div>
            ) : (
              <div className="space-y-4 pb-10">
                {(activeDashboardDate === '2026-05-27' ? MAY_27_SLOTS : REGULAR_SLOTS).map(slot => {
                  const booked = allBookings.find(b => b.date === activeDashboardDate && b.slot === slot);
                  const isBooked = !!booked;
                  
                  return (
                    <div key={slot} className={`transition-all duration-300 p-5 rounded-2xl border ${isBooked ? 'bg-red-50/50 border-red-100' : 'bg-white border-gray-200 hover:border-lime-300 hover:shadow-sm'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isBooked ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'}`}>
                          {isBooked ? <Lock className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{slot}</h4>
                          <div className="mt-1 flex items-center flex-wrap gap-2">
                            {isBooked ? (
                              <>
                                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">Booked</span>
                                <span className="text-sm font-medium text-gray-700">{booked.house} • {booked.subUnit}</span>
                              </>
                            ) : (
                              <>
                                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Available</span>
                                <span className="text-sm text-gray-500">Ready to book</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
