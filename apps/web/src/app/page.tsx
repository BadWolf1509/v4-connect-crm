import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-v4-red-500" />
          <h1 className="text-4xl font-bold text-white">V4 Connect CRM</h1>
        </div>

        <p className="max-w-lg text-center text-lg text-gray-400">
          CRM conversacional para WhatsApp, Instagram e Messenger. Gerencie atendimentos, vendas e
          campanhas em uma única plataforma.
        </p>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-v4-red-500 px-6 py-3 font-semibold text-white transition hover:bg-v4-red-600"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-gray-700 px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
          >
            Criar conta
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            title="Multi-canal"
            description="WhatsApp, Instagram Direct e Messenger em uma única inbox"
            icon="💬"
          />
          <FeatureCard
            title="CRM Integrado"
            description="Funis de vendas Kanban conectados às conversas"
            icon="📊"
          />
          <FeatureCard
            title="IA Avançada"
            description="Copilot, transcrição de áudios e análise de sentimento"
            icon="🤖"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
