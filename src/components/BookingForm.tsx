import React, { useState, useEffect, useMemo } from 'react';

export interface TripPricingRow {
  pax?: number;
  group_size?: number;
  price?: number;
  hotel?: number;
  homestay?: number;
  banyuwangi_hotel?: number;
  banyuwangi_homestay?: number;
}

export interface TripData {
  id: string;
  slug: string;
  name: string;
  duration: { days: number; nights: number; label: string };
  start: string;
  end: string;
  route_label: string;
  destinations: string[];
  group_size: { min: number; max: number };
  pricing: {
    columns: string[];
    rows: TripPricingRow[];
    from_price_4_pax: number;
  };
  photos: { hero: string };
  heroImageUrl?: string;
  included?: string[];
}

interface Props {
  trips: TripData[];
  initialTripSlug?: string;
  whatsappNumber?: string;
}

export default function BookingForm({ trips, initialTripSlug = '', whatsappNumber = '' }: Props) {
  // 1. URL prefill
  const [selectedSlug, setSelectedSlug] = useState<string>(initialTripSlug || trips[0]?.slug || '');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tripParam = params.get('trip');
    if (tripParam) {
      if (tripParam === 'custom' || trips.some((t) => t.slug === tripParam)) {
        setSelectedSlug(tripParam);
      }
    }
  }, [trips]);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.slug === selectedSlug),
    [trips, selectedSlug]
  );

  // Form State
  const [startDate, setStartDate] = useState('');
  const [participants, setParticipants] = useState<number | string>(4);
  const [accommodation, setAccommodation] = useState<'Homestay' | 'Hotel'>('Homestay');
  const [pickupArea, setPickupArea] = useState('Ubud');
  const [hotelName, setHotelName] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Route Picker Modal / Bottom Sheet State
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');
  const [routeCategory, setRouteCategory] = useState<'all' | 'volcano' | 'wildlife' | 'yogyakarta' | 'custom'>('all');

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isRouteModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isRouteModalOpen]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsRouteModalOpen(false);
    };
    if (isRouteModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRouteModalOpen]);

  // Filtered trips for route picker
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // Category filter
      if (routeCategory === 'volcano') {
        const isVolcano = t.name.includes('Bromo') || t.name.includes('Ijen') || t.name.includes('Tumpak Sewu');
        const isWildlife = t.name.includes('Sukamade');
        if (!isVolcano || isWildlife) return false;
      } else if (routeCategory === 'wildlife') {
        if (!t.name.includes('Sukamade')) return false;
      } else if (routeCategory === 'yogyakarta') {
        if (!t.name.includes('Borobudur') && !t.name.includes('Jomblang')) return false;
      } else if (routeCategory === 'custom') {
        return false;
      }

      // Search query
      if (routeSearch.trim()) {
        const q = routeSearch.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchDest = t.destinations.some((d) => d.toLowerCase().includes(q));
        const matchStart = t.start.toLowerCase().includes(q);
        const matchEnd = t.end.toLowerCase().includes(q);
        const matchDur = t.duration.label.toLowerCase().includes(q);
        if (!matchName && !matchDest && !matchStart && !matchEnd && !matchDur) return false;
      }
      return true;
    });
  }, [trips, routeCategory, routeSearch]);

  // Available participant options based on selected trip
  const participantOptions = useMemo(() => {
    if (!selectedTrip) return [2, 3, 4, 'More than 4'];
    const { min, max } = selectedTrip.group_size;
    const opts: (number | string)[] = [];
    for (let i = Math.max(1, min); i <= Math.min(6, max); i++) {
      opts.push(i);
    }
    opts.push('More than 4');
    return Array.from(new Set(opts));
  }, [selectedTrip]);

  // Does this trip have stay choice (hotel vs homestay)?
  const hasStayChoice = useMemo(() => {
    if (!selectedTrip) return false;
    return selectedTrip.pricing.columns.some((c) => c.includes('hotel') || c.includes('homestay'));
  }, [selectedTrip]);

  // Live Pricing Calculation
  const { ratePerPerson, estimatedTotal, isSpecialPrice } = useMemo(() => {
    if (selectedSlug === 'custom' || participants === 'More than 4' || typeof participants !== 'number') {
      return { ratePerPerson: null, estimatedTotal: null, isSpecialPrice: true };
    }
    if (!selectedTrip) return { ratePerPerson: null, estimatedTotal: null, isSpecialPrice: false };

    const row = selectedTrip.pricing.rows.find((r) => (r.pax ?? r.group_size) === participants);
    if (!row) {
      return { ratePerPerson: null, estimatedTotal: null, isSpecialPrice: true };
    }

    let rate = 0;
    if (selectedTrip.pricing.columns.includes('price')) {
      rate = row.price || 0;
    } else if (accommodation === 'Hotel') {
      rate = row.hotel || row.banyuwangi_hotel || row.price || 0;
    } else {
      rate = row.homestay || row.banyuwangi_homestay || row.price || 0;
    }

    const total = rate * participants;
    return { ratePerPerson: rate, estimatedTotal: total, isSpecialPrice: false };
  }, [selectedTrip, selectedSlug, participants, accommodation]);

  const formatIDR = (val: number) => `IDR ${val.toLocaleString('id-ID')}`;

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!consent) {
      setErrorMsg('Please agree to the privacy policy to submit.');
      return;
    }

    // Basic international WhatsApp check (+ and at least 8 digits)
    const cleanPhone = whatsapp.replace(/[\s\-()]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid WhatsApp number with country code (e.g. +62 812 3456 7890).');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        type: 'booking',
        trip_slug: selectedSlug,
        trip_name: selectedTrip ? selectedTrip.name : 'Custom Route',
        start_date: startDate,
        participants: participants,
        accommodation: hasStayChoice ? accommodation : 'Included in trip',
        pickup_area: pickupArea,
        hotel_name: hotelName,
        full_name: fullName,
        whatsapp: cleanPhone,
        email: email || undefined,
        notes: notes || undefined,
        consent: true,
        source_page: window.location.pathname,
      };

      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok && data.reference) {
        setSuccessRef(data.reference);
      } else {
        setErrorMsg(data.error || 'Failed to generate booking reference. Please chat directly with our team on WhatsApp.');
      }
    } catch (err) {
      setErrorMsg('Network error. Please chat with our team on WhatsApp directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyRef = () => {
    if (successRef) {
      navigator.clipboard.writeText(successRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const waChatUrl = useMemo(() => {
    const ref = successRef || '';
    const tripName = selectedTrip ? selectedTrip.name : 'Custom Trip';
    const text = `Hi NusaTrails! I just sent a booking request for ${tripName} (Ref: ${ref}).`;
    return whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`
      : `/contact`;
  }, [successRef, selectedTrip, whatsappNumber]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Your trip */}
            <div className="glass p-6 md:p-8 rounded-[14px]">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-[var(--nt-lime)] text-[#14170a] font-semibold text-sm flex items-center justify-center">
                  1
                </span>
                <h2 className="font-heading text-2xl font-medium text-white">Your trip</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[13px] font-medium text-[var(--nt-body)]">
                      Trip route
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsRouteModalOpen(true)}
                      className="text-xs text-[var(--nt-lime)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <span>Browse all routes</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Active Trip Trigger Card */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsRouteModalOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsRouteModalOpen(true);
                      }
                    }}
                    className="group relative flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl border border-white/20 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[var(--nt-lime)]/70 transition-all cursor-pointer shadow-lg"
                  >
                    {selectedTrip ? (
                      <>
                        {selectedTrip.heroImageUrl ? (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 border border-white/15 bg-black/40 relative">
                            <img
                              src={selectedTrip.heroImageUrl}
                              alt={selectedTrip.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/75 text-[var(--nt-lime)] backdrop-blur-xs">
                              {selectedTrip.duration.label}
                            </span>
                          </div>
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-[var(--nt-lime)]/15 border border-[var(--nt-lime)]/30 flex items-center justify-center shrink-0 text-[var(--nt-lime)]">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-heading text-base sm:text-lg font-medium text-white group-hover:text-[var(--nt-lime)] transition-colors truncate">
                              {selectedTrip.name}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-[#d9d3c8] border border-white/15">
                              {selectedTrip.route_label}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--nt-muted)] mt-1 truncate">
                            {selectedTrip.destinations.slice(0, 3).join(' · ')}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs font-semibold text-[var(--nt-lime)]">
                              From IDR {selectedTrip.pricing.from_price_4_pax.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[11px] text-[var(--nt-muted)]">/ pax</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-[var(--nt-lime)]/15 border border-[var(--nt-lime)]/30 flex items-center justify-center shrink-0 text-[var(--nt-lime)]">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-base sm:text-lg font-medium text-white group-hover:text-[var(--nt-lime)] transition-colors">
                            Custom Route
                          </h3>
                          <p className="text-xs text-[var(--nt-muted)] mt-1">
                            Tailor-made private tour across East Java & Yogyakarta
                          </p>
                          <span className="inline-block mt-1 text-xs font-semibold text-[var(--nt-lime)]">
                            Personalized quote on WhatsApp
                          </span>
                        </div>
                      </>
                    )}

                    {/* Change Button Pill */}
                    <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 group-hover:bg-[var(--nt-lime)] group-hover:text-[#14170a] text-white text-xs font-medium transition-all">
                      <span className="hidden sm:inline">Change</span>
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Hidden accessibility input */}
                  <input type="hidden" name="trip" value={selectedSlug} />
                </div>

                <div>
                  <label htmlFor="start-date" className="block text-[13px] text-[var(--nt-body)] mb-1.5">
                    Start date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-[6px] border border-white/30 bg-[#161414] text-white text-sm focus:border-[var(--nt-lime)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-[var(--nt-body)] mb-2">Participants</label>
                  <div className="flex flex-wrap gap-2.5">
                    {participantOptions.map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setParticipants(opt)}
                        className={`h-10 px-4 rounded-full text-sm font-medium border transition ${
                          participants === opt
                            ? 'bg-[var(--nt-lime)] text-[#14170a] border-[var(--nt-lime)] font-semibold'
                            : 'border-white/30 text-white hover:border-[var(--nt-lime)]'
                        }`}
                      >
                        {typeof opt === 'number' ? `${opt} people` : opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Stay and pick-up */}
            <div className="glass p-6 md:p-8 rounded-[14px]">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-[var(--nt-lime)] text-[#14170a] font-semibold text-sm flex items-center justify-center">
                  2
                </span>
                <h2 className="font-heading text-2xl font-medium text-white">Stay and pick-up</h2>
              </div>

              <div className="space-y-5">
                {hasStayChoice && (
                  <div>
                    <label className="block text-[13px] text-[var(--nt-body)] mb-2">Accommodation</label>
                    <div className="flex gap-3">
                      {(['Homestay', 'Hotel'] as const).map((type) => (
                        <button
                          type="button"
                          key={type}
                          onClick={() => setAccommodation(type)}
                          className={`flex-1 h-11 rounded-[6px] text-sm font-medium border transition ${
                            accommodation === type
                              ? 'bg-[var(--nt-lime)] text-[#14170a] border-[var(--nt-lime)] font-semibold'
                              : 'border-white/30 text-white hover:border-[var(--nt-lime)]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="pickup-area" className="block text-[13px] text-[var(--nt-body)] mb-1.5">
                    Pick-up area
                  </label>
                  {selectedTrip?.start === 'Bali' ? (
                    <select
                      id="pickup-area"
                      value={pickupArea}
                      onChange={(e) => setPickupArea(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-[6px] border border-white/30 bg-[#161414] text-white text-sm focus:border-[var(--nt-lime)] focus:outline-none"
                    >
                      <option value="Ubud">Ubud</option>
                      <option value="Sanur">Sanur</option>
                      <option value="Kuta / Legian">Kuta / Legian</option>
                      <option value="Denpasar">Denpasar</option>
                      <option value="Lovina">Lovina</option>
                      <option value="Pemuteran">Pemuteran</option>
                      <option value="Other area in Bali">Other area in Bali</option>
                    </select>
                  ) : (
                    <input
                      id="pickup-area"
                      type="text"
                      value={pickupArea}
                      onChange={(e) => setPickupArea(e.target.value)}
                      placeholder={`e.g. Hotel in ${selectedTrip?.start || 'Surabaya'}, or airport`}
                      className="w-full h-11 px-3.5 rounded-[6px] border border-white/30 bg-[#161414] text-white text-sm focus:border-[var(--nt-lime)] focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="hotel-name" className="block text-[13px] text-[var(--nt-body)] mb-1.5">
                    Hotel or address for pick-up
                  </label>
                  <input
                    id="hotel-name"
                    type="text"
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    placeholder="e.g. Alila Ubud (or leave blank if undecided)"
                    className="w-full h-11 px-3.5 rounded-[6px] border border-white/30 bg-[#161414] text-white text-sm focus:border-[var(--nt-lime)] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Your details */}
            <div className="glass p-6 md:p-8 rounded-[14px]">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-[var(--nt-lime)] text-[#14170a] font-semibold text-sm flex items-center justify-center">
                  3
                </span>
                <h2 className="font-heading text-2xl font-medium text-white">Your details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="full-name" className="block text-[13px] text-[var(--nt-body)] mb-1.5">
                    Full name *
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full h-11 px-3.5 rounded-[6px] border border-white/30 bg-[#161414] text-white text-sm focus:border-[var(--nt-lime)] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="whatsapp" className="block text-[13px] text-[var(--nt-body)] mb-1.5">
                    WhatsApp number (with country code) *
                  </label>
                  <input
                    id="whatsapp"
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="e.g. +62 812 3456 7890"
                    className="w-full h-11 px-3.5 rounded-[6px] border border-white/30 bg-[#161414] text-white text-sm focus:border-[var(--nt-lime)] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-[13px] text-[var(--nt-body)] mb-1.5">
                    Email (optional)
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full h-11 px-3.5 rounded-[6px] border border-white/30 bg-[#161414] text-white text-sm focus:border-[var(--nt-lime)] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Anything else? */}
            <div className="glass p-6 md:p-8 rounded-[14px]">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-[var(--nt-lime)] text-[#14170a] font-semibold text-sm flex items-center justify-center">
                  4
                </span>
                <h2 className="font-heading text-2xl font-medium text-white">Anything else?</h2>
              </div>

              <div>
                <label htmlFor="notes" className="block text-[13px] text-[var(--nt-body)] mb-1.5">
                  Notes or special requests
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Dietary requirements, children travelling, flight details, or route adjustments..."
                  className="w-full p-3.5 rounded-[6px] border border-white/30 bg-[#161414] text-white text-sm focus:border-[var(--nt-lime)] focus:outline-none resize-none"
                />
              </div>

              {/* Consent Checkbox */}
              <div className="mt-4 flex items-start gap-2.5">
                <input
                  id="consent"
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/40 text-[var(--nt-lime)] focus:ring-0 bg-transparent"
                />
                <label htmlFor="consent" className="text-[13px] leading-relaxed text-[var(--nt-body)]">
                  I agree to the{' '}
                  <a href="/privacy" target="_blank" className="text-[var(--nt-lime)] underline">
                    privacy policy
                  </a>{' '}
                  and consent to NusaTrails contacting me on WhatsApp to confirm this request.
                </label>
              </div>

              {errorMsg && (
                <div className="mt-4 p-3 rounded-[6px] bg-red-900/30 border border-red-500/40 text-sm text-red-300">
                  {errorMsg}
                </div>
              )}

              {/* Live Price Estimation Banner */}
              <div className="mt-6 p-4 rounded-[8px] bg-white/[0.04] border border-white/15 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-[var(--nt-muted)] block">
                    Estimated Total
                  </span>
                  <span className="text-sm text-white font-medium">
                    {typeof participants === 'number' ? `${participants} people` : participants}
                    {hasStayChoice ? ` · ${accommodation}` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-semibold text-[var(--nt-lime)] block">
                    {isSpecialPrice || !estimatedTotal ? 'Quote on request' : formatIDR(estimatedTotal)}
                  </span>
                  {ratePerPerson && !isSpecialPrice && (
                    <span className="text-xs text-[var(--nt-muted)] block">{formatIDR(ratePerPerson)} / person</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 w-full h-12 rounded-[6px] bg-[var(--nt-lime)] text-[#14170a] font-semibold text-sm hover:brightness-110 transition flex items-center justify-center cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Sending your request...' : 'Send booking request'}
              </button>

              <p className="mt-3 text-center text-[12px] text-[var(--nt-muted)]">
                No payment now. You get a reference number right away, then our team contacts you on WhatsApp.
              </p>
            </div>
          </form>
        </div>

        {/* Right: Live Summary Card & Next Steps */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
          {/* Summary Box */}
          <div className="glass p-6 rounded-[14px] border-white/20">
            <h3 className="font-heading text-xl uppercase tracking-wider text-white mb-4">
              Trip summary
            </h3>

            {selectedTrip?.heroImageUrl && (
              <div className="w-full h-40 rounded-[8px] overflow-hidden mb-4 bg-black/40 border border-white/10">
                <img
                  src={selectedTrip.heroImageUrl}
                  alt={selectedTrip.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="pb-4 border-b border-white/10">
              <h4 className="font-heading text-2xl font-medium text-white">
                {selectedTrip ? selectedTrip.name : 'Custom Itinerary'}
              </h4>
              <p className="text-sm text-[var(--nt-muted)] mt-1">
                {selectedTrip ? `${selectedTrip.duration.label} · ${selectedTrip.route_label}` : 'Tailor-made private tour'}
              </p>
            </div>

            {selectedTrip?.included && selectedTrip.included.length > 0 && (
              <div className="py-3 border-b border-white/10">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--nt-muted)] block mb-2">
                  Included in trip
                </span>
                <ul className="space-y-1.5 text-xs text-[var(--nt-body)]">
                  {selectedTrip.included.slice(0, 4).map((inc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--nt-lime)] shrink-0 mt-1.5" />
                      <span className="line-clamp-1">{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="py-4 space-y-3 text-sm border-b border-white/10">
              <div className="flex justify-between">
                <span className="text-[var(--nt-muted)]">Start date</span>
                <span className="text-white font-medium">{startDate || 'Select date'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--nt-muted)]">Participants</span>
                <span className="text-white font-medium">
                  {typeof participants === 'number' ? `${participants} people` : participants}
                </span>
              </div>
              {hasStayChoice && (
                <div className="flex justify-between">
                  <span className="text-[var(--nt-muted)]">Accommodation</span>
                  <span className="text-white font-medium">{accommodation}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--nt-muted)]">Rate per person</span>
                <span className="text-white font-medium">
                  {isSpecialPrice || !ratePerPerson ? 'Special price on request' : formatIDR(ratePerPerson)}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-heading text-lg text-white">Estimated total</span>
                <span className="text-xl md:text-2xl font-semibold text-[var(--nt-lime)]">
                  {isSpecialPrice || !estimatedTotal ? 'Quote on request' : formatIDR(estimatedTotal)}
                </span>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[var(--nt-muted)]">
                Estimate from 2026 rates. Peak season (Eid, New Year) adds 20%. Final quote after we confirm your dates.
              </p>
            </div>
          </div>

          {/* What happens next */}
          <div className="glass p-6 rounded-[14px]">
            <h4 className="font-heading text-lg uppercase tracking-wider text-white mb-4">
              What happens next
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--nt-lime)] text-[#14170a] text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-[13px] leading-relaxed text-[var(--nt-body)]">
                  Send your request and get a reference number.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--nt-lime)] text-[#14170a] text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-[13px] leading-relaxed text-[var(--nt-body)]">
                  Our team contacts you on WhatsApp within 24 hours.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--nt-lime)] text-[#14170a] text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-[13px] leading-relaxed text-[var(--nt-body)]">
                  We confirm availability and send your final quote. No payment until you confirm.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal Pop-up (Artboard 04-book-success-popup) */}
      {successRef && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <div className="glass max-w-[500px] w-full p-6 md:p-8 rounded-[16px] bg-[#141212] border-white/25 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Checkmark icon */}
            <div className="w-14 h-14 mx-auto rounded-full bg-[var(--nt-lime)]/20 text-[var(--nt-lime)] flex items-center justify-center mb-4">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h3 className="font-heading text-2xl md:text-3xl text-center text-white mb-2">
              Thank you! We’ve got your request.
            </h3>
            <p className="text-sm text-center text-[var(--nt-body)] mb-6">
              Our team will contact you on WhatsApp within 24 hours to confirm availability and your final quote.
            </p>

            {/* Reference Box */}
            <div className="glass p-4 rounded-[10px] bg-white/[0.04] text-center mb-6">
              <div className="text-[11px] uppercase tracking-wider text-[var(--nt-muted)] mb-1">
                Your reference number
              </div>
              <div className="font-mono text-2xl font-bold tracking-wider text-[var(--nt-lime)] mb-2">
                {successRef}
              </div>
              <button
                type="button"
                onClick={copyRef}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--nt-body)] hover:text-white transition"
              >
                {copied ? '✓ Copied to clipboard' : 'Copy number'}
              </button>
            </div>

            {/* Request Summary Details */}
            <div className="space-y-2 text-xs md:text-sm text-[var(--nt-muted)] mb-6 pb-4 border-b border-white/10">
              <div className="flex justify-between">
                <span>Trip:</span>
                <span className="text-white font-medium">{selectedTrip?.name || 'Custom Trip'}</span>
              </div>
              <div className="flex justify-between">
                <span>Start date:</span>
                <span className="text-white font-medium">{startDate || 'To be confirmed'}</span>
              </div>
              <div className="flex justify-between">
                <span>Participants:</span>
                <span className="text-white font-medium">{participants} people</span>
              </div>
              {hasStayChoice && (
                <div className="flex justify-between">
                  <span>Stay:</span>
                  <span className="text-white font-medium">{accommodation}</span>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <a
                href={waChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-[6px] bg-[var(--nt-lime)] text-[#14170a] font-semibold text-sm hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                Chat with us on WhatsApp
              </a>

              <a
                href="/trips"
                className="w-full h-10 rounded-[6px] border border-white/30 text-white text-sm hover:border-[var(--nt-lime)] transition flex items-center justify-center"
              >
                Back to trips
              </a>
            </div>

            <p className="mt-4 text-center text-[11px] text-[var(--nt-muted)]">
              Keep your reference number. No payment is needed at this step.
            </p>
          </div>
        </div>
      )}

      {/* Route Picker Modal / Bottom Sheet */}
      {isRouteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose Trip Route"
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        >
          {/* Backdrop click to close */}
          <div
            className="absolute inset-0"
            onClick={() => setIsRouteModalOpen(false)}
          />

          {/* Modal Container: Bottom sheet on mobile, centered modal on desktop */}
          <div className="relative z-10 w-full md:max-w-3xl max-h-[90vh] md:max-h-[85vh] bg-[#141212] border-t md:border border-white/20 rounded-t-3xl md:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
            {/* Mobile Drag Indicator */}
            <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1.5 bg-white/25 rounded-full" />
            </div>

            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-heading text-xl md:text-2xl font-semibold text-white tracking-wide">
                  Pilih Rute Perjalanan
                </h3>
                <p className="text-xs md:text-sm text-[var(--nt-muted)] mt-0.5">
                  15 private curated routes across Java + custom itinerary
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRouteModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
                aria-label="Close route picker"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Input & Category Filter Tabs */}
            <div className="p-3.5 md:px-6 md:py-3.5 border-b border-white/10 bg-[#100e0e] shrink-0 space-y-2.5">
              {/* Search Bar */}
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  placeholder="Cari rute, gunung, kota, atau durasi (Bromo, Ijen, Bali, 3D2N)..."
                  className="w-full h-10 pl-10 pr-16 rounded-lg bg-white/[0.06] border border-white/15 text-white text-xs md:text-sm placeholder-white/40 focus:border-[var(--nt-lime)] focus:outline-none"
                />
                {routeSearch && (
                  <button
                    type="button"
                    onClick={() => setRouteSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white cursor-pointer px-1 py-0.5"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                {[
                  { id: 'all', label: `Semua Rute (${trips.length})` },
                  { id: 'volcano', label: 'Gunung & Air Terjun' },
                  { id: 'wildlife', label: 'Sukamade Wildlife' },
                  { id: 'yogyakarta', label: 'Yogyakarta & Gua' },
                  { id: 'custom', label: 'Custom Rute' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRouteCategory(tab.id as any)}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer font-medium ${
                      routeCategory === tab.id
                        ? 'bg-[var(--nt-lime)] text-[#14170a] font-semibold shadow-sm'
                        : 'bg-white/[0.06] text-white/75 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Routes List */}
            <div className="flex-1 overflow-y-auto p-3.5 md:p-6 space-y-3 scrollbar-thin">
              {/* Special Custom Route Card */}
              {(routeCategory === 'all' || routeCategory === 'custom') && !routeSearch && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedSlug('custom');
                    setIsRouteModalOpen(false);
                  }}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 group ${
                    selectedSlug === 'custom'
                      ? 'border-[var(--nt-lime)] bg-[var(--nt-lime)]/[0.1] shadow-[0_0_20px_rgba(185,212,74,0.18)]'
                      : 'border-white/20 bg-white/[0.03] hover:border-[var(--nt-lime)]/60 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-[var(--nt-lime)]/15 border border-[var(--nt-lime)]/30 flex items-center justify-center shrink-0 text-[var(--nt-lime)]">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-heading text-base sm:text-lg font-semibold text-white group-hover:text-[var(--nt-lime)] transition-colors">
                        Custom Route · Buat Rute Sendiri
                      </span>
                      {selectedSlug === 'custom' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--nt-lime)] text-[#14170a] shrink-0">
                          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Selected</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--nt-muted)] mt-1">
                      Beri tahu destinasi yang ingin Anda kunjungi di Jawa. Tim lokal kami akan merancang mobil privat, pemandu, dan jadwal fleksibel.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-semibold text-[var(--nt-lime)]">
                        Estimasi harga via WhatsApp
                      </span>
                      <span className="text-[11px] text-[var(--nt-muted)]">· Tanpa uang muka diawal</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Trip Cards */}
              {filteredTrips.map((trip) => {
                const isSelected = selectedSlug === trip.slug;
                return (
                  <div
                    key={trip.slug}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedSlug(trip.slug);
                      setIsRouteModalOpen(false);
                    }}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 group ${
                      isSelected
                        ? 'border-[var(--nt-lime)] bg-[var(--nt-lime)]/[0.1] shadow-[0_0_20px_rgba(185,212,74,0.18)]'
                        : 'border-white/15 bg-white/[0.03] hover:border-[var(--nt-lime)]/60 hover:bg-white/[0.06]'
                    }`}
                  >
                    {/* Thumbnail with duration badge */}
                    <div className="w-20 h-20 sm:w-28 sm:h-22 rounded-lg overflow-hidden shrink-0 border border-white/15 bg-black/40 relative">
                      {trip.heroImageUrl ? (
                        <img
                          src={trip.heroImageUrl}
                          alt={trip.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/40 text-xs">
                          NusaTrails
                        </div>
                      )}
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/80 text-[var(--nt-lime)] backdrop-blur-xs border border-white/15">
                        {trip.duration.label}
                      </span>
                    </div>

                    {/* Trip Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-heading text-sm sm:text-base font-semibold text-white group-hover:text-[var(--nt-lime)] transition-colors truncate">
                          {trip.name}
                        </h4>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--nt-lime)] text-[#14170a] shrink-0">
                            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>Selected</span>
                          </span>
                        ) : (
                          <span className="text-xs text-white/40 group-hover:text-[var(--nt-lime)] font-medium shrink-0 hidden sm:inline">
                            Pilih →
                          </span>
                        )}
                      </div>

                      {/* Route label & start point */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white/10 text-white/90 font-medium">
                          <svg className="w-3 h-3 text-[var(--nt-lime)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{trip.route_label}</span>
                        </span>
                        <span className="text-[11px] text-[var(--nt-muted)] truncate hidden sm:inline">
                          {trip.destinations.slice(0, 3).join(' · ')}
                        </span>
                      </div>

                      {/* Pricing row */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs sm:text-sm font-semibold text-[var(--nt-lime)]">
                            From IDR {trip.pricing.from_price_4_pax.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-[var(--nt-muted)]">
                            / orang
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--nt-muted)]">
                          {trip.group_size.min}–{trip.group_size.max} orang privat
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty state when no search matches */}
              {filteredTrips.length === 0 && routeCategory !== 'custom' && (
                <div className="py-12 text-center">
                  <p className="text-sm text-white/70">Tidak ada rute yang cocok dengan "{routeSearch}".</p>
                  <button
                    type="button"
                    onClick={() => {
                      setRouteSearch('');
                      setRouteCategory('all');
                    }}
                    className="mt-2 text-xs text-[var(--nt-lime)] hover:underline cursor-pointer"
                  >
                    Reset pencarian
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 md:p-4 border-t border-white/10 bg-[#100e0e] flex items-center justify-between shrink-0">
              <div className="truncate max-w-[200px] sm:max-w-md">
                <span className="text-[11px] text-[var(--nt-muted)] block">Rute terpilih:</span>
                <span className="text-xs sm:text-sm text-white font-medium truncate block">
                  {selectedTrip ? selectedTrip.name : 'Custom Route'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsRouteModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-[var(--nt-lime)] text-[#14170a] font-semibold text-xs md:text-sm hover:brightness-105 transition cursor-pointer shadow-md"
              >
                Gunakan Rute Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
