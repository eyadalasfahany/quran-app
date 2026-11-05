import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { displayText } from '@/shared/ui';

import { MyDuaBody } from './MyDuaBody';

const BODY = '  FIXTURE text 1 — not a dua  \n second line ';
const CAPTION = 'FIXTURE title · من كتابتك';

describe('MyDuaBody', () => {
  it('shows the body exactly as written, with its spaces and line breaks', async () => {
    await renderUi(<MyDuaBody body={BODY} caption={CAPTION} />);
    expect(screen.getByText(BODY)).toBeOnTheScreen();
  });

  it('shows the one-line caption under the body', async () => {
    await renderUi(<MyDuaBody body={BODY} caption={CAPTION} />);
    const caption = screen.getByTestId('my-dua-body-caption');
    expect(caption).toHaveTextContent(CAPTION);
    expect(caption.props.numberOfLines).toBe(1);
  });

  it('does not truncate the body', async () => {
    await renderUi(<MyDuaBody body={BODY} caption={CAPTION} />);
    expect(screen.getByText(BODY).props.numberOfLines).toBeUndefined();
  });

  it('scales the text with fontScale, as the dhikr text does', async () => {
    await renderUi(<MyDuaBody body={BODY} caption={CAPTION} fontScale={1.5} />);
    const size = StyleSheet.flatten(screen.getByText(BODY).props.style).fontSize;
    expect(size).toBe(displayText('dhikr', 1.5).fontSize);
    expect(size).not.toBe(displayText('dhikr', 1).fontSize);
  });

  it('renders in English layout', async () => {
    await renderUi(<MyDuaBody body={BODY} caption={CAPTION} />, { locale: 'en' });
    expect(screen.getByText(BODY)).toBeOnTheScreen();
  });

  it('uses fixture and i18n only in source', () => {
    expect(featureComponentLiterals('features/duas/components/MyDuaBody.tsx')).toEqual([]);
  });
});
