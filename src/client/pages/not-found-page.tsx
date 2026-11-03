import { useEffect } from 'react';
import { Link } from 'react-router';
import { Navbar } from '@/components/navbar';
import { ArrowLeft, MapPin } from 'lucide-react';

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Сторінку не знайдено | MajstrMap';
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-4 text-center">
        <MapPin className="w-10 h-10 text-[#0ea5e9]" />
        <h1 className="text-2xl sm:text-3xl font-semibold">Сторінку не знайдено</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          Схоже, цієї адреси не існує або вона застаріла. Спробуйте знайти майстра на мапі України.
        </p>
        <Link
          to="/"
          className="mt-2 inline-flex items-center gap-1.5 rounded-2xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-extrabold uppercase tracking-wider text-xs px-4 h-10 border-b-4 border-[#0369a1] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          До мапи майстрів
        </Link>
      </main>
    </div>
  );
}
