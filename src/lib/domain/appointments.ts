export const APPOINTMENT_STATUSES = ["scheduled", "confirmed", "completed", "cancelled", "no_show"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  scheduled: ["confirmed", "completed", "cancelled", "no_show"],
  confirmed: ["scheduled", "completed", "cancelled", "no_show"],
  completed: ["confirmed"],
  no_show: ["confirmed"],
  cancelled: [],
};

export function allowedTransitions(status: AppointmentStatus): readonly AppointmentStatus[] {
  return TRANSITIONS[status];
}

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Statuses that occupy the professional's time. */
export function isBlocking(status: AppointmentStatus): boolean {
  return status !== "cancelled";
}

export function isEditable(status: AppointmentStatus): boolean {
  return status === "scheduled" || status === "confirmed";
}
