<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Controllers;

use App\Domains\Hadith\Http\Requests\HadithPageRequest;
use App\Domains\Hadith\Http\Resources\HadithChaptersResource;
use App\Domains\Hadith\Services\HadithCatalogueService;
use App\Http\Controllers\Controller;
use Dedoc\Scramble\Attributes\Response;

final class HadithChapterController extends Controller
{
    public function __construct(private readonly HadithCatalogueService $catalogue) {}

    #[Response(304, 'Not modified.', type: 'null')]
    #[Response(404, 'The collection is unavailable, or the book, chapter or hadith was not found.', mediaType: 'application/problem+json', type: '\App\Support\ProblemDetails\ProblemDetailsResource')]
    public function index(string $slug, string $book, HadithPageRequest $request): HadithChaptersResource
    {
        return new HadithChaptersResource($this->catalogue->chapters($slug, $book, $request->toData()));
    }
}
