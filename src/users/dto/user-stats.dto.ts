import { IsEmail, IsString, MinLength, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UserStatsDto {
  totalCards!: number;
  connections!: number;
  cardsReceived!: number;
  subscriptionTier!: string;
  subscriptionExpiresAt!: Date | null;
  tokenBalance!: number;
}
