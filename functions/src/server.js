/* eslint-disable */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

const port = process.env.PORT || '5000';
app.set('port', port);

require('./routes')(app);

app.listen(port, () => console.log(`Server running on localhost:${port}`));
