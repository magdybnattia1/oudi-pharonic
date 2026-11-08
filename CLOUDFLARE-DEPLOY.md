# نشر Oudi PHARONIC API على Cloudflare

1. افتح Cloudflare Dashboard ثم Workers & Pages.
2. اختر Create application ثم Get started بجوار Import a repository.
3. اربط GitHub واختر المستودع magdybnattia1/oudi-pharonic.
4. احفظ وانشر Worker. إعداد wrangler.toml في جذر المستودع يحدد الملف worker/index.js وKV binding باسم PRODUCTS؛ Cloudflare يستطيع إنشاء KV تلقائيًا عند النشر من إعداد binding بلا ID.
5. بعد أول نشر، افتح Worker > Settings > Variables and Secrets > Add.
6. أضف Secret باسم ADMIN_PASSWORD واختر كلمة مرور قوية بنفسك.
7. أضف Secret باسم SESSION_SECRET واجعل قيمته سلسلة عشوائية طويلة لا تقل عن 32 حرفًا.
8. Deploy للتغييرات. انسخ عنوان Worker الذي ينتهي بـ workers.dev.

تنبيه: لا تكتب كلمة المرور أو SESSION_SECRET في GitHub أو في محادثة ChatGPT.
بعد النشر أرسل هنا عنوان workers.dev فقط (ليس كلمة المرور ولا أي Token)، حتى أربطه بواجهة الموقع وأختبر الاتصال.
