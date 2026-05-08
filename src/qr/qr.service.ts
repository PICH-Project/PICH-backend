import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import type { User } from '../users/entities/user.entity';
import { CardsService } from '../cards/cards.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QrService {
  private readonly frontendUrl: string;

  constructor(
    // @Inject(CardsService)
    private readonly cardsService: CardsService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://pich.app';
  }

  async getCardShareLink(cardId: string): Promise<{ shareUrl: string; deepLink: string }> {
    const shareUrl = `${this.frontendUrl}/card/${cardId}`;

    const deepLink = `pich://card/${cardId}`;

    return {
      shareUrl,
      deepLink,
    };
  }

  async getMainCardShareLink(user: User): Promise<{ shareUrl: string; deepLink: string }> {
    if (user.mainCardId) {
      return this.getCardShareLink(user.mainCardId);
    }

    const userCards = await this.cardsService.findAll(user);
    if (userCards.length === 0) {
      throw new NotFoundException('User has no cards to share');
    }

    return this.getCardShareLink(userCards[0].id);
  }
  async generateCardQR(cardId: string): Promise<string> {
    // Generate QR code for a specific card
    const connectUrl = `pich://connect/${cardId}`;

    // Generate QR code as data URL
    return QRCode.toDataURL(connectUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000', // Using design token from Figma
        light: '#FFFFFF', // White background
      },
    });
  }

  async generateMainCardQR(user: User): Promise<string> {
    // If user has a main card, generate QR for that card
    if (user.mainCardId) {
      return this.generateCardQR(user.mainCardId);
    }

    // Otherwise, find the first card or throw an error
    const userCards = await this.cardsService.findAll(user);
    if (userCards.length === 0) {
      throw new NotFoundException('User has no cards to generate QR code for');
    }

    return this.generateCardQR(userCards[0].id);
  }
}
