export type HeroSlide = {
  type: "image" | "video";
  src: string;
  poster: string;
  alt: string;
  eyebrow: string;
  headline: string;
};

export type BrandItem = {
  label: string;
  region: string;
};

export type CityOption = {
  city: string;
  note: string;
  date: string;
  region: string;
};

export type WeekdayEvent = {
  day: string;
  title: string;
  detail: string;
};

export type PastEvent = {
  title: string;
  category: string;
  year: string;
  mediaType: "image" | "video";
  src: string;
  poster: string;
  alt: string;
  span?: string;
};

export type GalleryItem = {
  title: string;
  caption: string;
  kind: "image" | "video";
  src: string;
  poster: string;
  alt: string;
};

export const heroSlides: HeroSlide[] = [
  {
    type: "video",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1600&q=80",
    alt: "A cinematic hospitality scene with warm ambient motion.",
    eyebrow: "Lived-in luxury",
    headline: "A room that holds the mood before the first conversation.",
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1800&q=80",
    poster: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1800&q=80",
    alt: "Guests arriving at a refined social gathering.",
    eyebrow: "Hospitality-led ritual",
    headline: "Come here, you’ve arrived home.",
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=80",
    poster: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=80",
    alt: "Editorial table setting and atmospheric details.",
    eyebrow: "Culture in motion",
    headline: "A space for connection, culture, and curated moments.",
  },
];

export const brandPartners: BrandItem[] = [
  { label: "The Terrace", region: "Lagos" },
  { label: "TIIC Summit", region: "Canada" },
  { label: "Immigrant Entrepreneur Canada", region: "Canada" },
  { label: "Dare To Be Vulnerable Project", region: "Canada" },
  { label: "Ode Hotel", region: "Hospitality" },
  { label: "Ole Cocktails", region: "Hospitality" },
  { label: "Maison & Table", region: "Experiences" },
  { label: "The After Hours Table", region: "Experiences" },
];

export const cityOptions: CityOption[] = [
  {
    city: "Lagos",
    note: "Gatherings rooted in warmth, nightlife, and modern hospitality.",
    date: "Wednesdays & weekends",
    region: "West Africa",
  },
  {
    city: "Toronto",
    note: "Brand moments for diaspora communities and founders.",
    date: "Select Saturdays",
    region: "North America",
  },
  {
    city: "Vancouver",
    note: "Intimate experiences designed around food, design, and connection.",
    date: "Seasonal series",
    region: "North America",
  },
  {
    city: "Remote",
    note: "Digital-to-live concepts for distributed communities.",
    date: "By invitation",
    region: "Global",
  },
];

export const weekdayEvents: WeekdayEvent[] = [
  { day: "Monday", title: "Reset Sessions", detail: "Quiet strategy meetups for brands and founders." },
  { day: "Wednesday", title: "Wine & Dine Wednesdays", detail: "Shared conversation, games, and soft connection." },
  { day: "Friday", title: "After Hours Table", detail: "A slower, styled close to the week." },
  { day: "Sunday", title: "The Soft Landing", detail: "Wellness-led gatherings and reflective brunches." },
];

export const pastEvents: PastEvent[] = [
  {
    title: "Golden Table Dinner",
    category: "Hospitality / Dining",
    year: "2025",
    mediaType: "image",
    src: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=80",
    poster: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=80",
    alt: "An intimate dinner table with warm light and glassware.",
    span: "lg:col-span-2",
  },
  {
    title: "Conversation Room",
    category: "Community",
    year: "2025",
    mediaType: "video",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
    alt: "A softly moving ambient clip with refined atmosphere.",
  },
  {
    title: "Lekki After Hours",
    category: "Nightlife",
    year: "2024",
    mediaType: "image",
    src: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    poster: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    alt: "Moody hospitality interior with elegant lighting.",
  },
  {
    title: "Founder Supper",
    category: "Creative Strategy",
    year: "2024",
    mediaType: "image",
    src: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    poster: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    alt: "Editorial dining visuals with an atmospheric center table.",
  },
  {
    title: "Brunch of Belonging",
    category: "Gathering",
    year: "2024",
    mediaType: "video",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=1200&q=80",
    alt: "Short moving clip for a branded social gathering.",
  },
];

export const galleryItems: GalleryItem[] = [
  {
    title: "The Arrival",
    caption: "Guests crossing into the room.",
    kind: "image",
    src: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?auto=format&fit=crop&w=1400&q=80",
    poster: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?auto=format&fit=crop&w=1400&q=80",
    alt: "Guests arriving at an elegant hospitality event.",
  },
  {
    title: "Scent + Sound",
    caption: "Soft motion captured in a short loop.",
    kind: "video",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80",
    alt: "A looping short video for mood and atmosphere.",
  },
  {
    title: "Late Table",
    caption: "Candlelight and conversation.",
    kind: "image",
    src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80",
    poster: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80",
    alt: "Refined plated dining setup.",
  },
  {
    title: "After Hours",
    caption: "The room after the room.",
    kind: "image",
    src: "https://images.unsplash.com/photo-1525268323446-0554f9f0d05f?auto=format&fit=crop&w=1400&q=80",
    poster: "https://images.unsplash.com/photo-1525268323446-0554f9f0d05f?auto=format&fit=crop&w=1400&q=80",
    alt: "Elegant social ambiance in a dark luxury palette.",
  },
  {
    title: "A Living Brief",
    caption: "Video details with quiet movement.",
    kind: "video",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=80",
    alt: "Short atmospheric clip for the media gallery.",
  },
  {
    title: "Closing Note",
    caption: "The final pour.",
    kind: "image",
    src: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1400&q=80",
    poster: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1400&q=80",
    alt: "A closing hospitality portrait with warm tones.",
  },
];

export const contactIndustries = [
  "Food & Beverage",
  "Corporate",
  "Hospitality",
  "Travel/Tourism",
  "Fashion/Lifestyle",
  "Entertainment",
  "Media",
  "Other",
];

export const contactGoals = [
  "Brand Visibility",
  "Community Building",
  "Revenue",
  "Guest Experience",
  "Partnerships",
];
