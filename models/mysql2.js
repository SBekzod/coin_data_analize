const mysql = require('mysql2/promise');

class MySql {

    constructor() {
        this.con = null;
    }

    async connection() {
        this.con = await mysql.createPool({
            host: process.env.NTRY_DATABASE_HOST,
            user: process.env.NTRY_DATABASE_USERNAME,
            password: process.env.NTRY_DATABASE_PASSWORD,
            port: process.env.NTRY_DATABASE_PORT,
            database: process.env.NTRY_DATABASE_NAME,
            waitForConnections: true,
            queueLimit: 0,
        });
    }

    async prepareOneDayTicksBitcoin(start, end) {
        if (!this.con) await this.connection();
        const query_result = await this.con.query('select * from bitcoin_tick_collection where coltime >= ? and coltime <= ? ORDER BY id', [start, end]);
        let quantity = query_result[0];
        return quantity;
    }

    async prepareOneDayTicksEther(start, end) {
        if (!this.con) await this.connection();
        const query_result = await this.con.query('select * from ethereum_tick_collection where coltime >= ? and coltime <= ? ORDER BY id', [start, end]);
        let quantity = query_result[0];
        return quantity;
    }

    async prepareOneDayTicksDoge(start, end) {
        if (!this.con) await this.connection();
        const query_result = await this.con.query('select * from doge_tick_collection where coltime >= ? and coltime <= ? ORDER BY id', [start, end]);
        let quantity = query_result[0];
        return quantity;
    }


}

module.exports = MySql;





