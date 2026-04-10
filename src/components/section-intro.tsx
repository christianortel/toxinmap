type SectionIntroProps = {
  eyebrow: string;
  title: string;
  body: string;
  align?: "left" | "split";
};

export function SectionIntro({
  eyebrow,
  title,
  body,
  align = "split",
}: SectionIntroProps) {
  return (
    <div
      className={`mb-10 grid gap-6 ${
        align === "split" ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : ""
      }`}
    >
      <div>
        <p className="eyebrow mb-4">{eyebrow}</p>
        <h2 className="section-title max-w-2xl text-white">{title}</h2>
      </div>
      <p className="body-md max-w-2xl">{body}</p>
    </div>
  );
}
