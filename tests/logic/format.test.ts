import { formatDistance, formatPrice, formatEventDateTime } from '@/lib/format';

describe('formatDistance', () => {
  it('rounds short distances to the nearest 50m', () => {
    expect(formatDistance(120)).toBe('100 m');
    expect(formatDistance(930)).toBe('950 m');
  });

  it('formats kilometers with one decimal under 10km', () => {
    expect(formatDistance(3400)).toBe('3.4 km');
  });

  it('formats kilometers with no decimal at or above 10km', () => {
    expect(formatDistance(15000)).toBe('15 km');
  });
});

describe('formatPrice', () => {
  it('shows Gratis for free events regardless of cents', () => {
    expect(formatPrice(500000, true)).toBe('Gratis');
    expect(formatPrice(null, true)).toBe('Gratis');
  });

  it('formats paid events from cents to a whole currency amount', () => {
    expect(formatPrice(500000, false)).toBe('$5.000');
  });
});

describe('formatEventDateTime', () => {
  it('labels events happening today', () => {
    const today = new Date();
    today.setHours(23, 0, 0, 0);
    expect(formatEventDateTime(today.toISOString())).toMatch(/^Hoy · \d{2}:\d{2}$/);
  });
});
