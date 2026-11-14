<?php

declare(strict_types=1);

use App\Domains\Seerah\Canonical\BookCanonicalizer;
use App\Domains\Seerah\Canonical\CanonicalBook;
use App\Domains\Seerah\Enums\SectionLevel;
use App\Domains\Seerah\Exceptions\SeerahCanonicalException;

// Placeholder markup only. Every text in these fixtures is a marked placeholder («نص تجريبي» / «عنوان تجريبي»), never book text.

/**
 * @param  list<string>  $lines
 */
function shamelaFixture(array $lines): string
{
    return implode("\n", [
        '######OpenITI#',
        '',
        '#META# 020.BookTITLE :: FIXTURE title, not the book',
        '#META#Header#End#',
        ...$lines,
    ])."\n";
}

/**
 * @param  list<string>  $lines
 * @param  list<string>  $front
 */
function shamelaCanonical(array $lines, array $front = []): CanonicalBook
{
    return (new BookCanonicalizer)->canonicalize(shamelaFixture($lines), $front);
}

it('removes the header block and counts it', function (): void {
    $book = shamelaCanonical(['### | عنوان تجريبي ١', '# نص تجريبي ١ — ليس من الكتاب']);

    expect($book->counts->headerLines)->toBe(4)
        ->and($book->serialise())->not->toContain('#META#')
        ->and($book->sections)->toHaveCount(1);
});

it('removes a page marker alone and keeps its number as the page of the text after it', function (): void {
    $book = shamelaCanonical([
        '### | عنوان تجريبي ٢',
        '# PageV01P007 نص تجريبي ٢',
        '~~PageV01P008',
        '~~نص تجريبي ٣',
    ]);

    expect($book->paragraphs)->toHaveCount(1)
        ->and($book->paragraphs[0]->text)->toBe('نص تجريبي ٢ نص تجريبي ٣')
        ->and($book->paragraphs[0]->page)->toBe(7)
        ->and($book->sections[0]->page)->toBe(0)
        ->and($book->counts->pageMarkers)->toBe(2)
        ->and($book->counts->firstPage)->toBe(7)
        ->and($book->counts->lastPage)->toBe(8);
});

it('joins a continuation line to the line above with exactly one space', function (): void {
    $book = shamelaCanonical(['# نص تجريبي ٤', '~~نص تجريبي ٥', '~~نص تجريبي ٦']);

    expect($book->paragraphs[0]->text)->toBe('نص تجريبي ٤ نص تجريبي ٥ نص تجريبي ٦')
        ->and($book->counts->continuationLines)->toBe(2);
});

it('removes a milestone token with one adjacent space, at the start, the middle and the end of a line', function (): void {
    $book = shamelaCanonical([
        '### | عنوان تجريبي ٣',
        '# ms001 نص تجريبي ٤',
        '~~نص ms002 تجريبي ٥',
        '~~نص تجريبي ٦ ms003',
    ]);

    expect($book->paragraphs[0]->text)->toBe('نص تجريبي ٤ نص تجريبي ٥ نص تجريبي ٦')
        ->and($book->counts->milestoneTokens)->toBe(3);
});

it('removes an editor footnote reference «N» with one adjacent space and creates no double space', function (): void {
    $book = shamelaCanonical([
        '### | عنوان تجريبي ٧',
        '# نص «1» تجريبي ٨',
        '~~نص تجريبي ٩ «2»',
        '~~نص «3» ، نص',
    ]);

    expect($book->paragraphs[0]->text)->toBe('نص تجريبي ٨ نص تجريبي ٩ نص ، نص')
        ->and($book->counts->footnoteReferences)->toBe(3)
        ->and($book->serialise())->not->toContain('  ');
});

it('keeps a guillemet pair that is not a footnote number', function (): void {
    $book = shamelaCanonical(['### | عنوان تجريبي ١٠', '# «نص تجريبي ١١» ويتبع']);

    expect($book->paragraphs[0]->text)->toBe('«نص تجريبي ١١» ويتبع')
        ->and($book->counts->footnoteReferences)->toBe(0);
});

it('removes an HTML span tag with its adjacent space, and the footnote reference after it', function (): void {
    $book = shamelaCanonical(['### | عنوان تجريبي ١٢', '# </span> «4» نص تجريبي ١٣']);

    expect($book->paragraphs[0]->text)->toBe('نص تجريبي ١٣')
        ->and($book->counts->htmlTags)->toBe(1)
        ->and($book->counts->footnoteReferences)->toBe(1);
});

