<?php

declare(strict_types=1);

namespace App\Domains\Sync\Http\Resources;

use App\Domains\Sync\Data\BootstrapData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property BootstrapData $resource
 */
final class BootstrapResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{min_app_version: array{ios: string|null, android: string|null}, store_url: array{ios: string, android: string}}
     */
    public function toArray(Request $request): array
    {
        return [
            'min_app_version' => [
                'ios' => $this->resource->minAppVersionIos,
                'android' => $this->resource->minAppVersionAndroid,
            ],
            'store_url' => [
                'ios' => $this->resource->storeUrlIos,
                'android' => $this->resource->storeUrlAndroid,
            ],
        ];
    }
}
