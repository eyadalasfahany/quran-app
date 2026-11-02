# Production image for Railway (ADR 0022).
# Local development keeps the Dockerfile in this directory's parent (ADR 0003, 0004).
# Railway's service root is apps/api, so this file's build context is the Laravel app.

FROM dunglas/frankenphp:1-php8.5 AS vendor

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY composer.json composer.lock ./

ENV COMPOSER_ALLOW_SUPERUSER=1

# pcntl is installed in the runtime stage below. Horizon requires it, and this
# stage's PHP does not have it yet, so Composer must not reject the lockfile.
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader \
    --ignore-platform-req=ext-pcntl \
    --ignore-platform-req=ext-posix

FROM dunglas/frankenphp:1-php8.5

RUN install-php-extensions \
    bcmath \
    intl \
    opcache \
    pcntl \
    pdo_mysql \
    zip

# Command-line PHP (content sync, queue workers, scheduler, release) gets 1 GB: a QF snapshot such as a
# full tafsir or a reciter's 6,236 timings exceeds the 128 MB default. PHP reads php-cli.ini only for the
# CLI SAPI, so FrankenPHP web requests keep the default limit.
RUN printf 'memory_limit = 1G\n' > "$PHP_INI_DIR/php-cli.ini"

WORKDIR /app

COPY --from=vendor /app/vendor ./vendor

COPY . .

RUN mkdir -p storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    SERVER_NAME=:8080

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/release.sh /usr/local/bin/release.sh
COPY docker/start-web.sh /usr/local/bin/start-web.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/release.sh /usr/local/bin/start-web.sh

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
