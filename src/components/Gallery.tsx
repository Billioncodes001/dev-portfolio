import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Expand, X } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { assetUrl, ContactBanner, PageIntro } from "./UI";

export default function Gallery() {
  const { gallery } = usePortfolio();
  const [selected, setSelected] = useState<(typeof gallery)[number] | null>(
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!selected) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  return (
    <>
      <PageIntro
        label="Gallery / A visual journal"
        title="A closer look."
        accent="In pictures."
      >
        <p>
          Portraits and interface studies from my portfolio.
          <br />A different way to explore the person and the work.
        </p>
      </PageIntro>
      <section
        className="container gallery-grid"
        aria-label="Portfolio gallery"
      >
        {gallery.map((item, index) => (
          <figure
            className={
              "gallery-item " + (index === 0 ? "gallery-portrait" : "")
            }
            key={item.id}
          >
            <button
              className="gallery-image"
              onClick={() => setSelected(item)}
              aria-label={"Enlarge " + item.title}
              aria-haspopup="dialog"
            >
              <img
                src={assetUrl(item.image)}
                alt={item.alt}
                loading={index === 0 ? "eager" : "lazy"}
              />
              <span className="gallery-expand" aria-hidden="true">
                <Expand size={18} />
              </span>
            </button>
            <figcaption>
              <p className="eyebrow">{item.category}</p>
              <h2>{item.title}</h2>
              <p>{item.caption}</p>
            </figcaption>
          </figure>
        ))}
        {!gallery.length && (
          <p>New photographs and project images will appear here.</p>
        )}
      </section>
      <section className="container gallery-context">
        <p className="eyebrow">Beyond the pictures</p>
        <h2>
          Engineering, <em>and public service.</em>
        </h2>
        <p>
          Explore my professional experience and the student advocacy that runs
          alongside it.
        </p>
        <Link className="text-link" to="/experience#leadership">
          Read the story <ArrowRight size={17} />
        </Link>
      </section>
      <dialog
        ref={dialog}
        className="gallery-dialog"
        aria-labelledby="gallery-dialog-title"
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <button
              className="icon-button gallery-close"
              onClick={() => setSelected(null)}
              aria-label="Close image"
              autoFocus
            >
              <X size={22} />
            </button>
            <img src={assetUrl(selected.image)} alt={selected.alt} />
            <div className="gallery-dialog-caption">
              <p className="eyebrow">{selected.category}</p>
              <h2 id="gallery-dialog-title">{selected.title}</h2>
              <p>{selected.caption}</p>
            </div>
          </>
        )}
      </dialog>
      <ContactBanner />
    </>
  );
}
