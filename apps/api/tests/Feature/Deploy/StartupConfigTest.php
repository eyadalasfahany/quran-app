<?php

declare(strict_types=1);

/*
| Plan step 14 §1-§2 and the 2 Nov 2026 review (B1, M1, M3): what runs where. The pre-deploy container has no volume and
| runs migrations only; the web container start mounts the volume and runs the audio check, the pinned snapshots, the
| Azkar import (DB rows, --defer-pack), the pack build, then serves. entrypoint.sh never runs the Azkar work or migrates.
| These tests read the deployment files; they do not test Railway itself.
*/

/**
 * @return array<string, mixed>
 */
function deployRailwayConfig(): array
{
    return json_decode((string) file_get_contents(base_path('railway.json')), true, 512, JSON_THROW_ON_ERROR);
}

function deployFile(string $relative): string
{
    return (string) file_get_contents(base_path($relative));
}

it('the web service starts through start-web.sh, after entrypoint.sh', function (): void {
    $start = deployRailwayConfig()['deploy']['startCommand'];

    expect($start)->toBe('/usr/local/bin/entrypoint.sh /usr/local/bin/start-web.sh')
        ->and(deployRailwayConfig()['deploy']['healthcheckTimeout'])->toBe(120);
});

it('the pre-deploy command is the release script, and it runs migrations only', function (): void {
    expect(deployRailwayConfig()['deploy']['preDeployCommand'])->toBe(['/usr/local/bin/entrypoint.sh', '/usr/local/bin/release.sh']);

    $release = deployFile('docker/release.sh');

    expect($release)->toContain('php artisan migrate --force')
        ->and($release)->not->toContain('azkar')
        ->and($release)->not->toContain('--build-packs')
        ->and($release)->not->toContain('--if-unlocked');
});

it('the start script fetches the snapshots, imports DB rows after the audio check and before the pack build, then serves', function (): void {
    $start = deployFile('docker/start-web.sh');

    $audio = strpos($start, 'php artisan azkar:audio-verify');
    $snapshot = strpos($start, 'snapshot_pinned hisnmuslim');
    $import = strpos($start, 'php artisan azkar:import --download --defer-pack');
    $packs = strpos($start, 'php artisan content:ensure-packs');
    $serve = strpos($start, 'exec frankenphp run --config /etc/caddy/Caddyfile');

    expect($audio)->toBeInt()
        ->and($snapshot)->toBeGreaterThan($audio)
        ->and($import)->toBeGreaterThan($snapshot)
        ->and($packs)->toBeGreaterThan($import)
        ->and($serve)->toBeGreaterThan($packs)
        ->and($start)->not->toContain('--if-unlocked')
        ->and($start)->not->toContain('--build-packs')
        ->and($start)->toContain('storage/app/azkar-audio');
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
    $dockerfile = deployFile('docker/Dockerfile');

    expect($dockerfile)->toContain('COPY docker/start-web.sh /usr/local/bin/start-web.sh')
        ->and($dockerfile)->toContain('chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/release.sh /usr/local/bin/start-web.sh');
});

it('the storage folders the start script writes to are the ones the volume covers under /app/storage/app', function (): void {
    expect(deployFile('docker/start-web.sh'))
        ->toContain('mkdir -p storage/app/private/packs storage/app/tmp storage/app/azkar/reports storage/app/azkar-audio');
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
