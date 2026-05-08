import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanCode } from '../plan-code.enum';
export interface PlanFeatures {
  maxCards: number;
  cardTypes: string[];
  phoneNumbers: number;
  socialLinks: number;
  customization: boolean;
  aiFeatures: boolean;
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
  // {
  //   maxCards: number;
  //   cardTypes: string[];
  //   phoneNumbers: number;
  //   socialLinks: number;
  //   customization: boolean;
  //   aiFeatures?: boolean;
  // };

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
