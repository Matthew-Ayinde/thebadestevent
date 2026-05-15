import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { HeroSlide } from '@/models/HeroSlide';
import { BrandPartner } from '@/models/BrandPartner';
import { Event } from '@/models/Event';
import { MediaItem } from '@/models/MediaItem';
import { Settings } from '@/models/Settings';
import type { HeroSlide as HeroSlideData, BrandItem, WeekdayEvent, PastEvent, GalleryItem } from '@/components/rinwa/data';
import { heroSlides, brandPartners, weekdayEvents, pastEvents, galleryItems } from '@/components/rinwa/data';

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

    await User.create({
      email: adminEmail,
      password: adminPassword,
      name: 'RÌNWÁ Admin',
      role: 'admin',
    });
    console.log(`✓ Admin user created: ${adminEmail}`);

    // Seed Hero Slides
    console.log('Seeding hero slides...');
    const heroSlidesData = (heroSlides as HeroSlideData[]).map((slide, index) => ({
      imageUrl: slide.type === 'video' ? slide.poster : slide.src,
      videoUrl: slide.type === 'video' ? slide.src : undefined,
      title: slide.headline,
      description: slide.alt,
      order: index,
      isActive: true,
    }));
    await HeroSlide.insertMany(heroSlidesData);
    console.log(`✓ ${heroSlidesData.length} hero slides created`);

    // Seed Brand Partners
    console.log('Seeding brand partners...');
    const partnersData = (brandPartners as BrandItem[]).map((partner, index) => {
      const regionMap: Record<string, 'Lagos' | 'Canada' | 'Hospitality' | 'Other'> = {
        'Lagos': 'Lagos',
        'Canada': 'Canada',
        'Hospitality': 'Hospitality',
        'Experiences': 'Other',
      };
      return {
        name: partner.label,
        logoUrl: `https://via.placeholder.com/200?text=${encodeURIComponent(partner.label)}`,
        region: regionMap[partner.region] || 'Other',
        order: index,
        isActive: true,
      };
    });
    await BrandPartner.insertMany(partnersData);
    console.log(`✓ ${partnersData.length} brand partners created`);

    // Seed Events (from pastEvents as archived events)
    console.log('Seeding events...');
    const typeMap: Record<string, 'Dining' | 'Community' | 'Nightlife' | 'Creative' | 'Wellness'> = {
      'Hospitality / Dining': 'Dining',
      'Community': 'Community',
      'Nightlife': 'Nightlife',
      'Creative Strategy': 'Creative',
      'Gathering': 'Community',
    };
    const eventsData = (pastEvents as PastEvent[]).map((event, index) => ({
      name: event.title,
      description: event.category,
      city: 'Lagos' as const,
      weekday: 'Wednesday' as const,
      date: 'Upcoming',
      time: '6pm - 9pm',
      location: 'RÌNWÁ Venue',
      rsvpLink: 'https://example.com/rsvp',
      imageUrl: event.src,
      eventType: typeMap[event.category] || 'Dining',
      isFeatured: index === 0,
      isPast: true,
      order: index,
    }));
    await Event.insertMany(eventsData);
    console.log(`✓ ${eventsData.length} events created`);

    // Seed Media Items
    console.log('Seeding media items...');
    const mediaData = (galleryItems as GalleryItem[]).map((item, index) => ({
      imageUrl: item.src,
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
