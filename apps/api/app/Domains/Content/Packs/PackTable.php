<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

final readonly class PackTable
{
    /**
     * @param  list<PackColumn>  $columns
     * @param  list<string>  $primaryKey
     * @param  list<string>  $orderBy
     */
    public function __construct(
        public string $name,
        public array $columns,
        public array $primaryKey,
        public array $orderBy,
    ) {}

    public function createSql(): string
    {
        $definitions = [];

        foreach ($this->columns as $column) {
            $sql = $column->name.' '.($column->integer ? 'INTEGER' : 'TEXT');

            if (! $column->nullable) {
                $sql .= ' NOT NULL';
            }

            $definitions[] = $sql;
        }

        $definitions[] = 'PRIMARY KEY ('.implode(', ', $this->primaryKey).')';

        return 'CREATE TABLE '.$this->name.' ('.implode(', ', $definitions).')';
    }
}
