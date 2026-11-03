export interface WorkConditions {
  visit?: 'none' | 'city' | 'nearby' | null;
  radius_km?: number | null;
  days?: number[] | null;
  hours?: string | null;
  emergency?: boolean | null;
  emergency_hours?: string | null;
  visit_fee?: number | 'negotiable' | null;
}
export const DAY_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
const timeRange = /^([01]\d|2[0-3]):[0-5]\d\s*[-–]\s*([01]\d|2[0-3]):[0-5]\d$/;
export function validateWorkConditions(w: WorkConditions): void {
  if (!w || typeof w !== 'object' || Array.isArray(w)) throw new Error('Перевірте умови роботи.');
  if (w.visit != null && !['none','city','nearby'].includes(w.visit)) throw new Error('Виїзд: ні, місто або околиці.');
  if (w.radius_km != null && (!Number.isInteger(w.radius_km) || w.radius_km < 1 || w.radius_km > 1000 || w.visit !== 'nearby')) throw new Error('Радіус для виїзду в околиці — від 1 до 1000 км.');
  if (w.visit === 'nearby' && w.radius_km == null) throw new Error('Вкажіть радіус виїзду в кілометрах.');
  if (w.days != null && (!Array.isArray(w.days) || !w.days.length || w.days.some(d=>!Number.isInteger(d)||d<1||d>7))) throw new Error('Дні: пн, вт, ср, чт, пт, сб, нд.');
  if (w.hours != null && !timeRange.test(w.hours)) throw new Error('Години: 09:00-18:00 або за домовленістю.');
  if (w.emergency != null && typeof w.emergency !== 'boolean') throw new Error('Аварійний: так, ні або не вказано.');
  if (w.emergency_hours != null && (w.emergency !== true || (w.emergency_hours !== '24/7' && !timeRange.test(w.emergency_hours)))) throw new Error('Аварійні години: цілодобово або 09:00-18:00; увімкніть аварійні виклики.');
  if (w.visit_fee != null && w.visit_fee !== 'negotiable' && (typeof w.visit_fee !== 'number' || !Number.isInteger(w.visit_fee) || w.visit_fee<0 || w.visit_fee>100000000)) throw new Error('Вартість виїзду: число, безкоштовно або договірна.');
  if (w.visit_fee != null && w.visit !== 'city' && w.visit !== 'nearby') throw new Error('Для вартості виїзду спочатку вкажіть виїзд у місто або околиці.');
}
export function parseWorkConditions(text: string): WorkConditions {
  const w: WorkConditions = {};
  const unknown = new Set(['не вказано','за домовленістю','не стосується','-']);
  let rows = text.split('\n').filter(s=>s.trim());
  if (rows.length === 7 && rows.every(row => !row.includes(':'))) {
    const keys = ['виїзд','радіус','дні','години','аварійний','аварійні години','виїзд коштує'];
    rows = rows.map((row, index) => `${keys[index]}: ${row}`);
  }
  for (const row of rows) {
    const i = row.indexOf(':');
    if (i<1) throw new Error('Кожен рядок: назва поля: значення.');
    const key=row.slice(0,i).trim().toLocaleLowerCase('uk'), value=row.slice(i+1).trim().toLocaleLowerCase('uk');
    const empty=unknown.has(value);
    if (key==='виїзд') {
      if (empty) w.visit=null;
      else if (['ні','немає'].includes(value)) w.visit='none';
      else if (['місто','у межах міста'].includes(value)) w.visit='city';
      else if (['околиці','місто й околиці'].includes(value)) w.visit='nearby';
      else throw new Error('Виїзд: ні, місто, околиці або не вказано.');
    } else if (key==='радіус') { if(empty) w.radius_km=null; else if(/^\d+(\s*км)?$/.test(value)) w.radius_km=parseInt(value,10); else throw new Error('Радіус: ціле число кілометрів.'); }
    else if (key==='дні') {
      if(empty) w.days=null;
      else { const dayIds:Record<string,number>={пн:1,вт:2,ср:3,чт:4,пт:5,сб:6,нд:7}; w.days=value==='щодня'?[1,2,3,4,5,6,7]:[...new Set(value.split(/[,\s]+/).map(day=>{const d=dayIds[day];if(d===undefined)throw new Error('Дні: пн, вт, ср, чт, пт, сб, нд.');return d;}))]; }
    } else if (key==='години') w.hours=empty?null:value;
    else if (key==='аварійний') { if(empty)w.emergency=null;else if(value==='так')w.emergency=true;else if(value==='ні')w.emergency=false;else throw new Error('Аварійний: так, ні або не стосується.'); }
    else if (key==='аварійні години') w.emergency_hours=empty?null:['цілодобово','24/7'].includes(value)?'24/7':value;
    else if (key==='виїзд коштує') { if(empty)w.visit_fee=null;else if(value==='договірна')w.visit_fee='negotiable';else if(value==='безкоштовно')w.visit_fee=0;else if(/^\d+(\s*[₴грн]*)?$/.test(value))w.visit_fee=parseInt(value,10);else throw new Error('Виїзд коштує: число, безкоштовно, договірна або не вказано.'); }
    else throw new Error(`Невідоме поле: ${key}.`);
  }
  if (w.visit !== 'nearby') delete w.radius_km;
  if (w.emergency !== true) delete w.emergency_hours;
  if (w.visit !== 'city' && w.visit !== 'nearby') delete w.visit_fee;
  validateWorkConditions(w); return w;
}
export function workConditionRows(w: WorkConditions = {}): Array<[string,string]> {
  return [
    ['Виїзд',w.visit==='none'?'Без виїзду':w.visit==='city'?'У межах міста':w.visit==='nearby'?`Місто й околиці, до ${w.radius_km} км`:'Уточніть у майстра'],
    ['Дні роботи',w.days?.length?w.days.map(d=>DAY_NAMES[d-1]).join(', '):'Уточніть у майстра'],
    ['Години',w.hours||'Уточніть у майстра'],
    ['Аварійний виклик',w.emergency===true?`Так${w.emergency_hours ? `, ${w.emergency_hours}`:''}`:w.emergency===false?'Ні':'Уточніть у майстра'],
    ['Вартість виїзду',w.visit==='none'?'Без виїзду':w.visit_fee===0?'Безкоштовно':typeof w.visit_fee==='number'?`${w.visit_fee} ₴`:w.visit_fee==='negotiable'?'За домовленістю':'Уточніть у майстра'],
  ];
}
export const EMERGENCY_CATEGORIES = ['plumbing','electric','appliances','construction','auto'];
