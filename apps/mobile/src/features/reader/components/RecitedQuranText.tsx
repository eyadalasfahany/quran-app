import type { ComponentProps } from 'react';

import { QuranText } from '@/shared/ui';

import { RecitedWords } from './RecitedWords';

export { splitRecitedText, type TextPiece } from '../recited-text';

type QuranTextProps = ComponentProps<typeof QuranText>;

export function RecitedQuranText({
  text,
  activeWord,
  ...props
}: Omit<QuranTextProps, 'children'> & { text: string; activeWord: number | null }) {
  if (activeWord === null) {
    return <QuranText {...props}>{text}</QuranText>;
  }

  return (
    <QuranText {...props}>
      <RecitedWords activeWord={activeWord} testID={props.testID} text={text} />
    </QuranText>
  );
}
