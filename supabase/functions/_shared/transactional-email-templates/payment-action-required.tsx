/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, Button, Section, Text, styles } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  approvalUrl?: string
}

const Email = ({ name, approvalUrl = 'https://arabiyapath.com/dashboard' }: Props) => (
  <EmailLayout preview="Action required to complete your payment" heading="Action Required">
    <Text style={styles.text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
    <Text style={styles.text}>
      Your payment needs one more step. Please continue securely on PayPal to approve the transaction.
    </Text>
    <Section style={{ textAlign: 'center', margin: '32px 0' }}>
      <Button style={styles.button} href={approvalUrl}>Continue payment</Button>
    </Section>
    <Text style={styles.muted}>This link is secure and takes you directly to PayPal.</Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Action Required',
  displayName: 'Payment Action Required',
  previewData: { name: 'Sara' },
} satisfies TemplateEntry
