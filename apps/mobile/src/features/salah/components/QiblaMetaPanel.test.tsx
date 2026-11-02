import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { QiblaMetaPanel } from './QiblaMetaPanel';

const colors = themes.light.colors;

const PROPS = {
  accuracy: 'good' as const,
  distanceKm: 1245,
  locationSource: 'auto' as const,
};

describe('QiblaMetaPanel', () => {
  it('renders the three rows: distance, accuracy and location', async () => {
    const view = await renderUi(<QiblaMetaPanel {...PROPS} testID="panel" />);

    expect(view.getByText('إلى المسجد الحرام')).toBeOnTheScreen();
    expect(view.getByText('١٬٢٤٥ كم')).toBeOnTheScreen();
    expect(view.getByText('دقة البوصلة')).toBeOnTheScreen();
    expect(view.getByText('جيدة')).toBeOnTheScreen();
    expect(view.getByText('الموقع')).toBeOnTheScreen();
    expect(view.getByText('تلقائي')).toBeOnTheScreen();
  });

  it('draws the frame\'s glass card: player glass, 20 px radius, 52 px rows', async () => {
    const view = await renderUi(<QiblaMetaPanel {...PROPS} testID="panel" />);

    expect(flatStyle(view.getByTestId('panel').props.style)).toMatchObject({
      backgroundColor: colors.playerGlassFill,
      borderColor: colors.playerGlassStroke,
      borderRadius: themes.light.radius.lg,
    });
  });

  it.each([
    ['good', 'جيدة'],
    ['fair', 'متوسطة'],
    ['poor', 'منخفضة'],
  ] as const)('shows %s accuracy as «%s» in Arabic', async (accuracy, label) => {
    const view = await renderUi(<QiblaMetaPanel {...PROPS} accuracy={accuracy} />);

    expect(view.getByTestId('qibla-accuracy-value')).toHaveTextContent(label);
  });

  it.each([
    ['good', 'Good'],
    ['fair', 'Fair'],
    ['poor', 'Low'],
  ] as const)('shows %s accuracy as "%s" in English', async (accuracy, label) => {
    const view = await renderUi(<QiblaMetaPanel {...PROPS} accuracy={accuracy} />, { locale: 'en' });

    expect(view.getByText(label)).toBeOnTheScreen();
  });

  it('shows unavailable accuracy as a dash, labelled «غير متاحة» for screen readers', async () => {
    const view = await renderUi(<QiblaMetaPanel {...PROPS} accuracy="unavailable" />);

    const value = view.getByLabelText('غير متاحة');
    expect(value).toHaveTextContent('—');
    expect(view.queryByText('منخفضة')).toBeNull();
    expect(view.queryByText('متوسطة')).toBeNull();
  });

  it('labels unavailable accuracy "Unavailable" in English', async () => {
    const view = await renderUi(<QiblaMetaPanel {...PROPS} accuracy="unavailable" />, { locale: 'en' });

    expect(view.getByLabelText('Unavailable')).toHaveTextContent('—');
  });


  it('shows the manual city name when the location source is manual', async () => {
    const view = await renderUi(
      <QiblaMetaPanel {...PROPS} cityName={{ ar: 'دبي', en: 'Dubai' }} locationSource="manual" />,
    );

    expect(view.getByText('دبي')).toBeOnTheScreen();
    expect(view.queryByText('تلقائي')).toBeNull();
  });

  it.each(locales)('formats the distance for %s', async (locale) => {
    const view = await renderUi(<QiblaMetaPanel {...PROPS} />, { locale });

    expect(view.getByText(locale === 'ar' ? '١٬٢٤٥ كم' : '1,245 km')).toBeOnTheScreen();
  });

  it('shows the English city name in English', async () => {
    const view = await renderUi(
      <QiblaMetaPanel {...PROPS} cityName={{ ar: 'دبي', en: 'Dubai' }} locationSource="manual" />,
      { locale: 'en' },
    );

    expect(view.getByText('Dubai')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaMetaPanel.tsx')).toEqual([]);
  });
});
