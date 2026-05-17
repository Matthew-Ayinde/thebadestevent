# RÌNWÁ Admin Console - Setup & Implementation Guide

## Overview

This document guides you through setting up the RÌNWÁ admin console. The infrastructure is 80% complete with all core systems in place. This guide provides step-by-step instructions to complete the remaining implementation.

**Status**: Infrastructure ready, admin UI pages remaining, API routes fully functional

---

## What's Already Done ✅

### Phase 1-5 Completed
- ✅ Dependencies added (NextAuth, Mongoose, Cloudinary, React Hook Form, Zod, etc.)
- ✅ MongoDB connection utility (`lib/mongodb.ts`)
- ✅ All Mongoose models (User, HeroSlide, BrandPartner, Event, MediaItem, ContactSubmission, Settings)
- ✅ Cloudinary integration utilities
- ✅ NextAuth authentication configured (JWT strategy, role-based access)
- ✅ Middleware for route protection
- ✅ **All 14 API endpoints** fully implemented with validation:
  - Hero Slides (GET, POST, PUT, DELETE)
  - Brand Partners (GET, POST, PUT, DELETE with filtering)
  - Events (GET, POST, PUT, DELETE with filters)
  - Media Items (GET, POST, PUT, DELETE)
  - Contact Submissions (GET, POST, DELETE)
  - Settings (GET, PUT)

### Phase 6 Started (Admin UI)
- ✅ Admin login page (`app/admin/login/page.tsx`)
- ✅ Admin layout with SessionProvider (`app/admin/layout.tsx`)
- ✅ Admin sidebar navigation (`components/admin/AdminSidebar.tsx`)
- ✅ Dashboard overview page (`app/admin/page.tsx`)

### Phase 8 Started (Seeding)
- ✅ Seed script template (`scripts/seed.ts`)

---

## What Remains to Complete

### 1. Environment Setup (15 minutes)

Create `.env.local` with your credentials:

```bash
# Copy the template
cp .env.local.example .env.local

# Edit with your values
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
MONGODB_URI=<your-mongo-atlas-connection-string>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<your-gmail-address>
SMTP_PASS=<your-google-app-password>
SMTP_FROM="RÌNWÁ Hospitality <your-gmail-address>"
ADMIN_EMAIL=admin@rinwahospitality.com
ADMIN_PASSWORD=SecurePassword123!
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**How to get values:**
- **NEXTAUTH_SECRET**: Run `openssl rand -base64 32`
- **MongoDB**: Sign up at mongodb.com, create Atlas cluster, get connection string
- **Cloudinary**: Sign up at cloudinary.com, get API credentials from dashboard

### 2. Install Dependencies (5 minutes)

```bash
npm install
```

### 3. Run Seed Script (2 minutes)

Populates MongoDB with initial data from your existing data.ts:

```bash
npm run seed
```

This will:
- Create admin user (use credentials from .env.local)
- Populate hero slides, brand partners, events, media, settings
- Display login credentials on completion

### 4. Complete Admin Management Pages (2-3 hours)

You need to create 6 admin management pages. Each follows the same pattern:

#### Template Pattern for Management Pages

All pages should:
1. Fetch data from API on mount
2. Display in table or grid
3. Have add/edit/delete modals
4. Use React Hook Form + Zod for validation
5. Show loading/error states
6. Toast notifications for feedback

**Pages to Create:**

```
app/admin/hero-slides/page.tsx          - Table with add/edit/delete modals
app/admin/brand-partners/page.tsx       - Grid cards with modal forms
app/admin/events/page.tsx               - Table with filters (city, weekday)
app/admin/media/page.tsx                - Gallery grid with upload
app/admin/submissions/page.tsx          - Table with details drawer
app/admin/settings/page.tsx             - Form to edit global settings
```

**Each page structure:**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
// ... (see detailed page implementations below)
```

#### Detailed Page Implementations

See `/docs/ADMIN_PAGES_IMPLEMENTATION.md` for complete code examples for each page.

### 5. Create Reusable Admin Components (1-2 hours)

**Core shared components to create:**

