<?php

declare(strict_types=1);

use App\Domains\Seerah\Enums\ImportMode;
use App\Domains\Seerah\Exceptions\SeerahImportException;
use App\Domains\Seerah\Import\SeerahImportGuard;

it('allows or refuses an import by environment, mode and pack options', function (bool $production, ImportMode $mode, bool $buildPacks, bool $deferPack, ?string $refusal): void {
    $guard = new SeerahImportGuard;

    if ($refusal === null) {
        $guard->assertAllowed($production, $mode, $buildPacks, $deferPack);
        expect(true)->toBeTrue();

        return;
    }

    expect(fn () => $guard->assertAllowed($production, $mode, $buildPacks, $deferPack))
        ->toThrow(SeerahImportException::class, $refusal);
})->with([
    'production release' => [true, ImportMode::Release, false, false, null],
    'production structure is refused' => [true, ImportMode::Structure, false, false, 'Production imports need --release.'],
    'local structure' => [false, ImportMode::Structure, false, true, null],
    'local release' => [false, ImportMode::Release, true, false, null],
    'both pack options' => [false, ImportMode::Structure, true, true, 'Choose --build-packs or --defer-pack, not both.'],
]);
