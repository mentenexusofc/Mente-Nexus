require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function seedData() {
  try {
    await client.connect();
    console.log('🌱 Semeando dados de teste no Mente Nexus...');

    const clinicaId = '5511999999999';

    // 1. Inserir Clínica
    await client.query(`
      INSERT INTO clinicas (id, nome, email)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO NOTHING;
    `, [clinicaId, 'Clínica Mente Nexus - Matriz', 'contato@mentenexus.tech']);

    // 2. Inserir Clientes
    const clientes = [
      ['Ana Silva', '(11) 98888-0001', 'ana@email.com'],
      ['Carlos Souza', '(11) 97777-0002', 'carlos@email.com'],
      ['Beatriz Santos', '(11) 96666-0003', 'beatriz@email.com']
    ];

    for (const [nome, tel, email] of clientes) {
      await client.query(`
        INSERT INTO clientes (clinica_id, nome, telefone, email)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (telefone, clinica_id) DO NOTHING;
      `, [clinicaId, nome, tel, email]);
    }

    // 3. Obter IDs dos clientes inseridos
    const res = await client.query('SELECT id FROM clientes WHERE clinica_id = $1', [clinicaId]);
    const clientIds = res.rows.map(r => r.id);

    // 4. Inserir Agendamentos
    const hoje = new Date();
    const agendamentos = [
      [clientIds[0], new Date(hoje.setHours(10, 0, 0)), 'confirmado', 'Consulta de Rotina'],
      [clientIds[1], new Date(hoje.setHours(14, 30, 0)), 'pendente', 'Avaliação Inicial'],
      [clientIds[2], new Date(hoje.getTime() + 86400000), 'confirmado', 'Retorno']
    ];

    for (const [cid, data, status, obs] of agendamentos) {
      await client.query(`
        INSERT INTO agendamentos (clinica_id, cliente_id, data_hora, status, observacoes)
        VALUES ($1, $2, $3, $4, $5);
      `, [clinicaId, cid, data, status, obs]);
    }

    console.log('✅ Dados semeados com sucesso para a clínica:', clinicaId);
  } catch (err) {
    console.error('❌ Erro ao semear dados:', err.message);
  } finally {
    await client.end();
  }
}

seedData();
