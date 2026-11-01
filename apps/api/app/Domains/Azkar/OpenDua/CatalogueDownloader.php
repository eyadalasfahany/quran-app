<?php

declare(strict_types=1);

namespace App\Domains\Azkar\OpenDua;

use App\Domains\Azkar\Exceptions\CatalogueDownloadException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/**
 * Downloads the pinned OpenDua catalogue into storage/app/azkar (ADR 0031 §1). The bytes are checked against the pinned
 * SHA-256 before they touch the disk, so an unverified file is never imported. Storage is git-ignored: nothing is committed.
 */
final class CatalogueDownloader
{
    /**
     * @return string The absolute path of the verified file.
     *
     * @throws CatalogueDownloadException
     */
    public function download(): string
    {
        $url = (string) config('azkar.opendua.catalogue_url');
        $pin = (string) config('azkar.opendua.catalogue_sha256');

        $response = Http::withUserAgent($this->userAgent())
            ->timeout(60)
            ->retry(3, (int) config('azkar.opendua.retry_delay_ms', 1000), throw: false)
            ->get($url);

        if (! $response->successful()) {
            throw new CatalogueDownloadException('The catalogue download returned HTTP '.$response->status().'.');
        }

        $bytes = $response->body();

        if (! hash_equals($pin, hash('sha256', $bytes))) {
            throw new CatalogueDownloadException('The downloaded catalogue does not match the pinned SHA-256; nothing was written.');
        }

        $directory = storage_path('app/azkar');
        $path = $directory.DIRECTORY_SEPARATOR.'catalogue-'.config('azkar.opendua.version').'.json';
        $partial = $path.'.'.bin2hex(random_bytes(4)).'.part';

        File::ensureDirectoryExists($directory);
        File::put($partial, $bytes);

        if (File::exists($path)) {
            File::delete($path);
        }

        File::move($partial, $path);

        return $path;
    }

    private function userAgent(): string
    {
        $email = config('quran.qf.contact_email');

        return is_string($email) && $email !== '' ? 'Taybah/1.0 (+mailto:'.$email.')' : 'Taybah/1.0';
    }
}
