<?php

declare(strict_types=1);

namespace App\Domains\Duas\Services;

use App\Support\QuranText\SearchTextNormalizer;

/**
 * Matches verses against four rules for Quranic duas (ADR 0044-duas §2).
 * Rules are ordered by specificity for matched() call.
 */
final class QuranDuaCandidateFinder
{
    /**
     * Supplication imperatives for rule 4 (ربنا/رب within 3 words of an imperative).
     * Normalized forms only; never contains text.
     */
    private const array IMPERATIVE_LIST = [
        'اغفر', 'استغفر', 'سامح', 'ارحم', 'اعف', 'اصف', 'حمني', 'حفظني',
        'احمني', 'احصني', 'بارك', 'اعني', 'انصرني', 'قوني', 'اشفني',
        'اكفني', 'اكفيني', 'اعز', 'اذلل', 'اخزل', 'اعن', 'اثبت', 'امكن',
        'اشرح', 'يسر', 'استيسر', 'وسع', 'اوسع', 'احط', 'احاط', 'احيط',
        'اصلح', 'اسلم', 'سلم', 'عافني', 'عاف', 'احم', 'احيني', 'احينا',
        'سقني', 'ارونا', 'اتنا', 'انزل', 'انزلت', 'اكتب', 'اكتبنا',
        'اثبتنا', 'اعتقنا', 'احقق', 'ادم', 'ادمت', 'احفظ', 'احفظنا',
    ];

    /**
     * Find candidate Quranic duas in the given verse texts.
     *
     * @param  array<string, string>  $verseMap  Keyed quran:surah:ayah => text (from the command's Tanzil parsing)
     * @param  array<string, list<array<array-key, mixed>>>  $existing  Current map rows to preserve
     * @return array{rows: array<string, list<array<array-key, mixed>>>, stats: array<string, int>}
     */
    public function findCandidates(
        array $verseMap,
        array $existing,
        SearchTextNormalizer $normalizer,
    ): array {
        $rows = [];
        $stats = [
            'rule_vocative_rabb' => 0,
            'rule_speech_verb' => 0,
            'rule_contains_allahumma' => 0,
            'rule_imperative_list' => 0,
            'total_candidates' => 0,
            'preserved' => 0,
        ];

        foreach ($verseMap as $key => $text) {
            $normalized = $normalizer->normalize($text);
            $rule = $this->matchedRule($normalized);

            if ($rule !== null) {
                // Parse surah:ayah from key quran:surah:ayah
                $parts = explode(':', $key);
                $surah = (int) ($parts[1] ?? 1);
                $ayah = (int) ($parts[2] ?? 1);

                $rows[$key] = [
                    [
                        $surah,
                        $ayah,
                        null,
                        'status' => 'candidate',
                        'rule' => $rule,
                    ],
                ];
                $stats['total_candidates']++;
                $stats[$rule]++;
            }
        }

        // Preserve existing non-candidate statuses (bug fix: don't overwrite reviewed/rejected/added)
        foreach ($existing as $key => $spans) {
            // Check if this key has a preserved status (regardless of whether it's a new candidate)
            $hasPreservedStatus = false;
            foreach ($spans as $span) {
                $status = $span['status'] ?? null;
                if ($status && in_array($status, ['reviewed', 'rejected', 'added'], true)) {
                    $hasPreservedStatus = true;
                    break;
                }
            }

            if ($hasPreservedStatus) {
                // This key has a reviewed/rejected/added status: preserve it exactly, even if a new candidate matches
                $rows[$key] = $spans;
                $stats['preserved']++;
            } elseif (! array_key_exists($key, $rows)) {
                // No new candidate and no preserved status: keep the existing row as-is
                $rows[$key] = $existing[$key];
            }
        }

        return [
            'rows' => $rows,
            'stats' => $stats,
        ];
    }

    /**
     * Match a normalized verse against the four rules. Returns the rule name or null.
     *
     * Rule 1: Verse begins with ربنا or رب (with optional leading و)
     * Rule 2: Speech verb (قال, قالوا, قل, يقولون) + vocative (ربنا, رب, or اللهم)
     * Rule 3: Verse contains اللهم
     * Rule 4: ربنا or رب within 3 words of a supplication imperative
     */
    private function matchedRule(string $normalized): ?string
    {
        // Rule 1: Starts with ربنا or رب (optional leading و)
        $trimmed = ltrim($normalized, 'و');
        if (str_starts_with($trimmed, 'ربنا') || str_starts_with($trimmed, 'رب ')) {
            return 'rule_vocative_rabb';
        }

        // Rule 3: Contains اللهم (check this before rule 2 for efficiency)
        if (str_contains($normalized, 'اللهم')) {
            return 'rule_contains_allahumma';
        }

        // Rule 2: Speech verb + vocative
        $speechVerbs = ['قال', 'قالوا', 'قل ', 'يقولون'];
        foreach ($speechVerbs as $verb) {
            if (str_starts_with($normalized, $verb)) {
                $afterVerb = substr($normalized, strlen($verb));
                if (
                    str_starts_with(ltrim($afterVerb), 'ربنا') ||
                    str_starts_with(ltrim($afterVerb), 'رب ') ||
                    str_contains($afterVerb, 'اللهم')
                ) {
                    return 'rule_speech_verb';
                }
            }
        }

        // Rule 4: ربنا/رب within 3 words of an imperative
        if ($this->hasVocativeNearImperative($normalized)) {
            return 'rule_imperative_list';
        }

        return null;
    }

    /**
     * Check if ربنا or رب appears within 3 words of a supplication imperative.
     */
    private function hasVocativeNearImperative(string $normalized): bool
    {
        $words = preg_split('/\s+/u', $normalized, -1, PREG_SPLIT_NO_EMPTY);
        if ($words === false) {
            return false;
        }

        // Normalize imperative list to simple keys for faster lookup
        $imperativeMap = array_flip(self::IMPERATIVE_LIST);

        foreach ($words as $index => $word) {
            if ($word === 'ربنا' || $word === 'رب') {
                // Check 3 words before and after
                for ($i = max(0, $index - 3); $i <= min(count($words) - 1, $index + 3); $i++) {
                    if ($i !== $index && isset($imperativeMap[$words[$i]])) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
