import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS - Allow all origins
  app.enableCors({
    origin: true, // Allow all origins
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
