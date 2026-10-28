<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\ServedResourceGroup;

it('maps every served case to a non-ignored ResourceGroup with the same value', function (ServedResourceGroup $served): void {
    $group = ResourceGroup::from($served->value);

    expect($group->isIgnored())->toBeFalse();
})->with(ServedResourceGroup::cases());

it('splits ResourceGroup exactly into served and ignored cases', function (): void {
    $served = array_map(fn (ServedResourceGroup $group): string => $group->value, ServedResourceGroup::cases());
    $ignored = ResourceGroup::ignoredValues();
    $all = array_map(fn (ResourceGroup $group): string => $group->value, ResourceGroup::cases());

    expect(array_merge($served, $ignored))->toEqualCanonicalizing($all)
        ->and(array_intersect($served, $ignored))->toBeEmpty();
});

it('narrows a ResourceGroup to its served case', function (): void {
    expect(ServedResourceGroup::fromResourceGroup(ResourceGroup::Tafsirs))->toBe(ServedResourceGroup::Tafsirs);
});

it('rejects an ignored ResourceGroup', function (ResourceGroup $group): void {
    expect(fn () => ServedResourceGroup::fromResourceGroup($group))->toThrow(ValueError::class);
})->with(array_filter(ResourceGroup::cases(), fn (ResourceGroup $group): bool => $group->isIgnored()));
