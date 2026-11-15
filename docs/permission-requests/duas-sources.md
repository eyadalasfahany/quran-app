# Permission requests: duas sources (drafts)

Date: 15 Nov 2026 · Status: **drafts, not sent** · For the developer to review, fill in the bracketed parts and send. **Nothing from these sources is used, imported, cached or linked from the app until written permission is on file and a new ADR records it** (`docs/plans/azkar-duas-split.md`, decision 4). Licensed sources in use today: Hisn al-Muslim through OpenDua (ADR 0038), HadeethEnc (ADR 0044-duas, 0042), the Quran (Tanzil and Quran Foundation).

How to use: send from the developer's own address; keep the reply (an email or a licence page URL) in the developer's records and note the date in `docs/content-plan.md` «Permissions to request». Replace `[...]` before sending. The draft claims nothing about the app that is not true today: free, no ads, Arabic first, content shown without change and with credit.

## What we describe in every request

- App: Taybah («طيبة»), a free Quran app for iOS and Android, Arabic first, no ads, no donations, website taybah-app.com.
- Use: show the content unchanged, with the source's name and a link to its page on each item; store it in a read-only content pack on the user's device so it works offline; the pack is built from a fixed snapshot and updated only when the source changes.
- We never edit, shorten, summarise, translate or re-grade the content. We add no text of our own to it.
- We will stop and remove the content on request.

---

## 1. Dorar.net (الدرر السنية), hadith database and API

Context: the app already has an approved API access token (31 Oct 2026) under terms that forbid bulk import and permanent storage (ADR 0031 §2). The app today calls Dorar only through its own server and stores nothing. This request asks for the missing permission.

English

> Subject: Request for written permission to store and show Dorar hadith content in the Taybah app
>
> Peace be upon you,
>
> I am the developer of Taybah, a free, ad-free Arabic-first Quran app for iOS and Android (taybah-app.com). We hold an approved access token for the Dorar API. We would like to include a supplications section made of hadiths, and we ask your permission for the following:
>
> 1. To store the hadith records we choose, exactly as the API returns them (text, narrator, source, ruling and its scholar, page, and your canonical URL), in an offline content pack on the user's device, so the section works without a connection.
> 2. To keep a server-side copy of the same records to build that pack.
> 3. To show each record with «الدرر السنية» as the source and a link to its Dorar page.
>
> We will not modify, shorten, summarise or translate any record, we will not add rulings of our own, and we will not republish the data as a downloadable dataset or API. We will respect any limits you set on requests and caching, and we will remove any record on your request.
>
> Please tell us (a) whether this is permitted, (b) the attribution wording you require, (c) any limit on the number of records or on how often we refresh, and (d) whether a licence text or page we can cite exists.
>
> Thank you,
> [developer name] · [email] · taybah-app.com

العربية

> الموضوع: طلب إذن كتابي لحفظ محتوى الدرر السنية وعرضه في تطبيق «طيبة»
>
> السلام عليكم ورحمة الله وبركاته،
>
> أنا مطوّر تطبيق «طيبة»، وهو تطبيق قرآن مجاني بلا إعلانات للآيفون والأندرويد (taybah-app.com)، وعندنا رمز وصول معتمد لواجهة الدرر السنية. نرغب في إضافة قسم للأدعية من الأحاديث، ونطلب إذنكم بما يلي:
>
> ١. حفظ السجلات التي نختارها كما تعيدها الواجهة تمامًا (النص والراوي والمصدر والحكم وقائله والصفحة ورابطكم الأصلي) في حزمة محتوى على جهاز المستخدم ليعمل القسم دون اتصال.
> ٢. الاحتفاظ بنسخة على خادمنا لبناء هذه الحزمة.
> ٣. عرض كل سجل مع ذكر «الدرر السنية» مصدرًا ورابط صفحته عندكم.
>
> لن نعدّل أي سجل ولن نختصره أو نلخّصه أو نترجمه، ولن نضيف أحكامًا من عندنا، ولن ننشر البيانات مجموعة بيانات أو واجهة للتنزيل. وسنلتزم بأي حدود تضعونها على الطلبات والتخزين، ونحذف أي سجل بطلبكم.
>
> نرجو إفادتنا: (أ) هل هذا مسموح؟ (ب) صيغة الإسناد المطلوبة، (ج) أي حد لعدد السجلات أو لمرات التحديث، (د) هل توجد صفحة أو نص ترخيص يمكن أن نستند إليه؟
>
> شكرًا لكم،
> [اسم المطوّر] · [البريد] · taybah-app.com

---

## 2. IslamHouse (islamhouse.com / islamhouse.org)

Context: ADR 0044-duas lists an IslamHouse book of duas from the Quran and Sunnah, whose page terms were not found (2 Nov 2026). No IslamHouse content is used.

English

> Subject: Permission request: using a published book of supplications from IslamHouse in the Taybah app
>
> Peace be upon you,
>
> I develop Taybah, a free, ad-free Arabic-first Quran app (taybah-app.com). We would like to show, in a supplications section, the supplications listed in [title of the IslamHouse book or item and its URL], and we ask whether IslamHouse and the author permit:
>
> 1. Reading the item through your API or published files, and storing its text unchanged in an offline pack on the user's device and on our server.
> 2. Showing it with the author's name, IslamHouse as the publisher, and a link to the item page.
>
> We will not edit, reorder within an entry, summarise or translate the text. Please tell us the licence or terms that apply (we could not find them on the item page), the attribution you require, and whether the item may be redistributed inside an app. We will remove it on request.
>
> Thank you,
> [developer name] · [email] · taybah-app.com

