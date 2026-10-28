<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

final class ContentCatalogClient
{
    private readonly QfResponseParser $parser;

    public function __construct(private readonly QfApi $api)
    {
        $this->parser = new QfResponseParser;
    }

    /**
     * @return list<CatalogEntry>
     */
    public function tafsirs(): array
    {
        return $this->parser->catalog($this->api->get('/api/v4/resources/tafsirs'), 'tafsirs');
    }

    /**
     * @return list<ReciterCatalogEntry>
     */
    public function chapterReciters(string $language = 'en'): array
    {
        $query = $language === 'en' ? null : ['language' => $language];

        return $this->parser->reciters($this->api->get('/api/v4/resources/chapter_reciters', $query));
    }
}
