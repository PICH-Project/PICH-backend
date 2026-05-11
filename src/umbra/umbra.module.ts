import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UmbraService } from './umbra.service';

@Module({
  imports: [ConfigModule],
  providers: [UmbraService],
  exports: [UmbraService],
})
export class UmbraModule {}