it('removes the paragraph marker and the heading wrapper alone', function (): void {
    $book = shamelaCanonical(['### | عنوان تجريبي ١٤', '# نص تجريبي ١٥']);

    expect($book->sections[0]->title)->toBe('عنوان تجريبي ١٤')
        ->and($book->paragraphs[0]->text)->toBe('نص تجريبي ١٥')
        ->and($book->serialise())->not->toContain('### | ')
        ->and($book->serialise())->not->toContain('# ');
});

it('removes all of the closed list together and nothing else', function (): void {
    $book = shamelaCanonical([
        '### | عنوان تجريبي ١٦',
        '# PageV01P009 ms004 نص تجريبي ١٧ «5»',
        '~~PageV01P010 نص ms005 تجريبي ١٨',
    ]);

    expect($book->paragraphs[0]->text)->toBe('نص تجريبي ١٧ نص تجريبي ١٨')
        ->and($book->paragraphs[0]->page)->toBe(9)
        ->and($book->counts->milestoneTokens)->toBe(2)
        ->and($book->counts->pageMarkers)->toBe(2)
        ->and($book->counts->footnoteReferences)->toBe(1);
});

it('excludes an editor footnote body with its continuations and still moves the page for a marker inside it', function (): void {
    $book = shamelaCanonical([
        '### | عنوان تجريبي ١٩',
        '# نص تجريبي ٢٠',
        '# «1» نص حاشية ٢١',
        '~~PageV01P020 نص حاشية ٢٢',
        '# نص تجريبي ٢٣',
    ]);

    expect($book->paragraphs)->toHaveCount(2)
        ->and($book->paragraphs[1]->text)->toBe('نص تجريبي ٢٣')
        ->and($book->paragraphs[1]->page)->toBe(20)
        ->and($book->serialise())->not->toContain('نص حاشية')
        ->and($book->counts->footnoteBlocks)->toBe(1)
        ->and($book->counts->footnoteLines)->toBe(2);
});

it('keeps every other byte, including bidirectional marks, inner double spaces and punctuation', function (): void {
    $text = "نص\u{200F} تجريبي  ٢٤ ( ليس ) ، ؛ ﷺ — \u{200E}end";
    $book = shamelaCanonical(['### | عنوان تجريبي ٢٥', '# '.$text]);

    expect($book->paragraphs[0]->text)->toBe($text);
});

it('leaves the braced runs of a quotation untouched and counts them', function (): void {
    $book = shamelaCanonical(['### | عنوان تجريبي ٢٦', '# نص { نص تجريبي ٢٧', '~~ نص } نص']);

    expect($book->paragraphs[0]->text)->toBe('نص { نص تجريبي ٢٧  نص } نص')
        ->and($book->counts->bracedRuns)->toBe(1)
        ->and($book->counts->bracedUnbalanced)->toBe(0);
});

it('drops an empty heading wrapper and an empty paragraph, and counts them', function (): void {
    $book = shamelaCanonical(['### | عنوان تجريبي ٢٨', '### | ', '# PageV01P009', '#', '# نص تجريبي ٢٩']);

    expect($book->sections)->toHaveCount(1)
        ->and($book->paragraphs)->toHaveCount(1)
        ->and($book->paragraphs[0]->page)->toBe(9)
        ->and($book->counts->emptyHeadings)->toBe(1)
        ->and($book->counts->emptyParagraphs)->toBe(2)
        ->and($book->counts->bareMarkers)->toBe(1);
});

it('gives a heading with no paragraph of its own a null range and partitions a section into contiguous ranges', function (): void {
    $book = shamelaCanonical([
        '### | عنوان تجريبي ٣٠',
        '# نص تجريبي ٣١',
        '# نص تجريبي ٣٢',
        '### | عنوان تجريبي ٣٣',
        '### | عنوان تجريبي ٣٤',
        '# نص تجريبي ٣٥',
    ]);

    expect($book->sections)->toHaveCount(3)
        ->and($book->sections[0]->paragraphFrom)->toBe('p00001')
        ->and($book->sections[0]->paragraphTo)->toBe('p00002')
        ->and($book->sections[1]->paragraphFrom)->toBeNull()
        ->and($book->sections[2]->paragraphFrom)->toBe('p00003')
        ->and($book->paragraphs[2]->sectionId)->toBe('s003');
});

