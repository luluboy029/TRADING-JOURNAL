/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookMarked, Lock, User, AlertCircle, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: { id: string; username: string }) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMsg('Please specify both username and password.');
      return;
    }

    if (trimmedUser.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authenication failed. Please try again.');
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error connecting to trading ledger engine.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-geo-bg text-slate-100 flex flex-col justify-center items-center p-4 relative font-sans overflow-hidden" id="auth-screen-container">
      {/* Visual background accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-990/5 blur-[150px] pointer-events-none bg-emerald-950/10" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-md w-full"
      >
        {/* Branding header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center p-3.5 bg-blue-600/10 border border-blue-500/20 rounded-xs mb-1">
            <BookMarked className="text-blue-500 stroke-[2.5]" size={28} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-widest text-slate-100 uppercase font-display flex items-center justify-center gap-2 leading-none">
              LACC JOURNAL <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-sm bg-blue-600/15 text-blue-400 border border-blue-500/20">TRADING DESK</span>
            </h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1.5">
              Secure Playbook &amp; Analytics Ledger
            </p>
          </div>
        </div>

        {/* Credentials Form Box */}
        <div className="bg-geo-panel border border-geo-border p-6 rounded-sm shadow-2xl relative overflow-hidden text-left" id="auth-panel">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-teal-500 to-blue-500 opacity-60" />
          
          <h2 className="text-xs font-bold font-display uppercase tracking-widest text-slate-200 border-b border-geo-border/60 pb-3 mb-5 flex items-center gap-1.5">
            {isLoginMode ? (
              <>
                <LogIn size={13} className="text-blue-500" /> Sign In to Workspace
              </>
            ) : (
              <>
                <UserPlus size={13} className="text-emerald-500" /> Register New Account
              </>
            )}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input fields */}
            <div className="space-y-1.5" id="username-field-group">
              <label className="text-[9.5px] font-bold uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1">
                <User size={11} className="text-slate-500" /> Authorized Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  placeholder="e.g. trader_luis"
                  className="w-full bg-slate-950/50 border border-geo-border focus:border-blue-500 text-slate-100 placeholder-slate-600 text-xs py-2 px-3 focus:outline-none transition-colors font-mono uppercase tracking-wide h-10 rounded-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5" id="password-field-group">
              <label className="text-[9.5px] font-bold uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1">
                <Lock size={11} className="text-slate-500" /> Access Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="w-full bg-slate-950/50 border border-geo-border focus:border-blue-500 text-slate-100 placeholder-slate-600 text-xs py-2 px-3 focus:outline-none transition-colors font-mono h-10 rounded-xs"
                />
              </div>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-xs flex items-start gap-2 text-rose-350 pr-2.5 text-rose-450 text-[11px] font-mono leading-normal" id="auth-error-notice">
                <AlertCircle size={15} className="mt-0.5 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-60 text-white font-mono font-bold uppercase tracking-wider text-[11px] rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-6 shadow-md"
              id="auth-submit-button"
            >
              {isLoading ? (
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full border-b border-white animate-spin" />
                  Processing...
                </div>
              ) : isLoginMode ? (
                'Login'
              ) : (
                'Create Secure Profile'
              )}
            </button>
          </form>

          {/* Toggle login vs signup */}
          <div className="mt-5 pt-4 border-t border-geo-border/40 text-center">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setErrorMsg(null);
                setIsLoginMode(!isLoginMode);
              }}
              className="text-[10.5px] font-mono text-slate-400 hover:text-blue-400 cursor-pointer transition-colors"
              id="auth-toggle-mode"
            >
              {isLoginMode ? (
                <span>No profile registered? <strong className="text-blue-400 underline font-bold">Sign Up</strong></span>
              ) : (
                <span>Already registered? <strong className="text-blue-400 underline font-bold">Sign In here</strong></span>
              )}
            </button>
          </div>
        </div>

        {/* Split records description footnote */}
        <div className="mt-5 text-center font-mono text-[9px] text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5 select-none opacity-80 leading-normal max-w-sm mx-auto">
          <Sparkles size={11} className="text-slate-500 animate-pulse" />
          <span>Each profile is assigned a separate sandboxed ledger to record and analyze trade setups privately.</span>
        </div>
      </motion.div>
    </div>
  );
}
