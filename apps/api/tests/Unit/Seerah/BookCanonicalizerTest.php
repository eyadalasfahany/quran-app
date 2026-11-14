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
function seerahFixture(array $lines): string
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
 */
function seerahCanonical(array $lines): CanonicalBook
{
    return (new BookCanonicalizer)->canonicalize(seerahFixture($lines));
}

it('removes the header block and counts it', function (): void {
    $book = seerahCanonical(['# | 1 ( عنوان تجريبي ١ ) 1', '# نص تجريبي ١ — ليس من الكتاب']);

    expect($book->counts->headerLines)->toBe(4)
        ->and($book->serialise())->not->toContain('#META#')
        ->and($book->sections)->toHaveCount(1);
});

it('removes a page marker alone and keeps its number as the page of the text after it', function (): void {
    $book = seerahCanonical([
        '# | عنوان تجريبي ٢',
        '# PageV01P007 نص تجريبي ٢ — ليس من الكتاب',
        '~~PageV01P008',
        '~~نص تجريبي ٣',
    ]);

    expect($book->paragraphs)->toHaveCount(1)
        ->and($book->paragraphs[0]->text)->toBe('نص تجريبي ٢ — ليس من الكتاب نص تجريبي ٣')
        ->and($book->paragraphs[0]->page)->toBe(7)
        ->and($book->sections[0]->page)->toBe(0)
        ->and($book->counts->pageMarkers)->toBe(2)
        ->and($book->counts->firstPage)->toBe(7)
        ->and($book->counts->lastPage)->toBe(8);
});

it('joins a continuation line to the line above with exactly one space', function (): void {
    $book = seerahCanonical(['# نص تجريبي ٤', '~~نص تجريبي ٥', '~~نص تجريبي ٦']);

    expect($book->paragraphs[0]->text)->toBe('نص تجريبي ٤ نص تجريبي ٥ نص تجريبي ٦')
        ->and($book->counts->continuationLines)->toBe(2);
});

it('removes a milestone token with one adjacent space, at the start, the middle and the end of a line', function (): void {
    $book = seerahCanonical([
        '# ms001 نص تجريبي ٧',
        '~~نص ms002 تجريبي ٨',
        '~~نص تجريبي ٩ ms003',
    ]);

    expect($book->paragraphs[0]->text)->toBe('نص تجريبي ٧ نص تجريبي ٨ نص تجريبي ٩')
        ->and($book->counts->milestoneTokens)->toBe(3);
});

it('removes the paragraph marker alone', function (): void {
    $book = seerahCanonical(['# | عنوان تجريبي ١٠', '# نص تجريبي ١١']);

    expect($book->paragraphs[0]->text)->toBe('نص تجريبي ١١')
        ->and($book->serialise())->not->toContain('# ');
});

it('removes the heading wrapper alone', function (): void {
    $book = seerahCanonical(['# | عنوان تجريبي ١٢']);

    expect($book->sections[0]->title)->toBe('عنوان تجريبي ١٢')
        ->and($book->sections[0]->level)->toBe(SectionLevel::Heading);
});

it('removes all of the closed list together and nothing else', function (): void {
    $book = seerahCanonical([
        '# | 1 ( عنوان تجريبي ١٣ ) 1',
        '# PageV01P009 ms004 نص تجريبي ١٤',
        '~~PageV01P010 نص ms005 تجريبي ١٥',
    ]);

    expect($book->paragraphs[0]->text)->toBe('نص تجريبي ١٤ نص تجريبي ١٥')
        ->and($book->sections[0]->title)->toBe('عنوان تجريبي ١٣')
        ->and($book->paragraphs[0]->page)->toBe(9)
        ->and($book->counts->milestoneTokens)->toBe(2)
        ->and($book->counts->pageMarkers)->toBe(2);
});

it('keeps every other byte, including bidirectional marks, inner double spaces and punctuation', function (): void {
    $text = "نص\u{200F} تجريبي  ١٦ ( ليس ) ، ؛ ﷺ — \u{200E}end";
    $book = seerahCanonical(['# | عنوان تجريبي ١٧', '# '.$text]);

    expect($book->paragraphs[0]->text)->toBe($text);
});

it('leaves the braced runs of a quotation untouched and counts them', function (): void {
    $book = seerahCanonical(['# | عنوان تجريبي ١٨', '# نص { نص تجريبي ١٩', '~~ نص } نص']);

    expect($book->paragraphs[0]->text)->toBe('نص { نص تجريبي ١٩  نص } نص')
        ->and($book->counts->bracedRuns)->toBe(1)
        ->and($book->counts->bracedUnbalanced)->toBe(0);
});

