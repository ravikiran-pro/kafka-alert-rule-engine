const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5234,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });


module.exports = pool;