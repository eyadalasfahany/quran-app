import type { ReactElement } from 'react';

import { WIDGET_FONTS } from './fonts';
import { label, startAlign } from './primitives';

type TextProps = { style: { textAlign?: string; width?: string } };

describe('label', () => {
  const options = { color: '#13231f', font: WIDGET_FONTS.medium, size: 12 } as const;

  it('fills its column so Arabic text sits on the right, not the left edge', () => {
    const element = label('الصلاة القادمة', options, true) as ReactElement<TextProps>;

    expect(element.props.style.textAlign).toBe('right');
    expect(element.props.style.width).toBe('match_parent');
  });

  it('aligns English text on the left, also full width', () => {
    const element = label('Next prayer', options, false) as ReactElement<TextProps>;

    expect(element.props.style.textAlign).toBe(startAlign(false));
    expect(element.props.style.width).toBe('match_parent');
  });

  it('keeps an inline label its own width, for a row beside other items', () => {
    const element = label('٦:٣٧ م', { ...options, inline: true }, true) as ReactElement<TextProps>;

    expect(element.props.style.width).toBeUndefined();
  });
});
