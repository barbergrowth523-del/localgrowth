import type { Metadata } from 'next'
import { LegalDocumentLayout, LegalSection } from '@/components/legal/LegalDocumentLayout'

export const metadata: Metadata = { title: 'Politica de Cookies | Prontusfy' }

export default function CookiePolicyPage() {
  return <LegalDocumentLayout eyebrow="Privacidade e preferencias" title="Politica de Cookies">
    <LegalSection title="1. O que sao cookies"><p>Cookies sao pequenos arquivos gravados no navegador para lembrar escolhas, proteger a sessao e compreender como a plataforma e utilizada. Tecnologias similares podem ter finalidade equivalente.</p></LegalSection>
    <LegalSection title="2. Categorias utilizadas"><ul className="list-disc space-y-2 pl-5"><li><strong className="text-slate-200">Essenciais:</strong> necessarios para autenticacao, seguranca, navegacao e funcionamento da plataforma. Nao podem ser desativados sem comprometer recursos basicos.</li><li><strong className="text-slate-200">Analiticos:</strong> ajudam a medir desempenho, paginas acessadas e melhorias de produto. Sao ativados apenas apos aceite quando exigido.</li><li><strong className="text-slate-200">Marketing:</strong> permitem mensurar campanhas e publicidade, como pixels de anuncios. Sao ativados apenas apos consentimento.</li></ul></LegalSection>
    <LegalSection title="3. Como gerenciar preferencias"><p>Voce pode aceitar ou recusar cookies nao essenciais pelo aviso exibido na plataforma e tambem apagar ou bloquear cookies nas configuracoes do navegador. O bloqueio pode afetar a experiencia e recursos personalizados.</p></LegalSection>
    <LegalSection title="4. Atualizacoes"><p>Esta Politica pode ser atualizada quando houver mudancas nas tecnologias utilizadas, fornecedores ou exigencias legais. A versao atual ficara sempre disponivel nesta rota.</p></LegalSection>
  </LegalDocumentLayout>
}