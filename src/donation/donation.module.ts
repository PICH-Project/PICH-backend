import { Module } from '@nestjs/common';
import { DonationsController } from './donations.controller';
import { UmbraModule } from '../umbra/umbra.module';

@Module({
  imports: [UmbraModule],
  controllers: [DonationsController],
})
export class DonationsModule {}
