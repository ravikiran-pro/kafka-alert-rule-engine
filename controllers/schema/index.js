const knex = require('knex');


const getTableDetails = async (databaseType , config) => {
    const db = knex(config);

  try {
    let query;

    switch (databaseType) {
      case 'postgres':
        // const { Pool } = require('pg');
        // const { host, port, user, password, database } = config.connection; 
        // const pool = new Pool({
        //   host: host,
        //   port: port,
        //   user: user,
        //   password: password,
        //   database: database,
        // });
        // query = `
        //   SELECT table_name, column_name
        //   FROM information_schema.columns
        //   WHERE table_schema = 'public';        
        // `;
        // let results = await pool.query(query);
        // return results
      case 'mysql':
      case 'maria':
      case 'sql':
        query = `
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public';        
        `;
        break;
      case 'sqlite':
        query = `
          PRAGMA table_info('${tableName}');
        `;
        break;
      case 'mongo':
        const mongoose = require('mongoose');
        const connection = mongoose.createConnection(config.uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });

        const collections = await connection.db.listCollections().toArray();
        const collectionName = collections[0].name;

        const collection = connection.model(collectionName, {});
        const schema = await collection.findOne();

        return Object.keys(schema.toObject());
      default:
        throw new Error(`Unsupported database type: ${databaseType}`);
    }

    const result = await db.raw(query);

    return result?.rows || []
  } finally {
    await db.destroy();
  }
}


const constructSchema = async(result) => {
  const reducedData = result.reduce((result, item) => {
    const existingEntry = result.find(entry => entry.name === item.table_name);
  
    if (existingEntry) {
      existingEntry.columns.push(item.column_name);
    } else {
      result.push({
        name: item.table_name,
        columns: [item.column_name],
      });
    }
  
    return result;
  }, []);
  return reducedData
}

const getTableSchema = async (databaseType , config) =>{
  const results = await getTableDetails(databaseType , config);
  const schema = constructSchema(results);
  return schema;
  
}

module.exports = { getTableSchema }
