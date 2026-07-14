// Pure decision helper extracted from paypal-webhook so it can be unit-tested.
// Given the number of recorded real payments for a subscription (excluding the
// activation-stub row), decide which membership emails should be enqueued for
// a PAYMENT.SALE.COMPLETED event.
//
// Rule:
//   - First successful payment  -> membership-activated
//   - Subsequent payments       -> membership-renewed
// A purchase-receipt is always sent alongside (handled by the caller).

export interface MembershipEmailDecision {
  sendActivated: boolean;
  sendRenewed: boolean;
}

export function decideMembershipEmails(paidCount: number): MembershipEmailDecision {
  const isFirstPayment = (paidCount ?? 0) <= 1;
  return {
    sendActivated: isFirstPayment,
    sendRenewed: !isFirstPayment,
  };
}
