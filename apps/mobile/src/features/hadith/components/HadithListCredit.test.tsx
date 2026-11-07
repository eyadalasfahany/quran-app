import { screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { HadithListCredit } from './HadithListCredit';

const TEST_ID = 'hadith-list-credit';

describe('HadithListCredit', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithListCredit />, { locale });
    expect(screen.getByTestId(TEST_ID)).toHaveTextContent(
      locale === 'ar' ? 'المصدر: fawazahmed0/hadith-api · Unlicense' : 'Source: fawazahmed0/hadith-api · Unlicense',
    );
  });

  it('is centred muted text', async () => {
    await renderUi(<HadithListCredit />);
    const style = screen.getByTestId(TEST_ID).props.style;
    expect(JSON.stringify(style)).toContain('"textAlign":"center"');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithListCredit.tsx')).toEqual([]);
  });
});
