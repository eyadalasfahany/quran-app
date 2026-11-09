import { act, renderHook } from '@testing-library/react-native';
import { useNavigation } from 'expo-router';
import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { featureComponentLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { setContentGutter, useContentGutter } from './content-gutter-store';
import { CONTENT_COLUMN_MAX_WIDTH, ContentColumn } from './ContentColumn';

// Outside a navigator the hook throws, as the real one does; a test that needs a screen sets a fake navigation.
jest.mock('expo-router', () => ({
  useNavigation: jest.fn(() => {
    throw new Error("Couldn't find a navigation object.");
  }),
}));

describe('ContentColumn', () => {
  beforeEach(() => {
    setContentGutter(themes.light.space[6]);
  });

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

  it('publishes the default gutter, 24, when rendered outside a navigator', async () => {
    await renderUi(
      <ContentColumn>
        <Text>body</Text>
      </ContentColumn>,
    );

    expect(await publishedGutter()).toBe(24);
  });

  it('publishes a custom gutter, 20, and uses it for the padding', async () => {
    const view = await renderUi(
      <ContentColumn gutter={20}>
        <Text>body</Text>
      </ContentColumn>,
    );

    expect(flatStyle(view.getByText('body').parent?.props.style)).toMatchObject({ paddingHorizontal: 20 });
    expect(await publishedGutter()).toBe(20);
  });

  it('publishes its gutter only when its screen gains focus', async () => {
    const listeners: (() => void)[] = [];
    const navigation = {
      isFocused: () => false,
      addListener: (_event: string, listener: () => void) => {
        listeners.push(listener);
        return () => undefined;
      },
    };
    jest.mocked(useNavigation).mockReturnValue(navigation as unknown as ReturnType<typeof useNavigation>);

    await renderUi(
      <ContentColumn gutter={20}>
        <Text>body</Text>
      </ContentColumn>,
    );
    expect(await publishedGutter()).toBe(24);

    await act(async () => {
      listeners.forEach((listener) => listener());
    });
    expect(await publishedGutter()).toBe(20);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('core/layout/ContentColumn.tsx')).toEqual([]);
  });
});

// The gutter the floating notices would follow right now.
async function publishedGutter() {
  const { result } = await renderHook(() => useContentGutter());
  return result.current;
}
