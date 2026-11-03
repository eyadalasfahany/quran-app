import { renderHook } from '@testing-library/react-native';
import * as React from 'react';
import { act } from 'react';

import { putFile, resetFakeFileSystem } from '../../../../jest/fake-file-system';

import { useFontStorageBytes, type FontStorageBytesResult } from './useFontStorageBytes';

jest.mock('expo-file-system', () => {
  const { fakeExpoFileSystem: mockExpoFileSystem } = jest.requireActual('../../../../jest/fake-file-system');
  return mockExpoFileSystem;
});
jest.mock('@/features/reader/mushaf/fonts', () => ({ fontDirectoryPath: () => 'qcf-v2' }));

describe('useFontStorageBytes', () => {
  beforeEach(() => {
    resetFakeFileSystem();
  });

  it('starts loading', async () => {
    const useStateSpy = jest.spyOn(React, 'useState');
    (useStateSpy as jest.Mock).mockImplementationOnce((initial: FontStorageBytesResult) => {
      expect(initial).toEqual({ bytes: 0, loading: true });
      return [initial, jest.fn()];
    });
    await renderHook(() => useFontStorageBytes());
    useStateSpy.mockRestore();
  });

  it('returns 0 and loading=false when directory is empty', async () => {
    const { result } = await renderHook(() => useFontStorageBytes());
    await act(async () => {});
    expect(result.current.bytes).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('sums ttf files', async () => {
    putFile('file:///documents/qcf-v2/p1.ttf', 1000);
    putFile('file:///documents/qcf-v2/p2.ttf', 2000);
    const { result } = await renderHook(() => useFontStorageBytes());
    await act(async () => {});
    expect(result.current.bytes).toBe(3000);
    expect(result.current.loading).toBe(false);
  });

  it('excludes .part files', async () => {
    putFile('file:///documents/qcf-v2/p1.ttf', 1000);
    putFile('file:///documents/qcf-v2/p1.ttf.part', 999);
    const { result } = await renderHook(() => useFontStorageBytes());
    await act(async () => {});
    expect(result.current.bytes).toBe(1000);
  });

  it('returns 0 when the font directory does not exist', async () => {
    const { result } = await renderHook(() => useFontStorageBytes());
    await act(async () => {});
    expect(result.current.bytes).toBe(0);
    expect(result.current.loading).toBe(false);
  });
});
