import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { displayFontFamilies, useTheme } from '@/core/theme';

import { CoverOrnament } from './CoverOrnament';
import { coverGround, coverMetrics, coverOrnament, type CoverSize } from './collection-cover';

// The frames set the title at line height 1.3. The cover has a fixed size, so the title's text scaling is capped here
// instead of using UiText (no UiText variant fits an 11 or 12 pt display title).
const TITLE_MAX_FONT_SCALE = 1.2;
const TITLE_LINE_HEIGHT_RATIO = 1.3;
// Corners are physical, as the frames draw them (border-radius on the left and right sides).
const CORNER_START = 4;
const CORNER_END = 6;
const PAGE_EDGE_RADIUS = 2;
const FRAME_RADIUS = 2;

// A bound book drawn from tokens: a ground, a spine, a page edge, a gold frame line, one ornament and a cream title.
// The title is optional: a null or empty title draws the ornament only, with no text at all.
export function CollectionCover({
  slug,
  title,
  size = 'list',
  accessibilityLabel,
  testID,
}: {
  /** A collection slug. A null or unknown slug uses the neutral ground and the star. */
  slug: string | null;
  /** The Arabic title (Arabic UI) or the source title_en (English UI). Null draws the ornament only. */
  title: string | null;
  size?: CoverSize;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const metrics = coverMetrics[size];
  const { colors } = theme;
  const ornamentColor = colors.coverOrnament;
  const hasTitle = title !== null && title !== '';
  const label = accessibilityLabel ?? (hasTitle ? t('ui.collectionCover.titled', { title }) : t('ui.collectionCover.untitled'));

  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityRole="image"
      style={{
        backgroundColor: colors[coverGround(slug)],
        borderBottomLeftRadius: CORNER_START,
        borderBottomRightRadius: CORNER_END,
        borderTopLeftRadius: CORNER_START,
        borderTopRightRadius: CORNER_END,
        boxShadow: '3px 6px 12px ' + colors.coverShadow + ', 0px 1px 2px ' + colors.coverShadowSoft,
        height: metrics.height,
        overflow: 'hidden',
        width: metrics.width,
      }}
      testID={testID}
    >
      <View
        style={{
          backgroundColor: colors.coverSpine,
          bottom: 0,
          boxShadow: 'inset -1px 0 0 ' + colors.coverSpineEdge,
          position: 'absolute',
          start: 0,
          top: 0,
          width: metrics.spineWidth,
        }}
        testID={testID ? `${testID}-spine` : undefined}
      />
      <View
        style={{
          backgroundColor: colors.coverPageEdge,
          borderBottomRightRadius: PAGE_EDGE_RADIUS,
          borderTopRightRadius: PAGE_EDGE_RADIUS,
          bottom: 2,
          end: 0,
          position: 'absolute',
          top: 2,
          width: metrics.pageEdgeWidth,
        }}
        testID={testID ? `${testID}-page-edge` : undefined}
      />
      <View
        style={{
          borderColor: colors.coverFrameLine,
          borderRadius: FRAME_RADIUS,
          borderWidth: theme.stroke.hairline,
          bottom: metrics.frameInsetY,
          end: metrics.frameInsetEnd,
          position: 'absolute',
          start: metrics.frameInsetStart,
          top: metrics.frameInsetY,
        }}
        testID={testID ? `${testID}-frame` : undefined}
      />
      <View style={{ position: 'absolute', start: metrics.ornamentStart, top: metrics.ornamentTop }}>
        <CoverOrnament
          color={ornamentColor}
          shape={coverOrnament(slug)}
          size={metrics.ornamentSize}
          testID={testID ? `${testID}-ornament` : undefined}
        />
      </View>
      {hasTitle ? (
        <Text
          maxFontSizeMultiplier={TITLE_MAX_FONT_SCALE}
          numberOfLines={2}
          style={{
            bottom: metrics.titleBottom,
            color: colors.coverTitle,
            end: metrics.titleInsetEnd,
            fontFamily: displayFontFamilies[700],
            fontSize: metrics.titleSize,
            lineHeight: Math.round(metrics.titleSize * TITLE_LINE_HEIGHT_RATIO),
            position: 'absolute',
            start: metrics.titleInsetStart,
            textAlign: 'center',
          }}
          testID={testID ? `${testID}-title` : undefined}
        >
          {title}
        </Text>
      ) : null}
    </View>
  );
}
