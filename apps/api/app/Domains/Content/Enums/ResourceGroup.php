<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum ResourceGroup: string
{
    case QuranCore = 'quran_core';
    case Mushafs = 'mushafs';
    // Ignored, ADR 0014: the sync skips these groups and no row is written.
    case Translations = 'translations';
    case Tafsirs = 'tafsirs';
    // Ignored, ADR 0014.
    case WordByWordTranslations = 'word_by_word_translations';
    // Ignored, ADR 0014.
    case WordByWordTransliterations = 'word_by_word_transliterations';
    case Recitations = 'recitations';
    case ChapterRecitations = 'chapter_recitations';
    case Hadith = 'hadith';
    // ADR 0031: Azkar content is delivered as a fourth content-pack group.
    case Azkar = 'azkar';

    public function isIgnored(): bool
    {
        return match ($this) {
            self::Translations, self::WordByWordTranslations, self::WordByWordTransliterations => true,
            default => false,
        };
    }

    /**
     * @return list<string>
     */
    public static function ignoredValues(): array
    {
        return array_values(array_map(
            fn (self $group): string => $group->value,
            array_filter(self::cases(), fn (self $group): bool => $group->isIgnored()),
        ));
    }
}
