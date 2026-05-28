import type { ReactNode } from "react";

type SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function Section({ title, description, children }: SectionProps) {
  return (
    <section className="rounded-lg border border-shop bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-bark">{title}</h2>
        {description ? <p className="text-base text-barkSoft">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
