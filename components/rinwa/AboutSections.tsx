import Image from "next/image";

export function AboutSections() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm uppercase tracking-[0.28em] text-teal-100/75">
          About
        </p>
        <h2 className="mt-4 font-serif text-4xl text-white">
          Our Story & Founder
        </h2>
        <p className="mt-4 text-lg leading-7 text-white/80">
          An Ottawa-based travel-events management brand that provides
          full-service event planning, day-of coordination, venue sourcing,
          vendor management, and decor services. We plan & host private, social
          and corporate events.
        </p>
      </div>

      <div className="mt-16 space-y-12">
        {/* Our Story Card */}
        <article className="grid gap-8 rounded-3xl border border-white/8 bg-[#041114]/50 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:p-12">
          <div className="flex flex-col justify-center lg:order-2">
            <h3 className="font-semibold text-3xl text-white">Our Story</h3>
            <p className="mt-6 text-white/85 leading-8">
              Fueled by her own homesickness and a desire to nurture a warm,
              supportive and inclusive community for international students in
              Ottawa, Badé discovered her passion for hospitality and event
              planning. In December 2013, she organized her first event,
              welcoming and hosting a group of 10 international students.
            </p>

            <p className="mt-5 text-white/75 leading-8">
              Building on the success of this event, Badé continued to host
              yearly events, establishing her home as a central hub for
              connecting, supporting and celebrating international students in
              Ottawa.
            </p>

            <p className="mt-5 text-white/70 leading-8">
              In August 2022, Badé Obasa founded The Badést Experience to
              redefine event hospitality by curating high-quality event
              experiences that foster social wellness in Ottawa's Black
              community.
            </p>
          </div>

          <div className="flex items-start lg:order-1">
            <div className="w-full overflow-hidden rounded-2xl">
              <Image
                src="/images/picture.avif"
                alt="Our story"
                width={520}
                height={400}
                priority
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </article>

        {/* About Founder Card */}
        <article className="grid gap-8 rounded-3xl border border-white/8 bg-[#041114]/50 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:p-12">
          <div className="flex items-start">
            <div className="w-full overflow-hidden rounded-2xl">
              <Image
                src="/images/picture.avif"
                alt="Founder"
                width={520}
                height={400}
                className="h-auto w-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <h3 className="font-semibold text-3xl text-white">About Founder</h3>
            <p className="mt-6 text-white/85 leading-8">
              Badé is a cross-cultural experience strategist working across
              Nigeria and Canada. Her work sits at the intersection of
              hospitality, human behavior, and organizational culture. With over
              a decade of experience across events, human resources, and
              community systems. Badé doesn’t just bring people together- she
              designs environment that intentionally shapes how connections is
              made.
            </p>

            <p className="mt-5 text-white/75 leading-8">
              What started as a response to uncertainty became clarity, purpose,
              direction and impact. She realized she wasn’t building something
              temporary instead she was building a path rooted in her strengths,
              her lived experience, and her understanding of human needs. To
              her, a meaningful experience is not just something you attend , it
              is something you feel. Something that stays with you.
            </p>

            <p className="mt-5 text-white/70 leading-8">
              Her work has been recognized across Ottawa, with nominations for
              "Best Event Planner" and "Best Event Planning Company" at the 2023
              Ottawa Awards, highlighting her commitment to community-centered
              hospitality and exceptional experiences.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

export default AboutSections;
