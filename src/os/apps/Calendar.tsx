import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const weekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

/** A month view of my availability: weekdays are open for calls. */
export default function Calendar({ open }: { open: (path: string) => void }) {
  const today = new Date();
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  // Open on the next bookable weekday, so the button starts enabled.
  const [picked, setPicked] = useState(() => {
    const day = new Date(today.toDateString());
    while (weekend(day)) day.setDate(day.getDate() + 1);
    return day;
  });
  const first = month.getDay();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      month.getFullYear(),
      month.getMonth(),
      index - first + 1,
    );
    return { date, inMonth: date.getMonth() === month.getMonth() };
  });
  const past = picked < new Date(today.toDateString());
  const label = picked.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const shift = (by: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));

  return (
    <div className="cal">
      <header className="cal-head">
        <h3>
          {month.toLocaleDateString([], { month: "long" })}{" "}
          <span>{month.getFullYear()}</span>
        </h3>
        <div>
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="cal-today"
            onClick={() => {
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setPicked(today);
            }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>
      <div className="cal-grid" role="group" aria-label="Choose a day">
        {DAYS.map((day, index) => (
          <span key={index} className="cal-dow" aria-hidden="true">
            {day}
          </span>
        ))}
        {cells.map(({ date, inMonth }) => {
          const isToday = sameDay(date, today);
          const isPicked = sameDay(date, picked);
          const free = !weekend(date) && date >= new Date(today.toDateString());
          return (
            <button
              type="button"
              key={date.toISOString()}
              className={
                "cal-day" +
                (inMonth ? "" : " is-out") +
                (isToday ? " is-today" : "") +
                (isPicked ? " is-picked" : "")
              }
              aria-label={
                date.toDateString() + (free ? ", open for calls" : "")
              }
              aria-pressed={isPicked}
              onClick={() => setPicked(date)}
            >
              {date.getDate()}
              {free && inMonth && <i aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <section className="cal-detail" aria-live="polite">
        <p className="cal-date">{label}</p>
        {past ? (
          <p className="cal-empty">That day has passed.</p>
        ) : weekend(picked) ? (
          <p className="cal-empty">No events. Weekends are offline.</p>
        ) : (
          <div className="cal-event">
            <b>Open for a call</b>
            <span>10:00 – 17:00 WAT · Google Meet or phone</span>
          </div>
        )}
        <button
          type="button"
          className="cal-book"
          disabled={past || weekend(picked)}
          onClick={() => open("/contact?meeting=" + encodeURIComponent(label))}
        >
          <Plus size={16} /> Book a meeting
        </button>
      </section>
    </div>
  );
}
