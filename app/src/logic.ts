// Lógica pura: formatos, meses, lectura de respuestas de Claude, iCal, reglas de cálculo.

export type Linea = { codigo?: string | null; concepto: string; cantidad?: number | null; precio?: number | null; importe: number };
export type Deduccion = { concepto: string; base?: number | null; porcentaje?: number | null; importe: number; grupo?: 'ss' | 'irpf' | 'otras' };
export type Nomina = {
  id: string; ejemplo?: boolean; empresa?: string | null; cif?: string | null; trabajador?: string | null; nif?: string | null;
  categoria?: string | null; antiguedad?: string | null;
  periodo?: { mes?: number | null; anio?: number | null; desde?: string | null; hasta?: string | null; dias?: number | null };
  tipo: string; devengos: Linea[]; deducciones: Deduccion[];
  totalDevengado: number; totalDeducciones: number; liquido: number; irpfPct?: number | null;
  bases?: { contingenciasComunes?: number | null; contingenciasProfesionales?: number | null; irpf?: number | null };
  aportacionEmpresa?: number | null; notas?: string; subida?: string;
};
export type Doc = Record<string, any> & { id: string };

/* ---------- formatos ---------- */
const eurF = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur0F = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const eur = (n: any) => (n == null || isNaN(n)) ? '—' : eurF.format(Number(n));
export const eur0 = (n: any) => (n == null || isNaN(n)) ? '—' : eur0F.format(Number(n));
export const num = (n: any) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 });
export const pct = (n: any) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' %';
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const sum = <T,>(a: T[], f: (x: T) => any = (x: any) => x) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
export const toNum = (s: any): number | null => {
  const t = String(s ?? '').trim(); if (!t) return null;
  const v = parseFloat(/,/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t);
  return isNaN(v) ? null : v;
};
export const decTxt = (n: number | null | undefined) => n == null ? '' : String(n).replace('.', ',');

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const TIPO: Record<string, string> = { mensual: 'Mensual', extra: 'Paga extra', atrasos: 'Atrasos', finiquito: 'Finiquito', otra: 'Otra' };
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- meses y días ---------- */
export const pad = (n: number) => String(n).padStart(2, '0');
export const ymOf = (y: number, m: number) => `${y}-${pad(m)}`;
export const ymAdd = (ym: string, k: number) => { let [y, m] = ym.split('-').map(Number); m += k; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return ymOf(y, m); };
export const ymLabel = (ym: string) => { const [y, m] = ym.split('-').map(Number); return `${MESES[m - 1]} ${y}`; };
export const ymNow = () => { const d = new Date(); return ymOf(d.getFullYear(), d.getMonth() + 1); };
export const daysIn = (ym: string) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
export const addDays = (ds: string, k: number) => { const d = new Date(ds + 'T12:00:00'); d.setDate(d.getDate() + k); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const dow = (ds: string) => new Date(ds + 'T12:00:00').getDay();
export const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const fechaCorta = (ds: string) => { const [y, m, d] = ds.split('-').map(Number); return `${d} ${MES3[m - 1]} ${y}`; };

/* ---------- nóminas ---------- */
export const nomYm = (n: Nomina) => n.periodo?.anio && n.periodo?.mes ? ymOf(n.periodo.anio, n.periodo.mes) : '';
export const key = (n: Nomina) => (n.periodo?.anio || 0) * 100 + (n.periodo?.mes || 0) + (n.tipo === 'mensual' ? 0 : 0.5);
export const label = (n: Nomina) => n.periodo?.mes ? `${MESES[n.periodo.mes - 1]} ${n.periodo.anio}` : String(n.periodo?.anio || 'Sin fecha');
export const Label = (n: Nomina) => cap(label(n));
export const grp = (n: Nomina, g: string) => sum((n.deducciones || []).filter((d) => d.grupo === g), (d) => d.importe);
export const cuadra = (n: Nomina) => (n.totalDevengado == null || n.totalDeducciones == null || n.liquido == null) ? null : r2(n.totalDevengado - n.totalDeducciones - n.liquido);

function ejemplo(mes: number, anio: number, extra = 0): Nomina {
  const dev: Linea[] = [
    { concepto: 'Sueldo base', importe: 900.63 }, { concepto: 'Antigüedad', importe: 197.76 },
    { concepto: 'Complemento de destino', importe: 592.11 }, { concepto: 'Complemento específico', importe: 1124.86 },
    { codigo: '74', concepto: 'Jornada festiva', importe: 126.2 }, { codigo: '76', concepto: 'Jornada nocturna', importe: 129 },
    { codigo: '85', concepto: 'Jornada de sábado', importe: 75.52 + extra }, { codigo: '721', concepto: 'Desplazamiento', importe: 93.6 },
  ];
  const bruto = r2(sum(dev, (d) => d.importe));
  const ded: Deduccion[] = ([['Contingencias comunes', 4.7, 'ss'], ['Desempleo', 1.55, 'ss'], ['Formación profesional', 0.1, 'ss'], ['MEI', 0.15, 'ss']] as const)
    .map(([c, p, g]) => ({ concepto: c, base: bruto, porcentaje: p, importe: r2(bruto * p / 100), grupo: g }));
  ded.push({ concepto: 'Retención IRPF', base: bruto, porcentaje: 16, importe: r2(bruto * 0.16), grupo: 'irpf' });
  const td = r2(sum(ded, (d) => d.importe));
  return { id: `ej-${anio}-${mes}`, ejemplo: true, periodo: { mes, anio }, tipo: 'mensual', devengos: dev, deducciones: ded,
    totalDevengado: bruto, totalDeducciones: td, liquido: r2(bruto - td), irpfPct: 16,
    bases: { contingenciasComunes: bruto, contingenciasProfesionales: bruto, irpf: bruto }, aportacionEmpresa: null, notas: '' };
}
export const EJEMPLOS = [ejemplo(8, 2026), ejemplo(9, 2026, 37.76), ejemplo(10, 2026)];

/* ---------- instrucciones para Claude ---------- */
export const PROMPT_NOMINA = `Te adjunto una o varias nóminas españolas en PDF (Policía Local). Extrae TODOS los datos de cada nómina.
Responde SOLO con un bloque de código JSON, sin explicaciones, con esta forma:
{"nominas":[{
 "empresa":string|null,"cif":string|null,"trabajador":string|null,"nif":string|null,"categoria":string|null,"antiguedad":string|null,
 "periodo":{"mes":1-12|null,"anio":number|null,"desde":"AAAA-MM-DD"|null,"hasta":"AAAA-MM-DD"|null,"dias":number|null},
 "tipo":"mensual"|"extra"|"atrasos"|"finiquito"|"otra",
 "devengos":[{"codigo":string|null,"concepto":string,"cantidad":number|null,"precio":number|null,"importe":number}],
 "deducciones":[{"concepto":string,"base":number|null,"porcentaje":number|null,"importe":number,"grupo":"ss"|"irpf"|"otras"}],
 "totalDevengado":number|null,"totalDeducciones":number|null,"liquido":number|null,"irpfPct":number|null,
 "bases":{"contingenciasComunes":number|null,"contingenciasProfesionales":number|null,"irpf":number|null},
 "aportacionEmpresa":number|null,"notas":string
}]}
Reglas:
- Importes en euros con punto decimal (1.234,56 → 1234.56). Porcentajes como número (4,70% → 4.7).
- "codigo": el código numérico del concepto si aparece (por ejemplo "74", "3551"). Si no, null.
- "mes" y "anio": los del periodo de liquidación.
- grupo "ss": cuotas del trabajador a la Seguridad Social (contingencias comunes, desempleo, formación, MEI…). "irpf": retención de IRPF. "otras": el resto.
- "notas": una o dos frases con algo destacable, o "".
- Si un dato no aparece, null. No inventes valores.`;

export const promptCalendario = (quien: string) => `Te adjunto el calendario laboral de un policía local (calendario de turnos de la empresa) en PDF o foto. Extrae, día a día, lo que tiene ${quien ? `"${quien}"` : 'la persona del calendario (si hay varias, la que aparezca destacada o la primera)'}.
Códigos del calendario: "M y T" = turno de mañana y tarde (06-18). "T y N" = turno de tarde y noche (18-06). R1, R2, R3 = un tercio de retén cada uno; R123 = retén completo. RD = servicio RED.
Colores: rojo = festivo, gris = fin de semana, amarillo = incidencia (baja), verde = vacaciones. Míralo como imagen: se lee mejor que el texto.

Responde SOLO con JSON compacto, en una línea por mes, sin explicaciones. Cada día es un texto corto con estas marcas separadas por espacios:
MT (turno M y T), TN (turno T y N), R1 / R2 / R3 / R12 / R13 / R23 / R123 (tercios de retén), RD (RED; si el horario está escrito, pégalo: RD18-06), F (casilla roja, festivo), B (baja, amarillo), V (vacaciones, verde). Día sin nada: "".
Formato:
{"meses":[
{"m":10,"a":2026,"d":["MT","TN","","R123 B","","MT","TN F",...un texto por cada día del mes...]},
{"m":11,"a":2026,"d":[...]}
],"notas":""}
Reglas: todos los meses que aparezcan, cada uno con tantos textos como días tiene. "F" solo si la casilla es roja, no por ser fin de semana. No supongas horarios de RED que no estén escritos. En "notas", una frase si algo no se lee bien.`;

/** Arregla un JSON cortado (respuesta incompleta): lo recorta al último elemento completo y cierra lo que quede abierto. */
function repararJSON(c: string): any | null {
  let ultimo = -1; const pila: string[] = []; let enStr = false, esc = false; const cortes: { i: number; pila: string }[] = [];
  for (let i = 0; i < c.length; i++) {
    const ch = c[i];
    if (enStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') enStr = false; continue; }
    if (ch === '"') enStr = true;
    else if (ch === '{' || ch === '[') pila.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') { pila.pop(); ultimo = i; cortes.push({ i, pila: pila.slice().reverse().join('') }); }
  }
  for (let k = cortes.length - 1; k >= 0 && k >= cortes.length - 400; k--) {
    try { return JSON.parse(c.slice(0, cortes[k].i + 1).replace(/,\s*$/, '') + cortes[k].pila); } catch {}
  }
  return ultimo < 0 ? null : null;
}

/** Saca el primer objeto JSON de un texto (con o sin ```json), aunque venga cortado. */
export function sacarJSON(texto: string): any | null {
  const t = String(texto || '').replace(/[“”]/g, '"');
  const bloque = t.match(/```(?:json)?\s*([\s\S]*?)(```|$)/);
  const cands = [bloque?.[1], t];
  for (const c of cands) {
    if (!c) continue;
    const a = c.indexOf('{'), b = c.lastIndexOf('}');
    if (a < 0) continue;
    if (b > a) { try { return JSON.parse(c.slice(a, b + 1)); } catch {} }
    const r = repararJSON(c.slice(a)); if (r) return r;
  }
  return null;
}

/** Convierte un día en formato corto ("TN R1 F", "RD18-06") al formato completo. */
function diaDeTexto(dia: number, txt: any) {
  if (txt && typeof txt === 'object') return { ...txt, dia: txt.dia ?? dia };
  const u = String(txt || '').toUpperCase();
  const tok = u.split(/[\s,;]+/).filter(Boolean);
  const rd = tok.find((x) => /^RD/.test(x));
  const ret = tok.find((x) => /^R[123]+$/.test(x)) || '';
  return { dia, turno: tok.includes('MT') ? 'MT' : tok.includes('TN') ? 'TN' : '', reten: ret, red: !!rd,
    horarioRed: rd && parseRange(rd.slice(2)) ? parseRange(rd.slice(2))!.txt : null,
    festivo: tok.includes('F'), baja: tok.includes('B'), vacaciones: tok.includes('V'), texto: String(txt || '') };
}

export function nominasDeRespuesta(out: any): Nomina[] {
  const list: any[] = Array.isArray(out?.nominas) ? out.nominas : Array.isArray(out) ? out : out?.devengos ? [out] : [];
  return list.filter((n) => n && typeof n === 'object').map((n) => {
    const p = n.periodo || {};
    const devengos = Array.isArray(n.devengos) ? n.devengos : [];
    const deducciones = Array.isArray(n.deducciones) ? n.deducciones : [];
    const totalDevengado = n.totalDevengado ?? r2(sum(devengos, (d: any) => d.importe));
    const totalDeducciones = n.totalDeducciones ?? r2(sum(deducciones, (d: any) => d.importe));
    const liquido = n.liquido ?? r2(totalDevengado - totalDeducciones);
    const tipo = n.tipo || 'mensual';
    return { ...n, devengos, deducciones, totalDevengado, totalDeducciones, liquido, tipo,
      id: `n-${p.anio || 'x'}-${pad(p.mes || 0)}-${tipo}`, subida: new Date().toISOString() } as Nomina;
  });
}

export function calendariosDeRespuesta(out: any): { ym: string; doc: any }[] {
  const meses: any[] = Array.isArray(out?.meses) ? out.meses : [];
  return meses.map((m) => ({ mes: m?.mes ?? m?.m, anio: m?.anio ?? m?.a, dias: m?.dias ?? m?.d }))
    .filter((m) => m.mes && m.anio && Array.isArray(m.dias) && m.dias.length)
    .map((m) => ({ ym: ymOf(m.anio, m.mes), doc: { dias: m.dias.map((x: any, i: number) => diaDeTexto(i + 1, x)), notas: out.notas || '', subida: new Date().toISOString(),
      incompleto: m.dias.length < daysIn(ymOf(m.anio, m.mes)) } }));
}

/* ---------- iCal (direcciones secretas de Google Calendar) ---------- */
export const ICS_FESTIVOS = 'https://calendar.google.com/calendar/ical/es.spain%23holiday%40group.v.calendar.google.com/public/basic.ics';
type Ev = { uid: string; summary: string; description: string; allDay: boolean; start: string; end: string; rrule?: Record<string, string>; exdates: Set<string>; recurrenceId?: string; cancelled?: boolean };
export type Inst = { summary: string; description: string; start: { date?: string; dateTime?: string }; end: { date?: string; dateTime?: string } };

function icsFecha(prop: string, val: string): { d: string; allDay: boolean } {
  const m = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return { d: '', allDay: true };
  if (!m[4]) return { d: `${m[1]}-${m[2]}-${m[3]}`, allDay: true };
  if (m[7]) { const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])); return { d: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`, allDay: false }; }
  return { d: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`, allDay: false };
}
const unesc = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

