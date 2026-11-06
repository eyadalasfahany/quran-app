<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources;

use App\Domains\Hadith\Contracts\HadithCollectionSource;
use App\Domains\Hadith\Exceptions\UnknownHadithSourceException;

/**
 * The Hadith sources by code, and the primary one (config hadith.primary_source). Pattern: AzkarSourceRegistry.
 */
final class HadithSourceRegistry
{
    /**
     * @var array<string, HadithCollectionSource>
     */
    private readonly array $sources;

    public function __construct(FawazHadithSource $fawaz)
    {
        $this->sources = [
            $fawaz->code() => $fawaz,
        ];
    }

    /**
     * @throws UnknownHadithSourceException
     */
    public function for(string $code): HadithCollectionSource
    {
        if (! isset($this->sources[$code])) {
            throw new UnknownHadithSourceException('Unknown Hadith source ['.$code.']. Use one of: '.implode(', ', $this->codes()).'.');
        }

        return $this->sources[$code];
    }

    /**
     * @throws UnknownHadithSourceException
     */
    public function primary(): HadithCollectionSource
    {
        return $this->for($this->primaryCode());
    }

    public function primaryCode(): string
    {
        return (string) config('hadith.primary_source');
    }

    /**
     * @return list<string>
     */
    public function codes(): array
    {
        return array_map('strval', array_keys($this->sources));
    }
}
