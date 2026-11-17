import { useEffect } from 'react';
import { Link } from 'react-router';
import { Navbar } from '@/components/navbar';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
  useEffect(() => {
    document.title = 'Правила користування | MasterMap';
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          На головну
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">Правила користування</h1>

        <div className="flex flex-col gap-6 text-sm text-slate-600 leading-relaxed">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">1. Загальні положення</h2>
            <p>
              MasterMap (<a href="https://www.mastermap.sbs" className="text-sky-700 underline font-semibold">mastermap.sbs</a>) — це відкритий каталог майстрів і спеціалістів сфери послуг України. Платформа слугує інформаційним майданчиком для зручного пошуку перевірених фахівців.
            </p>
            <p>
              MasterMap не бере участі в розрахунках між замовником і майстром, не виступає посередником чи роботодавцем та не несе фінансової відповідальності за домовленості сторін.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">2. Реєстрація та верифікація майстрів</h2>
            <p>
              Створення профілю спеціаліста відбувається виключно через офіційного Telegram-бота{' '}
              <a href="https://t.me/mastermap_ua_bot" target="_blank" rel="noopener noreferrer" className="text-sky-700 font-semibold underline">@mastermap_ua_bot</a>.
            </p>
            <p>
              Майстер зобов'язується надавати правдиву інформацію щодо своїх послуг, реального досвіду та вартості робіт. Профілі проходять модерацію адміністрацією перед появою в каталозі.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">3. Безпека в умовах воєнного стану (Zero Geo-Leak)</h2>
            <p>
              З метою безпеки громадян та критичної інфраструктури, у MasterMap суворо заборонено:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Вказувати точні адреси (номери будинків, під'їзди, квартири) в описі профілю чи послуг. Географічна прив'язка здійснюється лише за містом або районом.</li>
              <li>Для міст у прифронтових областях населені пункти узагальнюються до рівня області.</li>
              <li>Завантажувати фото робіт, що містять військову техніку, блокпости, промислові об'єкти енергетики, геолокаційні позначки або назви вулиць.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">4. Відгуки та оцінки клієнтів</h2>
            <p>
              Клієнти можуть залишати відгуки майстрам через Telegram-бота. Задля захисту від спаму та накруток, імена клієнтів у публічному переліку скорочуються (наприклад, «Олександр М.»).
            </p>
            <p>
              Позначка «Угода підтверджена» присвоюється відгукам, де обидві сторони підтвердили факт виконання замовлення.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">5. Модерація та блокування</h2>
            <p>
              Адміністрація залишає за собою право призупинити показ або видалити анкету майстра у разі виявлення шахрайських дій, грубих порушень культури спілкування, порушення правил безпеки чи законодавства України.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">6. Контакти та служба підтримки</h2>
            <p>
              З усіх питань, скарг чи пропозицій звертайтеся на офіційну пошту підтримки:{' '}
              <a href="mailto:support@ihornone.site" className="text-sky-700 underline font-semibold">support@ihornone.site</a> або через бота{' '}
              <a href="https://t.me/mastermap_ua_bot" target="_blank" rel="noopener noreferrer" className="text-sky-700 font-semibold underline">@mastermap_ua_bot</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
