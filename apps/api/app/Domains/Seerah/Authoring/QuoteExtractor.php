<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Authoring;

use App\Domains\Seerah\Exceptions\SeerahAuthoringException;

/**
 * Extracts the exact substring of one paragraph from one word to another (`seerah:quote`). Words are compared after the search
 * normalisation and punctuation is ignored. The result is a byte-identical slice of the paragraph: it is the only way a quote enters
 * the data (ADR 0089 §3). The range never leaves the paragraph.
 */
final class QuoteExtractor
{
    /**
     * @return array{text: string, start: int, end: int}
     *
     * @throws SeerahAuthoringException when a word is not in the paragraph, or the end word is not after the start word
     */
    public function extract(string $paragraph, string $fromWord, string $toWord, int $occurrence = 1): array
    {
        $tokens = $this->tokens($paragraph);
        $from = $this->key($fromWord);
        $to = $this->key($toWord);

        if ($from === '' || $to === '') {
            throw new SeerahAuthoringException('The start and end words must hold a letter.');
        }

        $seen = 0;
        $fromIndex = null;

        foreach ($tokens as $index => [$key]) {
            if ($key === $from) {
                $seen++;

                if ($seen === $occurrence) {
                    $fromIndex = $index;

                    break;
                }
            }
        }

        if ($fromIndex === null) {
            throw new SeerahAuthoringException('The start word is not in this paragraph.');
        }

        for ($index = $fromIndex; $index < count($tokens); $index++) {
            if ($tokens[$index][0] === $to) {
                $start = $tokens[$fromIndex][1];
                $end = $tokens[$index][2];

                return ['text' => substr($paragraph, $start, $end - $start), 'start' => $start, 'end' => $end];
            }
        }

        throw new SeerahAuthoringException('The end word is not in this paragraph after the start word.');
    }

    /**
     * @return list<array{string, int, int}> key, byte start, byte end
     */
    private function tokens(string $paragraph): array
    {
        preg_match_all('/\S+/u', $paragraph, $matches, PREG_OFFSET_CAPTURE);
        $tokens = [];

        foreach ($matches[0] as [$token, $offset]) {
            $tokens[] = [$this->key($token), $offset, $offset + strlen($token)];
        }

        return $tokens;
    }

    /**
     * The comparison key of a word: punctuation removed, then the search normalisation.
     */
    public function key(string $word): string
    {
        $bare = preg_replace('/[\p{P}\p{S}]+/u', '', $word) ?? '';

        return SearchText::normalise($bare);
    }
}
