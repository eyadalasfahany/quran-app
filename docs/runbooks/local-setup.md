# Local setup (macOS)

ADR 0004: Homebrew MySQL and Redis, local PHP 8.5 and Node 26. No Docker for now.

## Toolchain

```bash
brew install php            # PHP 8.5, linked as `php`
nvm install && nvm use      # Node from .nvmrc (26)
brew services start mysql   # already running on this Mac (port 3306)
brew services start redis   # port 6379
```

## MySQL user and databases (once)

Run as MySQL root, in phpMyAdmin (SQL tab) or `mysql -uroot -p`. Use the same password as `DB_PASSWORD` in `apps/api/.env`.

```sql
CREATE DATABASE IF NOT EXISTS quran CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS quran_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'quran'@'localhost' IDENTIFIED BY 'change-me';
CREATE USER IF NOT EXISTS 'quran'@'127.0.0.1' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON quran.* TO 'quran'@'localhost', 'quran'@'127.0.0.1';
-- Pest --parallel creates quran_testing_test_N, hence the wildcard.
GRANT ALL PRIVILEGES ON `quran\_testing%`.* TO 'quran'@'localhost', 'quran'@'127.0.0.1';
FLUSH PRIVILEGES;
```

## API

```bash
cd apps/api
cp .env.example .env && php artisan key:generate   # first time only; then set DB_PASSWORD
composer install
php artisan migrate
php artisan serve            # http://localhost:8000/api/v1/health
php artisan horizon          # queues, when needed
php artisan schedule:work    # scheduler, when needed
composer qa                  # needs MySQL and Redis running
```

Mail goes to `storage/logs/laravel.log` (`MAIL_MAILER=log`).
