<?php

declare(strict_types=1);

namespace App\Support\QuranText;

final class AyahChecksum
{
    /**
     * SHA-256 of the ayah texts joined by a newline, in the given order, with no changes to the texts.
     *
     * @param  iterable<string>  $texts
     */
    public static function compute(iterable $texts): string
    {
        $context = hash_init('sha256');
        $needsSeparator = false;

        foreach ($texts as $text) {
            if ($needsSeparator) {
                hash_update($context, "\n");
            }

            hash_update($context, $text);
            $needsSeparator = true;
        }

        return hash_final($context);
    }
}
