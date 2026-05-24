import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChevronRight, LogOut, User } from "lucide-react";

export default function Navbar() {
    const { user, logout } = useAuth();
    const nav = useNavigate();

    return (
        <header
            data-testid="site-navbar"
            className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/10"
        >
            <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
                <Link to="/" data-testid="nav-logo" className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#FF5A00] rounded-full" />
                    <span className="font-heading font-black tracking-tight text-xl">FOMERSTICK</span>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-300">
                    <NavLink
                        to="/equipamentos"
                        data-testid="nav-equipment"
                        className={({ isActive }) =>
                            `hover:text-white transition-colors ${isActive ? "text-white" : ""}`
                        }
                    >
                        Equipamentos
                    </NavLink>
                    <a href="/#como-funciona" data-testid="nav-how" className="hover:text-white transition-colors">
                        Como funciona
                    </a>
                    <a href="/#faq" data-testid="nav-faq" className="hover:text-white transition-colors">
                        FAQ
                    </a>
                    {user && (
                        <NavLink
                            to="/painel"
                            data-testid="nav-dashboard"
                            className={({ isActive }) =>
                                `hover:text-white transition-colors ${isActive ? "text-white" : ""}`
                            }
                        >
                            Meu Painel
                        </NavLink>
                    )}
                    {user?.role === "admin" && (
                        <NavLink
                            to="/admin"
                            data-testid="nav-admin"
                            className={({ isActive }) =>
                                `hover:text-[#FF5A00] transition-colors text-[#FF5A00]/80 ${isActive ? "text-[#FF5A00]" : ""}`
                            }
                        >
                            Admin
                        </NavLink>
                    )}
                </nav>

                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
                                <User size={14} />
                                <span data-testid="navbar-user-name">{user.name}</span>
                            </div>
                            <button
                                data-testid="navbar-logout-btn"
                                onClick={() => {
                                    logout();
                                    nav("/");
                                }}
                                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                            >
                                <LogOut size={14} /> Sair
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                data-testid="navbar-login-link"
                                className="text-sm text-zinc-300 hover:text-white transition-colors"
                            >
                                Entrar
                            </Link>
                            <Link
                                to="/cadastro"
                                data-testid="navbar-signup-btn"
                                className="bg-[#FF5A00] hover:bg-[#FF7326] text-black font-heading font-bold text-sm px-4 py-2 rounded-sm flex items-center gap-1 transition-all hover:-translate-y-0.5"
                            >
                                Começar <ChevronRight size={14} />
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
