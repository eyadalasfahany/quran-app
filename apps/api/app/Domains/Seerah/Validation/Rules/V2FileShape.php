<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V2: ids match their pattern and are unique within their file (the file shape, canonical format and keys are checked by the loader).
 */
final class V2FileShape implements ValidationRule
{
    public const string EVENT_ID = '/^e\d{3}(\.\d+)?$/';

    public const string PLACE_ID = '/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/';

    public const string ROUTE_ID = '/^r-[a-z0-9-]+$/';

    public const string SECTION_ID = '/^s\d{3}$/';

    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $this->places($context, $issues);
        $this->events($context, $issues);
        $this->routes($context, $issues);
        $this->exclusions($context, $issues);
    }

    private function places(ValidationContext $context, IssueBag $issues): void
    {
        $seen = [];

        foreach ($context->data->gazetteer->places ?? [] as $place) {
            if (! preg_match(self::PLACE_ID, $place->id)) {
                $issues->error('V2', 'gazetteer '.$place->id, 'place id does not match its pattern');
            }

            if (isset($seen[$place->id])) {
                $issues->error('V2', 'gazetteer '.$place->id, 'place id is not unique');
            }

            $seen[$place->id] = true;
        }
    }

    private function events(ValidationContext $context, IssueBag $issues): void
    {
        $seen = [];

        foreach ($context->data->allEvents() as $event) {
            if (! preg_match(self::EVENT_ID, $event->id)) {
                $issues->error('V2', $event->batch.' '.$event->id, 'event id does not match its pattern');
            }

            if (! preg_match(self::SECTION_ID, $event->section)) {
                $issues->error('V2', $event->batch.' '.$event->id, 'section id does not match its pattern');
            }

            if (isset($seen[$event->id])) {
                $issues->error('V2', $event->batch.' '.$event->id, 'event id is not unique across the batches');
            }

            $seen[$event->id] = true;
        }
    }

    private function routes(ValidationContext $context, IssueBag $issues): void
    {
        $seen = [];

        foreach ($context->data->routes as $route) {
            if (! preg_match(self::ROUTE_ID, $route->id)) {
                $issues->error('V2', 'route '.$route->id, 'route id does not match its pattern');
            }

            if (isset($seen[$route->id])) {
                $issues->error('V2', 'route '.$route->id, 'route id is not unique');
            }

            $seen[$route->id] = true;
        }
    }

    private function exclusions(ValidationContext $context, IssueBag $issues): void
    {
        $seen = [];

        foreach ($context->data->exclusions as $exclusion) {
            if (isset($seen[$exclusion->section])) {
                $issues->error('V2', 'exclusions '.$exclusion->section, 'section is excluded twice');
            }

            $seen[$exclusion->section] = true;
        }
    }
}
