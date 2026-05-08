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
      <h1>Карта активних вантажів</h1>
      <p className="muted">
        Тільки вантажі у статусі <code>created</code>, <code>waiting</code> або{" "}
        <code>in_transit</code> та лише остання точка від будь-якого активного трекера. Опитування
        кожні 15 секунд.
      </p>
      <MapClient />
    </>
  );
}
