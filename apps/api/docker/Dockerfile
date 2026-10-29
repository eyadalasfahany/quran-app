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

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

FROM dunglas/frankenphp:1-php8.5

RUN install-php-extensions \
    bcmath \
    intl \
    opcache \
    pcntl \
    pdo_mysql \
    zip

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
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