it('parses a numbered heading into its title and printed number', function (): void {
    $book = seerahCanonical(['# | 1 ( عنوان تجريبي ٢٠ ) 1']);

    expect($book->sections[0]->level)->toBe(SectionLevel::Heading)
        ->and($book->sections[0]->title)->toBe('عنوان تجريبي ٢٠')
        ->and($book->sections[0]->printedNumber)->toBe('1')
        ->and($book->sections[0]->number)->toBeNull();
});

it('parses a Bab with its ordinal as a number and its title on the same line', function (): void {
    $book = seerahCanonical(['# | الباب الثاني عنوان تجريبي ٢١', '# نص تجريبي ٢٢']);

    expect($book->sections[0]->level)->toBe(SectionLevel::Bab)
        ->and($book->sections[0]->number)->toBe(2)
        ->and($book->sections[0]->title)->toBe('الباب الثاني عنوان تجريبي ٢١');
});

it('parses a Fasl whose title follows a pipe and keeps the pipe in the heading text', function (): void {
    $book = seerahCanonical(['# | الفصل الثالث | عنوان تجريبي ٢٣']);

    expect($book->sections[0]->level)->toBe(SectionLevel::Fasl)
        ->and($book->sections[0]->number)->toBe(3)
        ->and($book->sections[0]->title)->toBe('الفصل الثالث | عنوان تجريبي ٢٣');
});

it('parses an unnumbered one-line heading', function (): void {
    $book = seerahCanonical(['# | عنوان تجريبي ٢٤', '# نص تجريبي ٢٥']);

    expect($book->sections[0]->level)->toBe(SectionLevel::Heading)
        ->and($book->sections[0]->title)->toBe('عنوان تجريبي ٢٤')
        ->and($book->sections[0]->printedNumber)->toBeNull();
});

it('joins a heading split over three lines into one title', function (): void {
    $book = seerahCanonical(['# | 1 ( عنوان', '~~تجريبي ٢٦ )', '~~1', '# نص تجريبي ٢٧']);

    expect($book->sections)->toHaveCount(1)
        ->and($book->sections[0]->title)->toBe('عنوان تجريبي ٢٦')
        ->and($book->paragraphs[0]->text)->toBe('نص تجريبي ٢٧');
});

it('treats a multi-line wrapper block as body text, not a heading', function (): void {
    $book = seerahCanonical(['# | عنوان تجريبي ٢٨', '# | نص تجريبي ٢٩', '~~نص تجريبي ٣٠']);

    expect($book->sections)->toHaveCount(1)
        ->and($book->sections[0]->title)->toBe('عنوان تجريبي ٢٨')
        ->and($book->paragraphs[0]->text)->toBe('نص تجريبي ٢٩ نص تجريبي ٣٠');
});

it('keeps a printed-line marker as text, counts it, and does not start a paragraph', function (): void {
    $book = seerahCanonical(['# | عنوان تجريبي ٣١', '# نص تجريبي ٣٢', '# 12 ; نص تجريبي ٣٣']);

    expect($book->paragraphs)->toHaveCount(1)
        ->and($book->paragraphs[0]->text)->toBe('نص تجريبي ٣٢ 12 ; نص تجريبي ٣٣')
        ->and($book->counts->printedLineMarkers)->toBe(1);
});

it('assigns the paragraphs of a section a contiguous range and keeps ids in book order', function (): void {
    $book = seerahCanonical([
        '# | عنوان تجريبي ٣٤',
        '# نص تجريبي ٣٥',
        '# نص تجريبي ٣٦',
        '# | عنوان تجريبي ٣٧',
        '# نص تجريبي ٣٨',
    ]);

    expect($book->sections[0]->paragraphFrom)->toBe('p00001')
        ->and($book->sections[0]->paragraphTo)->toBe('p00002')
        ->and($book->sections[1]->paragraphFrom)->toBe('p00003')
        ->and($book->sections[1]->paragraphTo)->toBe('p00003')
        ->and($book->paragraphs[2]->sectionId)->toBe('s002');
});

it('gives a heading with no paragraph of its own a null range', function (): void {
    $book = seerahCanonical(['# | عنوان تجريبي ٣٩', '# | عنوان تجريبي ٤٠']);

    expect($book->sections)->toHaveCount(2)
        ->and($book->sections[0]->paragraphFrom)->toBeNull()
        ->and($book->sections[0]->paragraphTo)->toBeNull();
});

it('nests a Fasl under its Bab and a heading under its Fasl, and a new Bab closes both', function (): void {
    $book = seerahCanonical([
        '# | الباب الأول عنوان تجريبي ٤١',
        '# | الفصل الأول | عنوان تجريبي ٤٢',
        '# | 1 ( عنوان تجريبي ٤٣ ) 1',
        '# | الباب الثاني عنوان تجريبي ٤٤',
    ]);

    expect($book->sections[1]->parentId)->toBe('s001')
        ->and($book->sections[2]->parentId)->toBe('s002')
        ->and($book->sections[3]->parentId)->toBeNull();
});

