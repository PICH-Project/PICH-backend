import { Controller, Param, Get, Inject, UseGuards } from '@nestjs/common';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { User } from '../users/entities/user.entity';

@Controller('qr')
@UseGuards(JwtAuthGuard)
export class QrController {
  constructor(
    // @Inject(QrService)
    private readonly qrService: QrService,
  ) {}

  @Get('share/card/:cardId')
  getCardShareLink(
    @Param('cardId') cardId: string,
  ): Promise<{ shareUrl: string; deepLink: string }> {
    return this.qrService.getCardShareLink(cardId);
  }

  @Get('share/main-card')
  getMainCardShareLink(@GetUser() user: User): Promise<{ shareUrl: string; deepLink: string }> {
    return this.qrService.getMainCardShareLink(user);
  }

  @Get('card/:cardId')
  generateCardQR(@Param('cardId') cardId: string): Promise<string> {
    return this.qrService.generateCardQR(cardId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('main-card')
  generateMainCardQR(@GetUser() user: User): Promise<string> {
    return this.qrService.generateMainCardQR(user);
  }
}
