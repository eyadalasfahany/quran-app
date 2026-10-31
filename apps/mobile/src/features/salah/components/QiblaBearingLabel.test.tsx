import { typeScale } from '@quran/design-tokens';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { QiblaBearingLabel } from './QiblaBearingLabel';

const colors = themes.light.colors;

describe('QiblaBearingLabel', () => {
  it('renders the bearing in Arabic-Indic digits with the true-north caption in Arabic', async () => {
    const view = await renderUi(<QiblaBearingLabel bearing={244} />);

    const readout = view.getByText('٢٤٤°');
    expect(readout).toBeOnTheScreen();
    // displayLg is an Amiri display token, so it lives outside theme.text (ui styles only).
    expect(flatStyle(readout.props.style)).toMatchObject({
      color: colors.playerInk,
      fontSize: typeScale.displayLg.size,
      lineHeight: typeScale.displayLg.lineHeight,
    });
    expect(view.getByText('درجة من الشمال الحقيقي')).toBeOnTheScreen();
  });

  it('renders Western digits and the English caption in English', async () => {
    const view = await renderUi(<QiblaBearingLabel bearing={244} />, { locale: 'en' });

    expect(view.getByText('244°')).toBeOnTheScreen();
    expect(view.getByText('degrees from true north')).toBeOnTheScreen();
  });

  it('rounds fractional bearings', async () => {
    const view = await renderUi(<QiblaBearingLabel bearing={243.6} />);

    expect(view.getByText('٢٤٤°')).toBeOnTheScreen();
  });

  it('mutes the caption in the player palette', async () => {
    const view = await renderUi(<QiblaBearingLabel bearing={244} />);

    expect(flatStyle(view.getByText('درجة من الشمال الحقيقي').props.style).color).toBe(colors.playerMuted);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaBearingLabel.tsx')).toEqual([]);
  });
});
