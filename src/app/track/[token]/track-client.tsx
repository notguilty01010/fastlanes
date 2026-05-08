"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SendStatus = "idle" | "sending" | "ok" | "error" | "offline";

type Buffered = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  capturedAt: string;
};

const BUFFER_KEY = (token: string) => `fl_track_buffer_${token}`;
// Минимальный интервал между отправками (сервер всё равно держит rate limit ~1/5с,
// мы накидываем сверху, чтобы не жечь батарею).
const MIN_SEND_INTERVAL_MS = 10_000;

function readBuffer(token: string): Buffered[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BUFFER_KEY(token));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBuffer(token: string, items: Buffered[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BUFFER_KEY(token), JSON.stringify(items.slice(-200)));
  } catch {
    // localStorage может быть выключен — это ок, просто не буферим.
  }
}

async function postPoint(token: string, point: Buffered): Promise<boolean> {
  try {
    const res = await fetch(`/api/track/${token}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(point),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function TrackClient({ token }: { token: string }) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<SendStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{ lat: number; lon: number; at: number } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastSentAtRef = useRef<number>(0);

  const flushBuffer = useCallback(async () => {
    const buffered = readBuffer(token);
    if (buffered.length === 0) return;
    const remaining: Buffered[] = [];
    for (const p of buffered) {
      const ok = await postPoint(token, p);
      if (!ok) remaining.push(p);
    }
    writeBuffer(token, remaining);
  }, [token]);

  const handlePosition = useCallback(
    async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSentAtRef.current < MIN_SEND_INTERVAL_MS) return;
      lastSentAtRef.current = now;

      const point: Buffered = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        speed: pos.coords.speed != null && Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
        capturedAt: new Date(pos.timestamp || now).toISOString(),
      };

      setLast({ lat: point.latitude, lon: point.longitude, at: now });

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const buf = readBuffer(token);
        buf.push(point);
        writeBuffer(token, buf);
        setStatus("offline");
        return;
      }

      setStatus("sending");
      // Сначала пытаемся досылать буфер, иначе свежие точки могут уйти раньше старых.
      await flushBuffer();
      const ok = await postPoint(token, point);
      if (ok) {
        setStatus("ok");
        setError(null);
      } else {
        const buf = readBuffer(token);
        buf.push(point);
        writeBuffer(token, buf);
        setStatus("error");
      }
    },
    [token, flushBuffer],
  );

  const handleError = useCallback((err: GeolocationPositionError) => {
    setStatus("error");
    if (err.code === err.PERMISSION_DENIED) {
      setError("Доступ к геолокации запрещён. Разреши его в настройках браузера и перезайди на страницу.");
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      setError("Геолокация недоступна (нет GPS / сигнала).");
    } else if (err.code === err.TIMEOUT) {
      setError("Геолокация не отвечает (timeout).");
    } else {
      setError("Не удалось получить координаты.");
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setError("Геолокация не поддерживается браузером.");
      return;
    }

    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // wake lock не критичен
    }

    const id = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 30_000,
    });
    watchIdRef.current = id;
    setRunning(true);
    setStatus("sending");
  }, [handlePosition, handleError]);

  const stop = useCallback(() => {
    if (watchIdRef.current != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    setRunning(false);
    setStatus("idle");
  }, []);

  // Досыл буфера при возврате сети.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      flushBuffer().catch(() => {});
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushBuffer]);

  // На всякий случай останавливаем watch при выгрузке.
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  const statusLabel: Record<SendStatus, string> = {
    idle: "не активен",
    sending: "отправка…",
    ok: "координаты уходят",
    error: "ошибка отправки",
    offline: "нет сети — координаты в буфере",
  };

  return (
    <div className="track-controls">
      {!running ? (
        <button type="button" className="btn track-btn-primary" onClick={start}>
          Начать передачу геолокации
        </button>
      ) : (
        <button type="button" className="btn btn-secondary track-btn-primary" onClick={stop}>
          Остановить
        </button>
      )}

      <div className="track-status">
        <span className={`track-status-dot track-status-${status}`} aria-hidden />
        <span>{statusLabel[status]}</span>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {last ? (
        <p className="muted track-last">
          Последняя точка: {last.lat.toFixed(5)}, {last.lon.toFixed(5)} ·{" "}
          {new Date(last.at).toLocaleTimeString()}
        </p>
      ) : null}

      <p className="muted" style={{ fontSize: "0.85rem" }}>
        Не закрывай вкладку, пока ведёшь груз. На некоторых устройствах геолокация в фоне
        приостанавливается операционкой — поэтому экран мы пытаемся держать активным.
      </p>
    </div>
  );
}
