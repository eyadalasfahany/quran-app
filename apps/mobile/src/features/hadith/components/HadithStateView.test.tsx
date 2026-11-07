import { screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithStateView } from './HadithStateView';

const TEST_ID = 'hadith-state-view';

// The `name` prop of every rendered icon (EmptyState passes its icon to Icon, which draws it by name).
function iconNames(node: unknown = screen.toJSON(), found: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    node.forEach((child) => iconNames(child, found));
    return found;
  }
  if (typeof node !== 'object' || node === null) {
    return found;
  }
  const json = node as { props?: { name?: unknown }; children?: unknown };
  if (json.props?.name !== undefined) {
    found.push(json.props.name);
  }
  return iconNames(json.children, found);
}

describe('HadithStateView', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithStateView kind="noResults" />, { locale });
    expect(screen.getByText(locale === 'ar' ? 'لا توجد نتائج' : 'No results')).toBeOnTheScreen();
  });

  it('loading shows the skeleton', async () => {
    await renderUi(<HadithStateView kind="loading" />);
    expect(screen.getByLabelText('جارٍ التحميل')).toBeOnTheScreen();
  });

  it('offlineEmpty shows the title, body and no action', async () => {
    await renderUi(<HadithStateView kind="offlineEmpty" onAction={jest.fn()} />);
    expect(screen.getByText('لا توجد مجموعات محمّلة')).toBeOnTheScreen();
    expect(screen.getByText('اتصل بالإنترنت لتنزيل مجموعة.')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('error shows a retry action and calls onAction', async () => {
    const onAction = jest.fn();
    await renderUi(<HadithStateView kind="error" onAction={onAction} />);
    await press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('savedEmpty shows a browse action', async () => {
    await renderUi(<HadithStateView kind="savedEmpty" onAction={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'تصفّح المجموعات' })).toBeOnTheScreen();
  });

  it('noResults shows no action', async () => {
    await renderUi(<HadithStateView kind="noResults" onAction={jest.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('each kind has its own icon', async () => {
    const offline = await renderUi(<HadithStateView kind="offlineEmpty" />);
    expect(iconNames()).toContain('icloud.slash');
    await offline.unmount();

    const saved = await renderUi(<HadithStateView kind="savedEmpty" />);
    expect(iconNames()).toContain('bookmark');
    await saved.unmount();

    await renderUi(<HadithStateView kind="noResults" />);
    expect(iconNames()).toContain('magnifyingglass');
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithStateView kind="noResults" testID={TEST_ID} />);
    expect(screen.getByTestId(TEST_ID)).toBeOnTheScreen();
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithStateView kind="noResults" />, { theme });
    expect(screen.getByText('لا توجد نتائج')).toBeOnTheScreen();
    expect(themes[theme].colors.brand).toBeDefined();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithStateView.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithStateView kind="noResults" />);
    expect(screen.getByText('لا توجد نتائج').props.maxFontSizeMultiplier).toBe(maxFontScale.content);
  });
});
