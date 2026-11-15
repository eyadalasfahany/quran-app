<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * What a block of the source is: a heading (`### | `), a paragraph (`# ` or a bare `#`), or an editor's footnote body
 * (`# «N»`), which is excluded from the canonical book.
 */
enum BlockKind: string
{
    case Heading = 'heading';
    case Paragraph = 'paragraph';
    case Footnote = 'footnote';
}
