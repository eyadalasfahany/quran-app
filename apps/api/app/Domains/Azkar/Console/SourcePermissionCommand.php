<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Repositories\Contracts\AzkarImportRepository;
use App\Domains\Azkar\Sources\AzkarSourceRegistry;
use App\Domains\Content\Enums\PermissionStatus;
use Illuminate\Console\Command;

/**
 * Sets the OpenDua source's permission status for local and development work (ADR 0031 §1, §11).
 * Production never unlocks: the command refuses there and changes nothing. Production changes the status only
 * through a reviewed migration (ADR 0038).
 */
final class SourcePermissionCommand extends Command
{
    /**
     * The statuses this command may set. not_required is for sources without a licence to clear.
     */
    private const array SETTABLE = ['granted', 'pending', 'denied'];

    protected $signature = 'azkar:source-permission
        {status : granted, pending or denied}
        {--source=opendua : The source whose content_sources row changes (opendua, hisnmuslim or hadeethenc)}';

    protected $description = 'Set the OpenDua content source permission for local work. Refused in production (ADR 0031 §11).';

    public function handle(AzkarImportRepository $repository, AzkarSourceRegistry $sources): int
    {
        if (app()->isProduction()) {
            $this->error('Refused: the OpenDua permission is never changed from the command line in production (ADR 0031 §1, §11).');

            return self::FAILURE;
        }

        $status = (string) $this->argument('status');

        if (! in_array($status, self::SETTABLE, true)) {
            $this->error('The status must be one of: '.implode(', ', self::SETTABLE).'.');

            return self::FAILURE;
        }

        try {
            $requested = (string) $this->option('source');
            $code = $requested === 'hadeethenc' ? 'hadeethenc' : $sources->for($requested)->code();
        } catch (\InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if (! $repository->setSourcePermissionStatus($code, PermissionStatus::from($status))) {
            $this->error('The content source ['.$code.'] is not seeded. Run the migrations first.');

            return self::FAILURE;
        }

        $this->info('The content source ['.$code.'] permission_status is now ['.$status.'] (local).');

        return self::SUCCESS;
    }
}
