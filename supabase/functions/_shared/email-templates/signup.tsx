/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface Props {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to start learning Arabic with ArabiyaPath</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>ArabiyaPath</Text>
          <Text style={tagline}>Learn Arabic that actually sticks</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Confirm your email</Heading>
          <Text style={text}>
            Welcome to ArabiyaPath! Please confirm that <strong>{recipient}</strong> is your email
            to activate your account and start your first lesson.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={confirmationUrl}>Verify Email</Button>
          </Section>
          <Text style={muted}>
            Or copy this link: <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            If you didn't create an account, you can safely ignore this email.
          </Text>
        </Section>
        <Section style={footWrap}>
          <Text style={footBrand}>
            <Link href={siteUrl} style={footBrandLink}>arabiyapath.com</Link>
          </Text>
          <Text style={footSmall}>© {new Date().getFullYear()} ArabiyaPath. All rights reserved.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#f7f4ee', fontFamily: '"Helvetica Neue", Arial, sans-serif', margin: 0, padding: '32px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const header = { textAlign: 'center' as const, padding: '8px 0 24px' }
const brand = { fontSize: '22px', fontWeight: 700 as const, color: '#1a7a5c', letterSpacing: '0.5px', margin: 0 }
const tagline = { fontSize: '12px', color: '#7a7a7a', margin: '4px 0 0', letterSpacing: '0.3px' }
const card = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '36px 32px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #ece7dd' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: '#1f2b2b', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d4a4a', lineHeight: '1.6', margin: '0 0 16px' }
const muted = { fontSize: '12px', color: '#7a7a7a', lineHeight: '1.5', margin: '16px 0 0', wordBreak: 'break-all' as const }
const button = { backgroundColor: '#1a7a5c', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const link = { color: '#1a7a5c', textDecoration: 'underline' }
const hr = { border: 'none', borderTop: '1px solid #ece7dd', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#7a7a7a', margin: 0 }
const footWrap = { textAlign: 'center' as const, padding: '24px 0 0' }
const footBrand = { fontSize: '13px', color: '#1a7a5c', margin: 0, fontWeight: 600 as const }
const footBrandLink = { color: '#1a7a5c', textDecoration: 'none' }
const footSmall = { fontSize: '11px', color: '#9a9a9a', margin: '4px 0 0' }
