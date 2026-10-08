// Calendário de pregão da B3. Dias são chaves "YYYY-MM-DD" tratadas em UTC (mesmo formato de Trade.date).

// Feriados nacionais/dias sem pregão com data fixa (MM-DD).
const FIXED_HOLIDAYS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-24", "12-25", "12-31"];

// Feriados móveis em dias relativos ao Domingo de Páscoa: Carnaval (seg/ter), Sexta-feira Santa, Corpus Christi.
const EASTER_OFFSETS = [-48, -47, -2, 60];

const DAY_MS = 24 * 60 * 60 * 1000;

export const toDayKey = (date: Date) => date.toISOString().slice(0, 10);

// "Hoje" no fuso da B3, no formato de chave de dia.
export const todayInSaoPaulo = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

const fromDayKey = (day: string) => new Date(`${day}T00:00:00Z`);

export const addDays = (day: string, delta: number) => toDayKey(new Date(fromDayKey(day).getTime() + delta * 86_400_000));

// Algoritmo de Meeus/Jones/Butcher (calendário gregoriano).
function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day);
}

const holidayCache = new Map<number, Set<string>>();

export function b3Holidays(year: number) {
  let holidays = holidayCache.get(year);
  if (!holidays) {
    const easter = easterSunday(year);
    holidays = new Set([
      ...FIXED_HOLIDAYS.map((monthDay) => `${year}-${monthDay}`),
      ...EASTER_OFFSETS.map((offset) => toDayKey(new Date(easter + offset * DAY_MS))),
    ]);
    holidayCache.set(year, holidays);
  }
  return holidays;
}

export function isB3BusinessDay(day: string) {
  const weekday = fromDayKey(day).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !b3Holidays(Number(day.slice(0, 4))).has(day);
}

// month: 1-12. Retorna os dias de pregão do mês em ordem crescente.
export function businessDaysOfMonth(year: number, month: number) {
  const days: string[] = [];
  for (let date = new Date(Date.UTC(year, month - 1, 1)); date.getUTCMonth() === month - 1; date = new Date(date.getTime() + DAY_MS)) {
    const day = toDayKey(date);
    if (isB3BusinessDay(day)) days.push(day);
  }
  return days;
}

// Pregões do mês de `today` ainda sem resultado: de hoje em diante, fora dos já realizados e dentro do período filtrado.
export function pendingBusinessDays(today: string, realizedDays: Set<string>, range: { from?: string; to?: string } = {}) {
  const [year, month] = today.split("-").map(Number);
  return businessDaysOfMonth(year, month).filter(
    (day) =>
      day >= today &&
      !realizedDays.has(day) &&
      (!range.from || day >= range.from) &&
      (!range.to || day <= range.to),
  );
}

// Primeiro e último dia corrido do mês que contém `day`.
export function monthRange(day: string) {
  const [year, month] = day.split("-").map(Number);
  return {
    from: toDayKey(new Date(Date.UTC(year, month - 1, 1))),
    to: toDayKey(new Date(Date.UTC(year, month, 0))),
  };
}
