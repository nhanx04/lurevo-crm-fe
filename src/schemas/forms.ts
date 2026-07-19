import { z } from 'zod';

const money = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Use a non-negative amount with up to two decimals');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  parent_id: z.string().optional(),
  sort_order: z.coerce.number().int().min(0),
  is_active: z.boolean(),
  package_length: z.string().optional(),
  package_width: z.string().optional(),
  package_height: z.string().optional(),
  dimension_unit: z.enum(['in', 'cm']).optional(),
  shipping_cost_min: z.string().optional(),
  shipping_cost_max: z.string().optional(),
  shipping_currency: z.string().regex(/^[A-Z]{3}$/, 'Use a three-letter currency code').optional().or(z.literal('')),
  metadataText: z.string(),
}).superRefine((data, ctx) => {
  const positive = /^\d+(\.\d+)?$/;
  (['package_length', 'package_width', 'package_height'] as const).forEach((field) => {
    const value = data[field]?.trim();
    if (value && (!positive.test(value) || Number(value) <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Use a number greater than 0' });
    }
  });
  (['shipping_cost_min', 'shipping_cost_max'] as const).forEach((field) => {
    const value = data[field]?.trim();
    if (value && (!positive.test(value) || Number(value) < 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Use a non-negative amount' });
    }
  });
  const min = data.shipping_cost_min?.trim();
  const max = data.shipping_cost_max?.trim();
  if (min && max && Number(max) < Number(min)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['shipping_cost_max'], message: 'Maximum must be greater than or equal to minimum' });
  }
});

export const promptSchema = z.object({
  name: z.string().min(1, 'Prompt name is required'),
  type: z.enum(['design', 'mockup', 'other']),
  category_id: z.string().optional(),
  content: z.string().min(1, 'Prompt content is required'),
  description: z.string().optional(),
  tagsText: z.string(),
  state: z.enum(['active', 'inactive']),
});

export const statusSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a hex color like #3b82f6').optional().or(z.literal('')),
  sort_order: z.coerce.number().int().min(0),
  is_default: z.boolean(),
  is_active: z.boolean(),
  metadataText: z.string(),
});

export const listingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  short_name: z.string().min(1, 'Short name is required'),
  slug: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  short_description: z.string().optional(),
  sku: z.string().optional(),
  category_id: z.string().min(1, 'Category is required'),
  status_id: z.string().optional(),
  price: money,
  compare_at_price: z.string().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Use a three-letter currency code'),
  tagsText: z.string(),
  is_active: z.boolean(),
  internal_note: z.string().optional(),
  source: z.string().optional(),
  external_url: z.string().url().optional().or(z.literal('')),
  published_at: z.string().optional(),
  metadataText: z.string(),
  extraFieldsText: z.string(),
});

export const collaboratorSchema = z
  .object({
    email: z.string().email(),
    full_name: z.string().min(1, 'Full name is required'),
    password: z.string().min(8, 'Use at least 8 characters').max(128),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, { path: ['confirm_password'], message: 'Passwords must match' });

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Use at least 8 characters').max(128),
    new_password_confirmation: z.string(),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    path: ['new_password_confirmation'],
    message: 'Passwords must match',
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
export type PromptFormValues = z.infer<typeof promptSchema>;
export type StatusFormValues = z.infer<typeof statusSchema>;
export type ListingFormValues = z.infer<typeof listingSchema>;
export type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
