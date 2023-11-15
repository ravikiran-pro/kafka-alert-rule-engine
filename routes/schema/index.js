const express = require('express');
const { getTableSchema } = require('../../controllers/schema');
const router = express.Router();

router.post('/', async (req, res) => {

  try {
    let { dialect, host, user, password, database, uri, port } = req.body;
    const config = {
      client: 'pg',
      connection: {
        host: host,
        user: user,
        password: password,
        database: database,
        port: port
      }
    }
    const result = await getTableSchema(dialect, config);

    res.send(200, {
      status: true,
      data: result,
      message: `database schema successfull resolved`
    });
  }catch(err){
    res.send(400, {
      status: false,
      message: 'Invalid connection configuration',
      error: err
    });
  }
});


module.exports = router;