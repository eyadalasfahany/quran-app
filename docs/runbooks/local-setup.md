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

### Content: one command per feature

Each command fetches, verifies and imports all of that feature's content, then builds its pack. They are safe to re-run: files already present and matching their pins are kept.

```bash
php artisan azkar:setup   # audio (241 recordings) → pinned hisnmuslim + HadeethEnc snapshots → OpenDua import → packs
php artisan duas:setup    # pinned HadeethEnc snapshot → Duas import → packs (Duas has no audio, ADR 0055)
```

- `azkar:setup --skip-audio` skips the audio download and check. `--from=<folder>` copies the recordings from a folder instead of downloading them, and `--full` also hashes every file.
- A snapshot that can't be fetched only warns (as at web start), and the import runs without it.

**Android emulator:** the app calls `EXPO_PUBLIC_API_URL`. If that is the Mac's LAN address (for a phone on Wi-Fi), serve the API there too (`php artisan serve --host=<LAN IP>`), or set it to `http://10.0.2.2:8000` for the emulator and restart Metro. Otherwise no pack downloads and Azkar shows «الأذكار غير متاحة بعد».

## Mobile (iOS dev build)

```bash
npm ci                                  # from the repo root; runs the postinstall patches (Nitro, expo-audio exact seek)
cd apps/mobile/ios && pod install && cd ..
npx expo run:ios                        # the dev client; needed after any native dependency change
```

Locally only: run `pod install` after every `npm ci`. `ios/` is generated (continuous native generation, `.gitignore`), but a local `ios/` from an earlier build stays on disk. `npm ci` wipes the `sqlite3.c`/`sqlite3.h` that `expo-sqlite`'s podspec copies into `node_modules/expo-sqlite/ios/` during `pod install`, and `expo run:ios` skips `pod install` when the lockfile and Podfile are unchanged. The build then fails with `cannot find 'exsqlite3_bind_…' in scope` (29 Oct 2026). `npx expo prebuild --clean -p ios` also fixes it, by regenerating `ios/`.

EAS builds don't need any of this: each one starts from a clean checkout, runs `npm ci` (with the postinstall patches), then `expo prebuild` and `pod install` on a fresh `ios/`.
