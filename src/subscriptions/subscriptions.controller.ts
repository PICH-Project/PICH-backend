import { Controller, Param, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { BillingCycle, SubscriptionType } from './subscriptions.enums';

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
  @Get('all')
  async getAllSubscriptions(@GetUser() user: User) {
    return await this.subscriptionsService.getAllActiveSubscriptions(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('limits')
  async getUserLimits(@GetUser() user: User) {
    return await this.subscriptionsService.getUserCombinedLimits(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('premium')
  async addPremiumAddon(
    @GetUser() user: User,
    @Body('billingCycle') billingCycle?: 'monthly' | 'yearly',
  ) {
    const cycle = billingCycle === 'yearly' ? BillingCycle.YEARLY : BillingCycle.MONTHLY;

    return await this.subscriptionsService.addPremiumAddon(user.id, cycle);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancelSubscription(@GetUser() user: User, @Query('type') type?: 'primary' | 'addon') {
    const subType = type === 'addon' ? SubscriptionType.ADDON : SubscriptionType.PRIMARY;

    return await this.subscriptionsService.cancelSubscription(user.id, subType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('plans')
  createPlan(@Body() createDto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(createDto);
  }
}
