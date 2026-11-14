<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * A developer sign-off for one group (reviews/<group>.json): the hash of every approved record, the decisions, and the digest of
 * the hashes. Written only by `seerah:approve`.
 *
 * @param  array<string, string>  $records  record id => SHA-256 of the record
 * @param  array<string, Decision>  $decisions  record id => decision
 */
final readonly class SignOff
{
    public function __construct(
        public string $group,
        public string $signedBy,
        public string $signedAt,
        public array $records,
        public array $decisions,
        public string $digest,
    ) {}
}
