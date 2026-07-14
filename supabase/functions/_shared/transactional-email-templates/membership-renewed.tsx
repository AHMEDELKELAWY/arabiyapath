/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, Button, Section, Text, styles } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  plan?: string
  renewalDate?: string
  nextBillingDate?: string
  dashboardUrl?: string
}

const Email = ({ name, plan = 'Membership', renewalDate, nextBillingDate, dashboardUrl = 'https://arabiyapath.com/dashboard' }: Props) => (
  <EmailLayout preview="Your ArabiyaPath membership has been renewed" heading="Your Membership Has Been Renewed">
    <Text style={styles.text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
    <Text style={styles.text}>Thanks for continuing your Arabic journey with us. Your membership has been renewed successfully.</Text>
    <Text style={styles.detailRow}><span style={styles.detailLabel}>Plan:</span> <strong>{plan}</strong></Text>
    {renewalDate && <Text style={styles.detailRow}><span style={styles.detailLabel}>Renewal date:</span> {renewalDate}</Text>}
    {nextBillingDate && <Text style={styles.detailRow}><span style={styles.detailLabel}>Next billing:</span> {nextBillingDate}</Text>}
    <Section style={{ textAlign: 'center', margin: '32px 0' }}>
      <Button style={styles.button} href={dashboardUrl}>Continue learning</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your Membership Has Been Renewed',
  displayName: 'Membership Renewed',
  previewData: { name: 'Sara', plan: 'Monthly', renewalDate: 'Jul 14, 2026', nextBillingDate: 'Aug 14, 2026' },
} satisfies TemplateEntry
