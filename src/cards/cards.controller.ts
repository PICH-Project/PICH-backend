import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { User } from '../users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('cards')
export class CardsController {
  constructor(
    @Inject(CardsService)
    private readonly cardsService: CardsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createCardDto: CreateCardDto, @GetUser() user: User) {
    return this.cardsService.create(createCardDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@GetUser() user: User) {
    return this.cardsService.findAll(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.cardsService.findOne(id, user);
  }

  @Get('public/:id')
  findOnePublic(@Param('id') id: string) {
    return this.cardsService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto, @GetUser() user: User) {
    return this.cardsService.update(id, updateCardDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle-main')
  toggleMainCard(@Param('id') id: string, @GetUser() user: User) {
    return this.cardsService.toggleMainCard(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle-prime')
  togglePrime(@Param('id') id: string, @GetUser() user: User) {
    return this.cardsService.togglePrime(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle-wallet')
  toggleWallet(@Param('id') id: string, @GetUser() user: User) {
    return this.cardsService.toggleWallet(id, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.cardsService.remove(id, user);
  }
}
