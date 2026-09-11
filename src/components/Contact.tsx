import { useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  LoaderCircle,
  Mail,
} from "lucide-react";
import { contactSchema, type ContactInput } from "../../shared/schema";
import { usePortfolio } from "../hooks/usePortfolio";
import { PageIntro, SocialLinks } from "./UI";

const empty: ContactInput = {
  name: "",
  email: "",
  service: "Web development",
  message: "",
  website: "",
};
const services = [
  "Web development",
  "Backend & APIs",
  "Collaboration",
  "Something else",
] as const;
export default function Contact() {
  const portfolio = usePortfolio();
  const email =
    portfolio.social
      .find((item) => item.network === "email")
      ?.href.replace("mailto:", "") || "jhardeyemor@gmail.com";
  const [form, setForm] = useState<ContactInput>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const request = useRef<{ body: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const formElement = useRef<HTMLFormElement>(null);

  const update = (key: keyof ContactInput, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const fields = Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      );
      setErrors(fields);
      formElement.current
        ?.querySelector<HTMLElement>(
          '[name="' + String(parsed.error.issues[0].path[0]) + '"]',
        )
        ?.focus();
      return;
    }
    const body = JSON.stringify(parsed.data);
    if (!request.current || request.current.body !== body)
      request.current = { body, key: crypto.randomUUID() };
    inFlight.current = true;
    setStatus("sending");
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": request.current.key,
        },
        body,
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || !result.accepted)
        throw new Error(
          result.error || "Your message could not be saved. Please try again.",
        );
      setStatus("success");
      setForm(empty);
      request.current = null;
    } catch (cause) {
      setStatus("error");
      setError(
        cause instanceof Error && cause.name !== "AbortError"
          ? cause.message
          : "The connection timed out. Try again or email me directly.",
      );
    } finally {
      window.clearTimeout(timeout);
      inFlight.current = false;
    }
  }
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      setCopied(false);
      setError(
        "Copy is unavailable in this browser. You can select the email address or open your mail app.",
      );
    }
  }
  return (
    <>
      <PageIntro
        label="Let's talk"
        title="Every good thing starts"
        accent="somewhere."
      >
        <p>
          Tell me what you're thinking. A new product, an interesting
          <br />
          challenge, or a chance to work together.
        </p>
      </PageIntro>
      <section className="container contact-layout">
        <aside className="contact-aside">
          <div className="contact-note">
            <span className="tiny-dot" />A conversation, not a commitment.
          </div>
          <h2>
            Let's build
            <br />
            <em>something good.</em>
          </h2>
          <p>
            Share a little about your idea and what you need. Thoughtful
            collaborations are always worth a conversation.
          </p>
          <div className="email-block">
            <p className="eyebrow">Prefer a direct line?</p>
            <a href={"mailto:" + email}>
              {email}
              <ArrowUpRight size={17} />
            </a>
            <button onClick={copyEmail} className="text-link">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Email copied" : "Copy email address"}
            </button>
            <span className="sr-only" role="status">
              {copied ? "Email address copied to clipboard" : ""}
            </span>
          </div>
          <SocialLinks />
          <span className="contact-star" aria-hidden="true">
            ✳
          </span>
        </aside>
        {status === "success" ? (
          <div className="contact-success" role="status">
            <CheckCircle2 size={44} strokeWidth={1.4} />
            <p className="eyebrow">Message received</p>
            <h2>
              Thanks for
              <br />
              <em>reaching out.</em>
            </h2>
            <p>
              Your message has been saved. I appreciate you taking the time to
              share your idea.
            </p>
            <button
              className="button primary"
              onClick={() => setStatus("idle")}
            >
              Send another message <ArrowUpRight size={17} />
            </button>
          </div>
        ) : (
          <form
            className="contact-form"
            ref={formElement}
            onSubmit={submit}
            noValidate
          >
            <fieldset disabled={status === "sending"}>
              <legend className="sr-only">Send Josiah a message</legend>
              <div className="form-row">
                <label>
                  Your name <span>*</span>
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder="How should I call you?"
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    required
                  />
                  {errors.name && (
                    <span className="field-error" id="name-error">
                      {errors.name}
                    </span>
                  )}
                </label>
                <label>
                  Email address <span>*</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    maxLength={254}
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    required
                  />
                  {errors.email && (
                    <span className="field-error" id="email-error">
                      {errors.email}
                    </span>
                  )}
                </label>
              </div>
              <fieldset className="service-options">
                <legend>What can I help with?</legend>
                <div>
                  {services.map((service) => (
                    <label
                      key={service}
                      className={form.service === service ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="service"
                        value={service}
                        checked={form.service === service}
                        onChange={() => update("service", service)}
                      />
                      {service}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                A little about your idea <span>*</span>
                <textarea
                  name="message"
                  placeholder="The idea, the challenge, the big picture. I'm listening."
                  rows={6}
                  maxLength={5000}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={
                    errors.message
                      ? "message-error message-count"
                      : "message-count"
                  }
                  required
                />
                <span className="message-meta">
                  {errors.message ? (
                    <span className="field-error" id="message-error">
                      {errors.message}
                    </span>
                  ) : (
                    <span>At least 20 characters</span>
                  )}
                  <span id="message-count">{form.message.length} / 5,000</span>
                </span>
              </label>
              <div className="honeypot" aria-hidden="true">
                <label>
                  Website
                  <input
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                  />
                </label>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-submit">
                <p>
                  <Mail size={15} />
                  Your details stay private.
                  <br />
                  Only used to respond to your message.
                </p>
                <button
                  className="button primary"
                  type="submit"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? (
                    <>
                      Sending... <LoaderCircle className="spin" size={17} />
                    </>
                  ) : (
                    <>
                      Send message <ArrowUpRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </section>
    </>
  );
}
