const express = require('express');
const router = express.Router();
const schemaRouter = require('./schema');


router.use('/schema', schemaRouter);

module.exports = router;
