/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'

// Generic template that renders pre-built HTML produced by the project's
// existing _shared/email-templates.ts builder. This lets us migrate every
// existing transactional email to the Lovable Email queue without porting
// each one to React Email.
//
// The HTML passed in is first-party — produced server-side by our own
// trusted template builder — never user input. dangerouslySetInnerHTML is
// safe in this controlled context.
interface RawHtmlProps {
  html?: string
  subject?: string
}

const RawHtmlEmail = ({ html = '' }: RawHtmlProps) => {
  // React Email's renderAsync wraps the output as needed. We emit the
  // already-prepared HTML through dangerouslySetInnerHTML so the existing
  // brand styles in _shared/email-templates.ts pass through untouched.
  return React.createElement('div', {
    dangerouslySetInnerHTML: { __html: html },
  })
}

export const template = {
  component: RawHtmlEmail,
  subject: (data: Record<string, any>) =>
    (data?.subject as string) || 'Family Desk notification',
  displayName: 'Raw HTML wrapper',
  previewData: {
    subject: 'Sample Family Desk email',
    html:
      '<div style="font-family:sans-serif;padding:24px;color:#2C2C2A">' +
      '<h1 style="color:#0F6E56">Hello from Family Desk</h1>' +
      '<p>This is a preview of the raw-html template.</p></div>',
  },
} satisfies TemplateEntry