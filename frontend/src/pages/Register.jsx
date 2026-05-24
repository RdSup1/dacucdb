import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Loader2 } from "lucide-react";

export default function Register() {
    const { register } = useAuth();
    const nav = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        if (form.password.length < 6) {
            setErr("A senha deve ter pelo menos 6 caracteres.");
            return;
        }
        setLoading(true);
        const r = await register(form.email, form.password, form.name);
        setLoading(false);
        if (r.ok) nav("/painel");
        else setErr(r.error);
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex">
            <div className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-md">
                    <Link to="/" className="flex items-center gap-2 mb-12" data-testid="register-back-home">
                        <span className="w-2 h-2 bg-[#FF5A00] rounded-full" />
                        <span className="font-heading font-black tracking-tight text-xl">FOMERSTICK</span>
                    </Link>

                    <p className="fs-overline mb-4">Nova conta</p>
                    <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">
                        Comece a usar<br />em <span className="text-[#FF5A00]">60 segundos.</span>
                    </h1>
                    <p className="mt-4 text-zinc-400">
                        Sem cartão de crédito. Acesso imediato ao catálogo.
                    </p>

                    <form onSubmit={onSubmit} className="mt-10 space-y-5" data-testid="register-form">
                        <div>
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Nome completo</label>
                            <input
                                data-testid="register-name-input"
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="fs-input mt-2 w-full px-4 py-3 text-base"
                                placeholder="Maria Silva"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">E-mail</label>
                            <input
                                data-testid="register-email-input"
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="fs-input mt-2 w-full px-4 py-3 text-base"
                                placeholder="voce@empresa.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Senha</label>
                            <input
                                data-testid="register-password-input"
                                type="password"
                                required
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="fs-input mt-2 w-full px-4 py-3 text-base"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>

                        {err && (
                            <div data-testid="register-error" className="border border-red-500/40 bg-red-500/10 text-red-300 text-sm px-4 py-3">
                                {err}
                            </div>
                        )}

                        <button
                            data-testid="register-submit-btn"
                            type="submit"
                            disabled={loading}
                            className="btn-cta w-full justify-center text-base disabled:opacity-60"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <>Criar conta <ArrowRight size={18} /></>}
                        </button>
                    </form>

                    <p className="mt-8 text-sm text-zinc-500">
                        Já tem conta?{" "}
                        <Link to="/login" data-testid="register-to-login" className="text-[#FF5A00] hover:text-[#FF7326]">
                            Entrar
                        </Link>
                    </p>
                </div>
            </div>

            <div className="hidden md:block flex-1 relative border-l border-white/10">
                <img
                    src="https://static.prod-images.emergentagent.com/jobs/029f766b-5f58-45df-9e1d-177b829fd644/images/994c37d5920d1b91787190dfdf8b9c357481662451a9c042c85988c12014c510.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                    <p className="font-heading text-3xl md:text-4xl font-bold leading-tight max-w-md">
                        Sua próxima<br />ferramenta está<br /><span className="text-[#FF5A00]">a um clique.</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
