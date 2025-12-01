import { Header } from '@/components/dashboard/header';
import { Sidebar } from '@/components/dashboard/sidebar';
import { SocketProvider } from '@/providers/socket-provider';
import { Toaster } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocketProvider>
      <div className="flex h-screen bg-gray-950">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto bg-gray-900 p-6">{children}</main>
        </div>
      </div>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            border: '1px solid #374151',
            color: '#f9fafb',
          },
        }}
      />
    </SocketProvider>
  );
}
