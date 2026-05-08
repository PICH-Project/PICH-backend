export enum PlanCode {
  FREE = 'FREE',
  BUSINESS = 'BUSINESS',
  VIP = 'VIP',
  PREMIUM = 'PREMIUM',
}

export enum SubscriptionType {
  PRIMARY = 'primary', // Basic subscription (FREE/BUSINESS/VIP)
  ADDON = 'addon', // Additional (PREMIUM)
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}
