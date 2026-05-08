import { DataSource } from 'typeorm';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { PlanCode } from '../subscriptions/plan-code.enum';

export async function seedSubscriptionPlans(dataSource: DataSource) {
  const planRepository = dataSource.getRepository(SubscriptionPlan);

  const plans = [
    {
      name: 'FREE',
      displayName: 'Personal Card',
      code: PlanCode.FREE,
      price: 0,
      durationMonths: 0, // lifetime
      features: {
        maxCards: 1,
        cardTypes: ['PAC'],
        phoneNumbers: 1,
        socialLinks: 4,
        customization: false,
        aiFeatures: false,
      },
      description: 'Perfect for personal use. Create your digital business card for free.',
      isActive: true,
    },
    {
      name: 'BUSINESS',
      displayName: 'Business Card',
      code: PlanCode.BUSINESS,
      price: 9.99,
      durationMonths: 1, // monthly
      features: {
        maxCards: -1, // unlimited
        cardTypes: ['PAC', 'BAC'],
        phoneNumbers: 2,
        socialLinks: 5,
        customization: true,
        aiFeatures: false,
      },
      description: 'For professionals and small businesses. Unlimited cards with customization.',
      isActive: true,
    },
    {
      name: 'VIP',
      displayName: 'VIP Card',
      code: PlanCode.VIP,
      price: 29.99,
      durationMonths: 1, // monthly
      features: {
        maxCards: -1, // unlimited
        cardTypes: ['PAC', 'BAC', 'VIPAC'],
        phoneNumbers: 4,
        socialLinks: 8,
        customization: true,
        aiFeatures: true,
      },
      description: 'Premium features with AI-powered tools and maximum customization.',
      isActive: true,
    },
  ];

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
