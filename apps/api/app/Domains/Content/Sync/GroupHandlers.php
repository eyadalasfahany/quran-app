<?php

declare(strict_types=1);

namespace App\Domains\Content\Sync;

use App\Domains\Content\Enums\ResourceGroup;

final class GroupHandlers
{
    /**
     * @param  iterable<GroupHandler>  $handlers
     */
    public function __construct(private readonly iterable $handlers) {}

    public function for(ResourceGroup $group): GroupHandler
    {
        foreach ($this->handlers as $handler) {
            if ($handler->group() === $group) {
                return $handler;
            }
        }

        throw new SyncException('No content sync handler is registered for '.$group->value.'.');
    }
}
