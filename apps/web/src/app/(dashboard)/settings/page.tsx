import { redirect } from 'next/navigation';

export default function SettingsPage() {
  // biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes workaround
  redirect('/settings/channels' as any);
}
