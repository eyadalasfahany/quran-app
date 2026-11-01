import { storage, storageKeys } from '@/core/storage/mmkv';

import { getVariationChoices, setVariationChoice } from './variation-choice';

describe('variation choice storage', () => {
  beforeEach(() => {
    storage.remove(storageKeys.azkar.variationChoice);
  });

  it('reads no choices when nothing is saved', () => {
    expect(getVariationChoices()).toEqual({});
  });

  it('saves one entry choice and keeps the others', () => {
    setVariationChoice('fixture:entry-008', 'alternative');
    const map = setVariationChoice('fixture:entry-001', 'other');

    expect(map).toEqual({ 'fixture:entry-008': 'alternative', 'fixture:entry-001': 'other' });
    expect(getVariationChoices()).toEqual(map);
  });

  it('overwrites the choice for an entry', () => {
    setVariationChoice('fixture:entry-008', 'alternative');
    setVariationChoice('fixture:entry-008', 'primary');

    expect(getVariationChoices()).toEqual({ 'fixture:entry-008': 'primary' });
  });

  it('stores a JSON map under the azkar key', () => {
    setVariationChoice('fixture:entry-008', 'alternative');

    expect(JSON.parse(storage.getString(storageKeys.azkar.variationChoice) ?? 'null')).toEqual({
      'fixture:entry-008': 'alternative',
    });
  });

  it('reads a corrupt, non-object or partly invalid value as the valid part only', () => {
    storage.set(storageKeys.azkar.variationChoice, '{not json');
    expect(getVariationChoices()).toEqual({});

    storage.set(storageKeys.azkar.variationChoice, '["a"]');
    expect(getVariationChoices()).toEqual({});

    storage.set(storageKeys.azkar.variationChoice, '42');
    expect(getVariationChoices()).toEqual({});

    storage.set(storageKeys.azkar.variationChoice, JSON.stringify({ 'fixture:entry-008': 'alternative', 'fixture:entry-001': 3 }));
    expect(getVariationChoices()).toEqual({ 'fixture:entry-008': 'alternative' });
  });
});
