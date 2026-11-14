<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Enums\Era;

/**
 * The provisional age and Hijri convention (Q6, ADR 0089): the first Hijri year is age 53, so ah = age − 52 from age 53; before
 * the Hijra, bh = 53 − age (age 52 is 1 ق.هـ). V11 checks every stated year against it.
 */
final class AgeConvention
{
    private const int HIJRA_AGE = 53;

    /**
     * @return array{era: Era, hijri: int}
     */
    public static function fromAge(int $age): array
    {
        if ($age >= self::HIJRA_AGE) {
            return ['era' => Era::AfterHijra, 'hijri' => $age - (self::HIJRA_AGE - 1)];
        }

        return ['era' => Era::BeforeHijra, 'hijri' => self::HIJRA_AGE - $age];
    }

    /**
     * The age of a Hijri year in its era (the inverse of fromAge).
     */
    public static function ageOf(Era $era, int $hijri): int
    {
        return $era === Era::AfterHijra ? $hijri + (self::HIJRA_AGE - 1) : self::HIJRA_AGE - $hijri;
    }
}
