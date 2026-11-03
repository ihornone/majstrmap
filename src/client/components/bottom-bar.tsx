import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomBarProps {
  onScrollDown?: () => void;
  onScrollUp?: () => void;
  className?: string;
}

export function BottomBar({
  onScrollDown,
  onScrollUp,
  className,
}: BottomBarProps) {
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledDown(window.scrollY > 120);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    if (isScrolledDown) {
      if (onScrollUp) onScrollUp();
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (onScrollDown) onScrollDown();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white py-2 sm:py-2.5 px-6 rounded-t-2xl sm:rounded-t-3xl flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-150 cursor-pointer pointer-events-auto no-scrollbar',
        className
      )}
    >
      <span>{isScrolledDown ? 'До карти' : 'Про проєкт та реєстрація майстра'}</span>
      {isScrolledDown ? (
        <ChevronUp className="w-4 h-4 stroke-[2.5] animate-bounce" />
      ) : (
        <ChevronDown className="w-4 h-4 stroke-[2.5] animate-bounce" />
      )}
    </button>
  );
}
