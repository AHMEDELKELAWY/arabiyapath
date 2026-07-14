/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, Button, Section, Text, styles } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  amount?: string
  currency?: string
  retryUrl?: string
}

const Email = ({ name, amount, currency, retryUrl = 'https://arabiyapath.com/dashboard/progress#membership' }: Props) => (
  <EmailLayout preview="We couldn't process your payment" heading="Payment Failed">
    <Text style={styles.text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
    <Text style={styles.text}>
      We weren't able to process your latest ArabiyaPath payment{amount ? ` of ${amount} ${currency || ''}` : ''}. This usually happens when a card expired or PayPal needs re-approval.
    </Text>
    <Text style={styles.text}>To keep your access active, please update your payment method or retry the payment.</Text>
    <Section style={{ textAlign: 'center', margin: '32px 0' }}>
      <Button style={styles.button} href={retryUrl}>Update payment method</Button>
    </Section>
    <Text style={styles.muted}>Need help? Reply to this email and we'll sort it out.</Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Payment Failed',
  displayName: 'Payment Failed',
  previewData: { name: 'Sara', amount: '15.00', currency: 'USD' },
} satisfies TemplateEntry
