import { publishWidgetSnapshot, type WidgetSnapshotWriter } from './publish';
import { fullSnapshot } from './test-fixtures';

describe('publishWidgetSnapshot (ADR 0035 §4)', () => {
  it('writes the same JSON to every writer, then redraws each one', async () => {
    const calls: string[] = [];
    const writers: WidgetSnapshotWriter[] = [
      { id: 'mmkv', write: (json) => void calls.push(`write:mmkv:${json.length}`) },
      { id: 'android', refresh: () => void calls.push('refresh:android'), write: () => undefined },
      { id: 'ios-app-group', refresh: () => void calls.push('refresh:ios'), write: () => void calls.push('write:ios') },
    ];
    await publishWidgetSnapshot(fullSnapshot(), writers);
    const length = JSON.stringify(fullSnapshot()).length;
    expect(calls).toEqual([`write:mmkv:${length}`, 'write:ios', 'refresh:android', 'refresh:ios']);
  });

  it('stores before it redraws, so a redraw reads the new value', async () => {
    const order: string[] = [];
    await publishWidgetSnapshot(fullSnapshot(), [
      { id: 'mmkv', write: () => void order.push('store') },
      { id: 'android', refresh: () => void order.push('redraw'), write: () => undefined },
    ]);
    expect(order).toEqual(['store', 'redraw']);
  });

  it('keeps writing the other targets when one store fails, and skips only that target redraw', async () => {
    const calls: string[] = [];
    await publishWidgetSnapshot(fullSnapshot(), [
      {
        id: 'ios-app-group',
        refresh: () => void calls.push('refresh:ios'),
        write: () => {
          throw new Error('app group unavailable');
        },
      },
      { id: 'wear-os', refresh: () => void calls.push('refresh:wear'), write: () => void calls.push('write:wear') },
    ]);
    expect(calls).toEqual(['write:wear', 'refresh:wear']);
  });

  it('drops a failed redraw without stopping the other targets', async () => {
    const calls: string[] = [];
    await expect(
      publishWidgetSnapshot(fullSnapshot(), [
        {
          id: 'android',
          refresh: () => {
            throw new Error('no widget placed');
          },
          write: () => undefined,
        },
        { id: 'wear-os', refresh: () => void calls.push('refresh:wear'), write: () => undefined },
      ]),
    ).resolves.toBeUndefined();
    expect(calls).toEqual(['refresh:wear']);
  });

  it('accepts a writer with no redraw (a store only)', async () => {
    const write = jest.fn();
    await publishWidgetSnapshot(fullSnapshot(), [{ id: 'mmkv', write }]);
    expect(write).toHaveBeenCalledWith(JSON.stringify(fullSnapshot()));
  });
});
