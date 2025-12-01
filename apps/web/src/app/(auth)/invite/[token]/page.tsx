'use client';

import { Building2, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface InviteDetails {
  email: string;
  role: string;
  tenant: {
    name: string;
    slug: string;
  } | null;
  expiresAt: string;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    async function fetchInvite() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/v1/invite/${token}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Invite not found');
        }

        const data = await response.json();
        setInvite(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invite');
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/invite/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to accept invite');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-xl font-semibold text-white">Convite Inválido</h1>
            <p className="mt-2 text-sm text-gray-400">{error}</p>
          </div>
          <div className="mt-6 flex justify-center">
            <Link
              href="/login"
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              Ir para Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <h1 className="text-xl font-semibold text-white">Conta Criada!</h1>
            <p className="mt-2 text-sm text-gray-400">
              Sua conta foi criada com sucesso. Você será redirecionado para o login em alguns
              segundos.
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            <Link
              href="/login"
              className="rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600"
            >
              Fazer Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-v4-red-500/10">
            <Building2 className="h-6 w-6 text-v4-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-white">Você foi convidado!</h1>
          <p className="mt-2 text-sm text-gray-400">
            {invite?.tenant?.name
              ? `Você foi convidado para participar da equipe ${invite.tenant.name}`
              : 'Complete seu cadastro para aceitar o convite'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="rounded-lg bg-gray-800 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Email:</span>
              <span className="font-medium text-white">{invite?.email}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-gray-400">Função:</span>
              <span className="font-medium capitalize text-white">{invite?.role}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Seu nome
            </label>
            <input
              id="name"
              type="text"
              placeholder="Digite seu nome completo"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Senha
            </label>
            <input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
              Confirmar senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Aceitar Convite
          </button>

          <p className="text-center text-xs text-gray-400">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-v4-red-500 hover:underline">
              Fazer login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
