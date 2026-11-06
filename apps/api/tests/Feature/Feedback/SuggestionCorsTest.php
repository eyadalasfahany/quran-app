<?php

declare(strict_types=1);

it('answers the website preflight for the suggestions endpoint', function (): void {
    $this->withHeaders([
        'Origin' => 'https://taybah-app.com',
        'Access-Control-Request-Method' => 'POST',
    ])
        ->options('/api/v1/suggestions')
        ->assertHeader('Access-Control-Allow-Origin', 'https://taybah-app.com');
});
