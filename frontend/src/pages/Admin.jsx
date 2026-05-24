import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { toast } from "sonner";
import { Trash2, Plus, Package, Users, Clock, Activity } from "lucide-react";

export default function Admin() {
    const [equipment, setEquipment] = useState([]);
    const [loans, setLoans] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({
        name: "", category: "", description: "", image_url: "", specs: "", total_units: 1,
    });
    const [submitting, setSubmitting] = useState(false);

    async function loadAll() {
        const [eq, ln] = await Promise.all([
            api.get("/equipment"),
            api.get("/loans/all").catch(() => ({ data: [] })),
        ]);
        setEquipment(eq.data);
        setLoans(ln.data);
    }

    useEffect(() => { loadAll(); }, []);

    async function addEquipment(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post("/equipment", {
                ...form,
                total_units: parseInt(form.total_units, 10),
            });
            toast.success("Equipamento adicionado");
            setShowAdd(false);
            setForm({ name: "", category: "", description: "", image_url: "", specs: "", total_units: 1 });
            loadAll();
        } catch (err) {
            toast.error("Erro", { description: formatApiError(err) });
        } finally {
            setSubmitting(false);
        }
    }

    async function removeEquipment(id) {
        if (!confirm("Remover este equipamento?")) return;
        try {
            await api.delete(`/equipment/${id}`);
            toast.success("Equipamento removido");
            loadAll();
        } catch (err) {
            toast.error("Erro", { description: formatApiError(err) });
        }
    }

    return (
        <div className="grain bg-[#050505] text-white min-h-screen">
            <Navbar />

            <section className="pt-32 pb-12 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <p className="fs-overline mb-4">Administrador</p>
                    <h1 data-testid="admin-title" className="font-heading font-black text-4xl md:text-5xl tracking-tighter">
                        Painel <span className="text-[#FF5A00]">de controle.</span>
                    </h1>

                    <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Stat testid="admin-stat-equipment" icon={<Package size={16} />} label="Equipamentos" value={equipment.length} />
                        <Stat testid="admin-stat-active" icon={<Activity size={16} />} label="Ativos" value={loans.filter(l => l.status === "active").length} accent />
                        <Stat testid="admin-stat-queued" icon={<Clock size={16} />} label="Na fila" value={loans.filter(l => l.status === "queued").length} />
                        <Stat testid="admin-stat-users" icon={<Users size={16} />} label="Solicitações" value={loans.length} />
                    </div>

                    <div className="mt-12 flex items-center justify-between flex-wrap gap-4">
                        <h2 className="font-heading text-2xl tracking-tight">Equipamentos</h2>
                        <button
                            data-testid="add-equipment-btn"
                            onClick={() => setShowAdd(!showAdd)}
                            className="btn-cta"
                        >
                            <Plus size={16} /> {showAdd ? "Fechar" : "Adicionar"}
                        </button>
                    </div>

                    {showAdd && (
                        <form
                            data-testid="add-equipment-form"
                            onSubmit={addEquipment}
                            className="mt-6 fs-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            <div>
                                <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Nome</label>
                                <input
                                    data-testid="new-eq-name"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="fs-input mt-2 w-full px-4 py-3"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Categoria</label>
                                <input
                                    data-testid="new-eq-category"
                                    required
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="fs-input mt-2 w-full px-4 py-3"
                                    placeholder="Notebook, GPU, Audiovisual..."
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Descrição</label>
                                <textarea
                                    data-testid="new-eq-description"
                                    required
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="fs-input mt-2 w-full px-4 py-3 resize-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">URL da imagem</label>
                                <input
                                    data-testid="new-eq-image"
                                    required
                                    type="url"
                                    value={form.image_url}
                                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                                    className="fs-input mt-2 w-full px-4 py-3"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Specs</label>
                                <input
                                    data-testid="new-eq-specs"
                                    value={form.specs}
                                    onChange={(e) => setForm({ ...form, specs: e.target.value })}
                                    className="fs-input mt-2 w-full px-4 py-3"
                                    placeholder="M3 · 32GB · 1TB"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Total de unidades</label>
                                <input
                                    data-testid="new-eq-units"
                                    type="number"
                                    min={1}
                                    required
                                    value={form.total_units}
                                    onChange={(e) => setForm({ ...form, total_units: e.target.value })}
                                    className="fs-input mt-2 w-full px-4 py-3"
                                />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button data-testid="submit-new-equipment" type="submit" disabled={submitting} className="btn-cta">
                                    {submitting ? "Salvando..." : "Salvar equipamento"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Equipment list */}
                    <div className="mt-6 fs-card overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs uppercase tracking-widest text-zinc-500 font-bold border-b border-white/10">
                            <div className="col-span-5">Equipamento</div>
                            <div className="col-span-2">Categoria</div>
                            <div className="col-span-3">Disponibilidade</div>
                            <div className="col-span-2 text-right">Ações</div>
                        </div>
                        {equipment.length === 0 && (
                            <p className="px-6 py-12 text-center text-zinc-500" data-testid="admin-no-equipment">Nenhum equipamento cadastrado.</p>
                        )}
                        {equipment.map((eq) => (
                            <div key={eq.id} data-testid={`admin-eq-row-${eq.id}`} className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-white/5 hover:bg-white/[0.02]">
                                <div className="col-span-5 flex items-center gap-3">
                                    <img src={eq.image_url} alt="" className="w-12 h-12 object-cover" />
                                    <div>
                                        <p className="font-heading font-semibold">{eq.name}</p>
                                        <p className="text-xs text-zinc-500">{eq.specs}</p>
                                    </div>
                                </div>
                                <div className="col-span-2 text-sm text-zinc-400">{eq.category}</div>
                                <div className="col-span-3">
                                    <div className="text-sm">{eq.available_units} / {eq.total_units}</div>
                                    <div className="mt-1 h-1 bg-white/10 w-full">
                                        <div
                                            className="h-full bg-[#FF5A00]"
                                            style={{ width: `${(eq.available_units / eq.total_units) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2 text-right">
                                    <button
                                        data-testid={`delete-eq-${eq.id}`}
                                        onClick={() => removeEquipment(eq.id)}
                                        className="text-zinc-500 hover:text-red-400 transition-colors p-2"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* All loans */}
                    <div className="mt-16">
                        <h2 className="font-heading text-2xl tracking-tight mb-6">Todas as solicitações</h2>
                        <div className="fs-card overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs uppercase tracking-widest text-zinc-500 font-bold border-b border-white/10">
                                <div className="col-span-3">Usuário</div>
                                <div className="col-span-3">Equipamento</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2">Posição/Vencimento</div>
                                <div className="col-span-2">Solicitado em</div>
                            </div>
                            {loans.length === 0 && (
                                <p className="px-6 py-12 text-center text-zinc-500">Nenhuma solicitação ainda.</p>
                            )}
                            {loans.map((l) => (
                                <div key={l.id} data-testid={`admin-loan-row-${l.id}`} className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-white/5 text-sm">
                                    <div className="col-span-3">
                                        <p className="font-semibold">{l.user_name}</p>
                                        <p className="text-xs text-zinc-500">{l.user_email}</p>
                                    </div>
                                    <div className="col-span-3 text-zinc-300">{l.equipment_name}</div>
                                    <div className="col-span-2">
                                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 border ${statusClass(l.status)}`}>
                                            {statusLabel(l.status)}
                                        </span>
                                    </div>
                                    <div className="col-span-2 text-xs text-zinc-400">
                                        {l.queue_position ? `Fila #${l.queue_position}` : l.due_date ? new Date(l.due_date).toLocaleDateString("pt-BR") : "—"}
                                    </div>
                                    <div className="col-span-2 text-xs text-zinc-500">
                                        {new Date(l.requested_at).toLocaleDateString("pt-BR")}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

function Stat({ icon, label, value, accent, testid }) {
    return (
        <div data-testid={testid} className={`fs-card p-5 ${accent ? "border-[#FF5A00]/30" : ""}`}>
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-widest mb-3">
                {icon} <span>{label}</span>
            </div>
            <p className={`font-heading text-4xl font-bold tracking-tight ${accent ? "text-[#FF5A00]" : ""}`}>{value}</p>
        </div>
    );
}

function statusClass(s) {
    return {
        active: "bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]",
        queued: "bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]",
        returned: "bg-white/5 border-white/10 text-zinc-400",
        cancelled: "bg-white/5 border-white/10 text-zinc-600",
    }[s] || "bg-white/5 border-white/10 text-zinc-400";
}
function statusLabel(s) {
    return { active: "Ativo", queued: "Na fila", returned: "Devolvido", cancelled: "Cancelado" }[s] || s;
}
