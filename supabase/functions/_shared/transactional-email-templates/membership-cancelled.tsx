/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, Button, Section, Text, styles } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  accessUntil?: string
  rejoinUrl?: string
}

const Email = ({ name, accessUntil, rejoinUrl = 'https://arabiyapath.com/pricing' }: Props) => (
  <EmailLayout preview="Your ArabiyaPath membership has been cancelled" heading="Your Membership Has Been Cancelled">
    <Text style={styles.text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
    <Text style={styles.text}>We've cancelled your ArabiyaPath membership. You won't be charged again.</Text>
    {accessUntil && (
      <Text style={styles.text}>
        You'll keep full access until <strong>{accessUntil}</strong> — feel free to keep learning in the meantime.
      </Text>
    )}
    <Section style={{ textAlign: 'center', margin: '32px 0' }}>
      <Button style={styles.buttonGold} href={rejoinUrl}>Rejoin ArabiyaPath</Button>
    </Section>
    <Text style={styles.muted}>Changed your mind? You can rejoin any time and pick up right where you left off.</Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your Membership Has Been Cancelled',
  displayName: 'Membership Cancelled',
  previewData: { name: 'Sara', accessUntil: 'Aug 14, 2026' },
} satisfies TemplateEntry
