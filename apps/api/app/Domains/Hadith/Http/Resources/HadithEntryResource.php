<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Resources;

use App\Domains\Hadith\Data\HadithEntryData;
use App\Domains\Hadith\Data\HadithGradeData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One hadith. The grades key is present only while grades are visible (ADR 0042 section 5), so it is documented as
 * optional.
 *
 * @property HadithEntryData $resource
 */
final class HadithEntryResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     hadith_number: string,
     *     arabic_number: string|null,
     *     position: int,
     *     text_ar: string,
     *     source_url: string|null,
     *     book_number: string,
     *     chapter_number: int|null,
     *     grades?: list<array{grade: string, graded_by: string}>
     * }
     */
    public function toArray(Request $request): array
    {
        return [
            'hadith_number' => $this->resource->hadithNumber,
            'arabic_number' => $this->resource->arabicNumber,
            'position' => $this->resource->position,
            'text_ar' => $this->resource->textAr,
            'source_url' => $this->resource->sourceUrl,
            'book_number' => $this->resource->bookNumber,
            'chapter_number' => $this->resource->chapterNumber,
            ...$this->gradesPart(),
        ];
    }

    /**
     * Only while grades are visible: the key is absent otherwise (ADR 0042 section 5).
     *
     * @return array{grades?: list<array{grade: string, graded_by: string}>}
     */
    private function gradesPart(): array
    {
        if ($this->resource->grades === null) {
            return [];
        }

        $grades = [];

        foreach ($this->resource->grades as $grade) {
            $grades[] = $this->gradeShape($grade);
        }

        return ['grades' => $grades];
    }

    /**
     * @return array{grade: string, graded_by: string}
     */
    private function gradeShape(HadithGradeData $grade): array
    {
        return [
            'grade' => $grade->grade,
            'graded_by' => $grade->gradedBy,
        ];
    }
}
