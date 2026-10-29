import { Text } from 'react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { RecitedWords } from './RecitedWords';

const TEXT = 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ';

describe('RecitedWords', () => {
  it.each(locales)('draws every byte and marks the recited word in %s', async (locale) => {
    const view = await renderUi(
      <Text testID="ayah">
        <RecitedWords activeWord={4} testID="ayah" text={TEXT} />
      </Text>,
      { locale },
    );

    expect(view.getByTestId('ayah')).toHaveTextContent(TEXT);
    expect(view.getByTestId('ayah-word')).toHaveTextContent('رَيْبَ');
    expect(flatStyle(view.getByTestId('ayah-word').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.brandSurface,
      color: themes.light.colors.onBrandSurface,
    });
  });

  it('counts past a waqf mark standing as its own token', async () => {
    const view = await renderUi(
      <Text>
        <RecitedWords activeWord={5} testID="ayah" text={TEXT} />
      </Text>,
    );

    expect(view.getByTestId('ayah-word')).toHaveTextContent('فِيهِ');
  });

  it('uses no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/components/RecitedWords.tsx')).toEqual([]);
  });
});
