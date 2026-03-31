# Status do Projeto - Mente Nexus

## ✅ Concluído
- [x] Infraestrutura PostgreSQL no Coolify sincronizada com tabelas de suporte ao n8n.
- [x] Backend multi-tenant funcional com rotas de API para Clientes, Profissionais e Agendamentos.
- [x] Frontend Premium (Mente Nexus Dashboard):
    - [x] **Tela Inicial**: Dashboard com resumo de atendimentos e automação status.
    - [x] **Agenda**: Calendário visual para gestão de horários.
    - [x] **Clientes**: Listagem completa e busca por paciente.
- [x] **Migração do Workflow "Secretária v3"**:
    - Substituição total do Google Calendar por API Nexus.
    - Implementação de Ollama (`qwen2.5-coder:32b-instruct-q6_K` na VPS http://187.77.253.153:11434) no lugar da OpenAI.
    - Adição de ferramentas de busca e cadastro de pacientes.
    - Criação de tabelas de suporte ao n8n (`n8n_historico_mensagens`, `n8n_fila_mensagens`, `n8n_status_atendimento`).
    - Atualização do prompt Maria para o contexto Nexus.
- [x] **Nova Estrutura Organizada**:
    - `site/backend/`: Servidor Express e banco de dados.
    - `site/frontend/`: React Dashboard (Vite).
    - `n8n/`: Workflows e automações externas.
    - `regras/`: Diretrizes de IA e status do projeto.

## ⏳ Em Andamento
- [x] Teste de ponta a ponta: Mensagem WhatsApp -> Fila n8n -> Tomada de decisão IA -> Cadastro/Agendamento Nexus.
- [ ] Refinamento das ferramentas de pagamento (Asaas).
- [x] Validar a conexão do n8n com o banco de dados Nexus (Tabelas criadas com sucesso).

## 🚀 Próximos Passos
1. Testar o fluxo de áudio (Ollama vs Whisper).
2. Personalizar o dashboard de clientes no frontend.

---
**Data**: 30 de Março de 2026  
**Responsável**: Antigravity (IA Maria)
