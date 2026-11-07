<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources;

/**
 * Whether a collection's pinned files are in the cache and valid. Makes no request and writes nothing, so an import with
 * no --download never reaches the network (step 6).
 */
final class HadithSnapshotPresence
{
    public function __construct(
        private readonly FawazHadithSource $source,
        private readonly SnapshotStore $store,
        private readonly PinnedFileVerifier $verifier,
    ) {}

    /**
     * @return list<string> The paths that are absent or do not match their pin.
     */
    public function missing(string $slug): array
    {
        $paths = ['info.json', 'editions/ara-'.$this->source->sourceSlug($slug).'.json'];
        $missing = [];

        foreach ($paths as $path) {
            if (! $this->store->has($path) || ! $this->verifier->matches($path, $this->store->read($path))) {
                $missing[] = $path;
            }
        }

        return $missing;
    }
}