```
components/admin/AdminButton.tsx        - Button (primary, secondary, danger)
components/admin/AdminInput.tsx         - Text input with label/error
components/admin/AdminSelect.tsx        - Dropdown select
components/admin/AdminTextarea.tsx      - Multi-line text
components/admin/AdminTable.tsx         - Sortable table
components/admin/AdminCard.tsx          - Card wrapper
components/admin/AdminModal.tsx         - Modal dialog
components/admin/AdminDrawer.tsx        - Side panel
components/admin/ConfirmationDialog.tsx - Delete confirmation
components/admin/FileUploader.tsx       - Cloudinary image upload
components/admin/LoadingSpinner.tsx     - Loader indicator
components/admin/AlertBox.tsx           - Info/warning/error boxes
```

**Design System for Components:**

All components must follow this color scheme:
- Background: `#07171a`
- Text: `#f5f0e8`
- Primary (Teal): `#0f766e`
- Accent (Light Teal): `#7dd3cf`
- Borders: `border-white/10`
- Hover: `hover:bg-white/5`, `hover:border-white/20`
- Focus: `focus:shadow-[0_0_0_4px_rgba(125,211,207,0.08)]`

See design guidelines in `/Users/mac/.claude/plans/web-application-proposal-prepared-humble-sifakis.md` for exact Tailwind classes.

### 6. Update Website Components (30 minutes)

Modify components to fetch from API instead of hardcoded data:

```tsx
// components/rinwa/HeroCarousel.tsx
'use client';
import { useEffect, useState } from 'react';

export default function HeroCarousel() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hero-slides')
      .then(res => res.json())
      .then(data => setSlides(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!slides.length) return null;

  return (
    // ... render slides
  );
}
```

**Components to update:**
- `components/rinwa/HeroCarousel.tsx` - fetch from `/api/hero-slides`
- `components/rinwa/BrandMarquee.tsx` - fetch from `/api/brand-partners`
- `components/rinwa/ExperienceSection.tsx` - fetch from `/api/events`
- `components/rinwa/FeaturedEvent.tsx` - fetch featured event from API
- `components/rinwa/PastEventsGallery.tsx` - fetch from `/api/events?isPast=true`
- `components/rinwa/MediaGallery.tsx` - fetch from `/api/media`
- `components/rinwa/ContactForm.tsx` - submit to `/api/submissions`

### 7. Create AdminHook for Data Management (15 minutes)

Optional but recommended - creates reusable data-fetching hooks:

```tsx
// hooks/useAdminData.ts
import { useState, useEffect } from 'react';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(d => setEvents(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { events, loading, error };
}

// Usage in any component:
// const { events, loading, error } = useEvents();
```

---

## Testing Checklist

Before considering complete, verify:

- [ ] Can login with admin credentials at `/admin/login`
- [ ] Dashboard displays stats from MongoDB
- [ ] Can create new hero slide via admin panel
- [ ] New hero slide appears on website within 1 second
- [ ] Can upload image via admin (uses Cloudinary)
- [ ] Can edit/delete any resource
- [ ] Contact form submissions appear in admin panel
- [ ] Can filter events by city/weekday
- [ ] All forms validate inputs properly
- [ ] Error messages display clearly
- [ ] Mobile responsive (test on iPhone/tablet)
- [ ] Session timeout works (30 min inactivity)
- [ ] Logout clears session and redirects to login

---

## File Structure Reference

