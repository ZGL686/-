import { describe, expect, it } from 'vitest';
import { defaultPreferences, parsePreferences } from '../src/preferences/model';

describe('device preferences are safe to load before application data', () => {
  it.each([null, '', '{broken', 'null', '[]', '{"version":2,"font":"handwritten"}'])(
    'uses defaults for unsupported input %s',
    (raw) => {
      expect(parsePreferences(raw)).toEqual(defaultPreferences);
    },
  );
  it('keeps valid fields when another field is corrupt', () => {
    expect(
      parsePreferences(
        JSON.stringify({
          version: 1,
          font: 'handwritten',
          fontSize: 999,
          motion: 'reduced',
          sidebarCollapsed: true,
        }),
      ),
    ).toEqual({
      ...defaultPreferences,
      font: 'handwritten',
      motion: 'reduced',
      sidebarCollapsed: true,
    });
  });
  it('rejects arbitrary CSS values and wrong field types', () => {
    expect(
      parsePreferences(
        JSON.stringify({
          version: 1,
          font: 'url(https://invalid)',
          fontSize: '16',
          motion: 'full',
          sidebarCollapsed: 'false',
        }),
      ),
    ).toEqual(defaultPreferences);
  });
  it('round trips all supported preferences without copying unknown fields', () => {
    const p = {
      version: 1,
      font: 'system',
      fontSize: 16,
      motion: 'reduced',
      sidebarCollapsed: true,
    };
    expect(parsePreferences(JSON.stringify({ ...p, students: ['not a preference'] }))).toEqual(p);
  });
});
