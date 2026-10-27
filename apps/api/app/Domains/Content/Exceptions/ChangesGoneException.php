<?php

declare(strict_types=1);

namespace App\Domains\Content\Exceptions;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class ChangesGoneException extends HttpException
{
    public function __construct()
    {
        parent::__construct(Response::HTTP_GONE, __('problems.changes_gone_detail'));
    }
}
