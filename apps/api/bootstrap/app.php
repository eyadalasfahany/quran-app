<?php

declare(strict_types=1);

use App\Support\Http\Middleware\NoStore;
use App\Support\Http\Middleware\SetLocaleFromAcceptLanguage;
use App\Support\ProblemDetails\ProblemDetailsRenderer;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(SetLocaleFromAcceptLanguage::class);
        $middleware->alias(['no-store' => NoStore::class]);

        // Railway's edge is the only proxy in front of the container. Without this every client shares the IP of that
        // proxy, so one rate-limit bucket covers all users (rate limiters key on $request->ip()). Trusted here, not in env.
        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT | Request::HEADER_X_FORWARDED_PROTO,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(
            fn (Throwable $exception, Request $request): ?JsonResponse => $request->is('api/*')
                ? app(ProblemDetailsRenderer::class)->render($exception)->toResponse()
                : null,
        );
    })->create();
