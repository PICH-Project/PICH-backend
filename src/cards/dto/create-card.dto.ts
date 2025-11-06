import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsObject,
  ValidateNested,
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

  @IsOptional()
  phones?: string[];

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsObject()
  @IsOptional()
  social?: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  isPrime?: boolean;

  @IsString()
  @IsOptional()
  bio?: string;

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
}
