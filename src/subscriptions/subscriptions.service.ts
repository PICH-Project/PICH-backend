import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { User } from '../users/entities/user.entity';
import { Subscription } from './entities/subscription.entity';

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

  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { userId, status: 'active' },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    return subscription;
  }

  async createFreeSubscription(userId: string): Promise<Subscription> {
    const freePlan = await this.getPlanByName('FREE');

    const existing = await this.getCurrentSubscription(userId);
    if (existing) {
      return existing;
    }

    const subscription = this.subscriptionsRepository.create({
      userId,
      planId: freePlan.id,
      status: 'active',
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
  }): Promise<Subscription> {
    const { userId, planId, paymentProvider, externalId } = data;

    const plan = await this.getPlanById(planId);

    const startedAt = new Date();
    const expiresAt = new Date();

    if (plan.durationMonths && plan.durationMonths > 0) {
      expiresAt.setMonth(expiresAt.getMonth() + plan.durationMonths);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    }

    await this.subscriptionsRepository.update(
      { userId, status: 'active' },
      { status: 'cancelled', autoRenew: false },
    );

    const subscription = this.subscriptionsRepository.create({
      userId,
      planId,
      status: 'active',
      startedAt,
      expiresAt,
      autoRenew: true,
      paymentProvider,
      externalSubscriptionId: externalId,
    });

    const savedSubscription = await this.subscriptionsRepository.save(subscription);

    await this.usersRepository.update(userId, {
      subscriptionPlan: plan.name,
      subscriptionExpiresAt: expiresAt,
    });

    return savedSubscription;
  }

  async cancelSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.getCurrentSubscription(userId);

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
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
      .where('subscription.status = :status', { status: 'active' })
      .andWhere('subscription.expiresAt < :now', { now })
      .getMany();

    for (const subscription of expired) {
      subscription.status = 'expired';
      await this.subscriptionsRepository.save(subscription);

      const freePlan = await this.getPlanByName('FREE');
      await this.createFreeSubscription(subscription.userId);
    }
  }

  async getUserLimits(userId: string): Promise<{
    maxCards: number;
    cardTypes: string[];
    phoneNumbers: number;
    socialLinks: number;
    customization: boolean;
    aiFeatures: boolean;
  }> {
    const subscription = await this.getCurrentSubscription(userId);

    if (!subscription) {
      const freePlan = await this.getPlanByName('FREE');
      return freePlan.features;
    }

    return subscription.plan.features;
  }

  async createPlan(createDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const existingPlan = await this.plansRepository.findOne({ where: { code: createDto.code } });
    if (existingPlan) {
      throw new ConflictException(`Plan with code ${createDto.code} already exists`);
    }

    const plan = this.plansRepository.create(createDto);
    return this.plansRepository.save(plan);
  }
}
