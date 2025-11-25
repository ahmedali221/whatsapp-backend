import { DataSource } from 'typeorm';
import { Package } from '../../packages/entities/package.entity';
import { config } from 'dotenv';

config();

async function bootstrap() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Package],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const packageRepo = dataSource.getRepository(Package);

    const packages = [
      {
        name: 'Basic Plan',
        description: 'Perfect for individuals getting started with WhatsApp automation',
        messagesLimit: 1000,
        charactersLimit: 50000,
        durationDays: 7,
        price: 99.99,
        currency: 'EGP',
        isActive: true,
      },
      {
        name: 'Professional Plan',
        description: 'Ideal for small businesses with moderate messaging needs',
        messagesLimit: 5000,
        charactersLimit: 250000,
        durationDays: 30,
        price: 299.99,
        currency: 'EGP',
        isActive: true,
      },
      {
        name: 'Enterprise Plan',
        description: 'For large businesses with high-volume messaging requirements',
        messagesLimit: 20000,
        charactersLimit: 1000000,
        durationDays: 90,
        price: 799.99,
        currency: 'EGP',
        isActive: true,
      },
    ];

    const existing = await packageRepo.count();
    if (existing > 0) {
      console.log('⚠️  Packages already exist. Skipping seed.');
      await dataSource.destroy();
      return;
    }

    const created = packageRepo.create(packages);
    await packageRepo.save(created);
    console.log(`✅ Successfully seeded ${created.length} packages:`);
    created.forEach((pkg) => {
      console.log(`   - ${pkg.name}: ${pkg.price} ${pkg.currency} (${pkg.durationDays} days)`);
    });
  } catch (error) {
    console.error('❌ Error seeding packages:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

bootstrap()
  .then(() => {
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
