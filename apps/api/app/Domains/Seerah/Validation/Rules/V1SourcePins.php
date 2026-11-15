<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V1: the source file and the canonical text match their pins, and book/structure.json records them and matches the canonical text.
 */
final class V1SourcePins implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $derived = $context->book->sha256();
        $structure = $context->data->structure;

        if ($context->pins === null) {
            $issues->info('V1', 'pins', 'pins not checked (run over another file with --source)');
        } else {
            if (! hash_equals($context->pins['source_sha256'], $context->sourceSha256)) {
                $issues->error('V1', 'source', 'the source file differs from its pin');
            }

            if ($context->pins['canonical_sha256'] === null || ! hash_equals($context->pins['canonical_sha256'], $derived)) {
                $issues->error('V1', 'canonical', 'the canonical text differs from its pin');
            }
        }

        if ($context->data->structureSourceSha256 !== null && ! hash_equals($context->data->structureSourceSha256, $context->sourceSha256)) {
            $issues->error('V1', 'book/structure.json', 'structure.json records another source file');
        }

        if ($context->data->structureCanonicalSha256 !== null && ! hash_equals($context->data->structureCanonicalSha256, $derived)) {
            $issues->error('V1', 'book/structure.json', 'structure.json records another canonical text (run seerah:canonicalize)');
        }

        if ($structure !== null && $structure != $context->book->sections) {
            $issues->error('V1', 'book/structure.json', 'the sections differ from the canonical text (run seerah:canonicalize)');
        }

        $gazetteer = $context->data->gazetteer;

        if ($gazetteer !== null && ! hash_equals($gazetteer->sourceSha256, $derived)) {
            $issues->error('V1', 'gazetteer.json', 'source_sha256 is not the canonical text SHA-256');
        }
    }
}
