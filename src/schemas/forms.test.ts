import { describe, expect, it } from 'vitest';
import { changePasswordSchema, listingSchema } from './forms';

describe('schemas', () => {
  it('requires listing short name and valid currency', () => {
    const result = listingSchema.safeParse({ title: 'T', short_name: '', description: 'D', category_id: '1', price: '12.50', currency: 'usd', tagsText: '', is_active: true, metadataText: '{}', extraFieldsText: '{}' });
    expect(result.success).toBe(false);
  });

  it('validates password confirmation', () => {
    const result = changePasswordSchema.safeParse({ current_password: 'old', new_password: 'Password123', new_password_confirmation: 'Different123' });
    expect(result.success).toBe(false);
  });
});
