import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PermissionsService } from './auth/permissions/permissions.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Seed permissions on startup
  try {
    const permissionsService = app.get(PermissionsService);
    await permissionsService.seedPermissions();
  } catch (error) {
    console.error('❌ Error seeding permissions:', error.message);
  }

  // Enable CORS - Allow all origins with credentials support
  app.enableCors({
    origin: (origin, callback) => {
      // Allow all origins - return the origin if provided, or allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Return the specific origin to allow credentials
      callback(null, origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Get port from environment variable or use default
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  
  // Validate port number
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT environment variable: ${process.env.PORT}`);
  }

  await app.listen(port, '0.0.0.0'); // Listen on all interfaces for Docker
  console.log(`🚀 Server is running on http://0.0.0.0:${port}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();
