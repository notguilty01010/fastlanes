import { requireAdmin } from "@/lib/auth-helpers";
import { MapClient } from "./map-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Карта — FastLanes",
};

export default async function MapPage() {
  await requireAdmin();

  return (
    <>
      <h1>Карта активных грузов</h1>
      <p className="muted">
        Только грузы в статусе <code>created</code>, <code>waiting</code> или{" "}
        <code>in_transit</code> и только последняя точка от любого активного трекера. Опрос каждые
        15 секунд.
      </p>
      <MapClient />
    </>
  );
}
