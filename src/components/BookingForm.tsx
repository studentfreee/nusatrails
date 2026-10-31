import React, { useState, useEffect, useMemo } from 'react';

export interface TripPricingRow {
  group_size: number;
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

    const row = selectedTrip.pricing.rows.find((r) => r.group_size === participants);
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
        participants: typeof participants === 'number' ? participants : 5,
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

      if (res.ok && data.ok) {
        setSuccessRef(data.reference || 'NT-REQ-01');
      } else {
        setErrorMsg(data.error || 'Failed to submit booking request. Please chat directly on WhatsApp.');
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
                  <label htmlFor="trip-select" className="block text-[13px] text-[var(--nt-body)] mb-1.5">
                    Trip route
                  </label>
                  <select
                    id="trip-select"
                    value={selectedSlug}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-[6px] border border-white/30 bg-[#161414] text-white text-sm focus:border-[var(--nt-lime)] focus:outline-none"
                  >
                    {trips.map((t) => (
                      <option key={t.slug} value={t.slug} className="bg-[#141212] text-white">
                        {t.name} — {t.duration.label}, {t.route_label}
                      </option>
                    ))}
                    <option value="custom" className="bg-[#141212] text-white">
                      Custom route (tell us your plan)
                    </option>
                  </select>
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

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full h-12 rounded-[6px] bg-[var(--nt-lime)] text-[#14170a] font-semibold text-sm hover:brightness-110 transition flex items-center justify-center cursor-pointer disabled:opacity-60"
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

            <div className="pb-4 border-b border-white/10">
              <h4 className="font-heading text-2xl font-medium text-white">
                {selectedTrip ? selectedTrip.name : 'Custom Itinerary'}
              </h4>
              <p className="text-sm text-[var(--nt-muted)] mt-1">
                {selectedTrip ? `${selectedTrip.duration.label} · ${selectedTrip.route_label}` : 'Tailor-made private tour'}
              </p>
            </div>

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
    </>
  );
}
