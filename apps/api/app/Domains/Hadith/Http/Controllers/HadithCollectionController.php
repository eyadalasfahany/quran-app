<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Controllers;

use App\Domains\Hadith\Http\Resources\HadithCollectionsResource;
use App\Domains\Hadith\Services\HadithCatalogueService;
use App\Http\Controllers\Controller;
use Dedoc\Scramble\Attributes\Response;

final class HadithCollectionController extends Controller
{
    public function __construct(private readonly HadithCatalogueService $catalogue) {}

    #[Response(304, 'Not modified.', type: 'null')]
    public function index(): HadithCollectionsResource
    {
        return new HadithCollectionsResource($this->catalogue->collections());
    }
}
