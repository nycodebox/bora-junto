// Business-hours SLA calculator: Mon-Fri, 08:00-18:00 BRT (UTC-3), 24 business hours total.

const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18;
const SLA_BUSINESS_HOURS = 24;

function toBrtDate(utcMs: number): Date {
  return new Date(utcMs + BRT_OFFSET_MS);
}

function isBusinessDay(brtDate: Date): boolean {
  const day = brtDate.getUTCDay();
  return day >= 1 && day <= 5;
}

/**
 * Adds `hours` of business time (Mon-Fri 08:00-18:00 BRT) and returns UTC ISO string.
 */
export function computeBusinessSlaDeadlineIso(
  startMs: number = Date.now(),
  businessHours: number = SLA_BUSINESS_HOURS
): string {
  let remainingMinutes = businessHours * 60;
  let cursorUtc = startMs;

  while (remainingMinutes > 0) {
    const brt = toBrtDate(cursorUtc);
    if (!isBusinessDay(brt)) {
      // Jump to next day 08:00 BRT
      const nextDayBrt = Date.UTC(
        brt.getUTCFullYear(),
        brt.getUTCMonth(),
        brt.getUTCDate() + 1,
        WORK_START_HOUR,
        0,
        0
      );
      cursorUtc = nextDayBrt - BRT_OFFSET_MS;
      continue;
    }

    const hour = brt.getUTCHours();
    const minute = brt.getUTCMinutes();
    const currentMinOfDay = hour * 60 + minute;
    const startMin = WORK_START_HOUR * 60;
    const endMin = WORK_END_HOUR * 60;

    if (currentMinOfDay < startMin) {
      const targetBrt = Date.UTC(
        brt.getUTCFullYear(),
        brt.getUTCMonth(),
        brt.getUTCDate(),
        WORK_START_HOUR,
        0,
        0
      );
      cursorUtc = targetBrt - BRT_OFFSET_MS;
      continue;
    }

    if (currentMinOfDay >= endMin) {
      const nextDayBrt = Date.UTC(
        brt.getUTCFullYear(),
        brt.getUTCMonth(),
        brt.getUTCDate() + 1,
        WORK_START_HOUR,
        0,
        0
      );
      cursorUtc = nextDayBrt - BRT_OFFSET_MS;
      continue;
    }

    const availableTodayMin = endMin - currentMinOfDay;
    if (remainingMinutes <= availableTodayMin) {
      cursorUtc += remainingMinutes * 60 * 1000;
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableTodayMin;
      const nextDayBrt = Date.UTC(
        brt.getUTCFullYear(),
        brt.getUTCMonth(),
        brt.getUTCDate() + 1,
        WORK_START_HOUR,
        0,
        0
      );
      cursorUtc = nextDayBrt - BRT_OFFSET_MS;
    }
  }

  return new Date(cursorUtc).toISOString();
}

export function formatSlaDeadlineBrt(isoString: string): {
  formattedDate: string;
  isOverdue: boolean;
} {
  const deadlineMs = Date.parse(isoString);
  if (Number.isNaN(deadlineMs)) {
    return { formattedDate: 'Em até 24h úteis', isOverdue: false };
  }
  const brt = toBrtDate(deadlineMs);
  const dd = brt.getUTCDate().toString().padStart(2, '0');
  const mm = (brt.getUTCMonth() + 1).toString().padStart(2, '0');
  const hh = brt.getUTCHours().toString().padStart(2, '0');
  const min = brt.getUTCMinutes().toString().padStart(2, '0');
  return {
    formattedDate: `${dd}/${mm} às ${hh}:${min} BRT`,
    isOverdue: Date.now() > deadlineMs,
  };
}
