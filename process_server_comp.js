const moment = require('moment')
console.log(`Process started ${process.env.NODE_ENV === 'PRODUCTION' ? process.env.NODE_ENV : 'DEVELOPMENT'} ${moment.utc().format("YYYY-MM-DD HH:mm:ss")}`);
const dotenv = require('dotenv');
dotenv.config({path: './.env'});
const MySql = require('./models/mysql2');
const db = new MySql();

let target_btc = {}, zero_btc = 0;
let target_eth = {}, zero_eth = 0;
let target_doge = {}, zero_doge = 0;
let count_wins = {
    'btc': {'win': 0, 'draw': 0},
    'eth': {'win': 0, 'draw': 0},
    'doge': {'win': 0, 'draw': 0},
    'super_draw': 0,
    'rounds_checked': 0,
};

setTimeout(async function() {

    try {
        for(let i = 1; i < 2; i++) {
            const start_day = moment.utc().add( -i, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss');
            const end_day = moment.utc().add( -i, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss');
            console.log('Started', start_day);

            let res_bit = await db.prepareOneDayTicksBitcoin(start_day, end_day)
            let res_eth = await db.prepareOneDayTicksEther(start_day, end_day)
            let res_doge = await db.prepareOneDayTicksDoge(start_day, end_day)
            preparingCoinData(res_bit, 'bitcoin');
            preparingCoinData(res_eth, 'ethereum');
            preparingCoinData(res_doge, 'doge');
        }

        // Results
        console.log('::RESULTS::');
        console.log(`BTC total ${Object.keys(target_btc).length} and double zero came ${zero_btc} times`);
        console.log(`ETH total ${Object.keys(target_eth).length} and double zero came ${zero_eth} times`);
        console.log(`DOGE total ${Object.keys(target_doge).length} and double zero came ${zero_doge} times`);

        // GETTING WINNER INFORMATION
        preparingWinnerData();
        console.log('FINAL DATA');
        console.log(count_wins);

    } catch(err) {
        console.log(err);
    }
}, 1000);


function preparingCoinData(raw_data, coin_type) {
    raw_data.map(ele => {
        let time = new Date(parseInt(ele['binstamp']));
        if(time.getSeconds() % 10 === 0) {
            let key = `${time.getUTCHours()}:${time.getMinutes()}:${time.getSeconds()}`;
            cumulateDigits(ele, key, coin_type);
        }
    })
}


function cumulateDigits(ele, key, coin_type) {

    let numb, first_digit, second_digit;
    if (coin_type === 'doge') {
        numb = Math.floor(ele.close * 100000) % 100
    } else {
        numb = Math.floor(ele.close * 100) % 100;
    }

    if (numb < 10) {
        first_digit = 0;
        second_digit = numb;
    } else if (numb >= 10 && numb < 100) {
        first_digit = Math.floor(numb / 10);
        second_digit = numb % 10;
    }

    let summary = first_digit + second_digit;
    if (summary > 10) {
        summary = summary % 10;
    } else if (summary === 0) {
        if (coin_type == 'bitcoin') {
            zero_btc++;
        } else if (coin_type == 'ethereum') {
            zero_eth++;
        } else {
            zero_doge++;
        }
        summary = 10;
    }

    // console.log(`the number: ${numb} and summary: ${summary}`);

    if (coin_type === 'bitcoin') {
        target_btc[`${key}`] = {summary, data: ele};
    } else if (coin_type === 'ethereum') {
        target_eth[`${key}`] = {summary, data: ele};
    } else {
        target_doge[`${key}`] = {summary, data: ele};
    }

}

function preparingWinnerData() {
    Object.keys(target_btc).forEach((key) => {
        let ele = target_btc[`${key}`];
        if (target_eth.hasOwnProperty(`${key}`) && target_doge.hasOwnProperty(`${key}`)) {
            count_wins['rounds_checked']++;
            console.log('*****************');

            let btc_amount = ele['summary'];
            let eth_amount = target_eth[`${key}`]['summary'];
            let doge_amount = target_doge[`${key}`]['summary'];
            if (btc_amount > eth_amount && btc_amount > doge_amount) {
                count_wins['btc']['win']++;
            } else if (eth_amount > btc_amount && eth_amount > doge_amount) {
                count_wins['eth']['win']++;
            } else if (doge_amount > eth_amount && doge_amount > btc_amount) {
                count_wins['doge']['win']++;
            } else if (eth_amount === btc_amount && eth_amount === doge_amount) {
                count_wins['super_draw']++;
            } else if (eth_amount === btc_amount) {
                count_wins['btc']['draw']++;
                count_wins['eth']['draw']++;
            } else if (doge_amount === btc_amount) {
                count_wins['btc']['draw']++;
                count_wins['doge']['draw']++;
            } else if (eth_amount === doge_amount) {
                count_wins['eth']['draw']++;
                count_wins['doge']['draw']++;
            } else {
                console.log('SHOULD NOT BE COMMITTED');
            }

        }
        // console.log(key);
        // console.log(ele);
    })

}






