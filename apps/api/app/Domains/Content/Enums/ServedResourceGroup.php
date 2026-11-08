<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum ServedResourceGroup: string
{
    case QuranCore = 'quran_core';
    case Mushafs = 'mushafs';
    case Tafsirs = 'tafsirs';
    case Recitations = 'recitations';
    case ChapterRecitations = 'chapter_recitations';
    case Hadith = 'hadith';
    case Azkar = 'azkar';
    case Names = 'names';
    case Duas = 'duas';
    case HadithCollections = 'hadith_collections';
    case HadithExplanations = 'hadith_explanations';

    public static function fromResourceGroup(ResourceGroup $group): self
    {
        return self::from($group->value);
    }
}
