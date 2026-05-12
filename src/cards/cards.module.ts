import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { Card } from './entities/card.entity';
import { User } from '../users/entities/user.entity';
import { Connection } from '../connections/entities/connection.entity';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [
    // Connection — щоб у remove() самостійно прибирати orphan-з'єднання
    // (CASCADE на FK не завжди застосовується через synchronize).
    TypeOrmModule.forFeature([Card, User, Connection]),
    SubscriptionsModule,
    FilesModule,
  ],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
