import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { BOT_URL } from '@/lib/links';
import { Send, UserPlus, Menu, X, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onAddMaster?: () => void;
  className?: string;
  isFloating?: boolean;
}

export function Navbar({ onAddMaster, className, isFloating = false }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleAddMaster = () => {
    setIsMobileMenuOpen(false);
    if (onAddMaster) {
      onAddMaster();
    } else {
      window.open(BOT_URL, '_blank');
    }
  };

  return (
    <header
      className={cn(
        'w-full z-30 pointer-events-auto',
        isFloating ? 'absolute top-4 sm:top-5 inset-x-0 px-4 sm:px-6' : 'relative',
        className
      )}
    >
      <div className="w-full bg-white border border-slate-200 rounded-xl px-4 sm:px-6 py-3 shadow-none flex flex-col gap-3">
        { }
        <div className="flex items-center justify-between gap-3">
          { }
          <Link
            to="/"
            className="flex items-center cursor-pointer text-left"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="font-semibold text-2xl tracking-tight text-slate-900">
              Majstr<span className="text-[#0ea5e9]">Map</span>
            </span>
          </Link>

          <Button variant="threedIcon" size="icon" asChild className="ml-auto">
            <Link to="/saved" aria-label="Збережені майстри" title="Збережені майстри"><Heart/></Link>
          </Button>
          { }
          <div className="hidden sm:flex items-center gap-2 sm:gap-2.5">
            <Button
              variant="threedOutline"
              size="sm"
              onClick={() => window.open(BOT_URL, '_blank')}
              className="h-10 px-4 text-sm font-medium gap-1.5"
            >
              <Send className="w-4 h-4 text-[#0ea5e9]" />
              <span>Telegram Bot</span>
            </Button>

            <Button
              variant="threed"
              size="sm"
              onClick={handleAddMaster}
              className="h-10 px-4 text-sm font-medium gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Додати мене</span>
            </Button>
          </div>

          { }
          <div className="flex sm:hidden items-center">
            <Button
              variant="threedIcon"
              size="icon"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Закрити меню' : 'Відкрити меню'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              className="h-10 w-10 shrink-0"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Menu className="w-5 h-5 stroke-[2.5]" />
              )}
            </Button>
          </div>
        </div>

        { }
        {isMobileMenuOpen && (
          <div id="mobile-menu" className="sm:hidden flex flex-col gap-2.5 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
            <Button
              variant="threed"
              size="default"
              onClick={handleAddMaster}
              className="w-full h-11 text-sm font-medium gap-2 justify-center"
            >
              <UserPlus className="w-4 h-4" />
              <span>Додати мене</span>
            </Button>

            <Button
              variant="threedOutline"
              size="default"
              onClick={() => {
                setIsMobileMenuOpen(false);
                window.open(BOT_URL, '_blank');
              }}
              className="w-full h-11 text-sm font-medium gap-2 justify-center"
            >
              <Send className="w-4 h-4 text-[#0ea5e9]" />
              <span>Телеграм бот</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
