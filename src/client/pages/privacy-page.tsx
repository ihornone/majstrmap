import { useEffect } from 'react';
import { Link } from 'react-router';
import { Navbar } from '@/components/navbar';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPage() {
  useEffect(() => {
    document.title = 'Політика конфіденційності | MajstrMap';
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          На головну
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Політика конфіденційності</h1>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-8">
          Це шаблонний текст для попереднього перегляду. Перед публікацією його потрібно перевірити та доопрацювати.
        </p>

        <div className="flex flex-col gap-6 text-sm text-slate-600 leading-relaxed">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">1. Які дані ми обробляємо</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>
                <strong>Дані анкет майстрів:</strong> ім'я, місто й область, категорія та послуги, ціни, опис,
                досвід і контакти (телефон, Telegram тощо), які майстер сам надає через Telegram-бота.
              </li>
              <li>
                <strong>Фото/avatar:</strong> зображення, які майстер завантажує для своєї картки.
              </li>
              <li>
                <strong>Технічні метрики:</strong> анонімна статистика переглядів карток і звернень до майстрів
                (без створення рекламних профілів).
              </li>
              <li>
                <strong>Локальні дані браузера:</strong> список збережених майстрів у localStorage вашого браузера —
                він не надсилається на сервер.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">2. Навіщо ці дані</h2>
            <p>
              Дані публікуються в каталозі, щоб клієнти могли знайти майстра та зв'язатися з ним напряму.
              Метрики потрібні майстрам для бачення статистики переглядів і звернень. Ми не продаємо дані
              третім особам і не показуємо рекламу.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">3. Telegram-бот і повідомлення</h2>
            <p>
              Реєстрація та сповіщення про нових майстрів відбуваються через Telegram. При підписці на сповіщення
              Telegram передає боту ваш чат-ID — він використовується лише для надсилання цих сповіщень.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">4. Ваші права</h2>
            <p>
              Майстер може переглянути, змінити або повністю видалити свою анкету в будь-який момент через
              Telegram-бота. Інші запити щодо даних — на{' '}
              <a href="mailto:support@majstrmap.ua" className="text-sky-700 underline font-semibold">support@majstrmap.ua</a>.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">5. Зберігання та безпека</h2>
            <p>
              Дані зберігаються на серверах проєкту лише доки існує анкета. Після видалення анкети її дані
              перестають бути публічними. Ми застосовуємо базові технічні заходи захисту, але жоден сайт не може
              гарантувати абсолютну безпеку передачі даних.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
