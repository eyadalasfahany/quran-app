<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * One of the six named markers (المولد، البعثة، الهجرة، بدر، الفتح، الوفاة). Its age and year are read from `event`.
 */
final readonly class Milestone
{
    public function __construct(
        public string $key,
        public string $labelAr,
        public string $event,
    ) {}
}
