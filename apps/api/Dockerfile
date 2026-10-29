# Local development image for the API, Horizon and the scheduler (ADR 0003).
# Production on Railway uses docker/Dockerfile (ADR 0022).
FROM php:8.5-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends libicu-dev libzip-dev unzip \
    && docker-php-ext-install -j"$(nproc)" bcmath intl pcntl pdo_mysql zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
