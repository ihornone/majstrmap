import { useEffect } from 'react';
import { Link } from 'react-router';
import { Navbar } from '@/components/navbar';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
  useEffect(() => {
    document.title = 'Правила користування | MajstrMap';
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          На головну
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Правила користування</h1>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-8">
          Це шаблонний текст для попереднього перегляду. Перед публікацією його потрібно перевірити та доопрацювати.
        </p>

        <div className="flex flex-col gap-6 text-sm text-slate-600 leading-relaxed">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">1. Що таке MajstrMap</h2>
            <p>
              MajstrMap — безкоштовний каталог-мапа майстрів України. Сайт лише показує контактні дані майстрів,
              які самі зареєструвалися через Telegram-бота. MajstrMap не є стороною угоди між клієнтом і майстром,
              не приймає оплат і не відповідає за якість послуг.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">2. Реєстрація майстрів</h2>
            <p>
              Анкету створює сам майстер через Telegram-бота. Реєстрація безкоштовна; для публікації потрібна
              підписка на канал проєкту. Майстер підтверджує, що вказані ним дані (ім'я, послуги, ціни, контакти)
              достовірні, і що він має право їх публікувати.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">3. Заборонений контент</h2>
            <p>
              Не допускаються анкети з неправдивою інформацією, контентом, що порушує законодавство України,
              а також анкети не майстерного профілю. Адміністрація може приховати або видалити таку анкету
              без попередження.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">4. Відгуки</h2>
            <p>
              Відгуки залишають клієнти через Telegram-бота. Прапорець «Угода підтверджена» означає лише, що
              майстер і клієнт підтвердили співпрацю, і не є незалежною перевіркою якості послуг.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">5. Видалення анкети</h2>
            <p>
              Майстер може видалити свою анкету в будь-який момент через Telegram-бота. Питання та скарги —
              на <a href="mailto:support@majstrmap.ua" className="text-sky-700 underline font-semibold">support@majstrmap.ua</a>.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">6. Зміни правил</h2>
            <p>
              Проєкт розвивається, тому правила можуть оновлюватися. Актуальна версія завжди доступна на цій сторінці.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
