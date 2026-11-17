import { useState, useEffect, useCallback } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import type { PortfolioWorkItem } from '@/data/portfolio';

interface MasterPortfolioGalleryProps {
  items: PortfolioWorkItem[];
  masterName: string;
}

export function MasterPortfolioGallery({ items, masterName }: MasterPortfolioGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const activeItem = selectedIndex !== null ? items[selectedIndex] : null;

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev === null ? null : prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev === null ? null : (prev + 1) % items.length));
  }, [items.length]);

  // Керування клавіатурою при повноекранному перегляді
  useEffect(() => {
    if (selectedIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', onKeyDown);
    // Блокування скролу сторінки під модалкою
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedIndex, handleClose, handlePrev, handleNext]);

  if (!items.length) return null;

  return (
    <section className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-8 shadow-none flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#0ea5e9]" />
          Галерея робіт ({items.length})
        </h2>
        <span className="text-xs text-slate-400">Натисніть на фото для перегляду</span>
      </div>

      {/* Pinterest-стиль: Masonry Columns із природною висотою картинок */}
      <div className="columns-2 sm:columns-3 md:columns-3 lg:columns-4 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className="group relative block w-full break-inside-avoid rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs hover:shadow-md focus:outline-hidden focus:ring-2 focus:ring-[#0ea5e9] focus:ring-offset-2 transition-all duration-200 cursor-pointer text-left"
            aria-label={`Переглянути роботу: ${item.title}`}
          >
            <img
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              className="w-full h-auto object-cover block transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            />
            {/* Pinterest-стиль: плашка з інформацією знизу або затемнення при наведенні */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 sm:p-4 flex flex-col justify-end text-white">
              {item.tag && (
                <span className="self-start text-[10px] font-semibold bg-[#0ea5e9] text-white px-2 py-0.5 rounded-full mb-1.5 shadow-xs">
                  {item.tag}
                </span>
              )}
              <p className="text-xs sm:text-sm font-semibold leading-snug line-clamp-2 drop-shadow-xs">{item.title}</p>
              {item.description && (
                <p className="text-[11px] text-slate-200 mt-1 line-clamp-2 leading-relaxed opacity-90 drop-shadow-xs">
                  {item.description}
                </p>
              )}
            </div>

            {/* Іконка зуму */}
            <div className="absolute top-2.5 right-2.5 bg-black/45 backdrop-blur-xs text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>

      {/* Повноекранний лайтбокс / модальне вікно */}
      {activeItem && selectedIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Фото роботи: ${activeItem.title}`}
          onClick={handleClose}
          className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Динамічний розмитий фон із кольорів самого фото */}
          <div className="absolute inset-0 z-0 overflow-hidden select-none pointer-events-none">
            <img
              src={activeItem.imageUrl}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover scale-125 blur-3xl opacity-45 brightness-75 contrast-125"
            />
            {/* Брендовий MasterMap оверлей (темно-синій градієнт для глибини та контрасту) */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-slate-950/90" />
            {/* Тонке брендове сяйво MasterMap Sky */}
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#0ea5e9]/15 rounded-full blur-[100px] pointer-events-none" />
          </div>

          {/* Кнопка закриття */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Закрити повноекранний перегляд"
            className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Кнопка «Попереднє» */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Попереднє фото"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Центральний блок фотографії */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center text-white"
          >
            <div className="relative group max-h-[72vh] flex items-center justify-center">
              <img
                src={activeItem.imageUrl}
                alt={activeItem.title}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-white/15 select-none ring-1 ring-white/10"
              />
            </div>

            <div className="w-full max-w-2xl mt-4 px-2 text-center flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                {activeItem.tag && (
                  <span className="text-[11px] font-semibold bg-[#0ea5e9] text-white px-2.5 py-0.5 rounded-full shadow-sm">
                    {activeItem.tag}
                  </span>
                )}
                <span className="text-xs text-slate-300 font-medium bg-black/30 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10">
                  {selectedIndex + 1} з {items.length}
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-bold tracking-tight text-white drop-shadow-md">
                {activeItem.title}
              </h3>
              {activeItem.description && (
                <p className="text-xs sm:text-sm text-slate-250 max-w-xl leading-relaxed drop-shadow-sm">
                  {activeItem.description}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-0.5">
                Майстер: <span className="text-white font-medium">{masterName}</span>
              </p>
            </div>
          </div>

          {/* Кнопка «Наступне» */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              aria-label="Наступне фото"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
