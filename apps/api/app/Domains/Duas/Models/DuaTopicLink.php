<?php

declare(strict_types=1);

namespace App\Domains\Duas\Models;

use Illuminate\Database\Eloquent\Model;

final class DuaTopicLink extends Model
{
    protected $table = 'dua_topic_links';

    public $incrementing = false;

    public $timestamps = false;
}
