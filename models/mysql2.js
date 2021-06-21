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
        })

    }

    // async getCoinData() {
    //     if (!this.con) await this.connection();
    //     const query_result = await this.con.query('select * from bitcoin_tick_collection');
    //     return query_result[0][0];
    // }

    async getCoinDataById(key) {
        if (!this.con) await this.connection();
        const query_result = await this.con.query('select * from bitcoin_tick_collection where id = ?', [key]);
        return query_result[0][0];
    }

}

module.exports = MySql





