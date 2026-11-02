<?php

declare(strict_types=1);

// Messages for the rules the API's FormRequests use. Any other rule falls back to the English file.
return [
    'exists' => 'القيمة المختارة لـ :attribute غير موجودة.',
    'integer' => 'يجب أن يكون :attribute عددًا صحيحًا.',
    'max' => [
        'numeric' => 'يجب ألّا يزيد :attribute على :max.',
        'string' => 'يجب ألّا يزيد طول :attribute على :max حرفًا.',
    ],
    'min' => [
        'numeric' => 'يجب أن يكون :attribute :min على الأقل.',
        'string' => 'يجب أن يكون طول :attribute :min حرفًا على الأقل.',
    ],
    'required' => 'حقل :attribute مطلوب.',
    'string' => 'يجب أن يكون :attribute نصًا.',

    'attributes' => [
        'cursor' => 'المؤشر',
        'limit' => 'الحد',
        'resource_id' => 'معرّف المصدر',
        'since_version' => 'إصدار البداية',
    ],
];
