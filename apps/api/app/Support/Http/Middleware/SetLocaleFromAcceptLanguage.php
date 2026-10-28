<?php

declare(strict_types=1);

namespace App\Support\Http\Middleware;

use Closure;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Accept-Language picks the language of error messages and emails, never of
 * Quran text or tafsir (spec section 8). Arabic first.
 */
final readonly class SetLocaleFromAcceptLanguage
{
    private const array LOCALES = ['ar', 'en'];

    public function __construct(private Application $app) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $this->app->setLocale($request->getPreferredLanguage(self::LOCALES) ?? self::LOCALES[0]);

        return $next($request);
    }
}
