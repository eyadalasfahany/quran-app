import { useState, type ComponentProps } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useQuranFont, useTheme } from '@/core/theme';
import { QuranText } from '@/shared/ui';

import { splitRecitedText } from '../recited-text';
import { clampToWidth, pillMove, pillRect, recitedTokenIndex, tokenRects, tokensOf, type PillLine, type TokenRect } from '../word-pill';
import { RecitedWordPill } from './RecitedWordPill';
import { RecitedWords } from './RecitedWords';

export { splitRecitedText, type TextPiece } from '../recited-text';

type QuranTextProps = ComponentProps<typeof QuranText>;
type TextLayoutHandler = NonNullable<QuranTextProps['onTextLayout']>;

/**
 * An ayah's Quran text with the recited word marked. `wordMotion` 'span' (Mushaf, the default) marks the word with a
 * background span. 'pill' (Reading and Focus, ADR 0039) draws a pill behind the word from measured word positions, so
 * it can slide between words; the Quran text is still one QuranText, unchanged. Until the positions are measured the
 * span marking stands in.
 */
export function RecitedQuranText({
  text,
  activeWord,
  wordMotion = 'span',
  ...props
}: Omit<QuranTextProps, 'children'> & { text: string; activeWord: number | null; wordMotion?: 'span' | 'pill' }) {
  const theme = useTheme();
  const font = useQuranFont();
  const { onTextLayout, style, ...rest } = props;
  const pillMode = wordMotion === 'pill' && activeWord !== null;
  const variant = props.variant;
  const fontScale = props.fontScale ?? 1;
  const key = `${variant}|${fontScale}|${font}|${text}`;

  const pieces = splitRecitedText(text, activeWord ?? 0);
  const tokens = tokensOf(pieces);
  const index = recitedTokenIndex(pieces);

  const [layoutState, setLayoutState] = useState<{ key: string; lines: PillLine[] } | null>(null);
  const [widthState, setWidthState] = useState<{ key: string; widths: (number | undefined)[] }>({ key: '', widths: [] });
  const [containerWidth, setContainerWidth] = useState(0);
  const [arrivedKey, setArrivedKey] = useState('');
  // The last recited box and how the pill got to it. A change in the box (or the ayah) is recorded during render, the
  // React way to derive state from props; the move is then the one from the previous box, so it never flips.
  const [seen, setSeen] = useState<{ key: string; box: string; token: TokenRect | null; move: 'slide' | 'jump' }>({
    box: '',
    key: '',
    move: 'jump',
    token: null,
  });

  const lines = layoutState !== null && layoutState.key === key ? layoutState.lines : [];
  const widths = widthState.key === key ? widthState.widths : [];
  const widthsKnown = tokens.length > 0 && tokens.every((_, position) => widths[position] !== undefined);

  const rects = tokenRects(tokens, widths, lines);
  const token = index >= 0 ? (rects[index] ?? null) : null;
  const line = token === null ? undefined : lines[token.line];
  const pillBox =
    token !== null && line !== undefined
      ? clampToWidth(pillRect(token, line, theme.space[1], theme.space[1] / 2), containerWidth)
      : null;

  const recitedKey = `${key}|${index}`;
  const tokenBox = token === null ? '' : `${token.line}:${token.x}:${token.y}:${token.width}:${token.height}`;
  const changed = seen.key !== key || seen.box !== tokenBox;
  const move = changed ? (seen.key === key ? pillMove(seen.token, token) : 'jump') : seen.move;
  if (changed) {
    setSeen({ box: tokenBox, key, move, token });
  }
  const arrived = move === 'jump' || arrivedKey === recitedKey;

  if (!pillMode) {
    if (activeWord === null) {
      return <QuranText {...props}>{text}</QuranText>;
    }
    return (
      <QuranText {...props}>
        <RecitedWords activeWord={activeWord} testID={props.testID} text={text} />
      </QuranText>
    );
  }

  const handleTextLayout: TextLayoutHandler = (event) => {
    setLayoutState({ key, lines: [...event.nativeEvent.lines] });
    onTextLayout?.(event);
  };

  const onProbeLayout = (position: number, width: number) => {
    setWidthState((current) => {
      const base = current.key === key ? current.widths : [];
      if (base[position] === width) {
        return current;
      }
      const next = [...base];
      next[position] = width;
      return { key, widths: next };
    });
  };

  const { backgroundColor, ...textStyle } = StyleSheet.flatten(style) ?? {};

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setContainerWidth(event.nativeEvent.layout.width)}
      style={{ backgroundColor }}
    >
      {pillBox === null ? null : (
        <RecitedWordPill
          containerWidth={containerWidth}
          move={move}
          onArrive={() => setArrivedKey(recitedKey)}
          rect={pillBox}
          testID={props.testID ? `${props.testID}-pill` : undefined}
        />
      )}
      <QuranText {...rest} onTextLayout={handleTextLayout} style={textStyle}>
        <RecitedWords
          activeWord={activeWord ?? 0}
          colored={arrived}
          marking={pillBox === null ? 'span' : 'color'}
          testID={props.testID}
          text={text}
        />
      </QuranText>
      {widthsKnown ? null : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={{ alignItems: 'flex-start', opacity: 0, position: 'absolute', start: 0, top: 0, width: 4096 }}
        >
          {tokens.map((item, position) => (
            <QuranText
              fontScale={fontScale}
              key={position}
              onLayout={(event: LayoutChangeEvent) => onProbeLayout(position, event.nativeEvent.layout.width)}
              testID={props.testID ? `${props.testID}-probe-${position}` : undefined}
              variant={variant}
            >
              {item.text}
            </QuranText>
          ))}
        </View>
      )}
    </View>
  );
}
