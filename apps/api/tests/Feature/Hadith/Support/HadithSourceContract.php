<?php

declare(strict_types=1);

use App\Domains\Hadith\Contracts\HadithCollectionSource;

/*
| The shared contract (ADR 0042 §3). Step 18's SunnahComSource runs the same assertions. Each it() name starts with
| "contract:" because the calling file registers them.
*/

function hadithSourceContract(Closure $make): void
{
    it('contract: code and version are non-empty strings', function () use ($make): void {
        /** @var HadithCollectionSource $source */
        $source = $make();

        expect($source->code())->toBeString()->not->toBe('');
        expect($source->version())->toBeString()->not->toBe('');
    });

    it('contract: slugs are the ten configured collections in order', function () use ($make): void {
        /** @var HadithCollectionSource $source */
        $source = $make();

        expect($source->slugs())->toBe(config('hadith.collections'));
        expect($source->slugs())->toHaveCount(10);
    });

    it('contract: every slug returns info and a collection under the same slug', function () use ($make): void {
        foreach (config('hadith.collections') as $slug) {
            /** @var HadithCollectionSource $source */
            $source = $make();

            expect($source->info($slug)->slug)->toBe($slug);

            $collection = $source->collection($slug);

            expect($collection->slug)->toBe($slug);

            foreach ($collection->hadiths as $hadith) {
                expect($hadith->number)->toBeString()->not->toBe('');
                expect($hadith->text === null || is_string($hadith->text))->toBeTrue();

                foreach ($hadith->grades as $grade) {
                    expect($grade->grade)->toBeString();
                }
            }

            foreach ($collection->sections as $section) {
                expect($section->key)->toBeString();
            }
        }
    });

    it('contract: an unknown slug throws InvalidArgumentException', function () use ($make): void {
        /** @var HadithCollectionSource $source */
        $source = $make();

        expect(fn () => $source->collection('FIXTURE slug'))->toThrow(InvalidArgumentException::class);
        expect(fn () => $source->info('FIXTURE slug'))->toThrow(InvalidArgumentException::class);
    });
}
