-- Runs once, when the MySQL volume is first created.
-- Pest uses quran_testing; --parallel creates quran_testing_test_N, hence the wildcard grant.
CREATE DATABASE IF NOT EXISTS quran_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON `quran\_testing%`.* TO 'quran'@'%';
FLUSH PRIVILEGES;
