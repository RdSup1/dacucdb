export default function Footer() {
    return (
        <footer data-testid="site-footer" className="border-t border-white/10 bg-[#050505] mt-32">
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-[#FF5A00] rounded-full" />
                        <span className="font-heading font-black tracking-tight text-xl">FOMERSTICK</span>
                    </div>
                    <p className="text-zinc-400 max-w-md leading-relaxed">
                        Plataforma de gerenciamento e empréstimo de equipamentos com fila inteligente
                        e algoritmo de equidade. Pensada para laboratórios, estúdios e equipes técnicas.
                    </p>
                </div>

                <div>
                    <p className="fs-overline mb-4">Plataforma</p>
                    <ul className="space-y-3 text-sm text-zinc-400">
                        <li><a href="/equipamentos" className="hover:text-white">Catálogo</a></li>
                        <li><a href="/#como-funciona" className="hover:text-white">Como funciona</a></li>
                        <li><a href="/#faq" className="hover:text-white">FAQ</a></li>
                    </ul>
                </div>

                <div>
                    <p className="fs-overline mb-4">Suporte</p>
                    <ul className="space-y-3 text-sm text-zinc-400">
                        <li><a href="mailto:contato@fomerstick.com" className="hover:text-white">contato@fomerstick.com</a></li>
                        <li className="text-zinc-600">São Paulo · Brasil</li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex justify-between items-center text-xs text-zinc-500">
                    <span>© {new Date().getFullYear()} Fomerstick. Todos os direitos reservados.</span>
                    <span className="font-heading">Equidade · Fila Inteligente</span>
                </div>
            </div>
        </footer>
    );
}
