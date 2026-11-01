<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum PermissionStatus: string
{
    case Granted = 'granted';
    case Pending = 'pending';
    case NotRequired = 'not_required';
    case Denied = 'denied';

    /**
     * Only a source whose rights are granted or not needed may be packed or listed (ADR 0031 §1).
     */
    public function allowsDelivery(): bool
    {
        return match ($this) {
            self::Granted, self::NotRequired => true,
            self::Pending, self::Denied => false,
        };
    }
}
