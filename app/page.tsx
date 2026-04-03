import { BrandMarquee } from "@/components/rinwa/BrandMarquee";
import { ContactForm } from "@/components/rinwa/ContactForm";
import { ExperienceSection } from "@/components/rinwa/ExperienceSection";
import { FeaturedEvent } from "@/components/rinwa/FeaturedEvent";
import { HeroCarousel } from "@/components/rinwa/HeroCarousel";
import { MediaGallery } from "@/components/rinwa/MediaGallery";
import { PastEventsGallery } from "@/components/rinwa/PastEventsGallery";
import { PartnershipDivider } from "@/components/rinwa/PartnershipDivider";
import { SocialPresence } from "@/components/rinwa/SocialPresence";
import { SiteFooter } from "@/components/rinwa/SiteFooter";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RÌNWÁ Hospitality & Experiences",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/icon.svg`,
  description:
    "A culture-first hospitality and experiences brand curating intentional moments for hospitality-led brands, creative founders, and tourism ecosystems.",
  sameAs: [
    "https://instagram.com/rinwahospitality",
    "https://x.com/rinwahospitality",
    "https://tiktok.com/@rinwahospitality",
    "https://youtube.com/@rinwahospitality",
  ],
};

const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Wine & Dine Wednesdays",
  description:
    "Your after-work ritual to unwind, connect and engage with like minds through shared conversations, games and meaningful moments.",
  startDate: "2026-04-08T18:00:00+01:00",
  endDate: "2026-04-08T21:00:00+01:00",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  location: {
    "@type": "Place",
    name: "The Terrace, Lekki Phase 1",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Lekki Phase 1",
      addressRegion: "Lagos",
      addressCountry: "NG",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "RÌNWÁ Hospitality & Experiences",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  },
};

export default function Page() {
  return (
    <main className="bg-[radial-gradient(circle_at_top,rgba(125,211,207,0.12),transparent_28%),linear-gradient(180deg,#07171a_0%,#041114_100%)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />

      <HeroCarousel />
      <BrandMarquee />
      <ExperienceSection />
      <FeaturedEvent />
      <PastEventsGallery />
      <MediaGallery />
      <ContactForm />
      <SocialPresence />
      <PartnershipDivider />
      <SiteFooter />
    </main>
  );
}
