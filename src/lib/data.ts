import fs from 'node:fs';
import path from 'node:path';
import tripsRaw from '../data/trips.json';
import assetsRaw from '../data/assets_manifest.json';
import faqRaw from '../data/faq.json';
import {
  TripSchema,
  AssetSchema,
  FaqDataSchema,
  type Trip,
  type Asset,
  type FaqCategory,
} from './schema';

// 1. Validate & Parse Data
export const trips: Trip[] = tripsRaw.trips.map((raw, idx) => {
  const result = TripSchema.safeParse(raw);
  if (!result.success) {
    console.error(`Validation error in trip #${idx} (${(raw as any).slug}):`, result.error.format());
    throw new Error(`Invalid trip data for ${(raw as any).slug}`);
  }
  return result.data;
});

export const assets: Asset[] = assetsRaw.assets.map((raw, idx) => {
  const result = AssetSchema.safeParse(raw);
  if (!result.success) {
    console.error(`Validation error in asset #${idx} (${(raw as any).key}):`, result.error.format());
    throw new Error(`Invalid asset data for ${(raw as any).key}`);
  }
  return result.data;
});

export const assetMap = new Map<string, Asset>(assets.map((a) => [a.key, a]));

export const faqData = FaqDataSchema.parse(faqRaw);
export const faqCategories: FaqCategory[] = faqData.categories;
export const termsAndConditions: string[] = faqData.terms;

// 2. Perform Consistency Audit (Runs at build time)
export function auditData() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Verify assets existence on disk
  for (const asset of assets) {
    const fullPath = path.resolve(process.cwd(), asset.file);
    if (!fs.existsSync(fullPath)) {
      errors.push(`[Asset Missing] File not found on disk: ${asset.file} (key: ${asset.key})`);
    }
    if (asset.file.includes('DO_NOT_USE') && asset.used_on_site) {
      errors.push(`[Prohibited Asset] DO_NOT_USE asset marked as used_on_site: ${asset.file}`);
    }
    if (asset.status === 'TEMPORARY' && asset.used_on_site) {
      warnings.push(`[TEMPORARY Photo in use] ${asset.key} (${asset.file}) must be replaced before launch!`);
    }
  }

  // Cross check trips with assets & pricing
  for (const trip of trips) {
    if (!assetMap.has(trip.photos.hero)) {
      errors.push(`[Trip Missing Hero] Trip "${trip.slug}" references nonexistent hero key: "${trip.photos.hero}"`);
    }
    if (!assetMap.has(trip.photos.card)) {
      errors.push(`[Trip Missing Card] Trip "${trip.slug}" references nonexistent card key: "${trip.photos.card}"`);
    }

    // Verify from_price_4_pax matches cheapest 4 pax option
    const row4 = trip.pricing.rows.find((r) => r.pax === 4);
    if (row4) {
      const prices = trip.pricing.columns.map((col) => Number(row4[col])).filter((p) => !isNaN(p) && p > 0);
      const min4 = Math.min(...prices);
      if (min4 !== trip.pricing.from_price_4_pax) {
        errors.push(
          `[Price Discrepancy] Trip "${trip.slug}" from_price_4_pax is ${trip.pricing.from_price_4_pax}, but minimum 4-pax column price is ${min4}`
        );
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  --- BUILD WARNING: TEMPORARY ASSETS IN USE (Launch Checklist) ---');
    warnings.forEach((w) => console.warn(`  • ${w}`));
    console.warn(`Total temporary assets in use: ${warnings.length}\n`);
  }

  if (errors.length > 0) {
    console.error('\n🚨  --- BUILD ERROR: DATA INTEGRITY CHECKS FAILED ---');
    errors.forEach((e) => console.error(`  ✖ ${e}`));
    throw new Error('Data audit failed. Fix data errors to proceed.');
  }

  return { warningsCount: warnings.length, errorsCount: errors.length };
}

// Run audit automatically when imported in Node/Astro build
auditData();

// 3. Helper Functions
export function getTrips(): Trip[] {
  return trips;
}

export function getTrip(slug: string): Trip | undefined {
  return trips.find((t) => t.slug === slug);
}

export function getAsset(key: string): Asset | undefined {
  return assetMap.get(key);
}

export function formatIDR(amount: number): string {
  return `IDR ${amount.toLocaleString('id-ID')}`;
}
