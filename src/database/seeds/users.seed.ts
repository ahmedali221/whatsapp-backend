import { DataSource } from 'typeorm';
import { User, Role } from '../../auth/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import * as path from 'path';

config();

// Create DataSource with proper entity paths for ts-node
// When running on host (not in Docker), use localhost and external port
// When running in Docker, use 'postgres' as host
const dbHost = process.env.DB_HOST === 'postgres' && !process.env.RUNNING_IN_DOCKER 
  ? 'localhost' 
  : (process.env.DB_HOST || 'localhost');
const dbPort = process.env.DB_HOST === 'postgres' && !process.env.RUNNING_IN_DOCKER
  ? Number(process.env.DB_EXTERNAL_PORT) || 5434
  : Number(process.env.DB_PORT) || 5432;

const seedDataSource = new DataSource({
  type: 'postgres',
  host: dbHost,
  port: dbPort,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'wa_project_db',
  entities: [
    path.join(__dirname, '../../packages/entities/*.entity{.ts,.js}'),
    path.join(__dirname, '../../auth/entities/*.entity{.ts,.js}'),
  ],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function seedUsers() {
  console.log('🌱 Starting users seeding...');

  try {
    // Initialize DataSource
    await seedDataSource.initialize();

    const userRepository = seedDataSource.getRepository(User);

    // Default password for all seeded users (change this in production!)
    const defaultPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Define users to seed
    const usersData = [
      {
        name: 'Elias Melki',
        email: 'elias.melki@gmail.com',
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        phoneNumber: null,
      },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: Role.ADMIN,
        phoneNumber: '+1234567890',
      },
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: hashedPassword,
        role: Role.USER,
        phoneNumber: '+1987654321',
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: hashedPassword,
        role: Role.USER,
        phoneNumber: '+1555555555',
      },
      {
        name: 'Test Admin',
        email: 'testadmin@example.com',
        password: hashedPassword,
        role: Role.ADMIN,
        phoneNumber: null,
      },
    ];

    // Check which users already exist
    const existingEmails: string[] = [];
    for (const userData of usersData) {
      const existing = await userRepository.findOne({
        where: { email: userData.email },
      });
      if (existing) {
        existingEmails.push(userData.email);
      }
    }

    if (existingEmails.length > 0) {
      console.log(`⚠️  Some users already exist: ${existingEmails.join(', ')}`);
      console.log('   Skipping existing users and creating new ones...');
    }

    // Filter out existing users and create new ones
    const newUsersData = usersData.filter(
      (userData) => !existingEmails.includes(userData.email)
    );

    if (newUsersData.length === 0) {
      console.log('⚠️  All users already exist. Skipping seeding.');
      await seedDataSource.destroy();
      return;
    }

    // Create and save users
    const users = userRepository.create(newUsersData);
    await userRepository.save(users);

    console.log(`✅ Successfully seeded ${users.length} users:`);
    users.forEach((user) => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    if (existingEmails.length > 0) {
      console.log(`\n⚠️  Note: ${existingEmails.length} user(s) were skipped (already exist)`);
    }

    console.log(`\n🔑 Default password for all seeded users: ${defaultPassword}`);
    console.log('   ⚠️  Please change passwords after first login!');

    await seedDataSource.destroy();
    console.log('✅ Users seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    if (seedDataSource.isInitialized) {
      await seedDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the seed function
seedUsers();

