import { I18nManager } from 'react-native';

import { themes } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { SearchIdleHint } from './SearchIdleHint';

describe('SearchIdleHint', () => {
  it('renders the given text under its testID', async () => {
    const view = await renderUi(<SearchIdleHint testID="hint" text="FIXTURE text 1 — not a dhikr" />);

    expect(view.getByTestId('hint')).toHaveTextContent('FIXTURE text 1 — not a dhikr');
  });

  it('uses the caption size and the muted tone, the same as the Azkar idle line', async () => {
    const view = await renderUi(
      <>
        <SearchIdleHint testID="hint" text="FIXTURE text 1 — not a dhikr" />
        <UiText testID="reference" tone="muted" variant="caption">
          FIXTURE text 1 — not a dhikr
        </UiText>
      </>,
    );

    const style = flatStyle(view.getByTestId('hint').props.style);
    expect(style).toMatchObject({ color: themes.light.colors.inkMuted });
    expect(style).toEqual(flatStyle(view.getByTestId('reference').props.style));
  });

  it('is read as plain text, not a control', async () => {
    const view = await renderUi(<SearchIdleHint text="FIXTURE text 1 — not a dhikr" />);

    expect(view.queryByRole('button')).toBeNull();
    expect(view.getByText('FIXTURE text 1 — not a dhikr')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s, in RTL only for Arabic', async (locale) => {
    const text = locale === 'ar' ? 'ابحث بالكلمة أو بجزء منها' : 'Search by a word or part of one';
    const view = await renderUi(<SearchIdleHint text={text} />, { locale });

    expect(view.getByText(text)).toBeOnTheScreen();
    expect(I18nManager.isRTL).toBe(locale === 'ar');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/SearchIdleHint.tsx')).toEqual([]);
  });
});
