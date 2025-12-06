import { DataSource } from 'typeorm';
import { Package } from '../../packages/entities/package.entity';
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

async function seedPackages() {
  console.log('🌱 Starting packages seeding...');

  try {
    // Initialize DataSource
    await seedDataSource.initialize();

    const packageRepository = seedDataSource.getRepository(Package);

    // Check if packages already exist
    const existingPackages = await packageRepository.count();
    if (existingPackages > 0) {
      console.log(`⚠️  Packages already exist (${existingPackages} found). Skipping seeding.`);
      await seedDataSource.destroy();
      return;
    }

    // Define packages to seed
    const packagesData = [
      {
        name: 'Basic Plan',
        description: 'Perfect for individuals getting started with WhatsApp messaging',
        messagesLimit: 1000,
        charactersLimit: 50000,
        durationDays: 30,
        price: 9.99,
        currency: 'USD',
        isActive: true,
      },
      {
        name: 'Professional Plan',
        description: 'Ideal for small businesses and growing teams',
        messagesLimit: 5000,
        charactersLimit: 250000,
        durationDays: 30,
        price: 29.99,
        currency: 'USD',
        isActive: true,
      },
      {
        name: 'Enterprise Plan',
        description: 'For large organizations with high messaging volumes',
        messagesLimit: 20000,
        charactersLimit: 1000000,
        durationDays: 30,
        price: 99.99,
        currency: 'USD',
        isActive: true,
      },
      {
        name: 'Starter Weekly',
        description: 'Weekly plan for testing and small projects',
        messagesLimit: 500,
        charactersLimit: 25000,
        durationDays: 7,
        price: 4.99,
        currency: 'USD',
        isActive: true,
      },
      {
        name: 'Premium Quarterly',
        description: '3-month plan with best value for regular users',
        messagesLimit: 15000,
        charactersLimit: 750000,
        durationDays: 90,
        price: 79.99,
        currency: 'USD',
        isActive: true,
      },
    ];

    // Create and save packages
    const packages = packageRepository.create(packagesData);
    await packageRepository.save(packages);

    console.log(`✅ Successfully seeded ${packages.length} packages:`);
    packages.forEach((pkg) => {
      console.log(`   - ${pkg.name}: $${pkg.price} (${pkg.messagesLimit} messages, ${pkg.durationDays} days)`);
    });

    await seedDataSource.destroy();
    console.log('✅ Packages seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding packages:', error);
    if (seedDataSource.isInitialized) {
      await seedDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the seed function
seedPackages();

