"use client";

import Image from "next/image";
import useSiteContent from "src/app/components/cms/useSiteContent";

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function Hero() {
  const { content } = useSiteContent();
  const logoWidth = toNumber(content.branding.logoWidth, 240);
  const logoHeight = toNumber(content.branding.logoHeight, 120);
  const logoOffsetX = toNumber(content.heroLayout.logoOffsetX, 0);
  const logoOffsetY = toNumber(content.heroLayout.logoOffsetY, 0);
  const titleOffsetX = toNumber(content.heroLayout.titleOffsetX, 0);
  const titleOffsetY = toNumber(content.heroLayout.titleOffsetY, 0);
  const subtitleOffsetY = toNumber(content.heroLayout.subtitleOffsetY, 0);
  const ctaOffsetY = toNumber(content.heroLayout.ctaOffsetY, 0);

  return (
    <section className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "var(--kk-primary)" }}>
      <div className="w-full max-w-5xl text-center">
        <p className="text-lg md:text-2xl mb-4" style={{ color: "var(--kk-on-primary)" }}>{content.home.pretitle}</p>

        <div className="flex items-center justify-center gap-3 md:gap-4">
          <Image
            src={content.branding.logoUrl || "/kunstkwartiertje-logo.png"}
            alt="logo"
            width={logoWidth}
            height={logoHeight}
            className="object-contain"
            style={{
              width: `${logoWidth}px`,
              height: `${logoHeight}px`,
              transform: `translate(${logoOffsetX}px, ${logoOffsetY}px)`,
            }}
          />
          <h1 className="text-2xl md:text-5xl font-bold tracking-wide" style={{ color: "var(--kk-on-primary)", transform: `translate(${titleOffsetX}px, ${titleOffsetY}px)` }}>
            {content.home.title}
          </h1>
        </div>

        <p className="mt-6 text-sm md:text-lg max-w-md md:max-w-2xl mx-auto" style={{ color: "var(--kk-on-primary)", opacity: 0.86, transform: `translateY(${subtitleOffsetY}px)` }}>
          {content.home.subtitle}
        </p>

        <a
          href={content.home.ctaHref || "/register"}
          className="mt-8 md:mt-10 inline-block w-full md:w-auto px-6 md:px-10 py-3 md:py-4 text-sm md:text-lg hover:opacity-90 transition text-center"
          style={{
            backgroundColor: "var(--kk-accent)",
            color: "var(--kk-on-accent)",
            borderRadius: "var(--kk-radius)",
            transform: `translateY(${ctaOffsetY}px)`,
          }}
        >
          {content.home.ctaLabel}
        </a>
      </div>
    </section>
  );
}
