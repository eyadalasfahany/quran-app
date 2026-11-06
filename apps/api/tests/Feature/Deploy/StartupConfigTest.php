<?php

declare(strict_types=1);

/*
| Plan step 14 §1-§2, the 2 Nov 2026 review (B1, M1, M3) and ADR 0067: what runs where. There is no Railway config file
| and no pre-deploy step: the image starts itself (ENTRYPOINT entrypoint.sh, CMD start-web.sh). The start mounts the
| volume, migrates, then runs the audio check, the pinned snapshots, the imports (DB rows, --defer-pack) and the pack
| build, then hands over to supervisord (ADR 0065). entrypoint.sh never runs the Azkar work or migrates.
| These tests read the deployment files; they do not test Railway itself.
*/

function deployFile(string $relative): string
{
    return (string) file_get_contents(base_path($relative));
}

it('the image starts itself through entrypoint.sh and start-web.sh, with no Railway config file (ADR 0067)', function (): void {
    $dockerfile = deployFile('Dockerfile');

    expect($dockerfile)->toContain('ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]')
        ->and($dockerfile)->toContain('CMD ["/usr/local/bin/start-web.sh"]')
        ->and(file_exists(base_path('railway.json')))->toBeFalse()
        ->and(file_exists(base_path('docker/Dockerfile')))->toBeFalse();
});

it('the start script migrates first and stops on a failed migration (ADR 0067)', function (): void {
    $start = deployFile('docker/start-web.sh');

    $migrate = strpos($start, 'php artisan migrate --force');

    expect($migrate)->toBeInt()
        ->and($migrate)->toBeLessThan((int) strpos($start, 'php artisan azkar:audio-verify'))
        ->and($start)->toContain('ERROR: migrations failed; not starting');
});

it('the release script, kept for a manual run, runs migrations and the store version lookup only', function (): void {
    $release = deployFile('docker/release.sh');

    expect($release)->toContain('php artisan migrate --force')
        ->and($release)->toContain('php artisan app-stores:refresh || true')
        ->and($release)->not->toContain('azkar')
        ->and($release)->not->toContain('--build-packs')
        ->and($release)->not->toContain('--if-unlocked');
});

it('the start script fetches the snapshots, imports DB rows after the audio check and before the pack build, then hands over to supervisord', function (): void {
    $start = deployFile('docker/start-web.sh');

    $audio = strpos($start, 'php artisan azkar:audio-verify');
    $snapshot = strpos($start, 'snapshot_pinned hisnmuslim');
    $import = strpos($start, 'php artisan azkar:import --download --defer-pack');
    $packs = strpos($start, 'php artisan content:ensure-packs');
    $serve = strpos($start, 'exec supervisord -c /etc/supervisor/taybah.conf');

    expect($audio)->toBeInt()
        ->and($snapshot)->toBeGreaterThan($audio)
        ->and($import)->toBeGreaterThan($snapshot)
        ->and($packs)->toBeGreaterThan($import)
        ->and($serve)->toBeGreaterThan($packs)
        ->and($start)->not->toContain('--if-unlocked')
        ->and($start)->not->toContain('--build-packs')
        ->and($start)->toContain('storage/app/private/azkar-audio');
});

it('every start task warns and continues, so a failed download keeps the current version serving (M3)', function (): void {
    $start = deployFile('docker/start-web.sh');

    expect($start)->toContain('set -u')
        ->and($start)->not->toContain('set -e')
        ->and($start)->toContain('if php artisan azkar:import --download --defer-pack; then')
        ->and($start)->toContain('the current Azkar version keeps serving')
        ->and($start)->toContain('php artisan azkar:snapshot "$1" --pinned || echo');
});

it('entrypoint.sh never runs the Azkar work or migrations, so Horizon and the scheduler stay out of it (M1)', function (): void {
    $entrypoint = deployFile('docker/entrypoint.sh');

    expect($entrypoint)->not->toContain('start-web')
        ->and($entrypoint)->not->toContain('azkar')
        ->and($entrypoint)->not->toContain('content:ensure-packs')
        ->and($entrypoint)->not->toContain('migrate')
        ->and($entrypoint)->toContain('php artisan config:cache');
});

