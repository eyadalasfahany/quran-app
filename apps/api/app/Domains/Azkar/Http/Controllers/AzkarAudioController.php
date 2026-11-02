<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Http\Controllers;

use App\Domains\Azkar\Services\AzkarAudioService;
use App\Http\Controllers\Controller;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Serves one Taybah-hosted Azkar recording (ADR 0040). BinaryFileResponse answers Range requests with 206 and 416, which
 * the players need to seek. The version is in the path, so the response is immutable.
 */
final class AzkarAudioController extends Controller
{
    public function __construct(private readonly AzkarAudioService $audio) {}

    #[Response(404, 'The recording was not found.', mediaType: 'application/problem+json', type: '\App\Support\ProblemDetails\ProblemDetailsResource')]
    public function show(Request $request, string $version, string $file): BinaryFileResponse|HttpResponse
    {
        ['path' => $path, 'track' => $track] = $this->audio->resolve($version, $file);

        // BinaryFileResponse answers a range that starts past the end with 200, so the 416 is decided here.
        if ($this->startsBeyondEnd($request, $track->bytes)) {
            return response('', 416, [
                'Content-Type' => 'audio/mpeg',
                'Accept-Ranges' => 'bytes',
                'Content-Range' => 'bytes */'.$track->bytes,
            ]);
        }

        $response = response()->file($path, [
            'Content-Type' => 'audio/mpeg',
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'ETag' => '"'.$track->sha256.'"',
        ]);

        // Answers If-None-Match with 304 and an empty body when the client already holds this file.
        $response->isNotModified($request);

        return $response;
    }

    private function startsBeyondEnd(Request $request, int $bytes): bool
    {
        $range = $request->headers->get('Range');

        if (! is_string($range) || preg_match('/^bytes=(\d+)-/', $range, $matches) !== 1) {
            return false;
        }

        return (int) $matches[1] >= $bytes;
    }
}
