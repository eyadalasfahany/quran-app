<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Console;

use App\Domains\Seerah\Exceptions\SeerahCanonicalException;
use App\Domains\Seerah\Review\SignOffApprover;
use App\Domains\Seerah\Services\CanonicalBookBuilder;
use App\Domains\Seerah\Validation\SeerahValidator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Developer only (ADR 0089): signs one review group (G, E1 to E4 or M) by writing reviews/<group>.json with the hash of every record.
 * It refuses in production, in CI, in a non-interactive run, when the validator reports errors, when a record has an open flag without a
 * decision, and when the group is empty. It asks for the group's name before it writes. No agent runs it.
 */
final class ApproveCommand extends Command
{
    protected $signature = 'seerah:approve
        {group : The review group: G, E1, E2, E3, E4 or M}
        {--data= : The data folder (default database/data/seerah)}';

    protected $description = 'Sign one Seerah review group after the developer has read the report (ADR 0089). Developer only.';

    public function handle(SeerahValidator $validator, CanonicalBookBuilder $builder, SignOffApprover $approver): int
    {
        if (app()->isProduction()) {
            $this->error('seerah:approve is disabled in production.');

            return self::FAILURE;
        }

        if (filter_var(getenv('CI'), FILTER_VALIDATE_BOOLEAN) || filter_var(getenv('GITHUB_ACTIONS'), FILTER_VALIDATE_BOOLEAN)) {
            $this->error('seerah:approve refuses to run in CI.');

            return self::FAILURE;
        }

        if (! $this->input->isInteractive()) {
            $this->error('seerah:approve needs an interactive terminal; a sign-off is never written by a script.');

            return self::FAILURE;
        }

        $group = (string) $this->argument('group');
        $groups = array_merge(['G', 'M'], array_keys((array) config('seerah.batches', [])));

        if (! in_array($group, $groups, true)) {
            $this->error('Unknown group '.$group.'; use one of '.implode(', ', $groups).'.');

            return self::FAILURE;
        }

        try {
            $build = $builder->build(null);
        } catch (SeerahCanonicalException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $directory = (string) ($this->option('data') ?: database_path('data/seerah'));
        $run = $validator->validate($directory, $build, false, false);
        $reasons = $approver->refusals($group, $run->data, $run->issues);

        if ($reasons !== []) {
            foreach ($reasons as $reason) {
                $this->error('Refused: '.$reason);
            }

            return self::FAILURE;
        }

        $signedAt = now()->toDateString();
        $prepared = $approver->build($group, $run->data, 'developer', $signedAt);

        $this->line('Group '.$group.': '.$prepared['count'].' record(s), digest '.$prepared['digest'].'.');

        $typed = (string) $this->ask('Type the group name ('.$group.') to sign it, or press Enter to cancel');

        if ($typed !== $group) {
            $this->line('Not signed.');

            return self::SUCCESS;
        }

        $path = $directory.'/reviews/'.$group.'.json';
        File::ensureDirectoryExists(dirname($path));
        File::put($path, $prepared['json']);

        $this->info('Signed '.$group.' in '.$path.'.');

        return self::SUCCESS;
    }
}
