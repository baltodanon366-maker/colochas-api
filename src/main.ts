import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Configurar zona horaria de Nicaragua (UTC-6)
  process.env.TZ = 'America/Managua';
  
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS
  // Si NGROK_URL está configurado, permitir cualquier origen (para desarrollo con ngrok)
  // En producción, usar CORS_ORIGIN específico
  // En desarrollo, permitir múltiples orígenes comunes
  let corsOrigin: string | string[] | boolean;
  
  if (process.env.NGROK_URL) {
    // Permitir cualquier origen cuando se usa ngrok
    corsOrigin = true;
  } else if (process.env.NODE_ENV === 'development') {
    // En desarrollo, permitir múltiples orígenes comunes
    corsOrigin = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8081', // Expo web
      'http://localhost:19006', // Expo web alternativo
      process.env.CORS_ORIGIN || '',
    ].filter(Boolean); // Eliminar strings vacíos
  } else {
    // En producción, usar CORS_ORIGIN específico
    corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  }
  
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Interceptor global para formato de respuesta estándar
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Filtro global para manejo de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Sistema de Control de Rifas API')
    .setDescription('API REST para el control de inventario de rifas diarias')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
