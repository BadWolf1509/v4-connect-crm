'use client';

import { authApi } from '@/lib/api-client';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const company = formData.get('company') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // Register via API
      await authApi.register({ name, email, password, company });

      // Sign in after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Erro ao fazer login. Por favor, tente novamente.');
        return;
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-8 backdrop-blur">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-v4-red-500" />
        <h1 className="text-2xl font-bold text-white">Criar conta</h1>
        <p className="mt-2 text-gray-400">Comece gratuitamente</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-300">
            Seu nome
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="João Silva"
            required
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none focus:ring-1 focus:ring-v4-red-500"
          />
        </div>

        <div>
          <label htmlFor="company" className="mb-2 block text-sm font-medium text-gray-300">
            Nome da empresa
          </label>
          <input
            id="company"
            name="company"
            type="text"
            placeholder="Minha Empresa"
            required
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none focus:ring-1 focus:ring-v4-red-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            required
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none focus:ring-1 focus:ring-v4-red-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none focus:ring-1 focus:ring-v4-red-500"
          />
          <p className="mt-1 text-xs text-gray-500">Mínimo 8 caracteres</p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-v4-red-500 py-3 font-semibold text-white transition hover:bg-v4-red-600 disabled:opacity-50"
        >
          {isLoading ? 'Criando...' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Já tem uma conta?{' '}
        <Link href="/login" className="text-v4-red-500 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
