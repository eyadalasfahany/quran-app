import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { paragraphsFixture } from '../fixtures';
import { EventText } from './EventText';

describe('EventText', () => {
  it.each(locales)('renders every paragraph in order (%s)', async (locale) => {
    await renderUi(<EventText paragraphs={paragraphsFixture} />, { locale });
    const text = screen.getAllByTestId(/^seerah-event-text-p/);
    expect(text).toHaveLength(2);
    expect(text[0]).toHaveTextContent(paragraphsFixture[0]?.text ?? '');
    expect(text[1]).toHaveTextContent(paragraphsFixture[1]?.text ?? '');
  });

  it('shows the text exactly as stored: no trimming, no normalising', async () => {
    const raw = '  ‏نص   تجريبيً  \n  ';
    await renderUi(<EventText paragraphs={[{ id: 'p1', page: null, position: 1, text: raw }]} />);
    expect(screen.getByTestId('seerah-event-text-p1').props.children).toBe(raw);
  });

  it('sets the book text in Amiri at 21 on a 41 line, justified and right to left', async () => {
    await renderUi(<EventText paragraphs={paragraphsFixture} />, { locale: 'en' });
    expect(flatStyle(screen.getByTestId('seerah-event-text-p00001').props.style)).toMatchObject({
      fontSize: 21,
      lineHeight: 41,
      textAlign: 'justify',
      writingDirection: 'rtl',
    });
  });

  it('keeps the text scalable', async () => {
    await renderUi(<EventText paragraphs={paragraphsFixture} />);
    expect(screen.getByTestId('seerah-event-text-p00001').props.maxFontSizeMultiplier).toBe(2);
  });

  it('draws nothing for no paragraphs', async () => {
    await renderUi(<EventText paragraphs={[]} />);
    expect(screen.queryAllByTestId(/^seerah-event-text-p/)).toHaveLength(0);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventText.tsx')).toEqual([]);
    expect(themes.light.colors.ink).toBeDefined();
  });
});
