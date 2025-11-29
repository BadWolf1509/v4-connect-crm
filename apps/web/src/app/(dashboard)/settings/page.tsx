import { redirect } from 'next/navigation';

export default function SettingsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redirect('/settings/channels' as any);
}
