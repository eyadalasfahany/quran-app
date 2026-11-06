<?php

declare(strict_types=1);

use App\Domains\Hadith\Contracts\HadithCollectionSource;
use App\Domains\Hadith\Exceptions\UnknownHadithSourceException;
use App\Domains\Hadith\Sources\FawazHadithSource;
use App\Domains\Hadith\Sources\HadithSourceRegistry;
use Illuminate\Support\Facades\Http;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';

beforeEach(function (): void {
    Http::preventStrayRequests();
    hadithReload();
});

it('returns the fawazahmed0 source for its code and as the primary', function (): void {
    $registry = app(HadithSourceRegistry::class);

    expect($registry->for('fawazahmed0'))->toBeInstanceOf(FawazHadithSource::class)
        ->and($registry->primary())->toBeInstanceOf(FawazHadithSource::class)
        ->and($registry->primaryCode())->toBe('fawazahmed0')
        ->and($registry->codes())->toBe(['fawazahmed0']);
});

it('throws a domain exception for an unknown code', function (): void {
    expect(fn () => app(HadithSourceRegistry::class)->for('FIXTURE code'))
        ->toThrow(UnknownHadithSourceException::class, 'FIXTURE code');

    try {
        app(HadithSourceRegistry::class)->for('FIXTURE code');
    } catch (UnknownHadithSourceException $exception) {
        expect($exception->getMessage())->toContain('fawazahmed0');
    }
});

it('resolves the contract from the container to the primary source', function (): void {
    expect(app(HadithCollectionSource::class))->toBeInstanceOf(FawazHadithSource::class);
});
