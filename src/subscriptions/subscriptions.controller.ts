import { Controller, Param, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  getActivePlans() {
    return this.subscriptionsService.findAllActivePlans();
  }
  @Get('plans/:id')
  async getPlan(@Param('id') id: string) {
    return await this.subscriptionsService.getPlanById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentSubscription(@GetUser() user: User) {
    const subscription = await this.subscriptionsService.getCurrentSubscription(user.id);

    if (!subscription) {
      // If no subscription, create FREE one
      return await this.subscriptionsService.createFreeSubscription(user.id);
    }

    return subscription;
  }

  @UseGuards(JwtAuthGuard)
  @Get('limits')
  async getUserLimits(@GetUser() user: User) {
    return await this.subscriptionsService.getUserLimits(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancelSubscription(@GetUser() user: User) {
    return await this.subscriptionsService.cancelSubscription(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('plans')
  createPlan(@Body() createDto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(createDto);
  }
}