```
thebadestevent/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts       ✅
│   │   ├── hero-slides/route.ts              ✅
│   │   ├── hero-slides/[id]/route.ts         ✅
│   │   ├── brand-partners/route.ts           ✅
│   │   ├── brand-partners/[id]/route.ts      ✅
│   │   ├── events/route.ts                   ✅
│   │   ├── events/[id]/route.ts              ✅
│   │   ├── media/route.ts                    ✅
│   │   ├── media/[id]/route.ts               ✅
│   │   ├── submissions/route.ts              ✅
│   │   ├── submissions/[id]/route.ts         ✅
│   │   └── settings/route.ts                 ✅
│   ├── admin/
│   │   ├── layout.tsx                        ✅
│   │   ├── page.tsx                          ✅
│   │   ├── login/page.tsx                    ✅
│   │   ├── hero-slides/page.tsx              ⏳
│   │   ├── brand-partners/page.tsx           ⏳
│   │   ├── events/page.tsx                   ⏳
│   │   ├── media/page.tsx                    ⏳
│   │   ├── submissions/page.tsx              ⏳
│   │   └── settings/page.tsx                 ⏳
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── admin/
│   │   ├── AdminSidebar.tsx                  ✅
│   │   ├── AdminButton.tsx                   ⏳
│   │   ├── AdminInput.tsx                    ⏳
│   │   ├── AdminSelect.tsx                   ⏳
│   │   ├── AdminTextarea.tsx                 ⏳
│   │   ├── AdminTable.tsx                    ⏳
│   │   ├── AdminModal.tsx                    ⏳
│   │   ├── AdminDrawer.tsx                   ⏳
│   │   ├── ConfirmationDialog.tsx            ⏳
│   │   ├── FileUploader.tsx                  ⏳
│   │   └── LoadingSpinner.tsx                ⏳
│   └── rinwa/
│       ├── HeroCarousel.tsx                  (needs API update)
│       ├── BrandMarquee.tsx                  (needs API update)
│       ├── ExperienceSection.tsx             (needs API update)
│       ├── FeaturedEvent.tsx                 (needs API update)
│       ├── PastEventsGallery.tsx             (needs API update)
│       ├── MediaGallery.tsx                  (needs API update)
│       ├── ContactForm.tsx                   (needs API update)
│       ├── SocialPresence.tsx
│       ├── PartnershipDivider.tsx
│       ├── SiteFooter.tsx
│       ├── data.ts
│       └── use-autoplay-index.ts
├── models/                                   ✅
│   ├── User.ts
│   ├── HeroSlide.ts
│   ├── BrandPartner.ts
│   ├── Event.ts
│   ├── MediaItem.ts
│   ├── ContactSubmission.ts
│   └── Settings.ts
├── lib/                                      ✅
│   ├── mongodb.ts
│   └── cloudinary.ts
├── scripts/                                  ✅
│   └── seed.ts
├── auth.ts                                   ✅
├── middleware.ts                             ✅
├── package.json                              ✅
├── .env.local                                (create from .env.local.example)
└── .env.local.example                        ✅

✅ = Complete
⏳ = Needs implementation
```

---

## Quick Start (After Setup)

```bash
# 1. Install packages
npm install

# 2. Create .env.local with your credentials
cp .env.local.example .env.local
# Edit .env.local with actual values

# 3. Run dev server
npm run dev

# 4. In another terminal, run seed
npm run seed

# 5. Open browser
# Admin: http://localhost:3000/admin/login
# Website: http://localhost:3000
```

---

## API Documentation

All endpoints documented in plan: `/Users/mac/.claude/plans/web-application-proposal-prepared-humble-sifakis.md`

**Quick Reference:**

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/hero-slides` | GET | Public | Get all hero slides |
| `/api/hero-slides` | POST | Admin | Create new hero slide |
| `/api/hero-slides/[id]` | PUT | Admin | Update hero slide |
| `/api/hero-slides/[id]` | DELETE | Admin | Delete hero slide |
| `/api/events` | GET | Public | Get all events (supports filters) |
| `/api/events` | POST | Admin | Create new event |
| `/api/submissions` | POST | Public | Submit contact form |
| `/api/submissions` | GET | Admin | Get all submissions |
| `/api/settings` | GET | Public | Get global settings |
| `/api/settings` | PUT | Admin | Update settings |

---

## Troubleshooting

**MongoDB Connection Error:**
- Verify connection string in .env.local
- Check MongoDB Atlas IP whitelist includes your IP

**Cloudinary Upload Fails:**
- Verify API credentials are correct
- Check CLOUDINARY_CLOUD_NAME matches your account

**NextAuth Session Issues:**
- Ensure NEXTAUTH_SECRET is set (run `openssl rand -base64 32`)
- Check NEXTAUTH_URL matches your domain

**Admin pages 404:**
- Run `npm run build` to check for TypeScript errors
- Verify file paths match exactly

---

## Next Steps for Implementation

1. Set up environment variables
2. Install dependencies
3. Run seed script
4. Create 6 admin management pages (use plan as reference)
5. Create 11 shared admin components
6. Update 7 website components to fetch from API
7. Test all functionality
8. Deploy to production

**Estimated time to complete**: 4-6 hours

For detailed code examples for each remaining page/component, refer to the comprehensive prompt in `/Users/mac/.claude/plans/web-application-proposal-prepared-humble-sifakis.md` under "AI AGENT IMPLEMENTATION PROMPT" section.
