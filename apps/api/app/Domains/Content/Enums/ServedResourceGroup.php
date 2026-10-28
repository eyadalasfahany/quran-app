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

    public static function fromResourceGroup(ResourceGroup $group): self
    {
        return self::from($group->value);
    }
}
