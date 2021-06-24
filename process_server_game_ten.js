const moment = require('moment')
console.log(`Process started ${process.env.NODE_ENV === 'PRODUCTION' ? process.env.NODE_ENV : 'DEVELOPMENT'} ${moment.utc().format("YYYY-MM-DD HH:mm:ss")}`);
const dotenv = require('dotenv');
dotenv.config({path: './.env'});
const MySql = require('./models/mysql2');
const db = new MySql();
const exportCoinDataToExcel = require('./models/exportServiceGrouper');
const filePath = './outputs/excel-1min-js.xlsx'


let target_btc = {}, target_eth = {}, target_doge = {};
let count_wins = {
    'btc': {'win': 0, 'draw': 0},
    'eth': {'win': 0, 'draw': 0},
    'rounds_checked': 0,
};
let map_btc = new Map();
let map_eth = new Map();
// let map_bnb = new Map();


setTimeout(async function() {

    try {
        for(let i = 1; i < 2; i++) {
            const start_day = moment.utc().add( -i, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss');
            const end_day = moment.utc().add( -i, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss');
            console.log('Started', start_day);

            let res_bit = await db.prepareOneDayTicksBitcoin(start_day, end_day)
            let res_eth = await db.prepareOneDayTicksEther(start_day, end_day)
            // let res_doge = await db.prepareOneDayTicksDoge(start_day, end_day)
            preparingCoinData(res_bit, 'bitcoin');
            preparingCoinData(res_eth, 'ethereum');
            // preparingCoinData(res_doge, 'doge');
        }

        // Results
        console.log('::RESULTS::');
        console.log(`BTC total ${Object.keys(target_btc).length}`);
        console.log(`ETH total ${Object.keys(target_eth).length}`);
        // console.log(`DOGE total ${Object.keys(target_doge).length} and double zero came ${zero_doge} times`);


        // console.log(target_btc);
        makingRoundsData(target_btc, map_btc);
        makingRoundsData(target_eth, map_eth);
        console.log(map_btc);

        // Transfer to Excel
        const workSheetColumnNames = ['Rounds', 'TIME_MIN', 'TOTAL'];
        // exportCoinDataToExcel(map_btc, workSheetColumnNames, 'BTC_1min', filePath);
        exportCoinDataToExcel(map_eth, workSheetColumnNames, 'ETH_1min', filePath);

        // GETTING WINNER INFORMATION
        // preparingWinnerData();
        // console.log(count_wins);

    } catch(err) {
        console.log(err);
    }
}, 1000);


function preparingCoinData(raw_data, coin_type) {
    raw_data.map(ele => {
        let time = new Date(parseInt(ele['binstamp']));
        if (time.getSeconds() % 10 === 0) {
            // if (time.getSeconds() % 10 === 0 && time.getSeconds() !== 0) {
            let hour = shapingTime(time.getUTCHours());
            let minutes = shapingTime(time.getMinutes());
            let seconds = shapingTime(time.getSeconds());
            let key = `${hour}:${minutes}:${seconds}`;
            cumulateDigits(ele, key, coin_type);
        }
    })
}

function shapingTime(value) {
    if(value == 0) {
        return '00';
    } else if (value > 0 && value < 10) {
        return `0${value}`;
    } else {
        return value;
    }
}


function cumulateDigits(ele, key, coin_type) {

    let numb, first_digit, second_digit;
    if (coin_type === 'doge') {
        numb = Math.floor(ele.close * 1000000 / 10) % 100
    } else {
        numb = Math.floor(ele.close * 1000 / 10) % 100;
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
        summary = 10;
    }

    if (coin_type === 'bitcoin') {
        target_btc[`${key}`] = {summary, data: ele};
    } else if (coin_type === 'ethereum') {
        target_eth[`${key}`] = {summary, data: ele};
    }

}

function preparingWinnerData() {

    map_btc.forEach(function(value_btc, key) {
        count_wins['rounds_checked']++;
        let value_eth = map_eth.get(key);
        if (value_btc['total_summary'] > value_eth['total_summary']) {
            count_wins['btc']['win']++;
        } else if (value_eth['total_summary'] > value_btc['total_summary']) {
            count_wins['eth']['win']++;
        } else if (value_btc['total_summary'] === value_eth['total_summary']) {
            count_wins['btc']['draw']++;
            count_wins['eth']['draw']++;
        } else {
            console.log('SHOULD NOT BE COMMITTED');
        }
    });
}

function makingRoundsData(target_pair, map) {
    // console.log(target_pair);
    let key_list = Object.keys(target_pair);
    key_list.forEach((key) => {
        let round = key.split(':')[0] * 60 + parseInt(key.split(':')[1]) + 1;
        let cur_pairs = key.split(':')[2];
        if (cur_pairs !== '00') {
            if (map.has(round)) {
                let value = map.get(round);
                value['total_summary'] = value['total_summary'] * 1 + target_pair[key].summary * 1;
                map.set(round, value);
            } else {
                let time_min = `${key.split(':')[0]}:${key.split(':')[1]}`;
                map.set(round, {
                    total_summary: target_pair[key].summary * 1, time_min: time_min
                })
            }
        }
    })

}





