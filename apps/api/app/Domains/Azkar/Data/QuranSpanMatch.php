<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * The result of matching one ﴿…﴾ span. Holds references and evidence only, never the text.
 *
 * A span may cover more than one range when it runs across surah boundaries (ADR 0031 §11). `ranges` lists them in
 * order, each as [surah, verse_from, verse_to|null]. `check` is the Uthmani comparison of the same verses, a second
 * piece of evidence, or null when no range was found. `basmala` counts the basmala lines the span carries.
 */
final class QuranSpanMatch extends Data
{
    public const string CANDIDATE = 'candidate';

    public const string UNMATCHED = 'unmatched';

    /**
     * @param  list<array{0: int, 1: int, 2: int|null}>  $ranges
     */
    public function __construct(
        public readonly string $status,
        public readonly string $evidence,
        public readonly array $ranges,
        public readonly ?float $check,
        public readonly int $basmala,
    ) {}

    public function isCandidate(): bool
    {
        return $this->status === self::CANDIDATE;
    }

    public function firstSurah(): ?int
    {
        return $this->ranges[0][0] ?? null;
    }

    public function firstFrom(): ?int
    {
        return $this->ranges[0][1] ?? null;
    }

    public function firstTo(): ?int
    {
        return $this->ranges[0][2] ?? null;
    }
}
