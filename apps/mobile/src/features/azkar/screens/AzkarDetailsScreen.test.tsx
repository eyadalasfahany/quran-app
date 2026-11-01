import { screen } from '@testing-library/react-native';

import { emptyNotes, makeDetail, makeNote } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { AzkarDetailsScreen } from './AzkarDetailsScreen';

const mockDetail = jest.fn();

jest.mock('../data/hooks', () => ({
  useEntry: (entryKey: string) => mockDetail(entryKey),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

describe('AzkarDetailsScreen', () => {
  beforeEach(() => mockDetail.mockReset());

  it('shows the title and only the sections that have content', async () => {
    mockDetail.mockReturnValue(makeDetail());
    await renderUi(<AzkarDetailsScreen entryKey="fixture:entry-001" />);

    expect(screen.getByRole('header', { name: 'المصدر والتفاصيل' })).toBeTruthy();
    expect(screen.getByText('المناسبة')).toBeTruthy();
    expect(screen.getByText('المصدر')).toBeTruthy();
    for (const title of ['التعليمات', 'السياق', 'المعنى', 'الفضل', 'المرجع', 'الدرجة']) {
      expect(screen.queryByText(title)).toBeNull();
    }
    expect(mockDetail).toHaveBeenCalledWith('fixture:entry-001');
  });

  it('shows every populated section when the entry has all of them', async () => {
    const notes = {
      ...emptyNotes(),
      context: [makeNote('context')],
      explanation: [makeNote('explanation')],
      virtue: [makeNote('virtue')],
      reference: [makeNote('reference')],
      grade: [makeNote('grade', { textAr: null, grader: '[الدرجة تجريبية]' })],
    };
    mockDetail.mockReturnValue(makeDetail({ notes }));
    await renderUi(<AzkarDetailsScreen entryKey="fixture:entry-001" />);

    for (const title of ['المناسبة', 'السياق', 'المعنى', 'الفضل', 'المرجع', 'الدرجة', 'المصدر']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  it('renders the English sections in the English interface', async () => {
    mockDetail.mockReturnValue(makeDetail());
    await renderUi(<AzkarDetailsScreen entryKey="fixture:entry-001" />, { locale: 'en' });
    expect(screen.getByRole('header', { name: 'Source and details' })).toBeTruthy();
    expect(screen.getByText('Occasion')).toBeTruthy();
  });

  it('renders the header alone while the entry is unavailable', async () => {
    mockDetail.mockReturnValue(undefined);
    await renderUi(<AzkarDetailsScreen entryKey="missing" />);
    expect(screen.getByRole('header', { name: 'المصدر والتفاصيل' })).toBeTruthy();
    expect(screen.queryByText('المناسبة')).toBeNull();
  });
});
