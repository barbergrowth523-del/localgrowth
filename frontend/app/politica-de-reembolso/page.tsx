import type { Metadata } from 'next'
import { LegalDocumentLayout, LegalSection } from '@/components/legal/LegalDocumentLayout'

export const metadata: Metadata = { title: 'Politica de Reembolso | Prontusfy' }

export default function RefundPolicyPage() {
  return <LegalDocumentLayout eyebrow="Transparencia de cobranca" title="Politica de Reembolso">
    <LegalSection title="1. Prazo de arrependimento"><p>Para contratacoes realizadas online por consumidores no Brasil, o Prontusfy respeita o prazo de 7 dias corridos previsto no art. 49 do Codigo de Defesa do Consumidor, contado a partir da contratacao ou da liberacao do acesso, conforme aplicavel.</p></LegalSection>
    <LegalSection title="2. Como solicitar"><p>Dentro do prazo, solicite o reembolso pelo Concierge da plataforma, informando o e-mail da conta, nome da barbearia, data da cobranca e motivo da solicitacao. O pedido recebera protocolo e sera analisado pelo suporte.</p></LegalSection>
    <LegalSection title="3. Analise e estorno"><p>Depois de confirmar a elegibilidade, solicitaremos o estorno pelo mesmo meio de pagamento sempre que possivel. O prazo de processamento pode variar conforme banco, emissor do cartao, Pix e intermediador de pagamento. O Prontusfy informara o status pelo canal de contato cadastrado.</p></LegalSection>
    <LegalSection title="4. Cancelamento de assinaturas recorrentes"><p>Voce pode cancelar a renovacao automatica na area de Assinatura, quando disponivel, ou pedir apoio ao Concierge. O cancelamento evita novas cobrancas e nao gera reembolso proporcional de um periodo ja iniciado, exceto nos casos de arrependimento legal, falha comprovada do servico ou outra obrigacao prevista em lei.</p></LegalSection>
    <LegalSection title="5. Excecoes e boa-fe"><p>Solicitacoes fora do prazo legal podem ser avaliadas individualmente, sem obrigacao de aprovacao. Fraudes, chargebacks abusivos ou uso em violacao aos Termos de Uso podem resultar em suspensao da conta e contestacao da cobranca pelos meios legais cabiveis.</p></LegalSection>
  </LegalDocumentLayout>
}