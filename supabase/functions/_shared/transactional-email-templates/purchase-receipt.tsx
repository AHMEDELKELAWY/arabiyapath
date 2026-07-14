/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, Button, Hr, Section, Text, styles } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  productName?: string
  amount?: string
  currency?: string
  invoiceDate?: string
  transactionId?: string
  dashboardUrl?: string
}

const Email = ({ name, productName, amount, currency, invoiceDate, transactionId, dashboardUrl = 'https://arabiyapath.com/dashboard' }: Props) => (
  <EmailLayout preview="Your ArabiyaPath receipt" heading="Your Receipt">
    <Text style={styles.text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
    <Text style={styles.text}>Thank you for your purchase. Here's a summary of your order:</Text>
    <Hr style={styles.hr} />
    {productName && <Text style={styles.detailRow}><span style={styles.detailLabel}>Product:</span> <strong>{productName}</strong></Text>}
    {amount && <Text style={styles.detailRow}><span style={styles.detailLabel}>Amount:</span> {amount} {currency || 'USD'}</Text>}
    {invoiceDate && <Text style={styles.detailRow}><span style={styles.detailLabel}>Invoice date:</span> {invoiceDate}</Text>}
    {transactionId && <Text style={styles.detailRow}><span style={styles.detailLabel}>Transaction ID:</span> {transactionId}</Text>}
    <Hr style={styles.hr} />
    <Section style={{ textAlign: 'center', margin: '24px 0' }}>
      <Button style={styles.button} href={dashboardUrl}>Access your content</Button>
    </Section>
    <Text style={styles.muted}>Keep this email for your records. Questions? Just reply to this message.</Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your Receipt',
  displayName: 'Purchase Receipt',
  previewData: { name: 'Sara', productName: 'Gulf Arabic — Beginner', amount: '15.00', currency: 'USD', invoiceDate: 'Jul 14, 2026', transactionId: 'ABC123XYZ' },
} satisfies TemplateEntry
