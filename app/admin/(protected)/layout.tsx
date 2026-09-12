import { AdminNav } from "@/components/admin/admin-nav";
import { DemoBanner } from "@/components/admin/demo-banner";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="min-h-screen bg-[#efede7]"><AdminNav /><div className="lg:pl-60">{isDemoMode && <DemoBanner />}{children}</div></div>;
}
