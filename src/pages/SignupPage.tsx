import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !displayName) {
      setError('All fields are required');
      return;
    }
    navigate('/');
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Leaf className="w-6 h-6 text-emerald-400" />
            <span className="text-xl font-semibold">ROOT</span>
          </Link>
          <h1 className="text-2xl font-light tracking-tight mb-2">Create account</h1>
          <p className="text-zinc-500 text-sm">Join Thailand's plant marketplace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-11 rounded-lg">
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
