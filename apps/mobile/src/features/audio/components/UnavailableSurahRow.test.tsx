import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { UnavailableSurahRow } from './UnavailableSurahRow';

describe('UnavailableSurahRow', () => {
  it('renders the title and the «غير متوفرة» label', async () => {
    const view = await renderUi(<UnavailableSurahRow testID="row" title="البقرة" />);

    expect(view.getByText('البقرة')).toBeOnTheScreen();
    expect(view.getByText('غير متوفرة')).toBeOnTheScreen();
  });

  it.each(locales)('translates the label and the accessibility label under %s', async (locale) => {
    const view = await renderUi(<UnavailableSurahRow testID="row" title="Al-Baqarah" />, { locale });

    expect(view.getByText(locale === 'en' ? 'Unavailable' : 'غير متوفرة')).toBeOnTheScreen();
    expect(view.getByTestId('row').props.accessibilityLabel).toBe(
      locale === 'en'
        ? "Al-Baqarah, not available in this reciter's voice"
        : 'Al-Baqarah، غير متوفرة بصوت هذا القارئ',
    );
  });

  it('is disabled for accessibility, with a label and no button role', async () => {
    const view = await renderUi(<UnavailableSurahRow testID="row" title="البقرة" />);
    const row = view.getByTestId('row');

    expect(row.props.accessibilityState).toEqual({ disabled: true });
    expect(row.props.accessibilityLabel).toBe('البقرة، غير متوفرة بصوت هذا القارئ');
    expect(row.props.accessibilityRole).toBeUndefined();
    expect(view.queryByRole('button')).toBeNull();
  });

  it('does nothing when pressed', async () => {
    const view = await renderUi(<UnavailableSurahRow testID="row" title="البقرة" />);

    expect(() => fireEvent.press(view.getByTestId('row'))).not.toThrow();
  });

  it('draws the divider only when asked', async () => {
    const plain = await renderUi(<UnavailableSurahRow testID="row" title="البقرة" />);
    expect(flatStyle(plain.getByTestId('row').props.style).borderBottomWidth).toBeUndefined();

    const divided = await renderUi(<UnavailableSurahRow showDivider testID="row" title="البقرة" />);
    expect(flatStyle(divided.getByTestId('row').props.style).borderBottomWidth).toBe(themes.light.stroke.hairline);
    expect(flatStyle(divided.getByTestId('row').props.style).borderBottomColor).toBe(themes.light.colors.line);
  });

  it('dims the title in muted ink from the theme', async () => {
    const view = await renderUi(<UnavailableSurahRow testID="row" title="البقرة" />);

    expect(flatStyle(view.getByText('البقرة').props.style).color).toBe(themes.light.colors.inkMuted);
    expect(flatStyle(view.getByText('غير متوفرة').props.style).color).toBe(themes.light.colors.inkMuted);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/UnavailableSurahRow.tsx')).toEqual([]);
  });
});
