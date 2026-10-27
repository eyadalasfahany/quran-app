<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

/**
 * Opaque cursor: base64url of the last content_changes id, without padding.
 */
final class ChangeCursor
{
    public static function encode(int $id): string
    {
        return rtrim(strtr(base64_encode((string) $id), '+/', '-_'), '=');
    }

    public static function decode(string $cursor): ?int
    {
        if ($cursor === '' || preg_match('/^[A-Za-z0-9_-]+$/', $cursor) !== 1) {
            return null;
        }

        $padded = strtr($cursor, '-_', '+/');
        $remainder = strlen($padded) % 4;

        if ($remainder !== 0) {
            $padded .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode($padded, true);

        if ($decoded === false || preg_match('/^[1-9][0-9]*$/', $decoded) !== 1) {
            return null;
        }

        $id = (int) $decoded;

        if ($id < 1 || self::encode($id) !== $cursor) {
            return null;
        }

        return $id;
    }
}
