<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum LanguageCode: string
{
    case Arabic = 'ar';
    case English = 'en';
    case Urdu = 'ur';
    case Persian = 'fa';
    case Indonesian = 'id';
    case Turkish = 'tr';
    case French = 'fr';
    case Bengali = 'bn';
    case Spanish = 'es';
    case Russian = 'ru';
    case German = 'de';
    case Malay = 'ms';
    case Chinese = 'zh';

    public static function fromQfName(string $name): ?self
    {
        return match (strtolower($name)) {
            'arabic' => self::Arabic,
            'english' => self::English,
            'urdu' => self::Urdu,
            'persian' => self::Persian,
            'indonesian' => self::Indonesian,
            'turkish' => self::Turkish,
            'french' => self::French,
            'bengali' => self::Bengali,
            'spanish' => self::Spanish,
            'russian' => self::Russian,
            'german' => self::German,
            'malay' => self::Malay,
            'chinese' => self::Chinese,
            default => null,
        };
    }

    public function direction(): TextDirection
    {
        return match ($this) {
            self::Arabic, self::Urdu, self::Persian => TextDirection::Rtl,
            default => TextDirection::Ltr,
        };
    }
}
