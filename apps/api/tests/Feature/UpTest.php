<?php

declare(strict_types=1);

it('answers the uptime check', function (): void {
    $this->get('/up')->assertOk();
});
