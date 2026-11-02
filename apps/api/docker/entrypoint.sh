#!/bin/sh
set -e

# Railway injects PORT. FrankenPHP listens on SERVER_NAME.
if [ -n "$PORT" ]; then
  export SERVER_NAME=":$PORT"
fi

php artisan config:cache

exec "$@"
