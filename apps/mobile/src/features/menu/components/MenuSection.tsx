import { Children, createContext, useContext, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { menuToneColors, type MenuTone } from './menuTone';

export type MenuSectionColumns = 2 | 3;

const MenuToneContext = createContext<MenuTone>('green');

/** The tone of the section a card sits in; a card outside any section is green. */
export function useMenuSectionTone(): MenuTone {
  return useContext(MenuToneContext);
}

/**
 * One titled block of the menu (screens/frames/menu, #MenuSections): the title in the section's colour, then its cards
 * in even rows, two columns on a phone and three where the window is wide (ADR 0036). Cards read the section's tone, so
 * their icon tiles share its colour. Null children are dropped, and with none left the whole section is not drawn.
 * Without a `tone` the title is plain ink and each card keeps its own tone (the continue section).
 */
export function MenuSection({
  title,
  tone,
  columns = 2,
  children,
  testID,
}: {
  title: string;
  tone?: MenuTone;
  columns?: MenuSectionColumns;
  children: ReactNode;
  testID: string;
}) {
  const theme = useTheme();
  const items = Children.toArray(children);
  if (items.length === 0) return null;

  const rows = Array.from({ length: Math.ceil(items.length / columns) }, (_, row) =>
    items.slice(row * columns, row * columns + columns),
  );
  const titleColor = tone === undefined ? theme.colors.ink : menuToneColors(theme.colors, tone).ink;

  return (
    <MenuToneContext.Provider value={tone ?? 'green'}>
      <View style={{ gap: theme.space[3] }} testID={testID}>
        <UiText accessibilityRole="header" style={{ color: titleColor }} testID={`${testID}-title`} variant="headline" weight={700}>
          {title}
        </UiText>
        {rows.map((row, index) => (
          <View key={index} style={{ flexDirection: 'row', gap: theme.space[3] }} testID={`${testID}-row-${index}`}>
            {row.map((item, slot) => (
              <View key={slot} style={{ flex: 1, minWidth: 0 }}>
                {item}
              </View>
            ))}
            {/* Empty slots keep a short last row's cards one column wide. */}
            {Array.from({ length: columns - row.length }, (_, slot) => (
              <View key={`empty-${slot}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}
      </View>
    </MenuToneContext.Provider>
  );
}
