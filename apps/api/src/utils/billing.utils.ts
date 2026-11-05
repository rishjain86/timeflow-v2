// apps/api/src/utils/billing.utils.ts

import { Prisma, TimeEntry, ServiceCode, Client } from '@prisma/client';

// Strongly typed interface using Prisma's generated types
export type BillingTimeEntry = TimeEntry & {
  serviceCode: ServiceCode | null;
  client?: Client | null;
};

export const calculateBillingAmount = (entry: BillingTimeEntry): Prisma.Decimal => {
  // Using .toString() safely handles whether the Prisma value is already a Decimal object or a float
  const duration = new Prisma.Decimal(entry.duration ? entry.duration.toString() : '0');
  const rate = new Prisma.Decimal(entry.serviceCode?.defaultRate ? entry.serviceCode.defaultRate.toString() : '0');
  
  return duration.mul(rate);
};
