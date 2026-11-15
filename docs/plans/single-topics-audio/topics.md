# Single topics, one per chapter — review sheet

Status: **reviewed** (developer, 15 Nov 2026: every row and every topic name approved). Drafted by Claude on 15 Nov 2026 from the Hisn al-Muslim chapter titles (ADR 0092 decisions 1–2). Each chapter gets exactly one topic. Only the developer marks rows `reviewed`; until then a chapter keeps its OpenDua tags. Topic names are Claude's wording and need the developer's approval (ADR 0092 open point 2). Chapter 27 stays the morning and evening sessions (`split_topics`).

Quranic duas and hadith dua-book chapters (`config/duas_topics.php`) get the same list in a second pass. Their keyword-rule rows are redrafted, not remapped, because some are wrong (e.g. `quran:2:128` → «الموت والمتوفى»).

## Topics (29)

| Id | Topic | Chapters |
| --- | --- | --- |
| `waking-topic` | الاستيقاظ | 1 |
| `sleep-topic` | النوم | 4 |
| `morning-evening` | الصباح / المساء (جلسة) | 1 |
| `clothing` | اللباس | 4 |
| `purification` | الطهارة | 4 |
| `home` | المنزل | 2 |
| `masjid` | المسجد | 3 |
| `prayer` | الصلاة | 14 |
| `distress` | الكرب | 5 |
| `fear` | الخوف | 5 |
| `waswasa` | الوسوسة | 3 |
| `debt` | الدَّين | 2 |
| `provision` | الرزق | 1 |
| `forgiveness` | الاستغفار | 3 |
| `children` | الأولاد | 2 |
| `marriage` | الزواج | 3 |
| `illness` | المرض | 4 |
| `funerals` | الجنائز | 8 |
| `weather` | الطقس | 7 |
| `fasting` | الصيام | 4 |
| `food` | الطعام | 6 |
| `sneezing` | العطاس | 2 |
| `gatherings` | المجلس | 2 |
| `greeting` | السلام | 2 |
| `manners` | الآداب | 9 |
| `travel` | السفر | 10 |
| `dhikr` | الذكر | 7 |
| `hajj` | المناسك | 7 |
| `protection` | التحصين | 7 |

Added on 15 Nov 2026 by the developer for Quranic and hadith duas (`config/duas_topics.php`, sheet `duas-topics.md`). No Hisn chapter uses them. `morning-topic` and `evening-topic` reuse the split topic ids, because `morning` and `evening` are session category ids.

| Id | Topic | Chapters |
| --- | --- | --- |
| `nasr` | النصر | 0 |
| `hereafter` | الآخرة | 0 |
| `guidance` | الهداية | 0 |
| `steadfastness` | الثبات | 0 |
| `good-ending` | حسن الخاتمة | 0 |
| `wellbeing` | العافية | 0 |
| `knowledge` | العلم | 0 |
| `parents` | الوالدان | 0 |
| `comprehensive` | جوامع الدعاء | 0 |
| `virtue-of-dua` | فضل الدعاء | 0 |
| `night-prayer` | قيام الليل | 0 |
| `friday` | الجمعة | 0 |
| `morning-topic` | الصباح | 0 |
| `evening-topic` | المساء | 0 |

## Chapters (132)

