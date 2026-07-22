export type WorkerScheduleWeeklyLike = {
  id?: string;
  workerProfileId?: string;
  dayOfWeek: number;
  startTime?: string | null;
  endTime?: string | null;
  isActive?: boolean;
};

export type NormalizedWorkerScheduleWeekly = {
  id?: string;
  workerProfileId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export type WorkerScheduleExceptionLike = {
  id?: string;
  workerProfileId?: string;
  date: string;
  isDayOff?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

export type NormalizedWorkerScheduleException = {
  id?: string;
  workerProfileId: string;
  date: string;
  isDayOff: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string;
};

export function buildDefaultWeeklySchedule(
  workerProfileId: string
): NormalizedWorkerScheduleWeekly[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    workerProfileId,
    dayOfWeek,
    startTime: '08:00:00',
    endTime: '17:00:00',
    isActive: dayOfWeek !== 0,
  }));
}

export function normalizeWeeklySchedule(
  workerProfileId: string,
  slots: WorkerScheduleWeeklyLike[] | null | undefined
): NormalizedWorkerScheduleWeekly[] {
  const defaults = buildDefaultWeeklySchedule(workerProfileId);
  const byDay = new Map(defaults.map((slot) => [slot.dayOfWeek, slot]));

  for (const slot of slots ?? []) {
    if (!Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
      continue;
    }

    const fallback = byDay.get(slot.dayOfWeek) ?? defaults[slot.dayOfWeek];
    byDay.set(slot.dayOfWeek, {
      id: slot.id,
      workerProfileId: slot.workerProfileId || workerProfileId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime || fallback.startTime,
      endTime: slot.endTime || fallback.endTime,
      isActive: slot.isActive ?? fallback.isActive,
    });
  }

  return Array.from(byDay.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

export function upsertWeeklyScheduleSlot(
  current: NormalizedWorkerScheduleWeekly[],
  slot: NormalizedWorkerScheduleWeekly
): NormalizedWorkerScheduleWeekly[] {
  return normalizeWeeklySchedule(slot.workerProfileId, [
    ...current.filter((item) => item.dayOfWeek !== slot.dayOfWeek),
    slot,
  ]);
}

export function normalizeScheduleExceptions(
  workerProfileId: string,
  exceptions: WorkerScheduleExceptionLike[] | null | undefined
): NormalizedWorkerScheduleException[] {
  return (exceptions ?? [])
    .filter((item) => !!item.date)
    .map((item) => ({
      id: item.id,
      workerProfileId: item.workerProfileId || workerProfileId,
      date: item.date,
      isDayOff: item.isDayOff ?? true,
      startTime: item.startTime ?? null,
      endTime: item.endTime ?? null,
      reason: item.reason ?? undefined,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function normalizeAvailabilityResponse(response: unknown): boolean {
  if (typeof response === 'boolean') return response;
  if (!response || typeof response !== 'object') return false;

  const data = 'data' in response ? (response as { data?: unknown }).data : response;
  if (typeof data === 'boolean') return data;
  if (!data || typeof data !== 'object') return false;

  const record = data as Record<string, unknown>;
  if (typeof record.isAvailable === 'boolean') return record.isAvailable;
  if (typeof record.available === 'boolean') return record.available;

  return false;
}
