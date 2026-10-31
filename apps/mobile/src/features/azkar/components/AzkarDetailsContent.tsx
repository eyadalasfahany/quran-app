import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';

import type { AzkarEntryDetail, AzkarNote, AzkarNoteKind } from '../data/model';
import { hasArabic } from '../data/reader-units';
import { referenceNumber } from '../reader-model';
import { AzkarDetailsSection } from './AzkarDetailsSection';
import { stepText } from './AzkarStepNote';
import type { Locale } from '@/core/i18n';

/** Note kinds in display order, with the section title key of each. Occasion and instructions come first. */
const NOTE_SECTIONS: readonly { kind: AzkarNoteKind; titleKey: 'context' | 'meaning' | 'virtue' | 'reference' | 'grade' }[] = [
  { kind: 'context', titleKey: 'context' },
  { kind: 'explanation', titleKey: 'meaning' },
  { kind: 'virtue', titleKey: 'virtue' },
  { kind: 'reference', titleKey: 'reference' },
  { kind: 'grade', titleKey: 'grade' },
];

/** A note's text in the interface language. Arabic is never replaced by English, and English never by Arabic. */
export function noteBody(note: AzkarNote, locale: Locale): string | null {
  const text = locale === 'ar' ? note.textAr : note.textEn;
  return text ?? note.grader;
}

/** A note's caption: its source name and reference, when sourced. */
export function noteCaption(note: AzkarNote, t: (key: string, options?: Record<string, string>) => string, locale: Locale): string | null {
  if (note.sourceName.trim().length === 0) {
    return null;
  }
  if (note.sourceReference === null || note.sourceReference.trim().length === 0) {
    return t('azkar.details.sourceCaptionNoReference', { name: note.sourceName });
  }
  return t('azkar.details.sourceCaption', { name: note.sourceName, reference: referenceNumber(note.sourceReference, locale) });
}

/**
 * The details of an entry, in the order المناسبة، التعليمات، السياق، المعنى، الفضل، المرجع، الدرجة، المصدر. Every section
 * is shown only when it has content. No section is ever filled in by the app.
 */
export function AzkarDetailsContent({ detail, testID = 'azkar-details-content' }: { detail: AzkarEntryDetail; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const translate = t as unknown as (key: string, options?: Record<string, string>) => string;

  const occasion = detail.entry.occasion;
  const occasionText = occasion === null ? null : translate(`azkar.occasions.${occasion}`);

  const instructions = detail.items
    .filter((item) => item.kind !== 'recitation')
    .filter((item) => (locale === 'ar' ? hasArabic(item) : item.textEn !== null));
  const instructionText = instructions
    .map((item) => (locale === 'ar' ? stepText(item) : (item.textEn ?? '')))
    .filter((text) => text.length > 0)
    .join(' ');

  const reference = detail.entry.sourceReference.trim().length === 0 ? null : referenceNumber(detail.entry.sourceReference, locale);

  return (
    <View style={{ paddingBottom: theme.space[6] }} testID={testID}>
      <AzkarDetailsSection body={occasionText} title={t('azkar.details.occasion')} />
      <AzkarDetailsSection body={instructionText || null} title={t('azkar.details.instructions')} />
      {NOTE_SECTIONS.flatMap(({ kind, titleKey }) =>
        detail.notes[kind].map((note) => (
          <AzkarDetailsSection
            body={noteBody(note, locale)}
            caption={noteCaption(note, translate, locale)}
            key={`${kind}-${note.id}`}
            testID={`azkar-details-${kind}`}
            title={t(`azkar.details.${titleKey}`)}
          />
        )),
      )}
      <AzkarDetailsSection
        body={reference === null ? null : t('azkar.details.bookNumber', { number: reference })}
        title={t('azkar.details.source')}
      />
    </View>
  );
}
