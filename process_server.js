const moment = require('moment')
console.log(`Process started ${process.env.NODE_ENV === 'PRODUCTION' ? process.env.NODE_ENV : 'DEVELOPMENT'} ${moment.utc().format("YYYY-MM-DD HH:mm:ss")}`);
const dotenv = require('dotenv');
dotenv.config({path: './.env'});
const MySql = require('./models/mysql2');
let db = new MySql();

db.getCoinDataById(1).then(data => {
    console.log(data);
}).catch(err => {
   console.log(err);
});