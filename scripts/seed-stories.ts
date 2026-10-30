// Seeds sample "Came Home" stories for previewing the /feedback wall.
//   npm run seed:stories            add the samples (replacing earlier samples)
//   npm run seed:stories -- --remove  delete the samples only
// Samples are marked with status 'seed'; real submissions are never touched.
import { connectDB } from '@/lib/mongodb';
import { HomecomingStory, WALL_SIZE } from '@/models/HomecomingStory';

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80`;

const SAMPLES = [
  {
    creditAs: 'Full name', name: 'Adaeze Okafor', movedFrom: 'Toronto, Canada', yearReturned: 2024,
    photoUrl: photo('1531123897727-8f129e1688ce'), instagram: 'adaeze.okafor', wantsTag: true,
    story: "After eleven winters in Toronto I knew it was time. My mum was getting older, and I wanted my kids to know their grandparents properly, not through a phone screen. The first six months were harder than anyone admits: the paperwork, the schools, learning to drive in Lagos traffic again. But Sunday lunches at my mum's make every bit of it worth it.",
    landingThoughts: 'The heat hit me first, then the noise, and then I cried in the arrivals hall.',
    wishedHelpWith: 'Finding a good school for my kids mid-term.', wishPrepared: 'How long it takes to get a bank account sorted.',
  },
  {
    creditAs: 'Nickname', name: 'Tunde B.', movedFrom: 'London, UK', yearReturned: 2022,
    photoUrl: photo('1507003211169-0a1dd7228f2d'), twitter: 'tundeb', wantsTag: true,
    story: 'I moved back to start a logistics business. Everyone warned me about power and traffic. Nobody warned me how much of business here runs on relationships. Two years in, the business is growing and I finally feel like I belong to a place again.',
    landingThoughts: 'Okay. No more excuses. Let’s build.',
  },
  {
    creditAs: 'Anonymous', movedFrom: 'Houston, USA', yearReturned: 2023,
    story: "I left at nineteen and came back at thirty-four. My Yoruba was rusty and my cousins laughed at my accent for weeks. I came home to care for my dad after his surgery and somehow never left. Some days I miss the order of life in Houston, but I don't miss feeling like a visitor everywhere I went.",
    landingThoughts: 'Will they still recognise me?',
  },
  {
    creditAs: 'Full name', name: 'Chiamaka Eze', movedFrom: 'Dubai, UAE', yearReturned: 2021,
    photoUrl: photo('1494790108377-be9c29b29330'), instagram: 'chiamaka.eze', wantsTag: false,
    story: 'Dubai was comfortable, but it was never home. I came back to open a small bakery in Enugu with my sister. We started with one oven and a WhatsApp order list. Now we supply three cafés. Coming home was the scariest and best decision of my life.',
    landingThoughts: 'The smell of rain on red earth. I had forgotten it.',
  },
  {
    creditAs: 'Full name', name: 'Emeka Nwosu', movedFrom: 'Berlin, Germany', yearReturned: 2025,
    photoUrl: photo('1500648767791-00dcc994a43e'), linkedin: 'emekanwosu',
    story: 'I worked in tech in Berlin for eight years. I came back to build a team here because the talent is incredible and too many people still have to leave to be seen. I wish someone had told me how different hiring would be, but the energy here is unmatched.',
    landingThoughts: 'Home, finally. Now the real work starts.',
    wishPrepared: 'How much of daily life depends on having a reliable driver.',
  },
  {
    creditAs: 'Nickname', name: 'Bisi', movedFrom: 'Manchester, UK', yearReturned: 2019,
    story: "I came home for a two-week holiday and stayed. I'd been burned out for years and didn't realise it until I spent a fortnight surrounded by family who fed me, teased me and made me rest. I handed in my notice over email from my aunt's living room.",
    landingThoughts: 'Why did I wait so long?',
  },
  {
    creditAs: 'Full name', name: 'Folake Adeyemi', movedFrom: 'Atlanta, USA', yearReturned: 2024,
    photoUrl: photo('1534528741775-53994a69daeb'), instagram: 'folake.adeyemi', wantsTag: true,
    story: "My husband and I moved back with our two boys. The boys adjusted faster than we did: within a month they had more friends on our street than I'd had in five years in Atlanta. The hardest part was finding our people as adults. It took time, but we're getting there.",
    landingThoughts: 'Please let this be the right choice for the boys.',
    wishedHelpWith: 'Meeting other families who had just moved back.',
  },
  {
    creditAs: 'Full name', name: 'Kunle Ajayi', movedFrom: 'Johannesburg, South Africa', yearReturned: 2020,
    photoUrl: photo('1506794778202-cad84cf45f1d'),
    story: 'I came back during the pandemic, which was strange timing. Everything was closed and I spent the first three months mostly at home with my parents. Looking back, it was a gift. We had more time together than we had in fifteen years.',
    landingThoughts: 'Masks everywhere, but still, the welcome felt warm.',
  },
  {
    creditAs: 'Anonymous', movedFrom: 'Paris, France', yearReturned: 2023,
    story: "I'm a designer and I came home to work closer to the craftspeople who inspire me. The fabrics, the colours, the markets: I'd been referencing them from far away for years. Now I'm here, learning from tailors who have been doing this for decades.",
    landingThoughts: 'All this colour. I want to paint every street.',
  },
  {
    creditAs: 'Nickname', name: 'Zee', movedFrom: 'Toronto, Canada', yearReturned: 2026,
    story: "I've been home three months. Honestly, it's been a rollercoaster. Some days I'm sure I made the right call, other days I'm sitting in traffic wondering what I was thinking. But I'm writing this from a rooftop in Lekki at sunset, and right now, I'm glad I came.",
    landingThoughts: 'Is it too late to change my mind? (It wasn’t. I stayed.)',
    wishPrepared: 'That the first three months would feel like starting over.',
  },
];

async function main() {
  await connectDB();

  const removed = await HomecomingStory.deleteMany({ status: 'seed' });
  console.log(`Removed ${removed.deletedCount} earlier sample stories`);
  if (process.argv.includes('--remove')) return;

  // Only fill free wall spots, so real featured stories are never pushed off.
  const featuredNow = await HomecomingStory.countDocuments({ featured: true });
  const freeSpots = Math.max(0, WALL_SIZE - featuredNow);
  const now = Date.now();

  const docs = SAMPLES.map((s, i) => {
    const featured = i < freeSpots;
    return {
      ...s,
      contentConsent: true,
      status: 'seed',
      featured,
      // Stagger so the first sample shows first on the wall.
      featuredAt: featured ? new Date(now - i * 60_000) : undefined,
    };
  });
  await HomecomingStory.insertMany(docs);

  console.log(`Added ${docs.length} sample stories; ${Math.min(freeSpots, docs.length)} featured on the wall (${featuredNow} were already featured)`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
