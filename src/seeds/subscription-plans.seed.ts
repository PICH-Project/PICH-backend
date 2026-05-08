import { DataSource } from 'typeorm';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { PlanCode } from '../subscriptions/subscriptions.enums';

export const plans = [
  {
    name: 'FREE',
    displayName: 'Free Plan',
    code: PlanCode.FREE,
    price: 0,
    durationMonths: 0, // lifetime
    features: {
      cardTypes: ['PAC'],
      maxCards: 1,

      phoneNumbers: 1,
      socialLinks: 4,

      bioMaxLength: 100,
      additionalFields: 0,
      customization: false,
      additionalPhones: 0,
      additionalSocials: 0,

      // Premium features
      coinFarmBonus: false,
      vipIndicator: false,
      blackTheme: false,
      privacySettings: false,
      animatedPhoto: false,
      animatedBackground: false,

      // aiFeatures: false,
    },
    description: 'Free personal card (PAC) with basic features',
    isActive: true,
  },
  {
    name: 'BUSINESS',
    displayName: 'Business Plan',
    code: PlanCode.BUSINESS,
    price: 9.99,
    durationMonths: 1,
    features: {
      cardTypes: ['PAC', 'BAC'],
      maxCards: -1, // unlimited

      phoneNumbers: 2,
      socialLinks: 5,

      bioMaxLength: 250,
      additionalFields: 2,

      customization: true,

      additionalPhones: 0,
      additionalSocials: 0,

      // Premium features
      coinFarmBonus: false,
      vipIndicator: false,
      blackTheme: false,
      privacySettings: false,
      animatedPhoto: false,
      animatedBackground: false,

      // aiFeatures: false,
    },
    description: 'Business card (BAC) with customization and additional fields',
    isActive: true,
  },
  {
    name: 'PREMIUM',
    displayName: 'Premium Addon',
    code: PlanCode.PREMIUM,
    price: 4.99,
    durationMonths: 1,
    features: {
      cardTypes: [],
      maxCards: 0,

      phoneNumbers: 0,
      socialLinks: 0,

      bioMaxLength: 0,
      additionalFields: 0,

      customization: true,

      additionalPhones: 1,
      additionalSocials: 2,

      // Premium features
      coinFarmBonus: true,
      vipIndicator: false,
      blackTheme: false,
      privacySettings: false,
      animatedPhoto: true,
      animatedBackground: true,

      // aiFeatures: false,
    },
    description: 'Premium addon: +1 phone, +2 socials, customization, coin farm bonus',
    isActive: true,
  },
  {
    name: 'VIP',
    displayName: 'VIP Plan',
    code: PlanCode.VIP,
    price: 29.99,
    durationMonths: 1,
    features: {
      cardTypes: ['VIPAC'],
      maxCards: -1, // unlimited

      phoneNumbers: 4,
      socialLinks: 8,

      bioMaxLength: 500,
      additionalFields: 4,

      customization: true,

      additionalPhones: 0,
      additionalSocials: 0,

      // Premium features
      coinFarmBonus: true,
      vipIndicator: true, // VIP
      blackTheme: true,
      privacySettings: true,
      animatedPhoto: true,
      animatedBackground: true,

      // aiFeatures: true,
    },
    description: 'VIP card (VIPAC) with all premium features, privacy settings, VIP indicator',
    isActive: true,
  },
];

export async function seedSubscriptionPlans(dataSource: DataSource) {
  const planRepository = dataSource.getRepository(SubscriptionPlan);

  console.log('Seeding subscription plans...');

  for (const planData of plans) {
    // Check if plan already exists
    const existing = await planRepository.findOne({
      where: { code: planData.code },
    });

    if (existing) {
      console.log(`Plan ${planData.name} already exists, skipping...`);
      continue;
    }

    // Create new plan
    const plan = planRepository.create(planData);
    await planRepository.save(plan);
    console.log(`Created plan: ${planData.name} ($${planData.price})`);
  }

  console.log('Subscription plans seeding completed!');
}
