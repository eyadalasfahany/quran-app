import { NumberRing } from '@/shared/ui';

/**
 * The position of a Duas card (screens/, #DuasCategory): the shared gold-ringed badge (`NumberRing`), in Amiri with
 * Arabic-Indic digits as on the Azkar medallion. Decorative; the card around it carries the label.
 */
export function DuasCardNumber({ number, testID = 'duas-card-number' }: { number: number; testID?: string }) {
  return <NumberRing number={number} testID={testID} />;
}