export function parseICS(text: string): Ev[] {
  const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const out: Ev[] = []; let cur: Ev | null = null;
  for (const ln of lines) {
    if (ln === 'BEGIN:VEVENT') { cur = { uid: '', summary: '', description: '', allDay: true, start: '', end: '', exdates: new Set() }; continue; }
    if (ln === 'END:VEVENT') { if (cur && cur.start) out.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = ln.indexOf(':'); if (i < 0) continue;
    const prop = ln.slice(0, i), val = ln.slice(i + 1), name = prop.split(';')[0].toUpperCase();
    if (name === 'UID') cur.uid = val;
    else if (name === 'SUMMARY') cur.summary = unesc(val);
    else if (name === 'DESCRIPTION') cur.description = unesc(val);
    else if (name === 'STATUS') cur.cancelled = /CANCELLED/i.test(val);
    else if (name === 'DTSTART') { const f = icsFecha(prop, val); cur.start = f.d; cur.allDay = f.d.length === 10; }
    else if (name === 'DTEND') cur.end = icsFecha(prop, val).d;
    else if (name === 'RRULE') cur.rrule = Object.fromEntries(val.split(';').map((p) => p.split('=') as [string, string]));
    else if (name === 'EXDATE') for (const v of val.split(',')) { const f = icsFecha(prop, v); if (f.d) cur.exdates.add(f.d.slice(0, 10)); }
    else if (name === 'RECURRENCE-ID') cur.recurrenceId = icsFecha(prop, val).d.slice(0, 10);
  }
  return out;
}

const BYDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
/** Instancias de los eventos entre dos fechas (AAAA-MM-DD, fin exclusivo), con las repeticiones expandidas. */
export function expandICS(evs: Ev[], desde: string, hasta: string): Inst[] {
  const overrides = new Map<string, Ev>();
  for (const e of evs) if (e.recurrenceId) overrides.set(`${e.uid}|${e.recurrenceId}`, e);
  const out: Inst[] = [];
  const push = (e: Ev, startDay: string) => {
    const s0 = e.start.slice(0, 10);
    const durDays = e.end ? Math.max(0, Math.round((new Date(e.end.slice(0, 10) + 'T12:00:00').getTime() - new Date(s0 + 'T12:00:00').getTime()) / 864e5)) : (e.allDay ? 1 : 0);
    const endDay = addDays(startDay, e.allDay ? Math.max(1, durDays) : durDays);
    if (endDay <= desde && !(endDay === startDay && startDay >= desde)) return;
    if (startDay >= hasta) return;
    out.push(e.allDay ? { summary: e.summary, description: e.description, start: { date: startDay }, end: { date: endDay } }
      : { summary: e.summary, description: e.description, start: { dateTime: startDay + e.start.slice(10) }, end: { dateTime: endDay + (e.end || e.start).slice(10) } });
  };
  for (const e of evs) {
    if (e.recurrenceId) { if (!e.cancelled) push(e, e.start.slice(0, 10)); continue; }
    if (e.cancelled) continue;
    const s0 = e.start.slice(0, 10);
    if (!e.rrule) { push(e, s0); continue; }
    const r = e.rrule, freq = r.FREQ, iv = Math.max(1, +(r.INTERVAL || 1)), count = r.COUNT ? +r.COUNT : Infinity;
    const until = r.UNTIL ? icsFecha('', r.UNTIL).d.slice(0, 10) : '9999-12-31';
    const byday = (r.BYDAY || '').split(',').map((x) => BYDAY[x.replace(/^[+-]?\d+/, '')]).filter((x) => x != null);
    let n = 0, guard = 0;
    const emit = (d: string) => {
      n++;
      if (e.exdates.has(d)) return;
      const ov = overrides.get(`${e.uid}|${d}`);
      if (ov) return;   // la instancia modificada ya se añade por su cuenta
      push(e, d);
    };
    if (freq === 'WEEKLY' && byday.length) {
      const w0 = addDays(s0, -dow(s0));
      for (let w = 0; guard < 20000; w += iv) {
        const ws = addDays(w0, w * 7); if (ws > until || ws >= hasta) break;
        for (const bd of [...byday].sort()) { guard++; const d = addDays(ws, bd); if (d < s0 || d > until || n >= count) continue; emit(d); }
        if (n >= count) break;
      }
      continue;
    }
    let d = s0;
    while (d <= until && d < hasta && n < count && guard++ < 20000) {
      emit(d);
      const dt = new Date(s0 + 'T12:00:00');
      if (freq === 'DAILY') d = addDays(d, iv);
      else if (freq === 'WEEKLY') d = addDays(d, 7 * iv);
      else if (freq === 'MONTHLY') { dt.setMonth(dt.getMonth() + n * iv); d = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; }
      else if (freq === 'YEARLY') { dt.setFullYear(dt.getFullYear() + n * iv); d = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; }
      else break;
    }
  }
  return out;
}

/* ---------- turnos ---------- */
export const parseRange = (s: any) => {
  const m = String(s || '').match(/(\d{1,2})(?::\d{2})?\s*[-–]\s*(\d{1,2})(?::\d{2})?/);
  if (!m) return null; const a = +m[1], b = +m[2]; if (a > 24 || b > 24) return null;
  return { start: a % 24, dur: ((b - a + 24) % 24) || 24, txt: `${pad(a)}-${pad(b)}` };
};
export const normTurno = (s: any) => { const u = String(s || '').toUpperCase().replace(/[^A-Z]/g, ''); return (u === 'MT' || u === 'MYT') ? 'MT' : (u === 'TN' || u === 'TYN') ? 'TN' : ''; };
export const tercOf = (s: any) => { const u = String(s || '').toUpperCase().replace(/\s/g, ''); if (!/^R/.test(u)) return 0; const n = new Set(u.slice(1).match(/[123]/g) || []).size; return n || 3; };

export function summarizeGoogle(ym: string, ev: { trabajo: Inst[] | null; retenes: Inst[] | null; red: Inst[] | null; festivos: Inst[] | null }, faltan: string[]) {
  const inMonth = (ds: string) => ds.startsWith(ym);
  const R: any = { ym, generado: new Date().toISOString(), faltan, dias: {}, red: [], festivos: [], otros: {} };
  const mark = (d: string, tag: string) => { (R.dias[d] = R.dias[d] || []).push(tag); };
  const datesOf = (e: Inst) => {
    const out: string[] = [];
    if (e.start?.date) { let d = e.start.date; const end = e.end?.date || addDays(d, 1); let g = 0; while (d < end && g++ < 400) { if (inMonth(d)) out.push(d); d = addDays(d, 1); } }
    else if (e.start?.dateTime) { const d = e.start.dateTime.slice(0, 10); if (inMonth(d)) out.push(d); }
    return out;
  };
  for (const e of ev.festivos || []) if (e.start?.date && inMonth(e.start.date) && /^\s*(d[ií]a\s+)?festivo|public holiday/i.test(e.description || '')) R.festivos.push({ fecha: e.start.date, nombre: e.summary || 'Festivo' });
  for (const e of ev.trabajo || []) {
    const s = (e.summary || '').trim(), t = normTurno(s);
    for (const d of datesOf(e)) {
      if (t) mark(d, t);
      else if (/baja|incapacidad/i.test(s)) mark(d, 'BAJA');
      else if (/vacac/i.test(s)) mark(d, 'VAC');
      else R.otros[s] = (R.otros[s] || 0) + 1;
    }
  }
  for (const e of ev.retenes || []) {
    const n = ((e.summary || '').match(/(\d)/) || [])[1];
    for (const d of datesOf(e)) mark(d, n ? `R${n}` : 'R123');
  }
  for (const e of ev.red || []) {
    const r = parseRange(e.summary);
    for (const d of datesOf(e)) { mark(d, 'RED'); R.red.push({ fecha: d, servicio: (e.summary || '').replace(/^\s*red\s*/i, '').trim(), horario: r ? r.txt : null }); }
  }
  return R;
}

/* ---------- tarifas y reglas ---------- */
export const TARIFAS_DEF: Record<string, number> = { festiva: 31.55, nocturna: 21.5, sabado: 18.88, reten: 114, desplaz: 6.24, redHora: 32.6, redNoct: 2.69, redSab: 2.36, redFest: 3.94, partida: 12.88, moto: 12.89, juicio: 80, gratifMax: 102.42 };
export const TARIFA_LBL: [string, string][] = [['festiva', 'Jornada festiva (74)'], ['nocturna', 'Jornada nocturna (76)'], ['sabado', 'Jornada de sábado (85)'], ['reten', 'Retén completo (3551)'],
  ['desplaz', 'Desplazamiento por día (721)'], ['redHora', 'RED, precio hora (212)'], ['redNoct', 'RED, plus hora nocturna'], ['redSab', 'RED, plus hora de sábado'],
  ['redFest', 'RED, plus hora festiva'], ['partida', 'Jornada partida (77)'], ['moto', 'Moto/pala (3555)'], ['juicio', 'Juicio'], ['gratifMax', 'Gratificación 3575, máx. al mes']];
export type Ajustes = { quien: string; festivosLocales: string; tarifas: Record<string, number>; ics: { trabajo: string; retenes: string; red: string } };
export const leerAjustes = (d: any): Ajustes => ({ quien: '', festivosLocales: '', ...(d || {}), tarifas: { ...TARIFAS_DEF, ...(d?.tarifas || {}) }, ics: { trabajo: '', retenes: '', red: '', ...(d?.ics || {}) } });

export type Dia = { ds: string; dia: number; turno: string; tercios: number; red: boolean; baja: boolean; vac: boolean; festivo: boolean; redHorario: string | null; redOrigen: string | null; redServicio: string };
export type Mes = { days: Dia[]; diffs: { ds: string; dia: number; txt: string }[]; fest: Map<string, string>; fuente: 'empresa' | 'google'; cua: any; cal: any };

export function buildMonth(ym: string, docs: Record<string, any>, A: Ajustes): Mes | null {
  const cua = docs[`cua-${ym}`], cal = docs[`cal-${ym}`], ov = docs[`mes-${ym}`] || {};
  if (!cua && !cal) return null;
  const fest = new Map<string, string>((cal?.festivos || []).map((f: any) => [f.fecha, f.nombre]));
  for (const t of String(A.festivosLocales || '').split(/[,;\s]+/)) {
    const m = t.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (m) { const ds = `${ym.slice(0, 4)}-${pad(+m[2])}-${pad(+m[1])}`; if (ds.startsWith(ym) && !fest.has(ds)) fest.set(ds, 'Festivo local'); }
  }
  const cmap: Record<number, any> = {}; for (const d of cua?.dias || []) if (d && d.dia) cmap[d.dia] = d;
  const redG: Record<string, any> = {}; for (const r of cal?.red || []) if (!redG[r.fecha]) redG[r.fecha] = r;
  const days: Dia[] = [], diffs: Mes['diffs'] = [];
  for (let i = 1; i <= daysIn(ym); i++) {
    const ds = `${ym}-${pad(i)}`, g: string[] = cal?.dias?.[ds] || [], c = cmap[i];
    const gd = cal ? { turno: g.find((t) => t === 'MT' || t === 'TN') || '', tercios: Math.min(3, g.filter((t) => /^R\d+$/.test(t)).reduce((s, t) => s + tercOf(t), 0)), red: g.includes('RED'), baja: g.includes('BAJA'), vac: g.includes('VAC') } : null;
    const cd = cua ? { turno: normTurno(c?.turno), tercios: tercOf(c?.reten), red: !!c?.red, baja: !!c?.baja, vac: !!c?.vacaciones } : null;
    if (c?.festivo && !fest.has(ds)) fest.set(ds, 'Festivo del calendario de la empresa');
    if (cd && gd) {
      const dif: string[] = [];
      if (cd.turno !== gd.turno) dif.push(`turno ${gd.turno || 'libre'} en Google, ${cd.turno || 'libre'} en la empresa`);
      if (cd.tercios !== gd.tercios) dif.push(`retén ${gd.tercios}/3 en Google, ${cd.tercios}/3 en la empresa`);
      if (cd.red !== gd.red) dif.push(cd.red ? 'RED solo en la empresa' : 'RED solo en Google');
      if (cd.baja !== gd.baja) dif.push(cd.baja ? 'baja solo en la empresa' : 'baja solo en Google');
      if (dif.length) diffs.push({ ds, dia: i, txt: dif.join(' · ') });
    }
    const f = (cd || gd)!;
    const horEmp = c?.horarioRed && parseRange(c.horarioRed)?.txt;
    const hor = ov.red?.[ds] || horEmp || redG[ds]?.horario || null;
    const origen = ov.red?.[ds] ? 'ti' : horEmp ? 'la empresa' : redG[ds]?.horario ? 'Google' : null;
    days.push({ ds, dia: i, ...f, festivo: false, redHorario: f.red ? hor : null, redOrigen: f.red ? origen : null, redServicio: redG[ds]?.servicio || '' });
  }
  for (const d of days) d.festivo = fest.has(d.ds);
  return { days, diffs, fest, fuente: cua ? 'empresa' : 'google', cua, cal };
}

export type LineaCalc = { code: string; nombre: string; cant: number; unidad: string; precio: number | null; esperado: number; det: string; alt?: { importe: number; txt: string } | null; incompleto?: string | null };
export type RedCalc = { d: Dia; falta?: boolean; horas?: number; hN?: number; hS?: number; hF?: number; importe?: number };

/** Reglas por el día en que EMPIEZA el turno. */
export function compute(M: Mes, T: Record<string, number>) {
  const isFest = (ds: string) => M.fest.has(ds) || dow(ds) === 0;
  const c = { fest: 0, sab: 0, noch: 0, mt: 0, desp: 0, terc: 0, tercBaja: 0 };
  const det = { fest: [] as string[], sab: [] as string[], noch: [] as string[], desp: [] as number[], ret: [] as string[], retBaja: [] as string[] };
  const red: RedCalc[] = [];
  for (const d of M.days) {
    const wd = dow(d.ds), lbl = `${d.dia} ${DOW[wd]}`;
    if (d.turno === 'MT') {
      c.mt++;
      if (wd === 0 || d.festivo) { c.fest += 2; det.fest.push(`${lbl} MT ×2`); }
      else if (wd === 6) { c.sab += 2; det.sab.push(`${lbl} MT ×2`); }
    }
    if (d.turno === 'TN') {
      c.noch++; det.noch.push(lbl);
      if (wd === 0) { c.fest++; det.fest.push(`${lbl} TN`); }
      else if (wd === 6) { c.sab++; c.fest++; det.sab.push(`${lbl} TN`); det.fest.push(`${lbl} TN`); }
      else { if (wd === 5) { c.sab++; det.sab.push(`${lbl} TN`); } if (d.festivo) { c.fest++; det.fest.push(`${lbl} TN`); } }
    }
    if ((d.turno || d.red) && !d.baja && !d.vac) { c.desp++; det.desp.push(d.dia); }
    if (d.tercios) {
      const t = `${lbl} ${d.tercios === 3 ? 'completo' : d.tercios + '/3'}`;
      if (d.baja || d.vac) { c.tercBaja += d.tercios; det.retBaja.push(t); } else { c.terc += d.tercios; det.ret.push(t); }
    }
    if (d.red) {
      const r = parseRange(d.redHorario);
      if (!r) { red.push({ d, falta: true }); continue; }
      let imp = 0, hN = 0, hS = 0, hF = 0;
      for (let h = 0; h < r.dur; h++) {
        const t = r.start + h, day = addDays(d.ds, Math.floor(t / 24)), hod = t % 24, w = dow(day);
        imp += T.redHora;
        if (hod >= 22 || hod < 6) { imp += T.redNoct; hN++; }
        if (w === 6) { imp += T.redSab; hS++; }
        if (isFest(day)) { imp += T.redFest; hF++; }
      }
      red.push({ d, horas: r.dur, hN, hS, hF, importe: r2(imp) });
    }
  }
  const redOk = red.filter((x) => !x.falta), redFalta = red.length - redOk.length;
  const altRet = c.tercBaja ? r2((c.terc + c.tercBaja) / 3 * T.reten) : null;
  const lines: LineaCalc[] = [
    { code: '74', nombre: 'Jornada festiva', cant: c.fest, unidad: 'jornadas', precio: T.festiva, esperado: r2(c.fest * T.festiva), det: det.fest.join(', ') },
    { code: '76', nombre: 'Jornada nocturna', cant: c.noch, unidad: 'noches', precio: T.nocturna, esperado: r2(c.noch * T.nocturna), det: det.noch.join(', ') },
    { code: '85', nombre: 'Jornada de sábado', cant: c.sab, unidad: 'sábados', precio: T.sabado, esperado: r2(c.sab * T.sabado), det: det.sab.join(', ') },
    { code: '721', nombre: 'Desplazamiento', cant: c.desp, unidad: 'días', precio: T.desplaz, esperado: r2(c.desp * T.desplaz), det: c.desp ? `Días ${det.desp.join(', ')}` : '' },
    { code: '3551', nombre: 'Retenes', cant: r2(c.terc / 3), unidad: 'retenes', precio: T.reten, esperado: r2(c.terc / 3 * T.reten), det: det.ret.join(', '),
      alt: altRet != null ? { importe: altRet, txt: `Si también te pagan los retenes en baja o vacaciones (${det.retBaja.join(', ')}): ${eur(altRet)}.` } : null },
    { code: '212', nombre: 'Servicios RED', cant: red.length, unidad: 'servicios', precio: null, esperado: r2(sum(redOk, (x) => x.importe)),
      det: redOk.map((x) => `${x.d.dia} ${DOW[dow(x.d.ds)]} ${x.d.redHorario}: ${eur(x.importe)}`).join(', '),
      incompleto: redFalta ? `Falta el horario de ${redFalta} servicio${redFalta > 1 ? 's' : ''} RED.` : null },
  ];
  return { lines, red, c };
}

const MATCH: [string, RegExp][] = [['212', /\bred\b|refuerzo/i], ['3551', /ret[eé]n/i], ['721', /desplaz|locomoc|kilomet/i], ['74', /festiv/i], ['76', /noct/i], ['85', /s[aá]bad/i]];
const FIJO = /sueldo|salario base|antig|trienio|destino|espec[ií]fico|prorrat|paga extra|extraordinaria/i;
export function splitNomina(noms: Nomina[]) {
  const by: Record<string, { importe: number; conceptos: string[] }> = {}; const otros: Linea[] = [];
  for (const n of noms) for (const d of n.devengos || []) {
    const cs = String(d.concepto || '');
    const cod = String(d.codigo ?? '').replace(/\D/g, '').replace(/^0+/, '');
    const lead = (cs.match(/^\s*0*(\d{2,5})\b/) || [])[1] || '';
    let code = [cod, lead].find((x) => x && MATCH.some((m) => m[0] === x));
    if (!code && !cod && !lead) code = (MATCH.find((m) => m[1].test(cs)) || [])[0];
    if (code) { const o = by[code] = by[code] || { importe: 0, conceptos: [] }; o.importe = r2(o.importe + (Number(d.importe) || 0)); o.conceptos.push(cs); }
    else if (!FIJO.test(cs)) otros.push(d);
  }
  return { by, otros };
}

/* ---------- por cobrar ---------- */
export const PC_TIPOS: [string, string, string, string | null][] = [['horas_extra', 'Horas extra', 'h', 'redHora'], ['faltan_horas', 'Horas que faltan', 'h', 'redHora'], ['desplazamiento', 'Desplazamiento', 'días', 'desplaz'],
  ['juicio', 'Juicio', 'juicios', 'juicio'], ['reten', 'Retén', 'retenes', 'reten'], ['red', 'Servicio RED', 'h', 'redHora'], ['festiva', 'Jornada festiva', 'jornadas', 'festiva'],
  ['nocturna', 'Jornada nocturna', 'noches', 'nocturna'], ['sabado', 'Jornada de sábado', 'sábados', 'sabado'], ['partida', 'Jornada partida', 'jornadas', 'partida'],
  ['moto', 'Moto/pala', 'días', 'moto'], ['diferencia', 'Diferencia en nómina', '', null], ['otro', 'Otro', '', null]];
export const PC_BY = Object.fromEntries(PC_TIPOS.map((t) => [t[0], t]));
export const CODE_PC: Record<string, string> = { '74': 'festiva', '76': 'nocturna', '85': 'sabado', '721': 'desplazamiento', '3551': 'reten', '212': 'red' };
/** Acepta 2026-11-18, 18/11/2026 o 18/11 (año actual). */
export function leerFecha(s: string): string | null {
  const t = String(s || '').trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (m) { const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : new Date().getFullYear(); return `${y}-${pad(+m[2])}-${pad(+m[1])}`; }
  return null;
}
