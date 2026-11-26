<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Packs;

use PDO;

/**
 * Writes one SVG mushaf pack file (ADR 0090 decision 5). Its own PDO, not the content-pack writer, so the page bytes are bound
 * as blobs. No VACUUM: a new file has no free pages, and a second copy would double the disk use.
 */
final class SvgMushafPackWriter
{
    private ?PDO $pdo;

    private function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public static function create(string $path): self
    {
        $directory = dirname($path);

        if (! is_dir($directory) && ! mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new \RuntimeException('Could not create the directory for the SVG mushaf pack.');
        }

        $pdo = new PDO('sqlite:'.$path, options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $pdo->exec('PRAGMA journal_mode = DELETE');
        $pdo->exec('PRAGMA foreign_keys = OFF');

        return new self($pdo);
    }

    public function begin(): void
    {
        $this->connection()->beginTransaction();
    }

    public function commit(): void
    {
        $this->connection()->commit();
    }

    public function createSchema(): void
    {
        $this->connection()->exec(<<<'SQL'
            CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE pages (page INTEGER PRIMARY KEY, tqp BLOB NOT NULL, origin_x REAL NOT NULL, origin_y REAL NOT NULL);
            CREATE TABLE regions (
              page INTEGER NOT NULL, surah INTEGER NOT NULL, ayah INTEGER NOT NULL,
              label_x REAL, label_y REAL, polygon TEXT NOT NULL,
              PRIMARY KEY (page, surah, ayah)
            ) WITHOUT ROWID;
            CREATE INDEX regions_ayah ON regions (surah, ayah, page);
            CREATE TABLE word_boxes (
              page INTEGER NOT NULL, line INTEGER NOT NULL, surah INTEGER NOT NULL, ayah INTEGER NOT NULL,
              position INTEGER NOT NULL, x0 REAL NOT NULL, y0 REAL NOT NULL, x1 REAL NOT NULL, y1 REAL NOT NULL,
              PRIMARY KEY (surah, ayah, position)
            ) WITHOUT ROWID;
            CREATE INDEX word_boxes_page ON word_boxes (page, line);
            CREATE TABLE word_contours (
              surah INTEGER NOT NULL, ayah INTEGER NOT NULL, position INTEGER NOT NULL,
              first INTEGER NOT NULL, count INTEGER NOT NULL, flag INTEGER NOT NULL,
              PRIMARY KEY (surah, ayah, position, first)
            ) WITHOUT ROWID;
            CREATE TABLE contour_blocks (
              page INTEGER NOT NULL, kind INTEGER NOT NULL, ord INTEGER NOT NULL,
              surah INTEGER NOT NULL, ayah INTEGER NOT NULL, first INTEGER NOT NULL, count INTEGER NOT NULL,
              x0 INTEGER NOT NULL, y0 INTEGER NOT NULL, x1 INTEGER NOT NULL, y1 INTEGER NOT NULL,
              PRIMARY KEY (page, kind, ord)
            ) WITHOUT ROWID;
            SQL);
    }

    /**
     * @param  array<string, string>  $values
     */
    public function writeMeta(array $values): void
    {
        $statement = $this->connection()->prepare('INSERT INTO meta (key, value) VALUES (?, ?)');

        foreach ($values as $key => $value) {
            $statement->execute([$key, $value]);
        }
    }

    /**
     * The bytes are stored exactly as given: they are already gzip, and are never re-encoded here.
     */
    /**
     * @param  float  $originX  The raw viewBox min-x: regions and word boxes stay in raw page units.
     * @param  float  $originY  The raw viewBox min-y.
     */
    public function insertPage(int $page, string $tqp, float $originX, float $originY): void
    {
        $statement = $this->connection()->prepare('INSERT INTO pages (page, tqp, origin_x, origin_y) VALUES (?, ?, ?, ?)');
        $statement->bindValue(1, $page, PDO::PARAM_INT);
        $statement->bindValue(2, $tqp, PDO::PARAM_LOB);
        $statement->bindValue(3, $originX);
        $statement->bindValue(4, $originY);
        $statement->execute();
    }

    /**
     * @param  array{page: int, surah: int, ayah: int, label_x: string|null, label_y: string|null, polygon: string}  $row
     */
    public function insertRegion(array $row): void
    {
        $statement = $this->connection()->prepare('INSERT INTO regions (page, surah, ayah, label_x, label_y, polygon) VALUES (?, ?, ?, ?, ?, ?)');
        $statement->execute([$row['page'], $row['surah'], $row['ayah'], $row['label_x'], $row['label_y'], $row['polygon']]);
    }

    /**
     * @param  array{page: int, line: int, surah: int, ayah: int, position: int, x0: string, y0: string, x1: string, y1: string}  $row
     */
    public function insertWordBox(array $row): void
    {
        $statement = $this->connection()->prepare('INSERT INTO word_boxes (page, line, surah, ayah, position, x0, y0, x1, y1) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([$row['page'], $row['line'], $row['surah'], $row['ayah'], $row['position'], $row['x0'], $row['y0'], $row['x1'], $row['y1']]);
    }

    /**
     * @param  array{surah: int, ayah: int, position: int, first: int, count: int, flag: int}  $row
     */
    public function insertWordContour(array $row): void
    {
        $statement = $this->connection()->prepare('INSERT INTO word_contours (surah, ayah, position, first, count, flag) VALUES (?, ?, ?, ?, ?, ?)');
        $statement->execute([$row['surah'], $row['ayah'], $row['position'], $row['first'], $row['count'], $row['flag']]);
    }

    /**
     * Bounds are integers in 1/32 page units (ADR 0090 step 13 A3).
     *
     * @param  array{page: int, kind: int, ord: int, surah: int, ayah: int, first: int, count: int, x0: int, y0: int, x1: int, y1: int}  $row
     */
    public function insertContourBlock(array $row): void
    {
        $statement = $this->connection()->prepare('INSERT INTO contour_blocks (page, kind, ord, surah, ayah, first, count, x0, y0, x1, y1) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([$row['page'], $row['kind'], $row['ord'], $row['surah'], $row['ayah'], $row['first'], $row['count'], $row['x0'], $row['y0'], $row['x1'], $row['y1']]);
    }

    public function close(): void
    {
        $this->pdo = null;
    }

    private function connection(): PDO
    {
        if ($this->pdo === null) {
            throw new \LogicException('The SVG mushaf pack writer is closed.');
        }

        return $this->pdo;
    }
}
