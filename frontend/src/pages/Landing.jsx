import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import {
    ArrowRight, Shield, Cpu, Layers, Sparkles, Zap, Check,
    ChevronDown, Clock, Users, HardDrive
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";

const HERO_IMG =
    "https://static.prod-images.emergentagent.com/jobs/029f766b-5f58-45df-9e1d-177b829fd644/images/994c37d5920d1b91787190dfdf8b9c357481662451a9c042c85988c12014c510.png";
const MACRO_IMG =
    "https://static.prod-images.emergentagent.com/jobs/029f766b-5f58-45df-9e1d-177b829fd644/images/1a22ba0206b210b0a5f61a4d1f37ccc5ba0eec4eeee03de0bd7d45c88edda337.png";
const CTA_BG =
    "https://static.prod-images.emergentagent.com/jobs/029f766b-5f58-45df-9e1d-177b829fd644/images/658a438405fadb8e1d121098f5a9873fa7b2c31474717d898f1eb23c874e42e8.png";

export default function Landing() {
    const [stats, setStats] = useState({
        total_equipment: 0, active_loans: 0, queued_requests: 0, total_users: 0,
    });
    const [equipment, setEquipment] = useState([]);

    useEffect(() => {
        api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
        api.get("/equipment").then((r) => setEquipment(r.data.slice(0, 4))).catch(() => {});
    }, []);

    return (
        <div className="grain bg-[#050505] text-white min-h-screen">
            <Navbar />

            {/* HERO */}
            <section data-testid="hero-section" className="relative overflow-hidden pt-32 md:pt-40 pb-16 md:pb-24">
                <div className="hero-glow" style={{ top: "-150px", right: "-200px" }} />
                <div className="hero-glow" style={{ bottom: "-200px", left: "-200px", opacity: 0.7 }} />

                <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                    <div className="grid grid-cols-12 gap-6 md:gap-10 items-end">
                        <div className="col-span-12 md:col-span-7 reveal">
                            <p className="fs-overline mb-6" data-testid="hero-overline">
                                <span className="inline-block w-8 h-px bg-[#FF5A00] align-middle mr-3" />
                                Equidade · Fila Inteligente
                            </p>
                            <h1
                                data-testid="hero-title"
                                className="font-heading font-black tracking-tighter text-5xl sm:text-6xl md:text-7xl lg:text-[7.5rem] leading-[0.92]"
                            >
                                Equipamentos<br />
                                <span className="text-zinc-500">que circulam</span><br />
                                com <span className="text-[#FF5A00]">justiça.</span>
                            </h1>
                            <p
                                data-testid="hero-subtitle"
                                className="mt-8 text-zinc-400 max-w-xl text-base md:text-lg leading-relaxed"
                            >
                                Plataforma profissional de gerenciamento e empréstimo. Algoritmo de equidade
                                garante que cada pessoa do laboratório tenha acesso aos notebooks, SSDs e
                                instrumentos certos — na hora certa.
                            </p>
                            <div className="mt-10 flex flex-wrap gap-4">
                                <Link to="/cadastro" data-testid="hero-cta-primary" className="btn-cta">
                                    Acessar plataforma <ArrowRight size={18} />
                                </Link>
                                <Link to="/equipamentos" data-testid="hero-cta-secondary" className="btn-ghost">
                                    Ver catálogo
                                </Link>
                            </div>
                        </div>

                        <div className="col-span-12 md:col-span-5 hidden md:block reveal" style={{ animationDelay: "150ms" }}>
                            <div className="grid grid-cols-2 gap-4">
                                <StatTile testid="stat-equipment" label="Equipamentos" value={stats.total_equipment} icon={<HardDrive size={16} />} />
                                <StatTile testid="stat-active" label="Em uso" value={stats.active_loans} icon={<Zap size={16} />} />
                                <StatTile testid="stat-queue" label="Na fila" value={stats.queued_requests} icon={<Clock size={16} />} />
                                <StatTile testid="stat-users" label="Usuários" value={stats.total_users} icon={<Users size={16} />} />
                            </div>
                        </div>
                    </div>

                    {/* Hero image */}
                    <div className="mt-16 md:mt-24 relative reveal" style={{ animationDelay: "300ms" }}>
                        <div className="absolute -inset-x-12 -top-12 -bottom-12 bg-gradient-to-b from-[#FF5A00]/10 via-transparent to-transparent blur-3xl pointer-events-none" />
                        <img
                            src={HERO_IMG}
                            alt="Equipamentos profissionais — notebooks, SSDs e instrumentos de laboratório"
                            data-testid="hero-image"
                            className="relative w-full h-[420px] md:h-[640px] object-cover border border-white/10"
                            style={{ borderRadius: 2 }}
                        />
                        <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-between gap-4">
                            <div className="backdrop-blur-md bg-black/40 border border-white/10 px-4 py-3">
                                <p className="text-xs uppercase tracking-widest text-zinc-400">Catálogo curado</p>
                                <p className="font-heading text-lg">Hardware de bancada · Notebooks · GPUs · Instrumentos</p>
                            </div>
                            <div className="backdrop-blur-md bg-black/40 border border-white/10 px-4 py-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                                <p className="text-sm">Sistema operacional · v1.0</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MARQUEE / TRUST */}
            <section className="border-y border-white/5 py-8 overflow-hidden">
                <div className="marquee-track flex gap-16 whitespace-nowrap text-zinc-600 font-heading text-2xl md:text-3xl tracking-tight">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex gap-16 items-center">
                            <span>Laboratórios</span><span className="text-[#FF5A00]">·</span>
                            <span>Startups</span><span className="text-[#FF5A00]">·</span>
                            <span>Universidades</span><span className="text-[#FF5A00]">·</span>
                            <span>Estúdios criativos</span><span className="text-[#FF5A00]">·</span>
                            <span>Equipes de engenharia</span><span className="text-[#FF5A00]">·</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* RECURSOS — Bento */}
            <section data-testid="features-section" className="py-24 md:py-32 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-12 gap-8 mb-16">
                        <div className="col-span-12 md:col-span-5">
                            <p className="fs-overline mb-4">Recursos</p>
                            <h2 className="font-heading font-bold text-4xl sm:text-5xl tracking-tight leading-[1.05]">
                                Construído para<br />
                                <span className="text-zinc-500">decisões justas.</span>
                            </h2>
                        </div>
                        <div className="col-span-12 md:col-span-6 md:col-start-7 flex items-end">
                            <p className="text-zinc-400 leading-relaxed">
                                Cada recurso foi pensado para eliminar fricções e garantir que o equipamento
                                certo chegue à pessoa certa, sem favoritismos.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <FeatureCard
                            testid="feature-equity"
                            icon={<Shield size={24} />}
                            title="Algoritmo de Equidade"
                            text="Distribuição inteligente baseada em histórico de uso nos últimos 30 dias. Quem usou menos, recebe primeiro."
                            className="md:col-span-7 md:row-span-2"
                            tall
                            image={MACRO_IMG}
                        />
                        <FeatureCard
                            testid="feature-queue"
                            icon={<Layers size={24} />}
                            title="Fila Inteligente"
                            text="Reordenação automática em tempo real conforme equipamentos são devolvidos."
                            className="md:col-span-5"
                        />
                        <FeatureCard
                            testid="feature-tracking"
                            icon={<Cpu size={24} />}
                            title="Rastreamento Total"
                            text="Histórico de cada empréstimo, status em tempo real e devolução com um clique."
                            className="md:col-span-5"
                        />
                        <FeatureCard
                            testid="feature-catalog"
                            icon={<Sparkles size={24} />}
                            title="Catálogo Premium"
                            text="Notebooks, SSDs, GPUs, câmeras e instrumentos de bancada. Adicione novos itens em segundos."
                            className="md:col-span-4"
                        />
                        <FeatureCard
                            testid="feature-admin"
                            icon={<Zap size={24} />}
                            title="Painel Administrativo"
                            text="Visão completa de quem está usando o quê, quando, e por quanto tempo."
                            className="md:col-span-4"
                        />
                        <FeatureCard
                            testid="feature-fast"
                            icon={<Check size={24} />}
                            title="Aprovação Instantânea"
                            text="Quando há disponibilidade, o empréstimo é ativado automaticamente."
                            className="md:col-span-4"
                        />
                    </div>
                </div>
            </section>

            {/* COMO FUNCIONA */}
            <section id="como-funciona" data-testid="how-it-works-section" className="py-24 md:py-32 px-6 md:px-12 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-16">
                        <p className="fs-overline mb-4">Processo</p>
                        <h2 className="font-heading font-bold text-4xl sm:text-5xl tracking-tight leading-[1.05] max-w-3xl">
                            Três passos. <span className="text-[#FF5A00]">Zero burocracia.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
                        {[
                            { step: "01", title: "Solicite", text: "Navegue pelo catálogo, escolha o equipamento e defina o período. Sua solicitação entra na fila inteligente." },
                            { step: "02", title: "Aguarde", text: "Nosso algoritmo de equidade calcula sua posição com base no histórico de uso. Você é notificado quando ativo." },
                            { step: "03", title: "Use & devolva", text: "Receba o equipamento, use durante o período acordado e devolva com um clique. Próximo da fila é ativado automaticamente." },
                        ].map((s) => (
                            <div key={s.step} className="bg-[#0A0A0A] p-10 md:p-12 hover:bg-[#0F0F0F] transition-colors">
                                <p className="font-heading text-7xl font-black text-[#FF5A00]/30 leading-none">{s.step}</p>
                                <h3 className="mt-8 font-heading text-2xl font-semibold">{s.title}</h3>
                                <p className="mt-4 text-zinc-400 leading-relaxed">{s.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* EQUIPAMENTOS PREVIEW */}
            <section data-testid="equipment-preview-section" className="py-24 md:py-32 px-6 md:px-12 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
                        <div>
                            <p className="fs-overline mb-4">Catálogo</p>
                            <h2 className="font-heading font-bold text-4xl sm:text-5xl tracking-tight">
                                Equipamentos em destaque
                            </h2>
                        </div>
                        <Link to="/equipamentos" data-testid="see-all-equipment" className="text-[#FF5A00] hover:text-[#FF7326] flex items-center gap-2 font-heading font-semibold">
                            Ver todos <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {equipment.length === 0 ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="fs-card aspect-[3/4] animate-pulse" />
                            ))
                        ) : (
                            equipment.map((eq) => (
                                <Link
                                    key={eq.id}
                                    to="/equipamentos"
                                    data-testid={`equipment-preview-${eq.id}`}
                                    className="fs-card group block overflow-hidden"
                                >
                                    <div className="aspect-[4/3] overflow-hidden bg-black">
                                        <img
                                            src={eq.image_url}
                                            alt={eq.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                    </div>
                                    <div className="p-5">
                                        <p className="text-xs uppercase tracking-widest text-[#FF5A00]">{eq.category}</p>
                                        <h3 className="font-heading text-lg font-semibold mt-2 leading-tight">{eq.name}</h3>
                                        <p className="text-xs text-zinc-500 mt-3">
                                            {eq.available_units} de {eq.total_units} disponíveis
                                        </p>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" data-testid="faq-section" className="py-24 md:py-32 px-6 md:px-12 border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-12 text-center">
                        <p className="fs-overline mb-4">FAQ</p>
                        <h2 className="font-heading font-bold text-4xl sm:text-5xl tracking-tight">
                            Perguntas frequentes
                        </h2>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        {[
                            { q: "Como funciona o algoritmo de equidade?", a: "Cada solicitação recebe uma pontuação baseada no histórico de empréstimos do usuário nos últimos 30 dias. Quem usou menos equipamentos tem prioridade na fila, garantindo distribuição justa entre todos os membros do laboratório." },
                            { q: "Posso solicitar o mesmo equipamento mais de uma vez?", a: "Sim, mas não simultaneamente. Você só pode ter uma solicitação ativa (ou na fila) por equipamento. Após devolver, pode solicitar novamente." },
                            { q: "Por quanto tempo posso ficar com um equipamento?", a: "Você define o período no momento da solicitação — entre 1 e 30 dias. O sistema notifica automaticamente quando o prazo se aproxima." },
                            { q: "Quem pode adicionar equipamentos ao catálogo?", a: "Apenas administradores. O painel administrativo permite cadastrar, atualizar disponibilidade e remover itens do catálogo." },
                            { q: "Posso cancelar uma solicitação?", a: "Sim, enquanto estiver na fila. Empréstimos já ativos precisam ser devolvidos normalmente." },
                        ].map((item, i) => (
                            <AccordionItem
                                key={i}
                                value={`item-${i}`}
                                data-testid={`faq-item-${i}`}
                                className="border-white/10"
                            >
                                <AccordionTrigger className="font-heading text-left text-lg hover:text-[#FF5A00] hover:no-underline py-6">
                                    {item.q}
                                </AccordionTrigger>
                                <AccordionContent className="text-zinc-400 leading-relaxed pb-6">
                                    {item.a}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </section>

            {/* CTA FINAL */}
            <section data-testid="final-cta-section" className="relative py-24 md:py-32 px-6 md:px-12 overflow-hidden">
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: `url(${CTA_BG})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]" />
                <div className="relative max-w-4xl mx-auto text-center">
                    <h2 className="font-heading font-black text-5xl sm:text-6xl md:text-7xl tracking-tighter leading-[0.95]">
                        Pronto para distribuir<br />
                        <span className="text-[#FF5A00]">com equidade?</span>
                    </h2>
                    <p className="mt-8 text-zinc-400 max-w-xl mx-auto leading-relaxed">
                        Crie sua conta gratuita e comece a gerenciar empréstimos com transparência
                        e inteligência.
                    </p>
                    <div className="mt-10 flex flex-wrap gap-4 justify-center">
                        <Link to="/cadastro" data-testid="final-cta-button" className="btn-cta">
                            Criar conta gratuita <ArrowRight size={18} />
                        </Link>
                        <Link to="/equipamentos" className="btn-ghost">
                            Explorar catálogo
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

function StatTile({ testid, label, value, icon }) {
    return (
        <div data-testid={testid} className="fs-card p-5">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-widest mb-3">
                {icon} <span>{label}</span>
            </div>
            <p className="font-heading text-4xl font-bold tracking-tight">{value}</p>
        </div>
    );
}

function FeatureCard({ icon, title, text, className = "", image, tall, testid }) {
    return (
        <div data-testid={testid} className={`fs-card p-8 md:p-10 flex flex-col ${tall ? "min-h-[480px]" : "min-h-[260px]"} ${className}`}>
            <div className="flex items-center justify-between">
                <div className="w-12 h-12 border border-white/10 flex items-center justify-center text-[#FF5A00]">
                    {icon}
                </div>
                <ChevronDown className="text-zinc-700" size={18} />
            </div>
            <h3 className="font-heading text-2xl font-semibold mt-8 leading-tight">{title}</h3>
            <p className="text-zinc-400 mt-3 leading-relaxed flex-1">{text}</p>
            {image && (
                <div className="mt-6 -mx-10 -mb-10 overflow-hidden border-t border-white/10">
                    <img src={image} alt="" className="w-full h-64 object-cover" />
                </div>
            )}
        </div>
    );
}
