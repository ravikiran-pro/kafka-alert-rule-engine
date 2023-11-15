const express = require('express');
const bodyParser = require('body-parser');
const { consumer, ExecuteRule } = require('./services');
const Router = require('./routes');

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.use('/api/v1', Router);

consumer.on('message', function (message) {
  ExecuteRule(message)
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});