it('gives paragraphs before the first heading a front section', function (): void {
    $book = seerahCanonical(['# نص تجريبي ٤٥', '# | عنوان تجريبي ٤٦']);

    expect($book->sections[0]->level)->toBe(SectionLevel::Front)
        ->and($book->sections[0]->id)->toBe('s001')
        ->and($book->paragraphs[0]->sectionId)->toBe('s001')
        ->and($book->sections[1]->id)->toBe('s002');
});

it('counts bare markers and paragraphs with no text as empty, and keeps no paragraph for them', function (): void {
    $book = seerahCanonical(['# | عنوان تجريبي ٤٧', '#', '# PageV01P011', '# نص تجريبي ٤٨']);

    expect($book->paragraphs)->toHaveCount(1)
        ->and($book->counts->bareMarkers)->toBe(1)
        ->and($book->counts->emptyParagraphs)->toBe(2);
});

it('counts the pipes it keeps inside the text', function (): void {
    $book = seerahCanonical(['# | عنوان تجريبي ٤٩ | قسم', '# نص تجريبي ٥٠ . |']);

    expect($book->counts->pipes)->toBe(2);
});

it('gives the same ids and the same serialisation on every run', function (): void {
    $lines = ['# | 1 ( عنوان تجريبي ٥١ ) 1', '# PageV01P012 نص تجريبي ٥٢', '# | عنوان تجريبي ٥٣', '# نص تجريبي ٥٤'];

    $first = seerahCanonical($lines);
    $second = seerahCanonical($lines);

    expect($first->serialise())->toBe($second->serialise())
        ->and($first->sha256())->toBe($second->sha256())
        ->and($first->paragraphs[1]->id)->toBe('p00002');
});

it('fails when a continuation line has no block above it', function (): void {
    seerahCanonical(['~~نص تجريبي ٥٥']);
})->throws(SeerahCanonicalException::class, 'continuation_without_block');

it('fails on a line that is not a known marker', function (): void {
    seerahCanonical(['# | عنوان تجريبي ٥٦', 'نص بلا علامة']);
})->throws(SeerahCanonicalException::class, 'unknown_markup');

it('fails on a numbered heading that does not close', function (): void {
    seerahCanonical(['# | 1 ( عنوان تجريبي ٥٧']);
})->throws(SeerahCanonicalException::class, 'heading_numbered');

it('fails on a Bab or Fasl split over lines', function (): void {
    seerahCanonical(['# | الباب الأول عنوان', '~~تجريبي ٥٨']);
})->throws(SeerahCanonicalException::class, 'heading_split');

it('fails on a Bab or Fasl whose ordinal the book does not use', function (): void {
    seerahCanonical(['# | الباب الحادي عشر عنوان تجريبي ٥٩']);
})->throws(SeerahCanonicalException::class, 'heading_ordinal');

it('fails on a bare heading wrapper with no text', function (): void {
    seerahCanonical(['# | ']);
})->throws(SeerahCanonicalException::class, 'heading_empty');

it('fails on a source with no header end line', function (): void {
    (new BookCanonicalizer)->canonicalize("# | عنوان تجريبي ٦٠\n");
})->throws(SeerahCanonicalException::class, 'header_missing');

it('fails on a source with no heading at all', function (): void {
    seerahCanonical(['']);
})->throws(SeerahCanonicalException::class, 'no_headings');

it('fails on bytes that are not UTF-8', function (): void {
    (new BookCanonicalizer)->canonicalize(seerahFixture(['# | عنوان تجريبي ٦١'])."\xFF");
})->throws(SeerahCanonicalException::class, 'encoding');

it('fails on carriage returns', function (): void {
    (new BookCanonicalizer)->canonicalize(str_replace("\n", "\r\n", seerahFixture(['# | عنوان تجريبي ٦٢'])));
})->throws(SeerahCanonicalException::class, 'line_endings');

it('reports unparsed lines by number and code only, never their text', function (): void {
    try {
        seerahCanonical(['~~نص تجريبي ٦٣', '# | عنوان تجريبي ٦٤', 'نص تجريبي ٦٥ بلا علامة']);
        $this->fail('expected the canonicalizer to refuse the unparsed lines');
    } catch (SeerahCanonicalException $exception) {
        expect($exception->getMessage())
            ->toContain('2 (5:continuation_without_block, 7:unknown_markup)')
            ->not->toContain('نص تجريبي ٦٥');
    }
});
