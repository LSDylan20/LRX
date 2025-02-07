import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './adapters/redis.adapter';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('WebSocket Service');
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  
  // Setup Redis adapter for WebSocket scaling
  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  
  logger.log(`WebSocket service is running on port ${port}`);
}

bootstrap();
