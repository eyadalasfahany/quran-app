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

## Mobile (iOS dev build)

```bash
npm ci                                  # from the repo root; runs the postinstall patches (Nitro, expo-audio exact seek)
cd apps/mobile/ios && pod install && cd ..
npx expo run:ios                        # the dev client; needed after any native dependency change
```

Run `pod install` after every `npm ci`. `expo-sqlite`'s podspec copies its bundled `sqlite3.c`/`sqlite3.h` into `node_modules/expo-sqlite/ios/` only while `pod install` runs, and `npm ci` wipes them. If you skip it, the build fails with `cannot find 'exsqlite3_bind_…' in scope` (29 Oct 2026). If it still fails, regenerate the native project: `npx expo prebuild --clean -p ios`.
