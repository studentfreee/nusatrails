import { z } from 'zod';

export const PricingRowSchema = z.record(z.string(), z.union([z.number(), z.string()])).and(
  z.object({
    pax: z.number().int().positive(),
  })
);

export const PricingSchema = z.object({
  currency: z.string().default('IDR'),
  unit: z.string().default('per person'),
  columns: z.array(z.string()).min(1),
  rows: z.array(PricingRowSchema).min(1),
  from_price_4_pax: z.number().positive(),
  notes: z.array(z.string()).default([]),
  peak_season_surcharge_percent: z.number().nonnegative().nullable().optional().default(20),
});

export const ItineraryItemSchema = z.object({
  type: z.enum(['paragraph', 'subheading', 'bullet']),
  text: z.string().optional(),
  title: z.string().optional(),
});

export const ItineraryDaySchema = z.object({
  label: z.string(),
  title: z.string(),
  items: z.array(ItineraryItemSchema),
});

export const StaySchema = z.object({
  area: z.string(),
  options: z.array(z.string()),
});

export const ThirdCardSchema = z.object({
  title: z.string(),
  items: z.array(z.string()),
});

export const TripSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  region: z.string(),
  duration: z.object({
    days: z.number().int().nonnegative(),
    nights: z.number().int().nonnegative(),
    label: z.string(),
  }),
  start: z.string(),
  end: z.string(),
  route_label: z.string(),
  destinations: z.array(z.string()),
  difficulty: z.enum(['Easy', 'Moderate', 'Challenging']),
  difficulty_source: z.string().optional(),
  group_size: z.object({
    min: z.number().int().positive(),
    max: z.number().int().positive(),
  }),
  summary: z.string(),
  pricing: PricingSchema,
  overview: z.array(z.any()).default([]),
  itinerary: z.array(ItineraryDaySchema),
  included: z.array(z.string()),
  excluded: z.array(z.string()),
  third_card: ThirdCardSchema,
  stays: z.array(StaySchema).default([]),
  photos: z.object({
    hero: z.string(),
    card: z.string(),
  }),
  open_questions: z.array(z.string()).default([]),
  source_doc: z.string().optional(),
});

export const AssetSchema = z.object({
  key: z.string(),
  file: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  status: z.enum(['own', 'team_whatsapp_compressed', 'TEMPORARY']),
  must_replace_before_launch: z.boolean(),
  rights: z.string().optional(),
  note: z.string().optional(),
  used_on_site: z.boolean(),
});

export const FaqItemSchema = z.object({
  q: z.string(),
  a: z.string(),
});

export const FaqCategorySchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(FaqItemSchema),
});

export const FaqDataSchema = z.object({
  categories: z.array(FaqCategorySchema),
  terms: z.array(z.string()),
  note: z.string().optional(),
});

export type Trip = z.infer<typeof TripSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type FaqCategory = z.infer<typeof FaqCategorySchema>;
