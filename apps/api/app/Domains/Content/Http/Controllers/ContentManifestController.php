<?php

declare(strict_types=1);

namespace App\Domains\Content\Http\Controllers;

use App\Domains\Content\Http\Resources\ContentManifestResource;
use App\Domains\Content\Services\ContentDeliveryService;
use App\Http\Controllers\Controller;
use Dedoc\Scramble\Attributes\Response;

final class ContentManifestController extends Controller
{
    public function __construct(private readonly ContentDeliveryService $delivery) {}

    #[Response(304, 'Not modified.', type: 'null')]
    public function __invoke(): ContentManifestResource
    {
        return new ContentManifestResource($this->delivery->manifest());
    }
}
