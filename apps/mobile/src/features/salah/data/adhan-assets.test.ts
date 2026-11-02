import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import appConfigFactory from '../../../../app.config';
import { ADHAN_VOICES } from './adhan-sounds';

/**
 * The bundled adhan clips (ADR 0047). They reach the binary only through the expo-notifications plugin `sounds` list, so
 * the catalogue, the list and the files on disk must agree, and a native build with a missing file would fail silently.
 */

const ASSET_DIR = join('assets', 'adhan');
const SIZE_BUDGET_BYTES = 2 * 1024 * 1024;

type PluginOptions = { sounds?: unknown };

function notificationsPlugin(): PluginOptions {
  const config = appConfigFactory({ config: {} });
  const entry = (config.plugins ?? []).find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-notifications');
  expect(entry).toBeDefined();
  return Array.isArray(entry) ? (entry[1] as PluginOptions) : {};
}

function listedSounds(): string[] {
  const sounds = notificationsPlugin().sounds;
  expect(Array.isArray(sounds)).toBe(true);
  return sounds as string[];
}

function bundledFiles(): string[] {
  return readdirSync(ASSET_DIR).filter((file) => file.endsWith('.wav'));
}

describe('bundled adhan sounds', () => {
  it('lists every catalogue voice in the expo-notifications plugin sounds', () => {
    const listed = listedSounds().map((path) => path.split('/').pop());

    for (const voice of ADHAN_VOICES) {
      expect(listed).toContain(voice.file);
    }
  });

  it('lists the sounds by the relative path the plugin resolves from the project root', () => {
    for (const path of listedSounds()) {
      expect(path).toMatch(/^\.\/assets\/adhan\/[a-z0-9_]+\.wav$/);
    }
  });

  it('has every listed file on disk', () => {
    const onDisk = bundledFiles();

    for (const path of listedSounds()) {
      expect(onDisk).toContain(path.split('/').pop());
    }
  });

  it('lists no sound that the catalogue does not know', () => {
    const catalogue = new Set<string>(ADHAN_VOICES.map((voice) => voice.file));

    for (const path of listedSounds()) {
      expect(catalogue.has(path.split('/').pop() ?? '')).toBe(true);
    }
    expect(listedSounds()).toHaveLength(ADHAN_VOICES.length);
  });

  it('gives every file a name that Android and iOS both accept', () => {
    for (const path of listedSounds()) {
      const file = path.split('/').pop() ?? '';
      expect(file).toMatch(/^[a-z0-9_]+\.wav$/);
      expect(file.replace(/\.wav$/, '')).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it('keeps the bundled clips within the 2 MB size budget', () => {
    const total = bundledFiles().reduce((sum, file) => sum + readFileSync(join(ASSET_DIR, file)).length, 0);

    expect(total).toBeLessThanOrEqual(SIZE_BUDGET_BYTES);
  });

  it('keeps the fingerprint runtime, so an OTA update never reaches a binary without the sounds', () => {
    const config = appConfigFactory({ config: {} });

    expect(config.runtimeVersion).toEqual({ policy: 'fingerprint' });
  });
});
