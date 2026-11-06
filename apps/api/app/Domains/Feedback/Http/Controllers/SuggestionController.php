<?php

declare(strict_types=1);

namespace App\Domains\Feedback\Http\Controllers;

use App\Domains\Feedback\Http\Requests\StoreSuggestionRequest;
use App\Domains\Feedback\Services\SuggestionService;
use App\Http\Controllers\Controller;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;

/**
 * Accepts a suggestion from the website form (ADR 0066). Public, no token.
 */
final class SuggestionController extends Controller
{
    public function __construct(private readonly SuggestionService $suggestions) {}

    #[Response(422, 'Some fields are not valid.', mediaType: 'application/problem+json', type: '\App\Support\ProblemDetails\ProblemDetailsResource')]
    #[Response(429, 'Too many suggestions from this address.', mediaType: 'application/problem+json', type: '\App\Support\ProblemDetails\ProblemDetailsResource')]
    public function __invoke(StoreSuggestionRequest $request): JsonResponse
    {
        $this->suggestions->submit($request->toData());

        return response()->json(['status' => 'received'], 202);
    }
}
