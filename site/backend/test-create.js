require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    const clinicaId = '5537998145228';
    
    console.log('--- Testing Clinica creation ---');
    await pool.query(`INSERT INTO clinicas (id, nome) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [clinicaId, 'Clinica Teste ' + clinicaId]);
    console.log('OK');

    console.log('--- Testing Cliente creation ---');
    const res = await pool.query(`INSERT INTO clientes (clinica_id, nome, telefone) VALUES ($1, $2, $3) ON CONFLICT (telefone, clinica_id) DO UPDATE SET nome = EXCLUDED.nome RETURNING *`, [clinicaId, 'Cliente de Teste Antigravity', '37999887766']);
    console.log('OK, Created/Updated Cliente:', res.rows[0]);
    
    console.log('--- Checking all clients for this clinic ---');
    const resAll = await pool.query('SELECT * FROM clientes WHERE clinica_id = $1', [clinicaId]);
    console.log('Clients:', resAll.rows);
    
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}
test();
