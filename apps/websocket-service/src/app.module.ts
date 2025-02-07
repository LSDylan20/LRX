import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoadGateway } from './gateways/load.gateway';
import { NegotiationGateway } from './gateways/negotiation.gateway';
import { MarketGateway } from './gateways/market.gateway';
import { VoiceGateway } from './gateways/voice.gateway';
import { WebSocketMonitoringService } from './services/monitoring.service';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    RedisModule,
  ],
  providers: [
    LoadGateway,
    NegotiationGateway,
    MarketGateway,
    VoiceGateway,
    WebSocketMonitoringService,
  ],
})
export class AppModule {}
