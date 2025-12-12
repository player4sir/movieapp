
import 'dotenv/config';
import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
    const username = 'admin';
    const password = 'admin123'; // Default password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if admin exists
    const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
    });

    if (existingUser) {
        console.log('Admin user already exists.');

        // Optional: Update password if needed
        // await db.update(users).set({ passwordHash: hashedPassword, role: 'admin' }).where(eq(users.id, existingUser.id));
        // console.log('Admin password updated.');
        return;
    }

    // Generate ID compatible with project (nanoid 12 chars usually)
    const { nanoid } = await import('nanoid');
    const id = nanoid(12);

    await db.insert(users).values({
        id: id,
        username: username,
        passwordHash: hashedPassword,
        nickname: 'System Admin',
        role: 'admin',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        referralCode: 'ADMIN1', // Special referral code
    });

    console.log('Default admin created:');
    console.log('Username: admin');
    console.log('Password: admin123');
}

seedAdmin()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
