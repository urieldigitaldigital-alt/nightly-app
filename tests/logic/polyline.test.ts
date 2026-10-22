import { decodePolyline } from '@/lib/polyline';

describe('decodePolyline', () => {
  it('decodes the canonical Google polyline example', () => {
    // From Google's own encoded polyline algorithm documentation.
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    const expected = [
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ];
    expect(points).toHaveLength(expected.length);
    points.forEach((p, i) => {
      expect(p.latitude).toBeCloseTo(expected[i].latitude, 5);
      expect(p.longitude).toBeCloseTo(expected[i].longitude, 5);
    });
  });

  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});
