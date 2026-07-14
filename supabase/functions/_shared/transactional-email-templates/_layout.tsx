/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

export const styles = {
  main: { backgroundColor: '#f7f4ee', fontFamily: '"Helvetica Neue", Arial, sans-serif', margin: 0, padding: '32px 0' } as const,
  container: { maxWidth: '560px', margin: '0 auto', padding: '0 16px' } as const,
  header: { textAlign: 'center' as const, padding: '8px 0 24px' },
  brand: { fontSize: '22px', fontWeight: 700 as const, color: '#1a7a5c', letterSpacing: '0.5px', margin: 0 },
  tagline: { fontSize: '12px', color: '#7a7a7a', margin: '4px 0 0', letterSpacing: '0.3px' },
  card: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '36px 32px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #ece7dd' },
  h1: { fontSize: '22px', fontWeight: 700 as const, color: '#1f2b2b', margin: '0 0 16px' },
  text: { fontSize: '15px', color: '#3d4a4a', lineHeight: '1.6', margin: '0 0 16px' },
  muted: { fontSize: '12px', color: '#7a7a7a', lineHeight: '1.5', margin: '16px 0 0' },
  button: { backgroundColor: '#1a7a5c', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' },
  buttonGold: { backgroundColor: '#c8a45c', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' },
  link: { color: '#1a7a5c', textDecoration: 'underline' },
  hr: { border: 'none', borderTop: '1px solid #ece7dd', margin: '24px 0' },
  goldAccent: { display: 'inline-block', width: '40px', height: '3px', backgroundColor: '#c8a45c', borderRadius: '2px', margin: '0 0 16px' },
  footWrap: { textAlign: 'center' as const, padding: '24px 0 0' },
  footBrand: { fontSize: '13px', color: '#1a7a5c', margin: 0, fontWeight: 600 as const },
  footBrandLink: { color: '#1a7a5c', textDecoration: 'none' },
  footSmall: { fontSize: '11px', color: '#9a9a9a', margin: '4px 0 0' },
  detailRow: { fontSize: '14px', color: '#3d4a4a', lineHeight: '1.8', margin: 0 },
  detailLabel: { color: '#7a7a7a', display: 'inline-block', minWidth: '140px' },
}

interface LayoutProps {
  preview: string
  heading: string
  children: React.ReactNode
  siteUrl?: string
}

export const EmailLayout = ({ preview, heading, children, siteUrl = 'https://arabiyapath.com' }: LayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brand}>ArabiyaPath</Text>
          <Text style={styles.tagline}>Learn Arabic that actually sticks</Text>
        </Section>
        <Section style={styles.card}>
          <div style={styles.goldAccent} />
          <Heading style={styles.h1}>{heading}</Heading>
          {children}
        </Section>
        <Section style={styles.footWrap}>
          <Text style={styles.footBrand}>
            <Link href={siteUrl} style={styles.footBrandLink}>arabiyapath.com</Link>
          </Text>
          <Text style={styles.footSmall}>© {new Date().getFullYear()} ArabiyaPath. All rights reserved.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export { Button, Hr, Link, Section, Text }
