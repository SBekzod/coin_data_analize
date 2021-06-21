const moment = require('moment')
console.log(`Process started ${moment.utc().format("YYYY-MM-DD HH:mm:ss")}`);
const MySql = require('./models/mysql2');
let db = new MySql();

