require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function seedData() {
  try {
    await client.connect();
    console.log('🌱 Semeando profissionais no Mente Nexus...');

    const clinicaId = '5511999999999';

    // 1. Inserir Profissionais
    const profissionais = [
      ['Dr. Carlos Alberto', 'Cardiologia'],
      ['Dra. Mariana Oliveira', 'Dermatologia'],
      ['Dr. Ricardo Lima', 'Clínico Geral']
    ];

    for (const [nome, esp] of profissionais) {
      await client.query(`
        INSERT INTO profissionais (clinica_id, nome, especialidade)
        VALUES ($1, $2, $3);
      `, [clinicaId, nome, esp]);
    }

    console.log('✅ Profissionais semeados com sucesso para a clínica:', clinicaId);
  } catch (err) {
    console.error('❌ Erro ao semear dados:', err.message);
  } finally {
    await client.end();
  }
}

seedData();
