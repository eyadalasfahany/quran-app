import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { stageBands, type StageKey } from '../logic';

import { alongSize, alongStart, type TimelineOrientation } from './timeline-axis';

const BAND_THICKNESS = 6;

/**
 * The four life stages as coloured bands along the axis (الطفولة، الصبا، الشباب، الكهولة), each with its name. The
 * stage of the selected age keeps full strength and the others fade. Decorative: the timeline's value text names the stage.
 */
export function StageBands({
  orientation = 'horizontal',
  activeStage = null,
  testID,
}: {
  orientation?: TimelineOrientation;
  /** The stage that holds the selected age; null when no age is selected (every band at full strength). */
  activeStage?: StageKey | null;
  testID?: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const colors: Record<StageKey, string> = {
    childhood: theme.colors.highlightGold,
    adolescence: theme.colors.highlightGreen,
    youth: theme.colors.highlightBlue,
    maturity: theme.colors.highlightRose,
  };
  const horizontal = orientation === 'horizontal';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ flex: 1 }}
      testID={testID}
    >
      {stageBands().map((band) => {
        const faded = activeStage !== null && activeStage !== band.key;
        const opacity = faded ? theme.opacity.disabled : 1;
        return (
          <View
            key={band.key}
            style={[
              { position: 'absolute' },
              alongStart(orientation, band.start),
              alongSize(orientation, band.size),
              horizontal ? { bottom: 0, top: 0 } : { end: 0, start: 0 },
            ]}
          >
            <View
              style={[
                {
                  backgroundColor: colors[band.key],
                  borderRadius: BAND_THICKNESS / 2,
                  opacity,
                  position: 'absolute',
                },
                horizontal
                  ? { height: BAND_THICKNESS, marginHorizontal: 1, start: 0, end: 0, top: 0 }
                  : { width: BAND_THICKNESS, marginVertical: 1, top: 0, bottom: 0, start: 0 },
              ]}
              testID={testID ? `${testID}-${band.key}` : undefined}
            />
            <UiText
              align="center"
              numberOfLines={1}
              scale="bar"
              style={[
                // The name keeps full strength; only the band fades (frame SeerahMapRegionYear).
                { opacity: 1 },
                horizontal
                  ? { fontSize: 11, lineHeight: 14, marginHorizontal: -6, marginTop: BAND_THICKNESS + 2 }
                  : { marginStart: BAND_THICKNESS + 8, position: 'absolute', top: 0 },
                activeStage === band.key ? { color: theme.colors.brand } : null,
              ]}
              tone="muted"
              variant="label"
              weight={activeStage === band.key ? 700 : 500}
            >
              {t(`seerah.stages.${band.key}`)}
            </UiText>
          </View>
        );
      })}
    </View>
  );
}
