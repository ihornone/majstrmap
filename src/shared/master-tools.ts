export interface Availability { state?: 'free'|'busy_today'|'from_date'; date?: string; }
export function todayKyiv(): string { return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function validateAvailability(a: Availability):void {
  if(!a||typeof a!=='object'||Array.isArray(a))throw new Error('Перевірте статус доступності.');
  if(a.state!==undefined&&!['free','busy_today','from_date'].includes(a.state))throw new Error('Невідомий статус.');
  if(a.state){
    if(!a.date||!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||Number.isNaN(Date.parse(a.date+'T12:00:00Z'))||new Date(a.date+'T12:00:00Z').toISOString().slice(0,10)!==a.date)throw new Error('Дата має бути у форматі РРРР-ММ-ДД.');
  }
}
export function availabilityLabel(a:Availability = {}, today=todayKyiv()):string|null {
  if(a.state==='free'&&a.date===today)return 'Зараз вільний';
  if(a.state==='busy_today'&&a.date===today)return 'Зайнятий сьогодні';
  if(a.state==='from_date'&&a.date&&a.date>=today)return `Приймаю з ${new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',timeZone:'Europe/Kyiv'}).format(new Date(a.date+'T12:00:00Z'))}`;
  return null;
}
export function profileCompleteness(m:{avatar_key?:string|null;description?:string;about?:string|null;contacts?:Record<string,unknown>;experience_years?:number;services?:unknown[];work_conditions?:object;reviews_count?:number}) {
  const checks:[boolean,string][]=[
    [!!m.avatar_key,'Додайте фото або логотип'],[!!m.description&&m.description.length>=10,'Додайте короткий опис'],
    [!!m.about&&m.about.length>=10,'Розкажіть про свій підхід'],[!!m.contacts&&Object.values(m.contacts).some(Boolean),'Додайте контакт для клієнтів'],
    [typeof m.experience_years==='number','Вкажіть досвід'],[!!m.services?.length,'Додайте послуги з цінами'],
    [!!m.work_conditions&&Object.values(m.work_conditions).some(v=>v!=null),'Вкажіть умови роботи'],
  ];
  return {percent:Math.round(checks.filter(([ok])=>ok).length/checks.length*100),tips:checks.filter(([ok])=>!ok).map(([,tip])=>tip),reviewTip:m.reviews_count?'':'Поділіться посиланням на відгук із клієнтами після роботи.'};
}
