import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CardType {
  BAC = 'BAC', // Business Automatic Card
  PAC = 'PAC', // Personal Automatic Card
  VIPAC = 'VIPAC',
  // VAC = 'VAC', // Virtual Automatic Card
  // CAC = 'CAC', // Custom Automatic Card
}

export enum CardCategory {
  FAMILY = 'FAMILY',
  FRIENDS = 'FRIENDS',
  WORK = 'WORK',
  OTHER = 'OTHER',
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CardType,
    default: CardType.PAC,
  })
  type: CardType;

  @Column()
  name: string;

  @Column()
  nickname: string;

  @Column({ nullable: true, default: null })
  avatar: string;

  @Column({ type: 'json', nullable: true, default: null })
  phones: string[];

  @Column({ nullable: true, default: null })
  email: string;

  @Column({ type: 'json', nullable: true, default: null })
  social: Record<string, string>;

  @Column({ type: 'json', nullable: true, default: null })
  notes: Record<string, string>;

  @Column({ default: false })
  isPrime: boolean;

  @Column({ nullable: true, default: null })
  bio: string;

  @Column({ nullable: true, default: null })
  contactPerson: string;

  @Column({ type: 'json', nullable: true, default: null })
  location: {
    country?: string;
    city?: string;
    address?: string;
    postalCode?: string;
  };

  @Column({
    type: 'enum',
    enum: CardCategory,
    default: CardCategory.OTHER,
  })
  category: CardCategory;

  @Column({ nullable: true, default: null })
  blockchainId: string;

  @Column({ default: false })
  isMainCard: boolean;

  @Column({ default: false })
  isInWallet: boolean;

  /**
   * Преміум-фіча: вибраний шрифт для name (на картці).
   * 'default' | 'classic' | 'script' | null. Доступно для Premium ADDON / VIP.
   * Явний type: 'varchar' — без нього TypeORM не може вивести SQL-тип через
   * reflection із union `string | null` (бачить як Object → DataTypeNotSupportedError).
   */
  @Column({ type: 'varchar', nullable: true, default: null })
  nameFont: string | null;

  /**
   * VIP-фіча: рамка навколо avatar.
   * 'none' | 'gold' | 'aurora' | null. Доступно тільки для VIP.
   */
  @Column({ type: 'varchar', nullable: true, default: null })
  avatarFrame: string | null;

  @ManyToOne(() => User, user => user.cards)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
