<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Exceptions;

use RuntimeException;

/**
 * A source snapshot could not be fetched, decoded or verified. Nothing is pinned from a failed snapshot (ADR 0031 §12).
 */
final class SnapshotException extends RuntimeException {}
