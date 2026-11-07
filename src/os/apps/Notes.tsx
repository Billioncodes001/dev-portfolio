import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { usePortfolio } from "../../hooks/usePortfolio";
import { Markdown } from "../../components/UI";

type Note = {
  id: string;
  title: string;
  meta: string;
  preview: string;
  body: ReactNode;
};

const clip = (text: string) =>
  text
    .replace(/[*_#>`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

/** My story as a notebook: bio, leadership, roles, toolkit, education. */
export default function Notes() {
  const data = usePortfolio();
  const notes = useMemo<Note[]>(() => {
    const list: Note[] = [
      {
        id: "about",
        title: "About me",
        meta: "Pinned",
        preview: clip(data.about.about),
        body: <Markdown>{data.about.about}</Markdown>,
      },
    ];
    for (const item of data.leadership)
      list.push({
        id: "lead-" + item.title,
        title: item.title,
        meta: item.period,
        preview: item.organization,
        body: (
          <>
            <p className="notes-sub">
              {item.organization} · {item.period}
            </p>
            <p>{item.description}</p>
            <ul>
              {item.sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href} target="_blank" rel="noreferrer">
                    {source.text}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ),
      });
    for (const role of data.experiences)
      list.push({
        id: "role-" + role.title + role.dateText,
        title: role.title,
        meta: role.dateText,
        preview: role.subtitle,
        body: (
          <>
            <p className="notes-sub">
              {role.subtitle} · {role.dateText}
            </p>
            <ul>
              {role.workDescription.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ),
      });
    if (data.skills.length)
      list.push({
        id: "toolkit",
        title: "Toolkit",
        meta: data.skills.length + " groups",
        preview: data.skills.map((group) => group.title).join(", "),
        body: (
          <>
            {data.skills.map((group) => (
              <section key={group.title}>
                <h4>{group.title}</h4>
                <p>{group.items.map((item) => item.title).join(" · ")}</p>
              </section>
            ))}
          </>
        ),
      });
    for (const school of data.education)
      list.push({
        id: "edu-" + school.title,
        title: school.cardTitle,
        meta: school.title,
        preview: school.cardSubtitle,
        body: (
          <>
            <p className="notes-sub">
              {school.cardSubtitle} · {school.title}
            </p>
            <p>{school.cardDetailedText}</p>
          </>
        ),
      });
    return list;
  }, [data]);
  const [active, setActive] = useState<string | null>(null);
  const note = notes.find((item) => item.id === active);

  return (
    <div className={"notes" + (note ? " has-note" : "")}>
      <aside className="notes-list" aria-label="Notes">
        <h3>Notes</h3>
        <ul>
          {notes.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={item.id === (note?.id ?? notes[0].id) ? "is-on" : ""}
                aria-current={item.id === note?.id || undefined}
                onClick={() => setActive(item.id)}
              >
                <b>{item.title}</b>
                <span>
                  <i>{item.meta}</i> {item.preview}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <article className="notes-body">
        <button
          type="button"
          className="notes-back"
          onClick={() => setActive(null)}
        >
          <ChevronLeft size={18} /> Notes
        </button>
        <h2>{(note ?? notes[0]).title}</h2>
        {(note ?? notes[0]).body}
      </article>
    </div>
  );
}
