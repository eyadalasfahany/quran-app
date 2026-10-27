import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { featureComponentLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { CONTENT_COLUMN_MAX_WIDTH, ContentColumn } from './ContentColumn';

describe('ContentColumn', () => {
  it.each(locales)('centres a capped, padded column in %s', async (locale) => {
    const view = await renderUi(
      <ContentColumn>
        <Text>{locale}</Text>
      </ContentColumn>,
      { locale },
    );
    const column = view.getByText(locale).parent;

    expect(flatStyle(column?.props.style)).toMatchObject({
      alignSelf: 'center',
      maxWidth: CONTENT_COLUMN_MAX_WIDTH,
      paddingHorizontal: themes.light.space[6],
      width: '100%',
    });
  });

  it('caps the reading column at about 720 pt', () => {
    expect(CONTENT_COLUMN_MAX_WIDTH).toBe(720);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('core/layout/ContentColumn.tsx')).toEqual([]);
  });
});
