import { workConditionRows, type WorkConditions } from '../../shared/work-conditions';
export function WorkConditionBadges({ conditions = {} }: { conditions?: WorkConditions }) {
  const labels = [conditions.visit === 'city' ? 'З виїздом' : conditions.visit === 'nearby' ? `Виїзд до ${conditions.radius_km} км` : null, conditions.days?.includes(7) ? 'Працює у неділю' : null, conditions.emergency ? `Аварійний виклик${conditions.emergency_hours === '24/7' ? ' 24/7' : ''}` : null].filter(Boolean);
  return labels.length ? <div className="flex flex-wrap gap-1.5">{labels.map(label=><span key={label} className="rounded-full bg-sky-50 text-sky-800 px-2 py-1 text-[11px]">{label}</span>)}</div> : null;
}
export function WorkConditionsDetails({ conditions = {} }: { conditions?: WorkConditions }) {
  return <dl className="flex flex-col gap-3 text-sm">{workConditionRows(conditions).map(([label,value])=><div key={label} className="flex justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="text-right text-slate-800">{value}</dd></div>)}</dl>;
}
