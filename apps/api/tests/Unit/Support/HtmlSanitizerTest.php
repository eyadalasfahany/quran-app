<?php

declare(strict_types=1);

use App\Support\Html\HtmlSanitizer;

beforeEach(function (): void {
    $this->sanitizer = new HtmlSanitizer;
});

it('keeps the whitelist and drops style', function (): void {
    $html = '<h1><span style="color: rgb(59, 62, 102);">Introduction</span></h1><p>Body</p>';

    expect($this->sanitizer->sanitize($html))->toBe('<h1><span>Introduction</span></h1><p>Body</p>');
});

it('removes script elements with their text', function (): void {
    $html = '<p>Keep</p><script>alert(1)</script>';

    expect($this->sanitizer->sanitize($html))->toBe('<p>Keep</p>')
        ->and($this->sanitizer->textContent($this->sanitizer->sanitize($html)))->toBe('Keep');
});

it('unwraps a link and keeps its text', function (): void {
    expect($this->sanitizer->sanitize('<a href="https://example.test">words</a>'))->toBe('words');
});

it('keeps arabic diacritics byte for byte', function (): void {
    $arabic = 'بِسْمِ اللَّهِ';

    $sanitized = $this->sanitizer->sanitize('<p>'.$arabic.'</p>');

    expect($sanitized)->toBe('<p>'.$arabic.'</p>')
        ->and(bin2hex($this->sanitizer->textContent($sanitized)))->toBe(bin2hex($arabic));
});

it('unwraps nested disallowed tags', function (): void {
    $html = '<div><span class="x">Hi</span><section><b>there</b></section></div>';

    expect($this->sanitizer->sanitize($html))->toBe('<span>Hi</span><b>there</b>');
});

it('returns an empty string for empty input', function (): void {
    expect($this->sanitizer->sanitize(''))->toBe('');
});
