import { DataSource } from 'typeorm';
import { User, Role } from '../../auth/entities/user.entity';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

config();

async function bootstrap() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [User],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const userRepo = dataSource.getRepository(User);

    // Default password for all seeded users
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const users = [
      {
        name: 'Super Admin',
        email: 'superadmin@example.com',
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
      },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: Role.ADMIN,
      },
      {
        name: 'Regular User',
        email: 'user@example.com',
        password: hashedPassword,
        role: Role.USER,
      },
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: hashedPassword,
        role: Role.USER,
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: hashedPassword,
        role: Role.USER,
      },
    ];

    // Check for existing users and only create new ones
    const existingEmails = await userRepo
      .createQueryBuilder('user')
      .select('user.email')
      .where('user.email IN (:...emails)', {
        emails: users.map((u) => u.email),
      })
      .getMany();

    const existingEmailSet = new Set(existingEmails.map((u) => u.email));
    const newUsers = users.filter((u) => !existingEmailSet.has(u.email));

    if (newUsers.length === 0) {
      console.log('⚠️  All users already exist. Skipping seed.');
      await dataSource.destroy();
      return;
    }

    const created = userRepo.create(newUsers);
    await userRepo.save(created);

    console.log(`✅ Successfully seeded ${created.length} users:`);
    created.forEach((user) => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    console.log(`\n📝 Default password for all users: ${defaultPassword}`);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
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


