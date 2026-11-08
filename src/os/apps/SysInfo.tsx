import { useEffect } from "react";
import { unlock } from "../secrets";
import { usePortfolio } from "../../hooks/usePortfolio";
import { assetUrl } from "../../components/UI";

/** "About this machine", where the machine is me. */
export default function SysInfo({ open }: { open: (path: string) => void }) {
  const data = usePortfolio();
  useEffect(() => unlock("sysinfo"), []);
  const rows: [string, string][] = [
    ["Engineer", data.home.name],
    ["Chip", "Curiosity, Lagos-tuned"],
    ["Memory", `${data.projects.length} projects`],
    ["Roles", data.home.roles.map((r) => r.replace(/^an? /, "")).join(", ")],
    [
      "Startup disk",
      data.github
        ? `GitHub · ${data.github.repositories} public repos`
        : "GitHub",
    ],
    ["Serial number", "josiahadeyemo.me"],
  ];
  return (
    <div className="sysinfo">
      <img src={assetUrl(data.about.imageSource)} alt="" />
      <h3>JA/OS</h3>
      <p className="sysinfo-ver">Version 2.0 (Lagos)</p>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={() => open("/about")}>
        More Info…
      </button>
      <p className="sysinfo-legal">
        © {new Date().getFullYear()} Comr. Josiah Adeyemo
      </p>
    </div>
  );
}
