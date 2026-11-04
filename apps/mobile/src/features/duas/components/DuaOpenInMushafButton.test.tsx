import { fireEvent, screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { DuaOpenInMushafButton } from './DuaOpenInMushafButton';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

describe('DuaOpenInMushafButton', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('navigates to the reader at verse_from', async () => {
    await renderUi(<DuaOpenInMushafButton label="Open in Mushaf" surah={2} verseFrom={255} />);
    fireEvent.press(screen.getByTestId('dua-open-in-mushaf'));
    expect(mockPush).toHaveBeenCalledWith('/read/2:255');
  });
});
