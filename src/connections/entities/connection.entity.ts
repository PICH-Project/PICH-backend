import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Card } from '../../cards/entities/card.entity';

@Entity('connections')
export class Connection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The first card in the connection.
  // onDelete: 'CASCADE' — коли картку видаляють, connection теж видаляється
  // (інакше залишається orphan-row з broken FK).
  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card1Id' })
  card1: Card;

  @Column()
  card1Id: string;

  // The second card in the connection
  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card2Id' })
  card2: Card;

  @Column()
  card2Id: string;

  // Notes from card1's owner about card2
  @Column({ nullable: true, default: null })
  card1Notes: string;

  // Notes from card2's owner about card1
  @Column({ nullable: true, default: null })
  card2Notes: string;

  // Whether card1's owner has favorited card2
  @Column({ default: false })
  card1FavoritedCard2: boolean;

  // Whether card2's owner has favorited card1
  @Column({ default: false })
  card2FavoritedCard1: boolean;

  // The date when the connection was established
  @Column()
  connectionDate: Date;

  // The date of the last interaction between the cards
  @Column({ nullable: true, default: null })
  lastInteractionDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
