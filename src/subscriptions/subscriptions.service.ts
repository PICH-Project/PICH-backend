import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanFeatures, SubscriptionPlan } from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { User } from '../users/entities/user.entity';
import { Subscription } from './entities/subscription.entity';
import {
  BillingCycle,
  PlanCode,
  SubscriptionStatus,
  SubscriptionType,
} from './subscriptions.enums';
export interface CombinedLimits {
  cardTypes: string[];
  maxCards: number;
  phoneNumbers: number;
  socialLinks: number;
  bioMaxLength: number;
  customization: boolean;
  coinFarmBonus: boolean;
  vipIndicator: boolean;
  blackTheme: boolean;
  privacySettings: boolean;
  animatedPhoto: boolean;
  animatedBackground: boolean;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly plansRepository: Repository<SubscriptionPlan>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAllActivePlans(): Promise<SubscriptionPlan[]> {
    return this.plansRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.plansRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan with ID "${planId}" not found`);
    }
    return plan;
  }

  async getPlanByName(name: string): Promise<SubscriptionPlan> {
    const plan = await this.plansRepository.findOne({ where: { name } });
    if (!plan) {
      throw new NotFoundException(`Plan "${name}" not found`);
    }
    return plan;
  }

  async getPlanByCode(code: PlanCode): Promise<SubscriptionPlan> {
    const plan = await this.plansRepository.findOne({ where: { code } });
    if (!plan) {
      throw new NotFoundException(`Plan with code "${code}" not found`);
    }
    return plan;
  }

  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        subscriptionType: SubscriptionType.PRIMARY,
      },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    return subscription;
  }

  async getAllActiveSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionsRepository.find({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['plan'],
      order: { subscriptionType: 'ASC', createdAt: 'DESC' }, // PRIMARY першим
    });
  }

  async createFreeSubscription(userId: string): Promise<Subscription> {
    const freePlan = await this.getPlanByName('FREE');

    const existingPrimary = await this.subscriptionsRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        subscriptionType: SubscriptionType.PRIMARY,
      },
    });

    if (existingPrimary) {
      return existingPrimary;
    }

    const subscription = this.subscriptionsRepository.create({
      userId,
      planId: freePlan.id,
      subscriptionType: SubscriptionType.PRIMARY,
      status: SubscriptionStatus.ACTIVE,
      startedAt: new Date(),
      expiresAt: null, // FREE never expires
      autoRenew: false,
      paymentProvider: null,
      externalSubscriptionId: null,
    });

    const savedSubscription = await this.subscriptionsRepository.save(subscription);
    await this.usersRepository.update(userId, {
      subscriptionPlan: 'FREE',
    });

    return savedSubscription;
  }

  async activateSubscription(data: {
    userId: string;
    planId: string;
    paymentProvider: string;
    externalId: string;
    amount: number;
    currency: string;
    billingCycle?: BillingCycle;
  }): Promise<Subscription> {
    const {
      userId,
      planId,
      paymentProvider,
      externalId,
      billingCycle = BillingCycle.MONTHLY,
    } = data;

    const plan = await this.getPlanById(planId);

    const subType =
      plan.code === PlanCode.PREMIUM ? SubscriptionType.ADDON : SubscriptionType.PRIMARY;

    const startedAt = new Date();
    const expiresAt = new Date();

    if (plan.durationMonths && plan.durationMonths > 0) {
      const monthsToAdd =
        billingCycle === BillingCycle.YEARLY ? plan.durationMonths * 12 : plan.durationMonths;
      expiresAt.setMonth(expiresAt.getMonth() + monthsToAdd);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    }

    await this.subscriptionsRepository.update(
      {
        userId,
        status: SubscriptionStatus.ACTIVE,
        subscriptionType: subType,
      },
      { status: SubscriptionStatus.CANCELLED, autoRenew: false },
    );

    const subscription = this.subscriptionsRepository.create({
      userId,
      planId,
      subscriptionType: subType,
      billingCycle,
      status: SubscriptionStatus.ACTIVE,
      startedAt,
      expiresAt,
      autoRenew: true,
      paymentProvider,
      externalSubscriptionId: externalId,
    });

    const savedSubscription = await this.subscriptionsRepository.save(subscription);
    if (subType === SubscriptionType.PRIMARY) {
      await this.usersRepository.update(userId, {
        subscriptionPlan: plan.name,
        subscriptionExpiresAt: expiresAt,
      });
    }

    return savedSubscription;
  }

  async addPremiumAddon(
    userId: string,
    billingCycle: BillingCycle = BillingCycle.MONTHLY,
  ): Promise<Subscription> {
    const premiumPlan = await this.getPlanByCode(PlanCode.PREMIUM);

    const activeSubs = await this.subscriptionsRepository.find({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });

    const hasVip = activeSubs.some(s => s.plan.code === PlanCode.VIP);
    if (hasVip) {
      throw new BadRequestException('VIP subscription already includes all premium features');
    }

    const hasPremium = activeSubs.some(s => s.subscriptionType === SubscriptionType.ADDON);
    if (hasPremium) {
      throw new BadRequestException('Premium addon already active');
    }

    const expiresAt = new Date();
    if (billingCycle === BillingCycle.MONTHLY) {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    const subscription = this.subscriptionsRepository.create({
      userId,
      planId: premiumPlan.id,
      subscriptionType: SubscriptionType.ADDON,
      billingCycle,
      status: SubscriptionStatus.ACTIVE,
      startedAt: new Date(),
      expiresAt,
      autoRenew: true,
    });

    return this.subscriptionsRepository.save(subscription);
  }

  async cancelSubscription(
    userId: string,
    type: SubscriptionType = SubscriptionType.PRIMARY,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE, subscriptionType: type },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new NotFoundException(`No active ${type} subscription found`);
    }

    if (subscription.plan.name === 'FREE') {
      throw new BadRequestException('Cannot cancel FREE subscription');
    }

    subscription.autoRenew = false;
    return await this.subscriptionsRepository.save(subscription);
  }

  async expireSubscriptions(): Promise<void> {
    const now = new Date();

    const expired = await this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.expiresAt < :now', { now })
      .getMany();

    for (const subscription of expired) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionsRepository.save(subscription);

      if (subscription.subscriptionType === SubscriptionType.PRIMARY) {
        await this.createFreeSubscription(subscription.userId);
      }
    }
  }

  async getUserCombinedLimits(userId: string): Promise<CombinedLimits> {
    const activeSubs = await this.subscriptionsRepository.find({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });

    const primarySub = activeSubs.find(s => s.subscriptionType === SubscriptionType.PRIMARY);
    const addonSub = activeSubs.find(s => s.subscriptionType === SubscriptionType.ADDON);

    let baseFeatures: any;
    if (primarySub && primarySub.plan) {
      baseFeatures = primarySub.plan.features;
    } else {
      const freePlan = await this.getPlanByName('FREE');
      baseFeatures = freePlan.features;
    }

    const addonFeatures = addonSub?.plan?.features || {
      additionalPhones: 0,
      additionalSocials: 0,
      customization: false,
      coinFarmBonus: false,
      animatedPhoto: false,
      animatedBackground: false,
    };
    return {
      cardTypes: baseFeatures.cardTypes || ['PAC'],
      maxCards: baseFeatures.maxCards || 1,

      phoneNumbers: (baseFeatures.phoneNumbers || 1) + (addonFeatures.additionalPhones || 0),
      socialLinks: (baseFeatures.socialLinks || 4) + (addonFeatures.additionalSocials || 0),

      bioMaxLength: baseFeatures.bioMaxLength || 100,

      customization: baseFeatures.customization || addonFeatures.customization || false,
      coinFarmBonus: baseFeatures.coinFarmBonus || addonFeatures.coinFarmBonus || false,
      vipIndicator: baseFeatures.vipIndicator || false,
      blackTheme: baseFeatures.blackTheme || false,
      privacySettings: baseFeatures.privacySettings || false,
      animatedPhoto: baseFeatures.animatedPhoto || addonFeatures.animatedPhoto || false,
      animatedBackground:
        baseFeatures.animatedBackground || addonFeatures.animatedBackground || false,
    };
  }

  async getUserLimits(userId: string): Promise<CombinedLimits> {
    return this.getUserCombinedLimits(userId);
  }

  /**
   * Чи має юзер "Premium-перки" — тобто Premium ADDON активний АБО VIP активний.
   * Юзається для гейтингу преміум-фіч (зокрема nameFont на картці).
   */
  async hasPremiumPerks(userId: string): Promise<boolean> {
    const activeSubs = await this.subscriptionsRepository.find({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });
    return activeSubs.some(
      s =>
        s.plan.code === PlanCode.VIP ||
        s.subscriptionType === SubscriptionType.ADDON,
    );
  }

  /**
   * Чи має юзер активну VIP-підписку.
   * Юзається для гейтингу VIP-only фіч (зокрема avatarFrame на картці).
   */
  async hasVip(userId: string): Promise<boolean> {
    const activeSubs = await this.subscriptionsRepository.find({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });
    return activeSubs.some(s => s.plan.code === PlanCode.VIP);
  }

  async createPlan(createDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const existingPlan = await this.plansRepository.findOne({
      where: { code: createDto.code },
    });
    if (existingPlan) {
      throw new ConflictException(`Plan with code ${createDto.code} already exists`);
    }

    const plan = this.plansRepository.create(createDto);
    return this.plansRepository.save(plan);
  }
}
