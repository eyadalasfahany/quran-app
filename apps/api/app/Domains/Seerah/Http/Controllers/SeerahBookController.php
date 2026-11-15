<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Http\Controllers;

use App\Domains\Seerah\Http\Resources\SeerahBooksResource;
use App\Domains\Seerah\Services\SeerahCatalogueService;
use App\Http\Controllers\Controller;
use Dedoc\Scramble\Attributes\Response;

final class SeerahBookController extends Controller
{
    public function __construct(private readonly SeerahCatalogueService $catalogue) {}

    #[Response(304, 'Not modified.', type: 'null')]
    public function index(): SeerahBooksResource
    {
        return new SeerahBooksResource($this->catalogue->books());
    }
}
