import { useEffect, useState, useMemo } from "react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { Search, ArrowRight, Clock } from "lucide-react";

const CATEGORIES_ALL = "Todas";

export default function Equipment() {
    const { user } = useAuth();
    const nav = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState(CATEGORIES_ALL);
    const [selected, setSelected] = useState(null);
    const [requestDays, setRequestDays] = useState(7);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        api.get("/equipment")
            .then((r) => setItems(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const categories = useMemo(() => {
        const set = new Set(items.map((i) => i.category));
        return [CATEGORIES_ALL, ...Array.from(set)];
    }, [items]);

    const filtered = items.filter((i) => {
        const q = search.toLowerCase();
        return (
            (category === CATEGORIES_ALL || i.category === category) &&
            (i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
        );
    });

    async function submitLoanRequest() {
        if (!user) {
            nav("/login");
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await api.post("/loans/request", {
                equipment_id: selected.id,
                requested_days: parseInt(requestDays, 10),
                notes,
            });
            if (data.status === "active") {
                toast.success("Empréstimo ativado!", {
                    description: `Devolução prevista: ${new Date(data.due_date).toLocaleDateString("pt-BR")}`,
                });
            } else {
                toast.success("Você entrou na fila", {
                    description: `Posição: #${data.queue_position}`,
                });
            }
            setSelected(null);
            setNotes("");
            setRequestDays(7);
            // Refresh equipment list
            const fresh = await api.get("/equipment");
            setItems(fresh.data);
        } catch (e) {
            toast.error("Erro ao solicitar", { description: formatApiError(e) });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="grain bg-[#050505] text-white min-h-screen">
            <Navbar />

            <section className="pt-32 pb-12 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <p className="fs-overline mb-4">Catálogo</p>
                    <h1 data-testid="equipment-page-title" className="font-heading font-black text-5xl md:text-6xl tracking-tighter">
                        Equipamentos<br /><span className="text-zinc-500">disponíveis.</span>
                    </h1>
                    <p className="mt-6 text-zinc-400 max-w-xl">
                        Selecione um item para entrar na fila ou ativar empréstimo imediato quando houver disponibilidade.
                    </p>

                    {/* Filters */}
                    <div className="mt-12 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                data-testid="equipment-search-input"
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar equipamentos..."
                                className="fs-input w-full pl-11 pr-4 py-3"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {categories.map((c) => (
                                <button
                                    key={c}
                                    data-testid={`category-filter-${c}`}
                                    onClick={() => setCategory(c)}
                                    className={`px-4 py-2 text-sm font-heading font-semibold border transition-all ${
                                        category === c
                                            ? "bg-[#FF5A00] text-black border-[#FF5A00]"
                                            : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-white"
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-6 md:px-12 pb-24">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="fs-card aspect-[4/3] animate-pulse" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-24 text-zinc-500" data-testid="equipment-empty-state">
                            Nenhum equipamento encontrado.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map((eq) => (
                                <div
                                    key={eq.id}
                                    data-testid={`equipment-card-${eq.id}`}
                                    className="fs-card group overflow-hidden flex flex-col"
                                >
                                    <div className="aspect-[4/3] overflow-hidden bg-black relative">
                                        <img
                                            src={eq.image_url}
                                            alt={eq.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute top-3 left-3">
                                            <span className="bg-black/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-[#FF5A00] border border-white/10">
                                                {eq.category}
                                            </span>
                                        </div>
                                        <div className="absolute top-3 right-3">
                                            {eq.available_units > 0 ? (
                                                <span className="bg-[#22C55E]/20 border border-[#22C55E]/40 text-[#22C55E] px-3 py-1 text-xs font-bold">
                                                    {eq.available_units}/{eq.total_units} livres
                                                </span>
                                            ) : (
                                                <span className="bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] px-3 py-1 text-xs font-bold flex items-center gap-1">
                                                    <Clock size={12} /> Em fila
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="font-heading text-xl font-semibold leading-tight">{eq.name}</h3>
                                        {eq.specs && (
                                            <p className="text-xs text-zinc-500 mt-2 font-mono">{eq.specs}</p>
                                        )}
                                        <p className="text-sm text-zinc-400 mt-4 leading-relaxed flex-1">{eq.description}</p>
                                        <button
                                            data-testid={`request-loan-btn-${eq.id}`}
                                            onClick={() => setSelected(eq)}
                                            className="mt-6 w-full flex items-center justify-between border border-white/10 px-4 py-3 hover:border-[#FF5A00] hover:text-[#FF5A00] transition-colors font-heading font-semibold text-sm"
                                        >
                                            {eq.available_units > 0 ? "Solicitar agora" : "Entrar na fila"}
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
                <DialogContent
                    data-testid="loan-request-dialog"
                    className="bg-[#0A0A0A] border-white/10 text-white max-w-md rounded-none"
                >
                    <DialogHeader>
                        <DialogTitle className="font-heading text-2xl tracking-tight">
                            Solicitar {selected?.name}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {selected?.available_units > 0
                                ? "Há unidades disponíveis. Seu empréstimo será ativado imediatamente."
                                : "Você entrará na fila inteligente. Sua posição depende do algoritmo de equidade."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Período (dias)</label>
                            <input
                                data-testid="loan-days-input"
                                type="number"
                                min={1}
                                max={30}
                                value={requestDays}
                                onChange={(e) => setRequestDays(e.target.value)}
                                className="fs-input mt-2 w-full px-4 py-3"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Observações (opcional)</label>
                            <textarea
                                data-testid="loan-notes-input"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Projeto, finalidade, contato..."
                                className="fs-input mt-2 w-full px-4 py-3 resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <button
                            data-testid="loan-cancel-btn"
                            onClick={() => setSelected(null)}
                            className="btn-ghost"
                        >
                            Cancelar
                        </button>
                        <button
                            data-testid="loan-confirm-btn"
                            onClick={submitLoanRequest}
                            disabled={submitting}
                            className="btn-cta disabled:opacity-60"
                        >
                            {submitting ? "Enviando..." : "Confirmar"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Footer />
        </div>
    );
}
