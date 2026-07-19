import { describe, expect, it } from 'vitest';
import { categorySchema, changePasswordSchema, listingSchema, promptSchema } from './forms';

describe('schemas', () => {
  it('requires listing short name and valid currency', () => {
    const result = listingSchema.safeParse({ title: 'T', short_name: '', description: 'D', category_id: '1', price: '12.50', currency: 'usd', tagsText: '', is_active: true, metadataText: '{}', extraFieldsText: '{}' });
    expect(result.success).toBe(false);
  });

  it('validates password confirmation', () => {
    const result = changePasswordSchema.safeParse({ current_password: 'old', new_password: 'Password123', new_password_confirmation: 'Different123' });
    expect(result.success).toBe(false);
  });

  it('validates category dimensions and shipping-cost range', () => {
    const result = categorySchema.safeParse({
      name: 'Mug',
      slug: '',
      description: '',
      parent_id: '',
      sort_order: 0,
      is_active: true,
      package_length: '12',
      package_width: '8',
      package_height: '4',
      dimension_unit: 'in',
      shipping_cost_min: '12.00',
      shipping_cost_max: '8.00',
      shipping_currency: 'USD',
      metadataText: '{}',
    });
    expect(result.success).toBe(false);
  });

  it('allows legacy categories without package or shipping values', () => {
    const result = categorySchema.safeParse({
      name: 'Legacy',
      slug: '',
      description: '',
      parent_id: '',
      sort_order: 0,
      is_active: true,
      package_length: '',
      package_width: '',
      package_height: '',
      dimension_unit: 'in',
      shipping_cost_min: '',
      shipping_cost_max: '',
      shipping_currency: '',
      metadataText: '{}',
    });
    expect(result.success).toBe(true);
  });

  it('requires prompt content and a supported type', () => {
    const result = promptSchema.safeParse({
      name: 'Mockup prompt',
      type: 'invalid',
      category_id: '',
      content: '',
      description: '',
      tagsText: '',
      state: 'active',
    });
    expect(result.success).toBe(false);
  });
});
