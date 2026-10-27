<?php

declare(strict_types=1);

namespace App\Domains\Content\Http\Controllers;

use App\Domains\Content\Http\Requests\ContentChangesRequest;
use App\Domains\Content\Http\Resources\ContentChangesResource;
use App\Domains\Content\Services\ContentDeliveryService;
use App\Http\Controllers\Controller;
use Dedoc\Scramble\Attributes\Response;

final class ContentChangesController extends Controller
{
    public function __construct(private readonly ContentDeliveryService $delivery) {}

    #[Response(410, 'The change feed no longer covers this version.', mediaType: 'application/problem+json', type: '\App\Support\ProblemDetails\ProblemDetailsResource')]
    public function index(ContentChangesRequest $request): ContentChangesResource
    {
        return new ContentChangesResource($this->delivery->changes($request->toData()));
    }
}
