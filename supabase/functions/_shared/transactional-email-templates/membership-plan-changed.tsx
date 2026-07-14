/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, Button, Section, Text, styles } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  previousPlan?: string
  newPlan?: string
  effectiveDate?: string
  dashboardUrl?: string
}

const Email = ({ name, previousPlan, newPlan, effectiveDate, dashboardUrl = 'https://arabiyapath.com/dashboard' }: Props) => (
  <EmailLayout preview="Your ArabiyaPath plan has changed" heading="Your Membership Plan Has Changed">
    <Text style={styles.text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
    <Text style={styles.text}>Your ArabiyaPath plan has been updated.</Text>
    {previousPlan && <Text style={styles.detailRow}><span style={styles.detailLabel}>Previous plan:</span> {previousPlan}</Text>}
    {newPlan && <Text style={styles.detailRow}><span style={styles.detailLabel}>New plan:</span> <strong>{newPlan}</strong></Text>}
    {effectiveDate && <Text style={styles.detailRow}><span style={styles.detailLabel}>Effective:</span> {effectiveDate}</Text>}
    <Section style={{ textAlign: 'center', margin: '32px 0' }}>
      <Button style={styles.button} href={dashboardUrl}>View my membership</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your Membership Plan Has Changed',
  displayName: 'Membership Plan Changed',
  previewData: { name: 'Sara', previousPlan: 'Monthly', newPlan: 'Yearly', effectiveDate: 'Jul 14, 2026' },
} satisfies TemplateEntry
