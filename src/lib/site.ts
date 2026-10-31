/** Site-wide constants. The tab title is the same on every page (owner decision, PRD section 5, Brand). */
export const SITE_TITLE = 'nusatrails.id';
export const SITE_NAME = 'NusaTrails';
export const DEFAULT_DESCRIPTION =
  'Private tours in East Java and Yogyakarta: Ijen blue fire, Bromo, Tumpak Sewu, Sukamade, Borobudur and more. Own car, driver and English-speaking guide.';

export const NAV_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Trips', href: '/trips' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Book', href: '/book' },
] as const;

const env = import.meta.env;

export const SITE_URL: string = env.PUBLIC_SITE_URL || 'https://nusatrails.id';
export const WHATSAPP_NUMBER: string = String(env.PUBLIC_WHATSAPP_NUMBER ?? '');
/** True only when the owner has supplied a real number (digits only, with country code). */
export const HAS_WHATSAPP = /^\d{8,15}$/.test(WHATSAPP_NUMBER);

export function whatsappLink(message = "Hello NusaTrails, I'd like to ask about a private trip."): string {
  return HAS_WHATSAPP
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}
