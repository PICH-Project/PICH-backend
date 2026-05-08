import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
} from 'class-validator';
import { PlanCode } from '../subscriptions.enums';
import { PlanFeatures } from '../entities/subscription-plan.entity';

export class CreateSubscriptionPlanDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsEnum(PlanCode)
  code: PlanCode;

  @IsNumber()
  price: number;

  @IsNumber()
  @IsOptional()
  durationMonths?: number;

  @IsObject()
  @IsOptional()
  features: PlanFeatures;

  @IsString()
  @IsOptional()
  description: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
