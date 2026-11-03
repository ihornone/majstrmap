import { cn } from '@/lib/utils';
import { getAvatarUrl } from '@/lib/api';

interface AvatarProps {
  name: string;
  avatarKey?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1] ?? '';
  return (first.charAt(0) + second.charAt(0)).toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-sky-500 text-white',
    'bg-indigo-500 text-white',
    'bg-emerald-500 text-white',
    'bg-amber-500 text-white',
    'bg-rose-500 text-white',
    'bg-teal-500 text-white',
    'bg-purple-500 text-white',
    'bg-blue-600 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? 'bg-sky-500 text-white';
}

export function MasterAvatar({ name, avatarKey, className, size = 'md' }: AvatarProps) {
  const url = getAvatarUrl(avatarKey);

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-24 h-24 sm:w-28 sm:h-28 text-2xl font-bold',
  };

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn(
          'rounded-full object-cover border-2 border-white shadow-none ring-1 ring-slate-200 shrink-0',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  const initials = getInitials(name);
  const colorClass = getColorFromName(name);

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold select-none border-2 border-white shadow-none ring-1 ring-slate-200 shrink-0',
        sizeClasses[size],
        colorClass,
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
}
