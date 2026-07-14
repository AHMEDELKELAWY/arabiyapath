/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, Button, Section, Text, styles } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  plan?: string
  dashboardUrl?: string
}

const Email = ({ name, plan, dashboardUrl = 'https://arabiyapath.com/dashboard' }: Props) => (
  <EmailLayout preview="Welcome back to ArabiyaPath" heading="Welcome Back">
    <Text style={styles.text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
    <Text style={styles.text}>
      Your ArabiyaPath membership is active again{plan ? ` on the ${plan} plan` : ''}. Full access has been restored.
    </Text>
    <Section style={{ textAlign: 'center', margin: '32px 0' }}>
      <Button style={styles.button} href={dashboardUrl}>Jump back in</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Welcome Back',
  displayName: 'Membership Resumed',
  previewData: { name: 'Sara', plan: 'Monthly' },
} satisfies TemplateEntry
