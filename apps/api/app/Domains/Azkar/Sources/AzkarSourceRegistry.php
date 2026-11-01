<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Sources;

use InvalidArgumentException;

/**
 * The sources an Azkar command may use, and the primary one (config azkar.primary_source, ADR 0031 §12).
 */
final class AzkarSourceRegistry
{
    /**
     * @var array<string, AzkarCatalogueSource>
     */
    private readonly array $sources;

    public function __construct(OpenDuaSource $openDua, HisnMuslimSource $hisnMuslim)
    {
        $this->sources = [
            $openDua->code() => $openDua,
            $hisnMuslim->code() => $hisnMuslim,
        ];
    }

    /**
     * @throws InvalidArgumentException When no source has that code.
     */
    public function for(string $code): AzkarCatalogueSource
    {
        if (! isset($this->sources[$code])) {
            throw new InvalidArgumentException('Unknown Azkar source ['.$code.']. Use one of: '.implode(', ', $this->codes()).'.');
        }

        return $this->sources[$code];
    }

    public function primary(): AzkarCatalogueSource
    {
        return $this->for($this->primaryCode());
    }

    public function primaryCode(): string
    {
        return (string) config('azkar.primary_source', 'opendua');
    }

    /**
     * @return list<string>
     */
    public function codes(): array
    {
        return array_keys($this->sources);
    }
}