العربية

> الموضوع: طلب إذن باستخدام كتاب أدعية منشور في «دار الإسلام» في تطبيق «طيبة»
>
> السلام عليكم ورحمة الله وبركاته،
>
> أطوّر تطبيق «طيبة»، وهو تطبيق قرآن مجاني بلا إعلانات (taybah-app.com). نرغب في عرض الأدعية الواردة في [عنوان المادة ورابطها] ضمن قسم الأدعية، ونسأل: هل تأذن «دار الإسلام» والمؤلف بما يلي؟
>
> ١. قراءة المادة عبر واجهتكم أو ملفاتكم المنشورة وحفظ نصها دون تغيير في حزمة دون اتصال على جهاز المستخدم وعلى خادمنا.
> ٢. عرضها مع اسم المؤلف وذكر «دار الإسلام» ناشرًا ورابط صفحة المادة.
>
> لن نعدّل النص ولن نلخّصه ولن نترجمه. نرجو بيان الترخيص أو الشروط المنطبقة (لم نجدها في صفحة المادة)، وصيغة الإسناد المطلوبة، وهل يجوز تضمين المادة داخل تطبيق. وسنزيلها عند الطلب.
>
> شكرًا لكم،
> [اسم المطوّر] · [البريد] · taybah-app.com

---

## 3. Sunnah.com (already requested 1 Nov 2026): follow-up only

The API key was requested through a GitHub issue on `sunnah-com/api` on 1 Nov 2026 and is pending (`docs/content-plan.md`). Do not open a second request. If a follow-up comment on that issue is wanted:

> Following up on our request of 1 Nov 2026. For Taybah (taybah-app.com, free, ad-free), beyond the hadith collections we would also like to know whether the supplication books and chapters of each collection may be shown as a list of supplications, with each hadith shown unchanged, with its grade and grader, and a link to its sunnah.com page. We also need the terms for offline storage on the user's device and attribution wording. Thank you.

---

## 4. HadeethEnc (written confirmation of terms already used)

Context: HadeethEnc is in use on the terms printed in its API documentation («no modification, addition or deletion; clearly refer to the publisher and the source»), and the `hadeethenc` source row is `granted` by developer decision. Written confirmation is still open (ADR 0044-duas decision 16) and is non-blocking.

English

> Subject: Confirming how we use HadeethEnc content in the Taybah app
>
> Peace be upon you,
>
> Taybah (taybah-app.com) is a free, ad-free Arabic-first Quran app. We use the HadeethEnc API (language `ar`) under the terms in your API documentation. We show about [N] hadiths of the supplication categories, byte for byte (hadith text, title, attribution, grade, explanation, reference and benefits), each with «موسوعة الأحاديث النبوية (HadeethEnc.com)» and a link to its page, and we store them in an offline pack on the user's device. We hide none of the fields, and we have excluded duplicates, which is a selection of which hadiths to show, not a change to any record.
>
> Please confirm in writing that (a) offline storage in the app and on our server is permitted, (b) our attribution is acceptable or tell us the wording you prefer, (c) showing a subset of hadiths (some categories hidden, some duplicates left out) is acceptable, and (d) whether you have an audio source we may ask about separately.
>
> Thank you,
> [developer name] · [email] · taybah-app.com

العربية

> الموضوع: تأكيد طريقة استخدام محتوى موسوعة الأحاديث النبوية في تطبيق «طيبة»
>
> السلام عليكم ورحمة الله وبركاته،
>
> «طيبة» (taybah-app.com) تطبيق قرآن مجاني بلا إعلانات. نستخدم واجهة الموسوعة (اللغة العربية) وفق الشروط المنشورة في توثيق الواجهة. نعرض نحو [العدد] حديثًا من أبواب الأدعية كما وردت حرفيًا (النص والعنوان والإسناد والدرجة والشرح والمرجع والفوائد)، مع ذكر «موسوعة الأحاديث النبوية (HadeethEnc.com)» ورابط صفحة الحديث، ونحفظها في حزمة دون اتصال على جهاز المستخدم. لا نخفي أيًّا من الحقول، واستبعدنا المكرر منها، وهذا اختيار لما يُعرض لا تغيير في أي سجل.
>
> نرجو التأكيد كتابةً: (أ) أن الحفظ دون اتصال في التطبيق وعلى خادمنا مسموح، (ب) أن صيغة الإسناد مقبولة أو بيان الصيغة التي تفضلونها، (ج) أن عرض جزء من الأحاديث (إخفاء بعض الأبواب واستبعاد بعض المكرر) مقبول، (د) وهل لديكم مصدر صوتي يمكن أن نسأل عنه على حدة.
>
> شكرًا لكم،
> [اسم المطوّر] · [البريد] · taybah-app.com

---

## When a reply arrives

1. File the reply and the date in the developer's records and in `docs/content-plan.md` (source row, terms quoted).
2. Write an ADR (source, quoted terms, attribution, pinned snapshot, what is stored).
3. Add the source with a `content_sources` row, a pinned snapshot and a review sheet. No source is added to the import before step 3 is done.
