@php
    $font = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    $mail = config('feedback.mail');
    $replySubject = rawurlencode('Re: '.trans('feedback.auto_reply.subject', [], $suggestion->locale === 'ar' ? 'ar' : 'en'));
@endphp
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{{ __('feedback.admin_subject') }}</title>
</head>
<body style="margin:0; padding:0; background-color:#f7f3ea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f3ea" style="background-color:#f7f3ea;">
<tr>
<td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#fffdf8; border:1px solid #e7dfcc; border-radius:18px; overflow:hidden;">
        <tr>
            <td bgcolor="#1f4d40" style="background-color:#1f4d40; padding:18px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding-right:12px;"><img src="{{ $mail['logo_url'] }}" width="36" height="36" alt="" style="display:block; width:36px; height:36px; border:0; border-radius:10px;"></td>
                        <td style="font-family:{!! $font !!}; font-size:18px; font-weight:bold; color:#f7f3ea;">{{ __('feedback.admin.heading') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="padding:24px 28px 8px; font-family:{!! $font !!}; color:#13231f;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px; line-height:1.6;">
                    <tr>
                        <td width="130" style="padding:6px 0; color:#5b6a64; vertical-align:top;">{{ __('feedback.admin.name') }}</td>
                        <td dir="auto" style="padding:6px 0; font-weight:bold;">{{ $suggestion->name ?: '—' }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; color:#5b6a64; vertical-align:top;">{{ __('feedback.admin.email') }}</td>
                        <td style="padding:6px 0;"><a href="mailto:{{ $suggestion->email }}" style="color:#1f4d40;">{{ $suggestion->email }}</a></td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; color:#5b6a64; vertical-align:top;">{{ __('feedback.admin.language') }}</td>
                        <td style="padding:6px 0;">{{ $suggestion->locale === 'ar' ? 'العربية (ar)' : 'English (en)' }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; color:#5b6a64; vertical-align:top;">{{ __('feedback.admin.source') }}</td>
                        <td style="padding:6px 0;">{{ __('feedback.admin.sources.'.$suggestion->source->value) }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; color:#5b6a64; vertical-align:top;">{{ __('feedback.admin.received_at') }}</td>
                        <td style="padding:6px 0;">{{ $suggestion->created_at->utc()->format('Y-m-d H:i') }} UTC</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="padding:8px 28px 0; font-family:{!! $font !!};">
                <p style="margin:0 0 8px; font-size:13px; font-weight:bold; letter-spacing:0.04em; text-transform:uppercase; color:#a07c33;">{{ __('feedback.admin.message') }}</p>
                <div dir="auto" style="background-color:#f7f3ea; border-radius:14px; padding:16px 18px; font-size:16px; line-height:1.8; color:#13231f;">{!! nl2br(e($suggestion->message)) !!}</div>
            </td>
        </tr>
        <tr>
            <td style="padding:24px 28px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td bgcolor="#1f4d40" style="background-color:#1f4d40; border-radius:999px;">
                            <a href="mailto:{{ $suggestion->email }}?subject={{ $replySubject }}" style="display:inline-block; padding:12px 26px; font-family:{!! $font !!}; font-size:15px; font-weight:bold; color:#f7f3ea; text-decoration:none;">{{ __('feedback.admin.reply') }}</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</td>
</tr>
</table>
</body>
</html>
