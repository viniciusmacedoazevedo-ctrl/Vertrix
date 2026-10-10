"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { formToObject, toErrorState, type ActionState } from "@/lib/actions";
import {
  appointmentSchema, appointmentStatusSchema, bookingSettingsSchema, professionalSchema, serviceSchema, timeOffSchema, workingHoursSchema,
} from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/fields";
import {
  addTimeOff, deleteTimeOff, replaceWorkingHours, saveProfessional, saveService,
} from "@/lib/services/scheduling/catalog";
import { createAppointment, setAppointmentStatus, updateAppointment } from "@/lib/services/scheduling/appointments";
import { updateBookingSettings } from "@/lib/services/organizations";

function done() {
  revalidatePath("/app", "layout");
}

export async function saveServiceAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await saveService(ctx, id ? uuid.parse(id) : null, serviceSchema.parse(formToObject(formData)));
  } catch (error) {
    return toErrorState(error, ctx.t, "scheduling.service_failed");
  }
  done();
  redirect("/app/schedule/services");
}

export async function saveProfessionalAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  let savedId: string;
  try {
    ({ id: savedId } = await saveProfessional(ctx, id ? uuid.parse(id) : null, professionalSchema.parse(formToObject(formData, ["serviceIds"]))));
  } catch (error) {
    return toErrorState(error, ctx.t, "scheduling.professional_failed");
  }
  done();
  if (!id) redirect(`/app/schedule/professionals/${savedId}?created=1`);
  return { status: "success", message: ctx.t.scheduling.professionals.saved };
}

export async function saveWorkingHoursAction(professionalId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    const raw = formData.get("hours");
    const rows = workingHoursSchema.parse(JSON.parse(typeof raw === "string" ? raw : "[]"));
    await replaceWorkingHours(ctx, uuid.parse(professionalId), rows);
  } catch (error) {
    if (error instanceof SyntaxError) return { status: "error", message: ctx.t.errors.codes.validation };
    return toErrorState(error, ctx.t, "scheduling.hours_failed");
  }
  done();
  return { status: "success", message: ctx.t.scheduling.professionals.hoursSaved };
}

export async function addTimeOffAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await addTimeOff(ctx, timeOffSchema.parse(formToObject(formData)));
  } catch (error) {
    return toErrorState(error, ctx.t, "scheduling.time_off_failed");
  }
  done();
  return { status: "success", message: ctx.t.scheduling.professionals.timeOffSaved };
}

export async function deleteTimeOffAction(id: string): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await deleteTimeOff(ctx, uuid.parse(id));
  } catch (error) {
    return toErrorState(error, ctx.t, "scheduling.time_off_delete_failed");
  }
  done();
  return { status: "success" };
}

export async function createAppointmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  let id: string;
  try {
    ({ id } = await createAppointment(ctx, appointmentSchema.parse(formToObject(formData))));
  } catch (error) {
    return toErrorState(error, ctx.t, "scheduling.appointment_create_failed");
  }
  done();
  redirect(`/app/schedule/appointments/${id}?created=1`);
}

export async function updateAppointmentAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await updateAppointment(ctx, uuid.parse(id), appointmentSchema.parse(formToObject(formData)));
  } catch (error) {
    return toErrorState(error, ctx.t, "scheduling.appointment_update_failed");
  }
  done();
  redirect(`/app/schedule/appointments/${id}?updated=1`);
}

export async function setAppointmentStatusAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    const input = appointmentStatusSchema.parse(formToObject(formData));
    await setAppointmentStatus(ctx, uuid.parse(id), input.status, input.cancellationReason);
  } catch (error) {
    return toErrorState(error, ctx.t, "scheduling.appointment_status_failed");
  }
  done();
  return { status: "success", message: ctx.t.scheduling.appointment.updatedNotice };
}

export async function saveBookingSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await updateBookingSettings(ctx, bookingSettingsSchema.parse(formToObject(formData)));
  } catch (error) {
    return toErrorState(error, ctx.t, "scheduling.booking_settings_failed");
  }
  done();
  return { status: "success", message: ctx.t.scheduling.booking.saved };
}
