import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanCode } from '../subscriptions.enums';

export interface PlanFeatures {
  maxCards: number;
  cardTypes: string[];
  phoneNumbers: number;
  socialLinks: number;
  bioMaxLength: number;
  // additionalFields: number;

  customization: boolean;
  // aiFeatures: boolean;

  additionalPhones: number;
  additionalSocials: number;

  // premium features:
  coinFarmBonus: boolean;
  vipIndicator: boolean;
  blackTheme: boolean;
  privacySettings: boolean;
  animatedPhoto: boolean;
  animatedBackground: boolean;
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // 'FREE', 'BUSINESS', 'VIP'

  @Column()
  displayName: string; // 'Personal Card', 'Business Card', 'VIP Card'

  @Column({
    type: 'enum',
    enum: PlanCode,
    enumName: 'plan_code_enum',
    unique: true,
  })
  code: PlanCode;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 1 })
  durationMonths: number;

  @Column({ type: 'jsonb', default: {} })
  features: PlanFeatures;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
