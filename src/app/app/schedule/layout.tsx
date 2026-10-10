import { notFound } from "next/navigation";
import { canManage, getAppContext, hasModule } from "@/lib/auth/context";
import { ScheduleTabs } from "@/components/schedule/schedule-tabs";

export default async function ScheduleLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  if (!hasModule(ctx.org, "scheduling")) notFound();
  return (
    <>
      <ScheduleTabs canManage={canManage(ctx)} />
      {children}
    </>
  );
}
