<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Exceptions;

/**
 * The ayah polygons do not cover the surahs as surah.json counts them (check A2).
 */
final class SvgMushafCheckException extends SvgMushafException {}
