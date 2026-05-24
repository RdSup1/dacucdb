import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Clock, CheckCircle2, RotateCcw, X, Calendar, Package } from "lucide-react";

export default function Dashboard() {
    const { user } = useAuth();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        try {
            const { data } = await api.get("/loans/mine");
            setLoans(data);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const active = loans.filter((l) => l.status === "active");
    const queued = loans.filter((l) => l.status === "queued");
    const past = loans.filter((l) => ["returned", "cancelled"].includes(l.status));

    async function doReturn(id) {
        try {
            await api.post(`/loans/${id}/return`);
            toast.success("Equipamento devolvido");
            load();
        } catch (e) {
            toast.error("Erro", { description: formatApiError(e) });
        }
    }

    async function doCancel(id) {
        try {
            await api.post(`/loans/${id}/cancel`);
            toast.success("Solicitação cancelada");
            load();
        } catch (e) {
            toast.error("Erro", { description: formatApiError(e) });
        }
    }

    return (
        <div className="grain bg-[#050505] text-white min-h-screen">
            <Navbar />

            <section className="pt-32 pb-12 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <p className="fs-overline mb-4">Painel</p>
                    <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter" data-testid="dashboard-title">
                        Olá, <span className="text-[#FF5A00]">{user?.name}</span>
                    </h1>
                    <p className="mt-3 text-zinc-400">Acompanhe seus empréstimos ativos e posição na fila.</p>

                    {/* Summary */}
                    <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryCard testid="summary-active" icon={<CheckCircle2 size={16} />} label="Ativos" value={active.length} accent />
                        <SummaryCard testid="summary-queued" icon={<Clock size={16} />} label="Na fila" value={queued.length} />
                        <SummaryCard testid="summary-returned" icon={<RotateCcw size={16} />} label="Devolvidos" value={loans.filter(l => l.status === "returned").length} />
                        <SummaryCard testid="summary-total" icon={<Package size={16} />} label="Total" value={loans.length} />
                    </div>
                </div>
            </section>

            <section className="px-6 md:px-12 pb-24">
                <div className="max-w-7xl mx-auto space-y-12">
                    {loading ? (
                        <p className="text-zinc-500">Carregando...</p>
                    ) : loans.length === 0 ? (
                        <div className="fs-card p-12 text-center" data-testid="dashboard-empty">
                            <p className="font-heading text-2xl">Você ainda não solicitou equipamentos.</p>
                            <Link to="/equipamentos" className="btn-cta mt-6 inline-flex">
                                Explorar catálogo
                            </Link>
                        </div>
                    ) : (
                        <>
                            <LoansBlock testid="active-loans" title="Empréstimos ativos" loans={active} onAction={doReturn} actionLabel="Devolver" actionIcon={<RotateCcw size={14} />} />
                            <LoansBlock testid="queued-loans" title="Na fila inteligente" loans={queued} onAction={doCancel} actionLabel="Cancelar" actionIcon={<X size={14} />} ghost />
                            {past.length > 0 && (
                                <LoansBlock testid="past-loans" title="Histórico" loans={past} />
                            )}
                        </>
                    )}
                </div>
            </section>

            <Footer />
        </div>
    );
}

function SummaryCard({ icon, label, value, accent, testid }) {
    return (
        <div data-testid={testid} className={`fs-card p-5 ${accent ? "border-[#FF5A00]/30" : ""}`}>
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-widest mb-3">
                {icon} <span>{label}</span>
            </div>
            <p className={`font-heading text-4xl font-bold tracking-tight ${accent ? "text-[#FF5A00]" : ""}`}>{value}</p>
        </div>
    );
}

function LoansBlock({ title, loans, onAction, actionLabel, actionIcon, ghost, testid }) {
    if (loans.length === 0) return null;
    return (
        <div data-testid={testid}>
            <h2 className="font-heading text-2xl tracking-tight mb-6">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loans.map((l) => (
                    <div key={l.id} data-testid={`loan-card-${l.id}`} className="fs-card flex overflow-hidden">
                        <img src={l.equipment_image} alt={l.equipment_name} className="w-32 h-32 object-cover bg-black flex-shrink-0" />
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="font-heading text-lg font-semibold leading-tight">{l.equipment_name}</h3>
                                <StatusBadge status={l.status} />
                            </div>
                            <div className="mt-2 text-xs text-zinc-500 flex flex-wrap gap-3">
                                {l.queue_position && (
                                    <span className="flex items-center gap-1"><Clock size={12} /> Posição #{l.queue_position}</span>
                                )}
                                {l.due_date && (
                                    <span className="flex items-center gap-1"><Calendar size={12} /> Até {new Date(l.due_date).toLocaleDateString("pt-BR")}</span>
                                )}
                            </div>
                            {l.notes && <p className="text-xs text-zinc-500 mt-2 italic">"{l.notes}"</p>}
                            {onAction && (
                                <button
                                    data-testid={`loan-action-${l.id}`}
                                    onClick={() => onAction(l.id)}
                                    className={`mt-auto self-start text-xs font-heading font-semibold uppercase tracking-widest flex items-center gap-1 px-3 py-2 mt-3 border transition-colors ${
                                        ghost
                                            ? "border-white/10 text-zinc-400 hover:border-red-500/50 hover:text-red-400"
                                            : "border-[#FF5A00] text-[#FF5A00] hover:bg-[#FF5A00] hover:text-black"
                                    }`}
                                >
                                    {actionIcon} {actionLabel}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        active: { bg: "bg-[#22C55E]/15", border: "border-[#22C55E]/40", text: "text-[#22C55E]", label: "Ativo" },
        queued: { bg: "bg-[#F59E0B]/15", border: "border-[#F59E0B]/40", text: "text-[#F59E0B]", label: "Na fila" },
        returned: { bg: "bg-white/5", border: "border-white/10", text: "text-zinc-500", label: "Devolvido" },
        cancelled: { bg: "bg-white/5", border: "border-white/10", text: "text-zinc-600", label: "Cancelado" },
    };
    const s = map[status] || map.returned;
    return (
        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 border ${s.bg} ${s.border} ${s.text}`}>
            {s.label}
        </span>
    );
}
