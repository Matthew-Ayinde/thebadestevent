import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';

async function main() {
  const email = 'ayindematthew2003@gmail.com';
  const password = 'Password#12';
  const name = 'Matthew Ayinde';

  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      existing.password = password;
      existing.name = name;
      existing.role = 'admin';
      await existing.save();
      console.log(`✓ Existing user updated as admin: ${email}`);
    } else {
      await User.create({ email, password, name, role: 'admin' });
      console.log(`✓ Admin user created: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
