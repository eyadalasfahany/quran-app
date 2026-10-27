<?php

declare(strict_types=1);

namespace App\Support\ProblemDetails;

use Dedoc\Scramble\Extensions\TypeToSchemaExtension;
use Dedoc\Scramble\Support\Generator\Response;
use Dedoc\Scramble\Support\Generator\Schema;
use Dedoc\Scramble\Support\Generator\Types\IntegerType;
use Dedoc\Scramble\Support\Generator\Types\ObjectType as OpenApiObjectType;
use Dedoc\Scramble\Support\Generator\Types\StringType;
use Dedoc\Scramble\Support\Generator\Types\Type as OpenApiType;
use Dedoc\Scramble\Support\Type\ObjectType;
use Dedoc\Scramble\Support\Type\Type;

/**
 * Documents problem details as application/problem+json. Scramble's response
 * attribute only keeps a schema when the media type already matches.
 */
final class ProblemDetailsResourceTypeToSchema extends TypeToSchemaExtension
{
    public function shouldHandle(Type $type): bool
    {
        return $type instanceof ObjectType && $type->isInstanceOf(ProblemDetailsResource::class);
    }

    public function toSchema(Type $type): OpenApiType
    {
        return (new OpenApiObjectType)
            ->addProperty('type', new StringType)
            ->addProperty('title', new StringType)
            ->addProperty('status', new IntegerType)
            ->addProperty('code', new StringType)
            ->addProperty('detail', (new StringType)->nullable(true))
            ->setRequired(['type', 'title', 'status', 'code']);
    }

    public function toResponse(Type $type): Response
    {
        return Response::make(200)
            ->setContent('application/problem+json', Schema::fromType($this->toSchema($type)));
    }
}
