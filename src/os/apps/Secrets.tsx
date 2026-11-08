import { SECRETS, useSecrets } from "../secrets";

/** The treasure-hunt checklist: what you've found, and a hint for the rest. */
export default function Secrets() {
  const { found } = useSecrets();
  return (
    <div className="secrets">
      <p className="secrets-count">
        <b>
          {found.length}/{SECRETS.length}
        </b>{" "}
        secrets found
      </p>
      <progress value={found.length} max={SECRETS.length} />
      <ul>
        {SECRETS.map((s) => {
          const got = found.includes(s.id);
          return (
            <li key={s.id} className={got ? "is-found" : ""}>
              <span aria-hidden="true">{got ? "🏆" : "🔒"}</span>
              <span>
                <b>{got ? s.title : "Locked"}</b>
                <small>{s.hint}</small>
              </span>
            </li>
          );
        })}
      </ul>
      {found.length === SECRETS.length && (
        <p className="secrets-done">
          All of them. You'd be great at code review. Tell Josiah you won 🎉
        </p>
      )}
    </div>
  );
}
