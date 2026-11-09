import { space } from '@quran/design-tokens';
import { act, renderHook } from '@testing-library/react-native';

import { setContentGutter, useContentGutter } from './content-gutter-store';

describe('content gutter store', () => {
  beforeEach(() => {
    setContentGutter(space[6]);
  });

  it('starts at the ContentColumn default, space 6', async () => {
    const { result } = await renderHook(() => useContentGutter());

    expect(result.current).toBe(24);
  });

  it('publishes a new value to a mounted hook', async () => {
    const { result } = await renderHook(() => useContentGutter());

    act(() => setContentGutter(20));

    expect(result.current).toBe(20);
  });
});
