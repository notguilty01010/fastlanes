import { requireAdmin } from "@/lib/auth-helpers";
import { AdminNav } from "./admin-nav";

export const metadata = {
  title: "Адмінка — FastLanes",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <>
      <AdminNav email={session.user.email} />
      <main>{children}</main>
    </>
  );
}
