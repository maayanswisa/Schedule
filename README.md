🗓️ מערכת תיאום שיעורים – Maayan Tutor

פרויקט ווב מודרני שמאפשר ללקוחות לקבוע שיעורים אונליין בצורה פשוטה ונוחה.
המורה מקבל ממשק ניהול מלא, והלקוחות יכולים לבחור מועד פנוי ולקבל אישור במייל.

✨ פיצ’רים עיקריים

🔑 התחברות מנהל (Admin) – ממשק ניהול מאובטח להצגת כל השיעורים.

📅 מערכת שעות חכמה – מציגה שעות פנויות/תפוסות באופן ברור.

📨 התראות במייל – הלקוח מקבל אישור מידי, והמורה מקבל התראה.

📱 רספונסיביות מלאה – מותאם למובייל ולדסקטופ.

🗄️ בסיס נתונים בענן (Supabase) – ניהול כל המידע בצורה מאובטחת.

🌍 פריסה ל־Vercel – האתר נגיש מכל מקום.

🛠️ טכנולוגיות

Frontend: Next.js 14
 + React + TypeScript

Database & Auth: Supabase

Emails: Resend

UI: TailwindCSS

Deployment: Vercel

🚀 התקנה והרצה מקומית

שכפלו את הריפו:

git clone https://github.com/username/schedule-tutor.git
cd schedule-tutor


התקינו חבילות:

npm install


צרו קובץ .env.local והכניסו את המשתנים:

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
RESEND_API_KEY=...
MAIL_FROM=Your Name <you@yourdomain.com>


הריצו:

npm run dev


האתר יהיה זמין ב־http://localhost:3000.

🌐 פריסה ל־Vercel

התחברו ל־Vercel עם GitHub.

הוסיפו את כל משתני הסביבה ב־Settings → Environment Variables.

לחצו Deploy.

האתר יעלה לכתובת אישית (לדוגמה: https://schedule-tutor.vercel.app).

📧 הגדרות מייל

לפרודקשן חייבים MAIL_FROM מדומיין מאומת ב־Resend.

במידה ואין דומיין פרטי, ניתן להשתמש זמנית ב־onboarding@resend.dev.

מומלץ להגדיר Forward כדי לקבל תשובות ישירות ל־Gmail.

👩‍💻 מחברת הפרויקט

פיתוח ועיצוב: Maayan Swisa
📩 maayanswisa9@gmail.com

🌐 Portfolio
