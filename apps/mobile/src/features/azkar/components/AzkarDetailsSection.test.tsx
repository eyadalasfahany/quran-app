import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarDetailsSection } from './AzkarDetailsSection';

describe('AzkarDetailsSection', () => {
  it('renders its title, body and caption', async () => {
    await renderUi(<AzkarDetailsSection body="نص تجريبي — ليس ذكرًا" caption="المصدر: [مصدر تجريبي]" title="المعنى" />);
    expect(screen.getByText('المعنى')).toBeTruthy();
    expect(screen.getByText('نص تجريبي — ليس ذكرًا')).toBeTruthy();
    expect(screen.getByText('المصدر: [مصدر تجريبي]')).toBeTruthy();
  });

  it('renders nothing when the body is null', async () => {
    await renderUi(<AzkarDetailsSection body={null} title="الفضل" />);
    expect(screen.queryByText('الفضل')).toBeNull();
    expect(screen.queryByTestId('azkar-details-section')).toBeNull();
  });

  it('renders nothing when the body is blank', async () => {
    await renderUi(<AzkarDetailsSection body="  " title="الفضل" />);
    expect(screen.queryByTestId('azkar-details-section')).toBeNull();
  });

  it('omits the caption when none is given', async () => {
    await renderUi(<AzkarDetailsSection body="FIXTURE body" title="Meaning" />, { locale: 'en' });
    expect(screen.getByText('FIXTURE body')).toBeTruthy();
    expect(screen.getByText('Meaning')).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarDetailsSection.tsx')).toEqual([]);
  });
});
