import type { Metadata } from 'next'
import { FlowProvider } from '@/components/FlowProvider'
import { FlowShell } from '@/components/FlowShell'
import './globals.css'

export const metadata: Metadata = {
  title: 'AR Sketch & Trace - Your 7-day drawing plan',
  description: 'A personal 7-day drawing plan, built around you.',
}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <FlowProvider>
          <FlowShell>{children}</FlowShell>
        </FlowProvider>
      </body>
    </html>
  )
}
