# 🧠 Mente Nexus - Documentação de Integração

Este arquivo contém toda a estrutura técnica configurada para a integração entre o **Site**, **Coolify (Postgres)** e o **n8n**. Ele serve como a "memória" central do projeto.

---

## 🛠️ 1. Infraestrutura e Chaves de API

### **Coolify (Servidor VPS)**
*   **URL:** `https://coolify.mentenexus.tech/`
*   **API Key:** `2|oG18DswVATfG7xDueBdYV9UCVfB3PAK3KzXWFANXf1fa3a91`
*   **Credenciais Painel:** `mentenexus.ia@gmail.com` / `l57aJ965.`

### **n8n (Automações)**
*   **URL:** `https://n8n.mentenexus.tech/`
*   **API Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNjdhNmIwYS0zMzE2LTQxOGYtYTg5MC04NmVkMTU5OGY0NWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNzU3NmUzOWQtYjRlOC00MDQxLTk0ZWUtMzIyNjVkZjk3ZGQ0IiwiaWF0IjoxNzc0MzEyOTM5fQ.5pntYDg5c4VXrpell9YvXu1PGeIz7olw3SHTrbvHXLM`
*   **Postgres Credential (n8n):** `jgFi0rRDTA44wfwW` (Nome: "Nexus")

---

## 💾 2. Banco de Dados (PostgreSQL)

O banco foi reestruturado para ser **Multitenant orientado a telefone**.

*   **URL de Conexão:** `postgres://postgres:mKW7UE1ZK2N5SUqXTmA5MfwOY1Ohrm54MHHdpUdol77167hYbUclbU3z82r3EZGd@72.60.11.33:5432/postgres`
*   **Primeira Clínica:** `Teste Nexus` (ID: `5537998145228`)

### **Schema Principal:**
1.  **`clinicas`**: O `ID` é o número de telefone do WhatsApp.
2.  **`pacientes`**: Vinculados via `clinic_id` (com constraint UNIQUE em telefone per clínica).
3.  **`profissionais` / `medicos`**: Cadastro de quem atende.
4.  **`agendamentos`**: Onde os horários são gravados.

---

## 🤖 3. Workflows no n8n

### **APIs (Backend)**
*   **`00. API Gateway (Postgres)`** (ID: `2LYG7wM1Bktxoatp`): Atende o site via `POST /nexus-api`.
    *   `action: get_patients`
    *   `action: get_appointments`
    *   `action: get_dashboard`

### **Ferramentas da IA (Atendimento)**
*   **`06. Buscar paciente (Postgres)`** (ID: `7YRpakQgb0bNlzfW`): IA verifica se a pessoa já tem cadastro antes de falar.
*   **`05. Criar cadastro do paciente (Postgres)`** (ID: `F7Sd4GCQgmSKIfmv`): Cadastra novos pacientes sem duplicidade.
*   **`03. Buscar janelas (Postgres)`** (ID: `7CLHhOnru1BFXzBl`): IA consulta horários livres no banco.

---

## 🌐 4. O Site (mente nexus)

O site está sendo reconstruído para falar com o n8n em vez do Supabase. 
A ponte é feita via chamadas HTTP (POST) para o **Webhook do n8n**.

---
*Gerado por: Antigravity AI* 🚀
