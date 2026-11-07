<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

/**
 * The response is not the shape the client expects, or it has too many pages. The message names a label and a page.
 */
final class HadithApiComShapeException extends HadithApiComException {}
