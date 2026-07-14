/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, Button, Section, Text, styles } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  plan?: string
  billingPeriod?: string
  dashboardUrl?: string
}

const Email = ({ name, plan = 'Membership', billingPeriod, dashboardUrl = 'https://arabiyapath.com/dashboard' }: Props) => (
  <EmailLayout preview="Welcome to ArabiyaPath Membership" heading="Welcome to ArabiyaPath Membership">
    <Text style={styles.text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
    <Text style={styles.text}>
      Your membership is now active. You have full access to every dialect, level, unit, and flash card pack on ArabiyaPath.
    </Text>
    <Text style={styles.detailRow}><span style={styles.detailLabel}>Plan:</span> <strong>{plan}</strong></Text>
    {billingPeriod && (
      <Text style={styles.detailRow}><span style={styles.detailLabel}>Billing period:</span> {billingPeriod}</Text>
    )}
    <Section style={{ textAlign: 'center', margin: '32px 0' }}>
      <Button style={styles.button} href={dashboardUrl}>Go to your dashboard</Button>
    </Section>
    <Text style={styles.text}>Thank you for choosing ArabiyaPath. Let's make Arabic finally stick.</Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Welcome to ArabiyaPath Membership',
  displayName: 'Membership Activated',
  previewData: { name: 'Sara', plan: 'Yearly', billingPeriod: 'Yearly' },
} satisfies TemplateEntry
