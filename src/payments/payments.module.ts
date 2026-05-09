import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './entities/playment-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction]), ConfigModule, SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
