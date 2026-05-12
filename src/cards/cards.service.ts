import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { In, Not, type Repository } from 'typeorm';
import { Card } from './entities/card.entity';
import type { CreateCardDto } from './dto/create-card.dto';
import type { UpdateCardDto } from './dto/update-card.dto';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { FilesService } from '../files/files.service';
import { Connection } from '../connections/entities/connection.entity';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Connection)
    private readonly connectionsRepository: Repository<Connection>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly filesService: FilesService,
  ) {}

  async create(
    createCardDto: CreateCardDto,
    user: User,
    photo?: Express.Multer.File,
  ): Promise<Card> {
    await this.checkSubscriptionLimits(
      user.id,
      createCardDto.type,
      createCardDto.bio,
      createCardDto.phones,
      createCardDto.social,
    );

    // Двоканальна підтримка аватарки:
    //  1) multipart-photo (Катин flow) — бек сам заливає у Supabase
    //  2) avatar-URL у JSON-payload — мобілка вже залила через /upload/image
    //
    // Якщо переданий photo — він має пріоритет (свіже фото).
    // Інакше — лишаємо avatar з createCardDto.
    let photoUrl: string | undefined = undefined;
    if (photo) {
      const uploadResult = await this.filesService.uploadImage(photo, 'cards');
      photoUrl = uploadResult.url;
    }

    await this.checkCustomizationAccess(user.id, {
      nameFont: createCardDto.nameFont,
      avatarFrame: createCardDto.avatarFrame,
    });

    const card = this.cardsRepository.create({
      ...createCardDto,
      // Якщо photoUrl undefined — НЕ перетираємо createCardDto.avatar.
      ...(photoUrl ? { avatar: photoUrl } : {}),
      user,
      userId: user.id,
    });

    console.log('createCardDto', createCardDto);

    const savedCard = await this.cardsRepository.save(card);

    if (createCardDto.isMainCard) {
      await this.handleMainCardUpdate(savedCard.id, user.id);
    }

    return savedCard;
  }

  private async checkSubscriptionLimits(
    userId: string,
    cardType: string,
    bio?: string,
    phones?: string[],
    social?: Record<string, string>,
  ): Promise<void> {
    const limits = await this.subscriptionsService.getUserCombinedLimits(userId);

    if (!limits.cardTypes.includes(cardType)) {
      throw new ForbiddenException(
        `Your subscription plan does not support ${cardType} cards. ` +
          `Allowed types: ${limits.cardTypes.join(', ')}. ` +
          `Upgrade to access more card types.`,
      );
    }

    if (limits.maxCards !== -1) {
      // -1 = unlimited
      const currentCardCount = await this.cardsRepository.count({
        where: { userId },
      });

      if (currentCardCount >= limits.maxCards) {
        throw new ForbiddenException(
          `You have reached the maximum number of cards (${limits.maxCards}) ` +
            `for your subscription plan. Please upgrade or delete existing cards.`,
        );
      }
    }

    if (bio && bio.length > limits.bioMaxLength) {
      throw new BadRequestException(
        `Bio is too long. Maximum ${limits.bioMaxLength} characters allowed. ` +
          `You entered ${bio.length} characters. ` +
          `Upgrade to get more space for bio.`,
      );
    }

    if (phones && phones.length > limits.phoneNumbers) {
      throw new ForbiddenException(
        `Your subscription allows ${limits.phoneNumbers} phone number(s). ` +
          `You tried to add ${phones.length}. ` +
          `Upgrade to Premium for +1 phone.`,
      );
    }

    if (social) {
      const socialCount = Object.keys(social).length;
      if (socialCount > limits.socialLinks) {
        throw new ForbiddenException(
          `Your subscription allows ${limits.socialLinks} social link(s). ` +
            `You tried to add ${socialCount}. ` +
            `Upgrade to Premium for +2 social links.`,
        );
      }
    }
  }

  /**
   * Перевіряє чи юзеру дозволено застосовувати кастомізації картки за його планом:
   *  - `nameFont` (крім null/'default')  → потребує Premium ADDON або VIP
   *  - `avatarFrame` (крім null/'none')  → потребує VIP only
   *
   * Якщо юзер передав null чи дефолтне значення — перевірка пропускається
   * (вважаємо що він не активує фічу).
   */
  private async checkCustomizationAccess(
    userId: string,
    fields: { nameFont?: string | null; avatarFrame?: string | null },
  ): Promise<void> {
    const wantsCustomFont =
      fields.nameFont !== undefined &&
      fields.nameFont !== null &&
      fields.nameFont !== 'default';

    if (wantsCustomFont) {
      const hasPerks = await this.subscriptionsService.hasPremiumPerks(userId);
      if (!hasPerks) {
        throw new ForbiddenException(
          'Custom name font is a Premium feature. Upgrade to Premium or VIP to use it.',
        );
      }
    }

    const wantsCustomFrame =
      fields.avatarFrame !== undefined &&
      fields.avatarFrame !== null &&
      fields.avatarFrame !== 'none';

    if (wantsCustomFrame) {
      const hasVip = await this.subscriptionsService.hasVip(userId);
      if (!hasVip) {
        throw new ForbiddenException(
          'Custom avatar frame is a VIP-only feature. Upgrade to VIP to use it.',
        );
      }
    }
  }

  private async handleMainCardUpdate(currentCardId, userId: string): Promise<void> {
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
      mainCards.map(card => card.id),
    );

    // Update all found cards to not be main
    if (mainCards.length > 0) {
      await this.cardsRepository.update(
        { id: In(mainCards.map(card => card.id)) },
        { isMainCard: false },
      );
    }
  }

  async findAll(user: User): Promise<Card[]> {
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
      throw new ForbiddenException('You do not have permission to access this card');
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
    photo?: Express.Multer.File,
  ): Promise<Card> {
    const card = await this.findOne(id, user);

    const newType = updateCardDto.type || card.type;
    const newBio = updateCardDto.bio !== undefined ? updateCardDto.bio : card.bio;
    const newPhones = updateCardDto.phones || card.phones;
    const newSocial = updateCardDto.social || card.social;

    await this.checkSubscriptionLimits(user.id, newType, newBio, newPhones, newSocial);

    await this.checkCustomizationAccess(user.id, {
      nameFont: updateCardDto.nameFont,
      avatarFrame: updateCardDto.avatarFrame,
    });

    const isBecomingMainCard = updateCardDto.isMainCard === true && !card.isMainCard;

    Object.assign(card, updateCardDto);

    const updatedCard = await this.cardsRepository.save(card);
    if (photo) {
      const uploadResult = await this.filesService.uploadImage(photo, 'cards');
      card.avatar = uploadResult.url;
    }
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

    // Перед видаленням картки чистимо всі connections де вона фігурує
    // (як card1 або card2). Це робить cleanup детермінованим навіть якщо
    // у БД на FK ще не стоїть ON DELETE CASCADE — корисно бо synchronize
    // не змінює існуючі constraints.
    const orphanConnections = await this.connectionsRepository.find({
      where: [{ card1Id: id }, { card2Id: id }],
    });
    if (orphanConnections.length > 0) {
      await this.connectionsRepository.remove(orphanConnections);
    }

    await this.cardsRepository.remove(card);
  }

  async canCreateCard(userId: string, cardType?: string): Promise<boolean> {
    try {
      await this.checkSubscriptionLimits(userId, cardType || 'PAC');
      return true;
    } catch {
      return false;
    }
  }

  async getCardUsageInfo(userId: string): Promise<{
    currentCount: number;
    maxCards: number;
    allowedTypes: string[];
    canCreateMore: boolean;
    limits: {
      phoneNumbers: number;
      socialLinks: number;
      bioMaxLength: number;
    };
  }> {
    const limits = await this.subscriptionsService.getUserCombinedLimits(userId);
    const currentCount = await this.cardsRepository.count({ where: { userId } });

    return {
      currentCount,
      maxCards: limits.maxCards,
      allowedTypes: limits.cardTypes,
      canCreateMore: limits.maxCards === -1 || currentCount < limits.maxCards,
      limits: {
        phoneNumbers: limits.phoneNumbers,
        socialLinks: limits.socialLinks,
        bioMaxLength: limits.bioMaxLength,
      },
    };
  }
}
