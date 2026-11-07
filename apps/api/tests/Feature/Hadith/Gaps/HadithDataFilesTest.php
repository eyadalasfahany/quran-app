<?php

declare(strict_types=1);

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use Illuminate\Support\Facades\File;

/*
| The read-only data-file reader (ADR 0076 §2.3, step 6b.1). Files live in a per-process temporary folder; the bytes are
| placeholders.
*/

const HADITH_DATA_FILE_BYTES = '{"fixture":"FIXTURE bytes 1 — not a hadith"}';

function hadithDataDirectory(): string
{
    return storage_path('framework/testing/hadith-data-'.getmypid());
}

function hadithDataReader(): HadithDataFiles
{
    return new HadithDataFiles(hadithDataDirectory());
}

beforeEach(function (): void {
    File::ensureDirectoryExists(hadithDataDirectory().'/chapters');
    File::ensureDirectoryExists(hadithDataDirectory().'/gaps/decisions');
    config(['hadith.data_files' => []]);
});

afterEach(function (): void {
    File::deleteDirectory(hadithDataDirectory());
});

it('returns null when there is neither file nor pin', function (): void {
    expect(hadithDataReader()->readVerified('chapters/bukhari.json'))->toBeNull();
});

it('refuses a file with no pin', function (): void {
    File::put(hadithDataDirectory().'/chapters/bukhari.json', HADITH_DATA_FILE_BYTES);

    expect(fn () => hadithDataReader()->readVerified('chapters/bukhari.json'))
        ->toThrow(HadithDataFileException::class, 'pin_missing');
});

it('refuses a pin with no file', function (): void {
    config(['hadith.data_files' => ['chapters/bukhari.json' => hash('sha256', HADITH_DATA_FILE_BYTES)]]);

    expect(fn () => hadithDataReader()->readVerified('chapters/bukhari.json'))
        ->toThrow(HadithDataFileException::class, 'file_missing');
});

it('refuses a file whose SHA-256 differs, and never prints its content', function (): void {
    File::put(hadithDataDirectory().'/chapters/bukhari.json', HADITH_DATA_FILE_BYTES);
    config(['hadith.data_files' => ['chapters/bukhari.json' => hash('sha256', 'FIXTURE other bytes')]]);

    try {
        hadithDataReader()->readVerified('chapters/bukhari.json');
        $this->fail('The mismatch was not refused.');
    } catch (HadithDataFileException $exception) {
        expect($exception->getMessage())->toContain('sha_mismatch')
            ->and($exception->getMessage())->not->toContain('FIXTURE bytes');
    }
});

it('checks the hash before parsing', function (): void {
    File::put(hadithDataDirectory().'/chapters/bukhari.json', 'not json {');
    config(['hadith.data_files' => ['chapters/bukhari.json' => hash('sha256', 'something else')]]);

    expect(fn () => hadithDataReader()->readVerified('chapters/bukhari.json'))
        ->toThrow(HadithDataFileException::class, 'sha_mismatch');
});

it('refuses a malformed pin', function (): void {
    File::put(hadithDataDirectory().'/chapters/bukhari.json', HADITH_DATA_FILE_BYTES);
    config(['hadith.data_files' => ['chapters/bukhari.json' => 'ABC']]);

    expect(fn () => hadithDataReader()->readVerified('chapters/bukhari.json'))
        ->toThrow(HadithDataFileException::class, 'pin_malformed');
});

it('refuses a path outside the allowed folders', function (): void {
    expect(fn () => hadithDataReader()->readVerified('../secret.json'))
        ->toThrow(HadithDataFileException::class, 'bad_path');

    expect(fn () => hadithDataReader()->readVerified('other/bukhari.json'))
        ->toThrow(HadithDataFileException::class, 'bad_path');
});

it('returns the verified bytes when the pin matches', function (): void {
    File::put(hadithDataDirectory().'/gaps/decisions/nasai.json', HADITH_DATA_FILE_BYTES);
    config(['hadith.data_files' => ['gaps/decisions/nasai.json' => hash('sha256', HADITH_DATA_FILE_BYTES)]]);

    expect(hadithDataReader()->readVerified('gaps/decisions/nasai.json'))->toBe(HADITH_DATA_FILE_BYTES);
});

it('reports the pin, and the actual SHA-256 on disk or null', function (): void {
    File::put(hadithDataDirectory().'/chapters/bukhari.json', HADITH_DATA_FILE_BYTES);
    config(['hadith.data_files' => ['chapters/bukhari.json' => hash('sha256', HADITH_DATA_FILE_BYTES)]]);

    $reader = hadithDataReader();

    expect($reader->pin('chapters/bukhari.json'))->toBe(hash('sha256', HADITH_DATA_FILE_BYTES))
        ->and($reader->pin('chapters/muslim.json'))->toBeNull()
        ->and($reader->actualSha256('chapters/bukhari.json'))->toBe(hash('sha256', HADITH_DATA_FILE_BYTES))
        ->and($reader->actualSha256('chapters/muslim.json'))->toBeNull();
});
