# Regras do Projeto Mente Nexus

## Diretrizes de Inteligência Artificial
- **Obrigatório**: Sempre utilizar a LLM local `qwen2.5-coder:32b-instruct-q6_K` para decisões de código, lógica e arquitetura para preservar créditos da plataforma principal.

## Diretrizes Técnicas

### 1. Multi-Tenant (Isolamento de Dados)
- **Regra de Ouro**: Clínica X NUNCA deve ver dados da Clínica Y (e vice-versa).
- **Identificação**: O `clinica_id` (normalmente o telefone) deve ser passado obrigatoriamente via Header `X-Clinica-ID` em todas as requisições API.
- **Deployment**: O código base deve estar sempre sincronizado com a pasta `~/site` na VPS `187.77.253.153` para funcionamento web.
- **Filtragem**: Toda consulta ao banco (clientes, agendamentos) deve conter a cláusula `WHERE clinica_id = $1`.

### 2. Estilo e UX (User Experience)
- **Estilo**: Premium, moderno, Dark Mode por padrão no frontend.
- **Componentes**: Utilizar ícones da biblioteca `lucide-react`. 
- **Feedback**: Sempre exibir estados de carregamento (Loaders) e mensagens de erro amigáveis ao usuário.

### 3. Comunicação Backend-Frontend
- **API URL**: O backend roda por padrão na porta 3001. O frontend deve referenciar via variável de ambiente.

## Controle de Status
- Consultar sempre o arquivo `regras/status_projeto.md` antes de iniciar uma nova tarefa para evitar redundância.
