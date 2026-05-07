import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Subscription } from './subscription.entity';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription!: Subscription | null;

  @Column({ type: 'varchar', nullable: true })
  subscriptionId!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column()
  currency!: string; // 'USD', 'USDC', 'USDT', 'SOL'

  @Column()
  paymentProvider!: string; // fix here later

  @Column({ type: 'varchar', nullable: true })
  providerTransactionId!: string | null;

  @Column()
  status!: string; // 'pending', 'completed', 'failed', 'refunded'

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
