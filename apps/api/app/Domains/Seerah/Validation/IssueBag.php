<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation;

/**
 * Collects the issues of one run, in the order they were found.
 */
final class IssueBag
{
    /** @var list<Issue> */
    private array $issues = [];

    public function error(string $rule, string $where, string $message): void
    {
        $this->issues[] = new Issue($rule, Severity::Error, $where, $message);
    }

    public function warning(string $rule, string $where, string $message): void
    {
        $this->issues[] = new Issue($rule, Severity::Warning, $where, $message);
    }

    public function info(string $rule, string $where, string $message): void
    {
        $this->issues[] = new Issue($rule, Severity::Info, $where, $message);
    }

    /**
     * @return list<Issue>
     */
    public function all(): array
    {
        return $this->issues;
    }

    public function count(Severity $severity): int
    {
        return count(array_filter($this->issues, static fn (Issue $issue): bool => $issue->severity === $severity));
    }

    public function hasErrors(): bool
    {
        return $this->count(Severity::Error) > 0;
    }
}
