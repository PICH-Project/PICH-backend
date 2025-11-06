import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { In, Not, type Repository } from 'typeorm';
import { Card } from './entities/card.entity';
import type { CreateCardDto } from './dto/create-card.dto';
import type { UpdateCardDto } from './dto/update-card.dto';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createCardDto: CreateCardDto, user: User): Promise<Card> {
    const card = this.cardsRepository.create({
      ...createCardDto,
      user,
      userId: user.id,
    });

    console.log('createCardDto', createCardDto)

    const savedCard = await this.cardsRepository.save(card);

    if (createCardDto.isMainCard) {
      await this.handleMainCardUpdate(savedCard.id, user.id);
    }

    return savedCard;
  }

  private async handleMainCardUpdate(
    currentCardId,
    userId: string,
  ): Promise<void> {
    // Find all cards marked as main except the current one
    const mainCards = await this.cardsRepository.find({
      where: {
        userId: userId,
        isMainCard: true,
        id: Not(currentCardId),
      },
    });

    console.log(
      `Found ${mainCards.length} cards currently marked as main:`,
      mainCards.map((card) => card.id),
    );

    // Update all found cards to not be main
    if (mainCards.length > 0) {
      await this.cardsRepository.update(
        { id: In(mainCards.map((card) => card.id)) },
        { isMainCard: false },
      );
    }
  }

  async findAll(user: User): Promise<Card[]> {
    console.log(
      await this.cardsRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    })
    );
    return this.cardsRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Card> {
    const card = await this.cardsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!card) {
      throw new NotFoundException(`Card with ID "${id}" not found`);
    }

    // Check if the card belongs to the user
    if (card.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to access this card',
      );
    }

    return card;
  }

  async findOnePublic(id: string): Promise<Card> {
    const card = await this.cardsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!card) {
      throw new NotFoundException(`Card with ID "${id}" not found`);
    }

    // Remove sensitive information by creating a new user object without password
    if (card.user) {
      const { password: _unused, ...userWithoutPassword } = card.user;
      card.user = userWithoutPassword as User;
    }

    return card;
  }

  async update(
    id: string,
    updateCardDto: UpdateCardDto,
    user: User,
  ): Promise<Card> {
    const card = await this.findOne(id, user);
    const isBecomingMainCard =
      updateCardDto.isMainCard === true && !card.isMainCard;

    Object.assign(card, updateCardDto);

    const updatedCard = await this.cardsRepository.save(card);

    if (isBecomingMainCard) {
      await this.handleMainCardUpdate(id, user.id);

      // Also update the user's mainCardId
      if (user.mainCardId !== id) {
        user.mainCardId = id;
        await this.usersRepository.save(user);
      }
    }

    return updatedCard;
  }

  async toggleMainCard(id: string, user: User): Promise<Card> {
    const card = await this.findOne(id, user);

    // If the card is already the main card, do nothing
    if (card.isMainCard) {
      return card;
    }

    // Set this card as the main card
    card.isMainCard = true;

    // Save the updated card
    const updatedCard = await this.cardsRepository.save(card);

    // Update any other main cards
    await this.handleMainCardUpdate(id, user.id);

    // Also update the user's mainCardId
    if (user.mainCardId !== id) {
      user.mainCardId = id;
      await this.usersRepository.save(user);
    }

    return updatedCard;
  }

  async togglePrime(id: string, user: User): Promise<Card> {
    const card = await this.findOne(id, user);

    card.isPrime = !card.isPrime;

    return this.cardsRepository.save(card);
  }

  async toggleWallet(id: string, user: User): Promise<Card> {
    const card = await this.findOne(id, user);

    card.isInWallet = !card.isInWallet;

    return this.cardsRepository.save(card);
  }

  async remove(id: string, user: User): Promise<void> {
    const card = await this.findOne(id, user);

    await this.cardsRepository.remove(card);
  }
}
