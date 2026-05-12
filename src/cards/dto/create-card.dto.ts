import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CardType, CardCategory } from '../entities/card.entity';

class LocationDto {
  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;
}

export class CreateCardDto {
  @IsEnum(CardType)
  @IsNotEmpty()
  type: CardType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  phones?: string[];

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsObject()
  @IsOptional()
  social?: Record<string, string>;

  @IsObject()
  @IsOptional()
  notes?: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  isPrime?: boolean;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;

  @IsEnum(CardCategory)
  @IsOptional()
  category?: CardCategory;

  @IsString()
  @IsOptional()
  blockchainId?: string;

  @IsBoolean()
  @IsOptional()
  isMainCard?: boolean;

  @IsBoolean()
  @IsOptional()
  isInWallet?: boolean;

  /**
   * Преміум-фіча. 'default' | 'classic' | 'script' | null.
   * Перевірка плану — у service.checkSubscriptionLimits.
   */
  @IsString()
  @IsOptional()
  nameFont?: string | null;

  /**
   * VIP-only фіча. 'none' | 'gold' | 'aurora' | null.
   * Перевірка плану — у service.checkSubscriptionLimits.
   */
  @IsString()
  @IsOptional()
  avatarFrame?: string | null;
}
