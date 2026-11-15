import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { displayText } from '@/shared/ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DuaHadithBody } from './DuaHadithBody';

const FIXTURE_TEXT = 'FIXTURE text 1 — not a dua';

describe('DuaHadithBody', () => {
  it('renders the text', async () => {
    await renderUi(<DuaHadithBody text={FIXTURE_TEXT} />);
    expect(screen.getByTestId('dua-hadith-body')).toBeOnTheScreen();
    expect(screen.getByText(FIXTURE_TEXT)).toBeOnTheScreen();
  });

  it('shows no narrator or source line', async () => {
    await renderUi(<DuaHadithBody text={FIXTURE_TEXT} />);
    expect(screen.queryByText(/المصدر|HadeethEnc|راوي/)).toBeNull();
    expect(screen.getByTestId('dua-hadith-body').children).toHaveLength(1);
  });

  it('renders in English layout', async () => {
    await renderUi(<DuaHadithBody text={FIXTURE_TEXT} />, { locale: 'en' });
    expect(screen.getByText(FIXTURE_TEXT)).toBeOnTheScreen();
  });

  it('scales the text with fontScale, as the dhikr text does', async () => {
    await renderUi(<DuaHadithBody fontScale={1.5} text={FIXTURE_TEXT} />);
    const size = StyleSheet.flatten(screen.getByText(FIXTURE_TEXT).props.style).fontSize;
    expect(size).toBe(displayText('dhikr', 1.5).fontSize);
    expect(size).not.toBe(displayText('dhikr', 1).fontSize);
  });

  it('renders the text in the default scale when fontScale is omitted', async () => {
    await renderUi(<DuaHadithBody text={FIXTURE_TEXT} />);
    const size = StyleSheet.flatten(screen.getByText(FIXTURE_TEXT).props.style).fontSize;
    expect(size).toBe(displayText('dhikr', 1).fontSize);
  });

  it('uses fixture and i18n only in source', () => {
    expect(featureComponentLiterals('features/duas/components/DuaHadithBody.tsx')).toEqual([]);
  });
});