it('makes the configured front-matter headings level front, in book order, and the rest heading', function (): void {
    $book = shamelaCanonical(
        ['### | عنوان تجريبي ٣٦', '# نص تجريبي ٣٧', '### | عنوان تجريبي ٣٨', '# نص تجريبي ٣٩'],
        ['عنوان تجريبي ٣٦'],
    );

    expect($book->sections[0]->level)->toBe(SectionLevel::Front)
        ->and($book->sections[1]->level)->toBe(SectionLevel::Heading);
});

it('fails when a front-matter heading differs from its configured title', function (): void {
    shamelaCanonical(['### | عنوان تجريبي ٤٠'], ['عنوان تجريبي ٤١']);
})->throws(SeerahCanonicalException::class, 'front_mismatch');

it('fails when the book has fewer headings than its front matter', function (): void {
    shamelaCanonical(['### | عنوان تجريبي ٤٢'], ['عنوان تجريبي ٤٢', 'عنوان تجريبي ٤٣']);
})->throws(SeerahCanonicalException::class, 'front_mismatch');

it('gives paragraphs before the first heading a front section with no title', function (): void {
    $book = shamelaCanonical(['# نص تجريبي ٤٤', '### | عنوان تجريبي ٤٥']);

    expect($book->sections[0]->level)->toBe(SectionLevel::Front)
        ->and($book->sections[0]->title)->toBe('')
        ->and($book->paragraphs[0]->sectionId)->toBe('s001');
});

it('gives the same ids and the same serialisation on every run', function (): void {
    $lines = ['### | عنوان تجريبي ٤٦', '# PageV01P012 نص تجريبي ٤٧', '### | عنوان تجريبي ٤٨', '# نص تجريبي ٤٩'];

    $first = shamelaCanonical($lines);
    $second = shamelaCanonical($lines);

    expect($first->serialise())->toBe($second->serialise())
        ->and($first->sha256())->toBe($second->sha256())
        ->and($first->paragraphs[1]->id)->toBe('p00002');
});

it('fails when a continuation line has no block above it', function (): void {
    shamelaCanonical(['~~نص تجريبي ٥٠']);
})->throws(SeerahCanonicalException::class, 'continuation_without_block');

it('fails on a line that is not a known marker', function (): void {
    shamelaCanonical(['### | عنوان تجريبي ٥١', 'نص بلا علامة']);
})->throws(SeerahCanonicalException::class, 'unknown_markup');

it('fails on a heading wrapper that is not the three-hash pipe form', function (): void {
    shamelaCanonical(['### عنوان تجريبي ٥٢']);
})->throws(SeerahCanonicalException::class, 'heading_markup');

it('fails on a heading that is continued on the next line', function (): void {
    shamelaCanonical(['### | عنوان تجريبي ٥٣', '~~تجريبي ٥٤']);
})->throws(SeerahCanonicalException::class, 'heading_split');

it('fails on a tab inside a heading', function (): void {
    shamelaCanonical(["### | عنوان\tتجريبي ٥٥"]);
})->throws(SeerahCanonicalException::class, 'tab_in_text');

it('fails on a source with no header end line', function (): void {
    (new BookCanonicalizer)->canonicalize("### | عنوان تجريبي ٥٦\n");
})->throws(SeerahCanonicalException::class, 'header_missing');

it('fails on a source with no heading at all', function (): void {
    shamelaCanonical(['']);
})->throws(SeerahCanonicalException::class, 'no_headings');

it('fails on bytes that are not UTF-8', function (): void {
    (new BookCanonicalizer)->canonicalize(shamelaFixture(['### | عنوان تجريبي ٥٧'])."\xFF");
})->throws(SeerahCanonicalException::class, 'encoding');

it('fails on carriage returns', function (): void {
    (new BookCanonicalizer)->canonicalize(str_replace("\n", "\r\n", shamelaFixture(['### | عنوان تجريبي ٥٨'])));
})->throws(SeerahCanonicalException::class, 'line_endings');

it('reports unparsed lines by number and code only, never their text', function (): void {
    try {
        shamelaCanonical(['~~نص تجريبي ٥٩', '### | عنوان تجريبي ٦٠', 'نص تجريبي ٦١ بلا علامة']);
        $this->fail('expected the canonicalizer to refuse the unparsed lines');
    } catch (SeerahCanonicalException $exception) {
        expect($exception->getMessage())
            ->toContain('2 (5:continuation_without_block, 7:unknown_markup)')
            ->not->toContain('نص تجريبي ٦١');
    }
});
