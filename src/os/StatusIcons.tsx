import { useEffect, useState } from "react";

type BatteryManager = EventTarget & { level: number; charging: boolean };

/** The device's real battery level where the browser exposes it (Chromium). */
export function useBattery() {
  const [battery, setBattery] = useState<{
    level: number;
    charging: boolean;
  } | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryManager>;
    };
    if (!nav.getBattery) return;
    let manager: BatteryManager | null = null;
    const update = () =>
      manager &&
      setBattery({ level: manager.level, charging: manager.charging });
    nav
      .getBattery()
      .then((value) => {
        manager = value;
        update();
        value.addEventListener("levelchange", update);
        value.addEventListener("chargingchange", update);
      })
      .catch(() => undefined);
    return () => {
      manager?.removeEventListener("levelchange", update);
      manager?.removeEventListener("chargingchange", update);
    };
  }, []);
  return battery;
}

export function Signal() {
  return (
    <svg className="si-signal" viewBox="0 0 18 12" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 4.6}
          y={9 - i * 3}
          width="3.2"
          height={3 + i * 3}
          rx="0.9"
        />
      ))}
    </svg>
  );
}

export function Wifi() {
  return (
    <svg className="si-wifi" viewBox="0 0 16 12" aria-hidden="true">
      <path d="M8 11.4 5.6 9a3.4 3.4 0 0 1 4.8 0L8 11.4Z" />
      <path d="M3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0L3.4 6.8Z" />
      <path d="M1.1 4.5a9.8 9.8 0 0 1 13.8 0L13.5 5.9a7.8 7.8 0 0 0-11 0L1.1 4.5Z" />
    </svg>
  );
}

export function Battery({ showPercent = false }: { showPercent?: boolean }) {
  const battery = useBattery();
  const level = battery ? Math.round(battery.level * 100) : 100;
  return (
    <span
      className="si-battery"
      role={battery ? "img" : undefined}
      aria-label={battery ? `Battery ${level}%` : undefined}
      aria-hidden={battery ? undefined : true}
    >
      {showPercent && battery && <span className="si-pct">{level}%</span>}
      <span className="si-cell">
        <i
          style={{ width: level + "%" }}
          className={
            battery?.charging ? "is-charging" : level <= 20 ? "is-low" : ""
          }
        />
      </span>
    </span>
  );
}
