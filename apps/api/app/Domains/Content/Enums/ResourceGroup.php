<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum ResourceGroup: string
{
    case QuranCore = 'quran_core';
    case Mushafs = 'mushafs';
    case Translations = 'translations';
    case Tafsirs = 'tafsirs';
    case WordByWordTranslations = 'word_by_word_translations';
    case WordByWordTransliterations = 'word_by_word_transliterations';
    case Recitations = 'recitations';
    case ChapterRecitations = 'chapter_recitations';
    case Hadith = 'hadith';
}
