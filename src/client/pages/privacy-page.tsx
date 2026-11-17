import { useEffect } from 'react';
import { Link } from 'react-router';
import { Navbar } from '@/components/navbar';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPage() {
  useEffect(() => {
    document.title = 'Політика конфіденційності | MasterMap';
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          На головну
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">Політика конфіденційності</h1>

        <div className="flex flex-col gap-6 text-sm text-slate-600 leading-relaxed">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">1. Які дані ми обробляємо</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>
                <strong>Дані анкет майстрів:</strong> ім'я/псевдонім, місто та область, категорія й перелік послуг, ціни, опис,
                досвід роботи та канали зв'язку (телефон, Telegram-нік тощо), які майстер добровільно надає через офіційного бота <a href="https://t.me/mastermap_ua_bot" target="_blank" rel="noopener noreferrer" className="text-sky-700 font-semibold underline">@mastermap_ua_bot</a>.
              </li>
              <li>
                <strong>Портфоліо та фото робіт:</strong> зображення, які майстер завантажує для ілюстрації виконаних замовлень (зберігаються в захищеному сховищі Cloudflare R2).
              </li>
              <li>
                <strong>Технічні метрики:</strong> знеособлена статистика переглядів карток та відкриття контактів для захисту від ботів і розуміння попиту (без продажу третім особам та рекламного трекінгу).
              </li>
              <li>
                <strong>Локальні дані браузера:</strong> список збережених майстрів зберігається суто локально в браузері користувача (localStorage) і не передається на сервер.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">2. Безпека геоданих (Zero Geo-Leak) та захист контактів</h2>
            <p>
              Ми не збираємо і принципово не публікуємо точні адреси (вулиці, номери будинків чи квартир), а також координати фізичного перебування користувачів чи пристроїв. В анкеті відображається виключно місто або умовний район.
            </p>
            <p>
              Усі завантажені фотографії портфоліо та аватарів проходять автоматичне очищення від метаданих (EXIF, геотеги GPS).
            </p>
            <p>
              Контакти майстрів надійно захищені від спам-ботів та автоматичного парсингу інтелектуальною системою Cloudflare Turnstile та криптографічними токенами розкриття.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">3. Мета обробки даних</h2>
            <p>
              Дані публікуються у каталозі MasterMap виключно для того, щоб клієнти могли знайти майстра та напряму зв'язатися з ним для замовлення послуг. Ми не продаємо персональні дані, не передаємо їх рекламним мережам і не займаємося спам-розсилками.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">4. Telegram-бот та безпека взаємодії</h2>
            <p>
              Керування анкетою та підписка на сповіщення здійснюються через офіційного бота <a href="https://t.me/mastermap_ua_bot" target="_blank" rel="noopener noreferrer" className="text-sky-700 font-semibold underline">@mastermap_ua_bot</a>. Чат-ID використовується суто для сервісних повідомлень платформи й ніколи не передається стороннім особам чи іншим майстрам.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">5. Ваші права та видалення даних</h2>
            <p>
              Майстер має повне право переглянути, відредагувати, призупинити показ або повністю й безповоротно видалити свою анкету та фотографії в будь-який момент самостійно через Telegram-бота або звернувшись до служби підтримки за адресою{' '}
              <a href="mailto:support@ihornone.site" className="text-sky-700 underline font-semibold">support@ihornone.site</a>.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">6. Зберігання даних</h2>
            <p>
              Дані обробляються за допомогою розподіленої інфраструктури Cloudflare (D1, R2, Workers). Після видалення анкети картка миттєво зникає з публічного каталогу, а пов'язані медіафайли видаляються.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
