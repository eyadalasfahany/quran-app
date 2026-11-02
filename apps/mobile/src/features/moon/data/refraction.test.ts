import { geometricAltitude, refractionRadians } from './refraction';

describe('refraction', () => {
  it('inverts Meeus 16.4 within round-trip tolerance', () => {
    const geom = -1.5;
    const h = (geom * Math.PI) / 180;
    const apparent = geom + refractionRadians(h) / (Math.PI / 180);
    expect(geometricAltitude(apparent)).toBeCloseTo(geom, 2);
  });
});
