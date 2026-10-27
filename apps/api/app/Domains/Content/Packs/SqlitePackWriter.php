<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

use PDO;
use PDOStatement;

/**
 * Writes one resource pack into a temporary SQLite file.
 */
final class SqlitePackWriter
{
    private ?PDO $pdo;

    /** @var array<string, PDOStatement> */
    private array $inserts = [];

    private function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public static function create(string $path): self
    {
        $directory = dirname($path);

        if (! is_dir($directory) && ! mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new PackBuildException('Could not create the temporary pack directory.');
        }

        $pdo = new PDO('sqlite:'.$path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        $pdo->exec('PRAGMA foreign_keys = OFF');
        $pdo->exec('PRAGMA journal_mode = DELETE');

        return new self($pdo);
    }

    public function begin(): void
    {
        $this->pdo()->beginTransaction();
    }

    public function commit(): void
    {
        $this->pdo()->commit();
    }

    /**
     * @param  array<string, string>  $values
     */
    public function writeMeta(array $values): void
    {
        $this->pdo()->exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');

        $statement = $this->pdo()->prepare('INSERT INTO meta (key, value) VALUES (?, ?)');

        foreach ($values as $key => $value) {
            $statement->bindValue(1, $key, PDO::PARAM_STR);
            $statement->bindValue(2, $value, PDO::PARAM_STR);
            $statement->execute();
        }
    }

    public function createTable(PackTable $table): void
    {
        $this->pdo()->exec($table->createSql());
    }

    /**
     * @param  array<string, int|string|null>  $row
     */
    public function insert(PackTable $table, array $row): void
    {
        $statement = $this->insertStatement($table);
        $index = 1;

        foreach ($table->columns as $column) {
            $value = $row[$column->name] ?? null;

            if ($value === null) {
                $statement->bindValue($index, null, PDO::PARAM_NULL);
            } elseif (is_int($value)) {
                $statement->bindValue($index, $value, PDO::PARAM_INT);
            } else {
                $statement->bindValue($index, $value, PDO::PARAM_STR);
            }

            $index++;
        }

        $statement->execute();
    }

    public function vacuum(): void
    {
        $this->pdo()->exec('VACUUM');
    }

    public function close(): void
    {
        $this->inserts = [];
        $this->pdo = null;
    }

    private function insertStatement(PackTable $table): PDOStatement
    {
        if (isset($this->inserts[$table->name])) {
            return $this->inserts[$table->name];
        }

        $names = array_map(fn (PackColumn $column): string => $column->name, $table->columns);
        $placeholders = implode(', ', array_fill(0, count($names), '?'));
        $sql = 'INSERT INTO '.$table->name.' ('.implode(', ', $names).') VALUES ('.$placeholders.')';

        $statement = $this->pdo()->prepare($sql);
        $this->inserts[$table->name] = $statement;

        return $statement;
    }

    private function pdo(): PDO
    {
        if ($this->pdo === null) {
            throw new PackBuildException('The pack database is closed.');
        }

        return $this->pdo;
    }
}
