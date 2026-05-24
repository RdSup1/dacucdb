import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Loader2 } from "lucide-react";

export default function Login() {
    const { login } = useAuth();
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        setLoading(true);
        const r = await login(email, password);
        setLoading(false);
        if (r.ok) nav("/painel");
        else setErr(r.error);
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex">
            <div className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-md">
                    <Link to="/" className="flex items-center gap-2 mb-12" data-testid="login-back-home">
                        <span className="w-2 h-2 bg-[#FF5A00] rounded-full" />
                        <span className="font-heading font-black tracking-tight text-xl">FOMERSTICK</span>
                    </Link>

                    <p className="fs-overline mb-4">Acesso</p>
                    <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">
                        Bem-vindo<br />de volta.
                    </h1>
                    <p className="mt-4 text-zinc-400">
                        Entre para gerenciar seus empréstimos e acompanhar a fila.
                    </p>

                    <form onSubmit={onSubmit} className="mt-10 space-y-5" data-testid="login-form">
                        <div>
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">E-mail</label>
                            <input
                                data-testid="login-email-input"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="fs-input mt-2 w-full px-4 py-3 text-base"
                                placeholder="voce@empresa.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Senha</label>
                            <input
                                data-testid="login-password-input"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="fs-input mt-2 w-full px-4 py-3 text-base"
                                placeholder="••••••••"
                            />
                        </div>

                        {err && (
                            <div data-testid="login-error" className="border border-red-500/40 bg-red-500/10 text-red-300 text-sm px-4 py-3">
                                {err}
                            </div>
                        )}

                        <button
                            data-testid="login-submit-btn"
                            type="submit"
                            disabled={loading}
                            className="btn-cta w-full justify-center text-base disabled:opacity-60"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <>Entrar <ArrowRight size={18} /></>}
                        </button>
                    </form>

                    <p className="mt-8 text-sm text-zinc-500">
                        Ainda não tem conta?{" "}
                        <Link to="/cadastro" data-testid="login-to-register" className="text-[#FF5A00] hover:text-[#FF7326]">
                            Criar conta
                        </Link>
                    </p>
                </div>
            </div>

            <div className="hidden md:block flex-1 relative border-l border-white/10">
                <img
                    src="https://static.prod-images.emergentagent.com/jobs/029f766b-5f58-45df-9e1d-177b829fd644/images/1a22ba0206b210b0a5f61a4d1f37ccc5ba0eec4eeee03de0bd7d45c88edda337.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                    <p className="font-heading text-3xl md:text-4xl font-bold leading-tight max-w-md">
                        Equidade não é<br />opcional. É <span className="text-[#FF5A00]">arquitetura.</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