it('the image copies and marks executable the start script', function (): void {
    $dockerfile = deployFile('Dockerfile');

    expect($dockerfile)->toContain('COPY docker/start-web.sh /usr/local/bin/start-web.sh')
        ->and($dockerfile)->toContain('chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/release.sh /usr/local/bin/start-web.sh');
});

it('the storage folders the start script writes to include the ones the volume covers under /app/storage/app/private', function (): void {
    expect(deployFile('docker/start-web.sh'))
        ->toContain('mkdir -p storage/app/private/packs storage/app/tmp storage/app/azkar/reports storage/app/private/azkar-audio storage/app/private/sources');
});

it('keeps the Azkar audio on the volume, which is mounted at /app/storage/app/private', function (): void {
    expect(config('filesystems.disks.azkar_audio.root'))->toBe(storage_path('app/private/azkar-audio'));
});

it('the start script imports MP3Quran rows, then Taybah timings, after the Azkar import and before the pack build', function (): void {
    $start = deployFile('docker/start-web.sh');

    $azkar = strpos($start, 'php artisan azkar:import --download --defer-pack');
    $mp3quran = strpos($start, 'php artisan mp3quran:import --defer-pack');
    $taybah = strpos($start, 'php artisan recitation-timings:import --defer-pack');
    $packs = strpos($start, 'php artisan content:ensure-packs');

    expect($mp3quran)->toBeInt()
        ->and($mp3quran)->toBeGreaterThan($azkar)
        ->and($taybah)->toBeGreaterThan($mp3quran)
        ->and($packs)->toBeGreaterThan($taybah)
        ->and($start)->not->toContain('mp3quran:import --defer-pack --build-packs')
        ->and($start)->not->toContain('recitation-timings:import --defer-pack --build-packs');
});

it('the MP3Quran and Taybah imports warn and continue like the Azkar import, without building packs', function (): void {
    $start = deployFile('docker/start-web.sh');

    expect($start)->toContain('if php artisan mp3quran:import --defer-pack; then')
        ->and($start)->toContain('if php artisan recitation-timings:import --defer-pack; then')
        ->and($start)->toContain('WARNING: the MP3Quran import did not finish')
        ->and($start)->toContain('WARNING: some Taybah timing files were skipped')
        ->and($start)->not->toContain('--build-packs');
});

it('the start script fetches the Duas snapshot and imports Duas rows after Azkar and before MP3Quran, then builds packs last', function (): void {
    $start = deployFile('docker/start-web.sh');

    $azkar = strpos($start, 'php artisan azkar:import --download --defer-pack');
    $duasSnapshot = strpos($start, 'php artisan duas:snapshot hadeethenc --pinned');
    $duasImport = strpos($start, 'php artisan duas:import --download --defer-pack');
    $mp3quran = strpos($start, 'php artisan mp3quran:import --defer-pack');
    $taybah = strpos($start, 'php artisan recitation-timings:import --defer-pack');
    $packs = strpos($start, 'php artisan content:ensure-packs');

    expect($duasSnapshot)->toBeInt()
        ->and($duasSnapshot)->toBeGreaterThan($azkar)
        ->and($duasImport)->toBeGreaterThan($duasSnapshot)
        ->and($mp3quran)->toBeGreaterThan($duasImport)
        ->and($taybah)->toBeGreaterThan($mp3quran)
        ->and($packs)->toBeGreaterThan($taybah);
});

it('the Duas snapshot and import warn and continue without building packs', function (): void {
    $start = deployFile('docker/start-web.sh');

    expect($start)->toContain('if php artisan duas:snapshot hadeethenc --pinned; then')
        ->and($start)->toContain('if php artisan duas:import --download --defer-pack; then')
        ->and($start)->toContain('WARNING: the Duas HadeethEnc snapshot is not fetched')
        ->and($start)->toContain('WARNING: the Duas import did not finish')
        ->and($start)->not->toContain('duas:import --download --defer-pack --build-packs')
        ->and($start)->not->toContain('duas:snapshot hadeethenc --pinned --build-packs');
});
