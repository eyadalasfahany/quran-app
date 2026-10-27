<?php

declare(strict_types=1);

use Tests\TestCase;

uses(TestCase::class);

it('keeps each sync group filter to one group', function (): void {
    $groups = config('quran.sync.groups');

    expect($groups)->toBeArray()->not->toBeEmpty();

    foreach ($groups as $key => $filter) {
        expect($filter)->toBeString()->toMatch('/^[a-z_]+:(\*|\d+(,\d+)*)$/');

        [$group] = explode(':', $filter, 2);

        expect($group)->toBe($key);
    }
});
