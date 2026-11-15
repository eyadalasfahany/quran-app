import type { ComponentProps } from 'react';

import { locales, renderUi } from '../../../../jest/render-ui';

import { BackButton } from '@/shared/ui';
import { EventListRow } from './EventListRow';
import { EventPager } from './EventPager';
import { EventTopBar } from './EventTopBar';
import { MapHeader } from './MapHeader';
import { TimelineHeader } from './TimelineHeader';

// Each glyph renders as a View that carries its SF Symbol name; a mirrored glyph carries scaleX -1 (Icon, mirrorInRtl).
jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View: NativeView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SymbolView: ({ name }: { name: { ios: string; android: string } }) =>
      createElement(NativeView, { name, testID: 'symbol-view' } as ComponentProps<typeof NativeView>),
  };
});

/** The SF Symbol names drawn, in order, and how many of them are mirrored (scaleX -1) in the tree. */
function glyphs(tree: unknown): { names: string[]; mirrored: number } {
  const json = JSON.stringify(tree);
  const names = [...json.matchAll(/"name":\{"ios":"([^"]+)"/g)].map((match) => match[1] ?? '');
  const mirrored = json.match(/"scaleX":-1/g)?.length ?? 0;
  return { mirrored, names };
}

const noop = () => undefined;

describe('directional glyphs', () => {
  it.each(locales)('the back button points at the leading edge: right in Arabic, left in English (%s)', async (locale) => {
    const view = await renderUi(<BackButton onPress={noop} />, { locale });
    expect(glyphs(view.toJSON())).toEqual({ mirrored: locale === 'ar' ? 1 : 0, names: ['chevron.left'] });
  });

  it.each(locales)('the event page back button mirrors the same way (%s)', async (locale) => {
    const view = await renderUi(<EventTopBar crumb="الصبا" onBack={noop} onShowList={noop} />, { locale });
    expect(glyphs(view.toJSON()).names).toContain('chevron.left');
    expect(glyphs(view.toJSON()).mirrored).toBe(locale === 'ar' ? 1 : 0);
  });

  it.each(locales)('the event pager: previous points right and next points left in Arabic, the opposite in English (%s)', async (locale) => {
    const view = await renderUi(
      <EventPager index={3} next={{ id: 'n', title: 'التالي' }} onNext={noop} onPrevious={noop} previous={{ id: 'p', title: 'السابق' }} total={9} />,
      { locale },
    );
    expect(glyphs(view.toJSON())).toEqual({ mirrored: locale === 'ar' ? 2 : 0, names: ['chevron.left', 'chevron.right'] });
  });

  it.each(locales)('the timeline steps: earlier is right and later is left in Arabic, mirrored in English (%s)', async (locale) => {
    const view = await renderUi(
      <TimelineHeader onClear={noop} onNext={noop} onPrevious={noop} showClear={false} subtitle="" title="" />,
      { locale },
    );
    // Previous is the first control: chevron.left mirrors under RTL so it points right (earlier, the start of the track).
    expect(glyphs(view.toJSON())).toEqual({ mirrored: locale === 'ar' ? 2 : 0, names: ['chevron.left', 'chevron.right'] });
  });

  it.each(locales)('the vertical timeline steps point up and down and never mirror (%s)', async (locale) => {
    const view = await renderUi(
      <TimelineHeader onClear={noop} onNext={noop} onPrevious={noop} orientation="vertical" showClear={false} subtitle="" title="" />,
      { locale },
    );
    expect(glyphs(view.toJSON())).toEqual({ mirrored: 0, names: ['chevron.up', 'chevron.down'] });
  });

  it.each(locales)('the map header region chip is a back chevron (right in Arabic, left in English, frame SeerahMapMadinah); info and list never mirror (%s)', async (locale) => {
    const view = await renderUi(
      <MapHeader levelChip={{ label: 'المنطقة', onPress: noop }} onBack={noop} onOpenKey={noop} onToggleView={noop} subtitle="" title="" />,
      { locale },
    );
    const drawn = glyphs(view.toJSON());
    // Without a back button in this header, the region chip's chevron is the one directional glyph: it mirrors in Arabic.
    expect(drawn.names).toEqual(expect.arrayContaining(['chevron.left', 'info.circle']));
    expect(drawn.mirrored).toBe(locale === 'ar' ? 1 : 0);
  });

  it.each(locales)('a list row disclosure chevron points left in Arabic and right in English (%s)', async (locale) => {
    const view = await renderUi(<EventListRow onPress={noop} subtitle="مكة" title="غزوة بدر" />, { locale });
    expect(glyphs(view.toJSON())).toEqual({ mirrored: locale === 'ar' ? 1 : 0, names: ['chevron.right'] });
  });
});