| Ch. | Title (book) | OpenDua tags today | Proposed topic | Note |
| --- | --- | --- | --- | --- |
| 1 | أذكار الاستيقاظ من النوم | sleep-and-waking | **الاستيقاظ** |  |
| 2 | دعاء ُلبْس الثوب | home-and-family | **اللباس** |  |
| 3 | دعاء ُلبْس الثوب الجديد | home-and-family | **اللباس** |  |
| 4 | الدعاء لمن لبس ثوبا جديدا | gatherings-and-greetings، home-and-family | **اللباس** | كانت في المجلس؛ الموضوع لباس |
| 5 | ما يقول إذا وضع ثوبه | home-and-family | **اللباس** |  |
| 6 | دعاء دخول الخلاء | wudu-and-purification | **الطهارة** |  |
| 7 | دعاء الخروج من الخلاء | wudu-and-purification | **الطهارة** |  |
| 8 | الذكر قبل الوضوء | wudu-and-purification | **الطهارة** |  |
| 9 | الذكر بعد الفراغ من الوضوء | wudu-and-purification | **الطهارة** |  |
| 10 | الذكر عند الخروج من المنزل | home-and-family، protection-and-refuge | **المنزل** |  |
| 11 | الذكر عند دخول المنزل | home-and-family | **المنزل** |  |
| 12 | دعاء الذهاب إلى المسجد | prayer-and-the-masjid | **المسجد** |  |
| 13 | دعاء دخول المسجد | prayer-and-the-masjid | **المسجد** |  |
| 14 | دعاء الخروج من المسجد | prayer-and-the-masjid | **المسجد** |  |
| 15 | أذكار الآذان | prayer-and-the-masjid | **الصلاة** |  |
| 16 | دعاء الاستفتاح | prayer-and-the-masjid | **الصلاة** |  |
| 17 | دعاء الركوع | prayer-and-the-masjid | **الصلاة** |  |
| 18 | دعاء الرفع من الركوع | prayer-and-the-masjid | **الصلاة** |  |
| 19 | دعاء السجود | prayer-and-the-masjid | **الصلاة** |  |
| 20 | دعاء الجلسة بين السجدتين | prayer-and-the-masjid | **الصلاة** |  |
| 21 | دعاء سجود التلاوة | prayer-and-the-masjid | **الصلاة** |  |
| 22 | التشهد | prayer-and-the-masjid | **الصلاة** |  |
| 23 | الصلاة على النبي بعد التشهد | dhikr-and-praise، prayer-and-the-masjid | **الصلاة** |  |
| 24 | الدعاء بعد التشهد الأخير قبل السلام | prayer-and-the-masjid، protection-and-refuge | **الصلاة** |  |
| 25 | الأذكار بعد السلام من الصلاة | dhikr-and-praise، prayer-and-the-masjid | **الصلاة** |  |
| 26 | دعاء صلاة الاستخارة | knowledge-and-guidance، prayer-and-the-masjid | **الصلاة** | الاستخارة؛ بديل: موضوع «الاستخارة» |
| 27 | أذكار الصباح والمساء | morning-and-evening، protection-and-refuge | **الصباح / المساء (جلسة)** |  |
| 28 | أذكار النوم | sleep-and-waking | **النوم** |  |
| 29 | الدعاء إذا تقلب ليلا | sleep-and-waking | **النوم** |  |
| 30 | دعاء الفزع في النوم و من بُلِيَ بالوحشة | distress-and-anxiety، sleep-and-waking | **النوم** |  |
| 31 | ما يفعل من رأى الرؤيا أو الحلم | protection-and-refuge، sleep-and-waking | **النوم** |  |
| 32 | دعاء قنوت الوتر | prayer-and-the-masjid | **الصلاة** |  |
| 33 | الذكر عقب السلام من الوتر | dhikr-and-praise، prayer-and-the-masjid | **الصلاة** |  |
| 34 | دعاء الهم والحزن | distress-and-anxiety | **الكرب** |  |
| 35 | دعاء الكرب | distress-and-anxiety | **الكرب** |  |
| 36 | دعاء لقاء العدو و ذي السلطان | protection-and-refuge | **الخوف** |  |
| 37 | دعاء من خاف ظلم السلطان | protection-and-refuge | **الخوف** |  |
| 38 | الدعاء على العدو | protection-and-refuge | **الخوف** |  |
| 39 | ما يقول من خاف قوما | protection-and-refuge | **الخوف** |  |
| 40 | دعاء من أصابه وسوسة في الإيمان | knowledge-and-guidance، protection-and-refuge | **الوسوسة** |  |
| 41 | دعاء قضاء الدين | provision-and-debt | **الدَّين** |  |
| 42 | دعاء الوسوسة في الصلاة و القراءة | prayer-and-the-masjid، protection-and-refuge | **الوسوسة** |  |
| 43 | دعاء من استصعب عليه أمر | distress-and-anxiety | **الكرب** |  |
| 44 | ما يقول ويفعل من أذنب ذنبا | forgiveness-and-repentance | **الاستغفار** |  |
| 45 | دعاء طرد الشيطان و وساوسه | protection-and-refuge | **الوسوسة** |  |
| 46 | الدعاء حينما يقع ما لا يرضاه أو ُ غلب على أمره | distress-and-anxiety | **الكرب** |  |
| 47 | ﺗﻬنئة المولود له وجوابه | gatherings-and-greetings، home-and-family | **الأولاد** |  |
| 48 | ما يعوذ به الأولاد | home-and-family، protection-and-refuge | **الأولاد** |  |
| 49 | الدعاء للمريض في عيادته | illness-and-healing | **المرض** |  |
| 50 | فضل عيادة المريض | illness-and-healing | **المرض** |  |
| 51 | دعاء المريض الذي يئس من حياته | death-and-the-deceased، illness-and-healing | **المرض** |  |
| 52 | تلقين المحتضر | death-and-the-deceased | **الجنائز** |  |
| 53 | دعاء من أصيب بمصيبة | death-and-the-deceased، distress-and-anxiety | **الكرب** | المصيبة؛ بديل: الجنائز |
| 54 | الدعاء عند إغماض الميت | death-and-the-deceased | **الجنائز** |  |
| 55 | الدعاء للميت في الصلاة عليه | death-and-the-deceased، prayer-and-the-masjid | **الجنائز** |  |
| 56 | الدعاء للفرط في الصلاة عليه | death-and-the-deceased، prayer-and-the-masjid | **الجنائز** |  |
| 57 | دعاء التعزية | death-and-the-deceased | **الجنائز** |  |
| 58 | الدعاء عند إدخال الميت القبر | death-and-the-deceased | **الجنائز** |  |
| 59 | الدعاء بعد دفن الميت | death-and-the-deceased | **الجنائز** |  |
| 60 | دعاء زيارة القبور | death-and-the-deceased | **الجنائز** |  |
| 61 | دعاء الريح | weather-and-nature | **الطقس** |  |
| 62 | دعاء الرعد | weather-and-nature | **الطقس** |  |
| 63 | من أدعية الاستسقاء | weather-and-nature | **الطقس** |  |
| 64 | الدعاء إذا نزل المطر | weather-and-nature | **الطقس** |  |
| 65 | الذكر بعد نزول المطر | weather-and-nature | **الطقس** |  |
| 66 | من أدعية الاستصحاء | weather-and-nature | **الطقس** |  |
| 67 | دعاء رؤية الهلال | weather-and-nature | **الطقس** | الهلال ليس طقسًا؛ بديل: الصيام |
| 68 | الدعاء عند إفطار الصائم | fasting، food-and-drink | **الصيام** |  |
| 69 | الدعاء قبل الطعام | food-and-drink | **الطعام** |  |
| 70 | الدعاء عند الفراغ من الطعام | food-and-drink | **الطعام** |  |
| 71 | دعاء الضيف لصاحب الطعام | food-and-drink، gatherings-and-greetings | **الطعام** |  |
| 72 | التعريض بالدعاء لطلب الطعام أو الشراب | food-and-drink، gatherings-and-greetings | **الطعام** |  |
| 73 | الدعاء إذا أفطر عند أهل بيت | fasting، food-and-drink، gatherings-and-greetings | **الصيام** |  |
| 74 | دعاء الصائم إذا حضر الطعام ولم يفطر | fasting، food-and-drink | **الصيام** |  |
| 75 | ما يقول الصائم إذا سابه أحد | fasting | **الصيام** |  |
| 76 | الدعاء عند رؤية باكورة الثمر | food-and-drink | **الطعام** |  |
| 77 | دعاء العطاس | gatherings-and-greetings | **العطاس** |  |
| 78 | ما يقال للكافر إذا عطس فحمد الله | gatherings-and-greetings | **العطاس** |  |
| 79 | الدعاء للمتزوج | home-and-family | **الزواج** |  |
| 80 | دعاء المتزوج و شراء الدابة | home-and-family | **الزواج** |  |
| 81 | الدعاء قبل إتيان الزوجة | home-and-family، protection-and-refuge | **الزواج** |  |
| 82 | دعاء الغضب | distress-and-anxiety، protection-and-refuge | **التحصين** | الغضب؛ بديل: موضوع «الغضب» |
| 83 | دعاء من رأى مبتلى | dhikr-and-praise، protection-and-refuge | **الذكر** | حمد عند رؤية مبتلى؛ بديل: التحصين |
| 84 | ما يقال في اﻟﻤﺠلس | dhikr-and-praise، gatherings-and-greetings | **المجلس** |  |
| 85 | كفارة اﻟﻤﺠلس | forgiveness-and-repentance، gatherings-and-greetings | **المجلس** |  |
| 86 | الدعاء لمن قال غفر الله لك | gatherings-and-greetings | **الآداب** |  |
| 87 | الدعاء لمن صنع إليك معروفا | gatherings-and-greetings | **الآداب** |  |
| 88 | ما يعصم الله به من الدجال | protection-and-refuge | **التحصين** |  |
| 89 | الدعاء لمن قال إني أحبك في الله | gatherings-and-greetings | **الآداب** |  |
| 90 | الدعاء لمن عرض عليك ماله | gatherings-and-greetings، provision-and-debt | **الآداب** | كانت في الرزق أيضًا |
| 91 | الدعاء لمن أقرض عند القضاء | provision-and-debt | **الدَّين** |  |
| 92 | دعاء الخوف من الشرك | forgiveness-and-repentance، protection-and-refuge | **الاستغفار** | الخوف من الشرك؛ بديل: التحصين |
| 93 | الدعاء لمن قال بارك الله فيك | gatherings-and-greetings | **الآداب** |  |
| 94 | دعاء كراهية الطيرة | protection-and-refuge | **التحصين** |  |
| 95 | دعاء الركوب | travel | **السفر** |  |
| 96 | دعاء السفر | travel | **السفر** |  |
| 97 | دعاء دخول القرية أو البلدة | travel | **السفر** |  |
| 98 | دعاء دخول السوق | dhikr-and-praise، travel | **الرزق** | كانت في السفر؛ السوق أقرب للرزق |
| 99 | الدعاء إذا تعس المركوب | travel | **السفر** |  |
| 100 | دعاء المسافر للمقيم | travel | **السفر** |  |
| 101 | دعاء المقيم للمسافر | travel | **السفر** |  |
| 102 | التكبير و التسبيح في سير السفر | dhikr-and-praise، travel | **السفر** |  |
| 103 | دعاء المسافر إذا أسحر | travel | **السفر** |  |
| 104 | الدعاء إذا نزل مترلا في سفر أو غيره | protection-and-refuge، travel | **السفر** |  |
| 105 | ذكر الرجوع من السفر | travel | **السفر** |  |
| 106 | ما يقول من أتاه أمر يسره أو يكرهه | dhikr-and-praise | **الذكر** |  |
| 107 | فضل الصلاة على النبي صلى الله عليه و سلم | dhikr-and-praise | **الذكر** |  |
| 108 | إفشاء السلام | gatherings-and-greetings | **السلام** |  |
| 109 | كيف يرد السلام على الكافر إذا سلم | gatherings-and-greetings | **السلام** |  |
| 110 | الدُّعاءُ عِنْدَ سَمَاعِ صِياحِ الدِّيكِ ونَهِيقِ الْحِمَارِ | protection-and-refuge | **التحصين** |  |
| 111 | دعاء نباح الكلاب بالليل | protection-and-refuge، sleep-and-waking | **التحصين** |  |
| 112 | الدعاء لمن سببته | forgiveness-and-repentance، gatherings-and-greetings | **الآداب** |  |
| 113 | ما يقول المسلم إذا مدح المسلم | gatherings-and-greetings | **الآداب** |  |
| 114 | ما يقول المسلم إذا زكي | gatherings-and-greetings | **الآداب** |  |
| 115 | كيف يلبي المحرم في الحج أو العمرة ؟ | hajj-and-umrah | **المناسك** |  |
| 116 | التكبير إذا أتى الركن الأسود | hajj-and-umrah | **المناسك** |  |
| 117 | الدعاء بين الركن اليماني والحجر الأسود | hajj-and-umrah | **المناسك** |  |
| 118 | دعاء الوقوف على الصفا والمروة | hajj-and-umrah | **المناسك** |  |
| 119 | الدعاء يوم عرفة | hajj-and-umrah | **المناسك** |  |
| 120 | الذكر عند المشعر الحرام | hajj-and-umrah | **المناسك** |  |
| 121 | التكبير عند رمي الجمار مع كل حصاة | hajj-and-umrah | **المناسك** |  |
| 122 | دعاء التعجب والأمر السار | dhikr-and-praise | **الذكر** |  |
| 123 | ما يفعل من أتاه أمر يسره | dhikr-and-praise | **الذكر** |  |
| 124 | ما يقول من أحس وجعا في جسده | illness-and-healing | **المرض** |  |
| 125 | دعاء من خشي أن يصيب شيئا بعينه | illness-and-healing، protection-and-refuge | **التحصين** | العين؛ بديل: المرض |
| 126 | ما يقال عند الفزع | distress-and-anxiety، protection-and-refuge | **الخوف** |  |
| 127 | ما يقول عند الذبح أو النحر | food-and-drink | **الطعام** |  |
| 128 | ما يقول لرد كيد مردة الشياطين | protection-and-refuge | **التحصين** |  |
| 129 | الاستغفار و التوبة | forgiveness-and-repentance | **الاستغفار** |  |
| 130 | فضل التسبيح و التحميد، و التهليل، و التكبير | dhikr-and-praise | **الذكر** |  |
| 131 | كيف كان النبي يسبح؟ | dhikr-and-praise | **الذكر** |  |
| 132 | من أنواع الخير والآداب الجامعة | gatherings-and-greetings، protection-and-refuge | **الآداب** |  |
