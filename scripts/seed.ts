import { connectDB } from './lib/mongodb';
import { User } from './models/User';
import { HeroSlide } from './models/HeroSlide';
import { BrandPartner } from './models/BrandPartner';
import { Event } from './models/Event';
import { MediaItem } from './models/MediaItem';
import { Settings } from './models/Settings';
import { heroSlides, brandPartners, weekdayEvents, pastEvents, galleryItems } from './components/rinwa/data';

async function main() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      HeroSlide.deleteMany({}),
      BrandPartner.deleteMany({}),
      Event.deleteMany({}),
      MediaItem.deleteMany({}),
      Settings.deleteMany({}),
    ]);

    // Create admin user
    console.log('Creating admin user...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@rinwahospitality.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

    const adminUser = await User.create({
      email: adminEmail,
      password: adminPassword,
      name: 'RÌNWÁ Admin',
      role: 'admin',
    });
    console.log(`✓ Admin user created: ${adminUser.email}`);

    // Seed Hero Slides
    console.log('Seeding hero slides...');
    const heroSlidesData = heroSlides.map((slide, index) => ({
      imageUrl: slide.imageUrl,
      videoUrl: slide.videoUrl,
      title: slide.title,
      description: slide.description,
      order: index,
      isActive: true,
    }));
    await HeroSlide.insertMany(heroSlidesData);
    console.log(`✓ ${heroSlidesData.length} hero slides created`);

    // Seed Brand Partners
    console.log('Seeding brand partners...');
    const partnersData = brandPartners.map((partner, index) => ({
      name: partner.name,
      logoUrl: partner.logoUrl,
      region: partner.region,
      link: partner.link,
      order: index,
      isActive: true,
    }));
    await BrandPartner.insertMany(partnersData);
    console.log(`✓ ${partnersData.length} brand partners created`);

    // Seed Events (combine weekday and past events)
    console.log('Seeding events...');
    const weekdayEventsData = weekdayEvents.map((event, index) => ({
      name: event.name,
      description: event.description,
      city: event.city,
      weekday: event.weekday,
      date: event.date,
      time: event.time,
      location: event.location,
      rsvpLink: event.rsvpLink,
      imageUrl: event.imageUrl,
      eventType: event.eventType,
      isFeatured: event.isFeatured || false,
      isPast: false,
      order: index,
    }));

    const pastEventsData = pastEvents.map((event, index) => ({
      name: event.name,
      description: event.description,
      city: event.city,
      weekday: event.weekday,
      date: event.date,
      time: event.time,
      location: event.location,
      rsvpLink: event.rsvpLink,
      imageUrl: event.imageUrl,
      eventType: event.eventType,
      isFeatured: false,
      isPast: true,
      order: index,
    }));

    await Event.insertMany([...weekdayEventsData, ...pastEventsData]);
    console.log(`✓ ${weekdayEventsData.length + pastEventsData.length} events created`);

    // Seed Media Items
    console.log('Seeding media items...');
    const mediaData = galleryItems.map((item, index) => ({
      imageUrl: item.imageUrl,
      caption: item.caption,
      order: index,
      isActive: true,
    }));
    await MediaItem.insertMany(mediaData);
    console.log(`✓ ${mediaData.length} media items created`);

    // Create Settings
    console.log('Creating settings...');
    await Settings.create({
      partnershipEmail: 'rinwahospitality@gmail.com',
      tagline: 'Come here, you\'ve arrived home',
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    });
    console.log('✓ Settings created');

    console.log('\n✨ Seed completed successfully!');
    console.log(`\nLogin with:`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
