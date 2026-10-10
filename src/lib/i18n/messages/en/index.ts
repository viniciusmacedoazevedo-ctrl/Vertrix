import type { Messages } from "../index";
import { auth, common, errors, landing, nav, onboarding, options } from "./part1";
import { activity, customers, dashboard, opportunities, tasks } from "./part2";
import { assistant, booking, reports, scheduling } from "./part3";
import { legal, settings } from "./part4";

export const en: Messages = {
  common, errors, landing, auth, onboarding, nav, options, dashboard, activity, customers,
  opportunities, tasks, scheduling, booking, assistant, reports, settings, legal,
};
