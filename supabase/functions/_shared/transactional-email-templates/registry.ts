/// <reference types="npm:@types/react@18.3.1" />
import type { ComponentType } from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string
}

import { template as membershipActivated } from './membership-activated.tsx'
import { template as membershipRenewed } from './membership-renewed.tsx'
import { template as membershipCancelled } from './membership-cancelled.tsx'
import { template as membershipResumed } from './membership-resumed.tsx'
import { template as membershipPlanChanged } from './membership-plan-changed.tsx'
import { template as paymentFailed } from './payment-failed.tsx'
import { template as paymentActionRequired } from './payment-action-required.tsx'
import { template as purchaseReceipt } from './purchase-receipt.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'membership-activated': membershipActivated,
  'membership-renewed': membershipRenewed,
  'membership-cancelled': membershipCancelled,
  'membership-resumed': membershipResumed,
  'membership-plan-changed': membershipPlanChanged,
  'payment-failed': paymentFailed,
  'payment-action-required': paymentActionRequired,
  'purchase-receipt': purchaseReceipt,
}
