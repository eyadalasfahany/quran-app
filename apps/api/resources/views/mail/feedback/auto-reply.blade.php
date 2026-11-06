@php
    $locale = app()->getLocale();
    $rtl = $locale === 'ar';
    $dir = $rtl ? 'rtl' : 'ltr';
    $align = $rtl ? 'right' : 'left';
    $font = $rtl
        ? "'Geeza Pro', 'Segoe UI', Tahoma, 'Noto Sans Arabic', Arial, sans-serif"
        : "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    $mail = config('feedback.mail');
@endphp
<!DOCTYPE html>
<html lang="{{ $locale }}" dir="{{ $dir }}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{{ __('feedback.auto_reply.subject') }}</title>
<style>
    @media (max-width: 620px) {
        .card { border-radius: 0 !important; }
        .pad { padding-left: 24px !important; padding-right: 24px !important; }
    }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f7f3ea; -webkit-text-size-adjust:100%;">
{{-- Preheader: the line inbox lists show after the subject. --}}
<div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">{{ __('feedback.auto_reply.preheader') }}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f3ea" style="background-color:#f7f3ea;">
<tr>
<td align="center" style="padding:32px 12px;">

    <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" dir="{{ $dir }}" style="max-width:560px; background-color:#fffdf8; border:1px solid #e7dfcc; border-radius:18px; overflow:hidden;">

        {{-- Brand header --}}
        <tr>
            <td align="center" bgcolor="#1f4d40" style="background-color:#1f4d40; padding:36px 24px 30px;">
                <img src="{{ $mail['logo_url'] }}" width="64" height="64" alt="{{ __('feedback.auto_reply.brand') }}" style="display:block; width:64px; height:64px; border:0; border-radius:16px;">
                <p style="margin:14px 0 0; font-family:{!! $font !!}; font-size:22px; line-height:1.3; font-weight:bold; color:#f7f3ea;">{{ __('feedback.auto_reply.brand') }}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top:14px;">
                    <tr><td width="40" height="2" bgcolor="#c9a961" style="width:40px; height:2px; line-height:2px; font-size:0; background-color:#c9a961;">&nbsp;</td></tr>
                </table>
            </td>
        </tr>

        {{-- Body --}}
        <tr>
            <td class="pad" dir="{{ $dir }}" align="{{ $align }}" style="padding:36px 40px 8px; font-family:{!! $font !!}; text-align:{{ $align }}; color:#13231f;">
                <h1 style="margin:0 0 20px; font-size:24px; line-height:1.4; font-weight:bold; color:#1f4d40;">{{ __('feedback.auto_reply.heading') }}</h1>
                <p style="margin:0 0 16px; font-size:17px; line-height:1.9;">{{ __('feedback.auto_reply.greeting') }}</p>
                <p style="margin:0 0 16px; font-size:17px; line-height:1.9;">{{ __('feedback.auto_reply.body') }}</p>
                <p style="margin:0 0 24px; font-size:17px; line-height:1.9; color:#5b6a64;">{{ __('feedback.auto_reply.body_more') }}</p>

                {{-- Dua, set apart --}}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="{{ $dir }}">
                    <tr>
                        <td bgcolor="#f7f3ea" style="background-color:#f7f3ea; border-radius:14px; border-{{ $rtl ? 'right' : 'left' }}:3px solid #a07c33; padding:16px 20px; font-family:{!! $font !!}; font-size:17px; line-height:1.8; color:#7e5f1e; text-align:{{ $align }};">
                            {{ __('feedback.auto_reply.closing') }}
                        </td>
                    </tr>
                </table>

                <p style="margin:28px 0 0; font-size:17px; line-height:1.6; font-weight:bold; color:#13231f;">{{ __('feedback.auto_reply.signature') }}</p>
            </td>
        </tr>

        {{-- Call to action --}}
        <tr>
            <td class="pad" align="center" style="padding:28px 40px 36px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr>
                        <td align="center" bgcolor="#1f4d40" style="background-color:#1f4d40; border-radius:999px;">
                            <a href="{{ $mail['download_url'] }}" target="_blank" style="display:inline-block; padding:14px 32px; font-family:{!! $font !!}; font-size:16px; line-height:1.2; font-weight:bold; color:#f7f3ea; text-decoration:none; border-radius:999px;">{{ __('feedback.auto_reply.cta') }}</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        {{-- Footer --}}
        <tr>
            <td class="pad" dir="{{ $dir }}" align="{{ $align }}" style="padding:22px 40px 28px; border-top:1px solid #e7dfcc; font-family:{!! $font !!}; text-align:{{ $align }}; font-size:13px; line-height:1.8; color:#5b6a64;">
                <p style="margin:0 0 8px;">{{ __('feedback.auto_reply.footer_why') }}</p>
                <p style="margin:0;">{{ __('feedback.auto_reply.footer_noreply') }}</p>
            </td>
        </tr>
    </table>

    {{-- Below the card --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
            <td align="center" dir="{{ $dir }}" style="padding:20px 24px 0; font-family:{!! $font !!}; font-size:13px; line-height:1.8; color:#5b6a64;">
                {{ __('feedback.auto_reply.footer_tagline') }}<br>
                <a href="{{ $mail['site_url'] }}" target="_blank" style="color:#1f4d40; text-decoration:none; font-weight:bold;">taybah-app.com</a>
            </td>
        </tr>
    </table>

</td>
</tr>
</table>
</body>
</html>
