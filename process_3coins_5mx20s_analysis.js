const moment = require('moment')
console.log(`Process started ${process.env.NODE_ENV === 'PRODUCTION' ? process.env.NODE_ENV : 'DEVELOPMENT'} ${moment.utc().format("YYYY-MM-DD HH:mm:ss")}`);
const dotenv = require('dotenv');
dotenv.config({path: './.env'});
const MySql = require('./models/mysql2');
const db = new MySql();
const exportCoinDataToExcelAll = require('./models/exportServiceFireman');
const filePath_btc_all = './outputs/btc-20s.xlsx';
const filePath_eth_all = './outputs/eth-20s.xlsx';
const filePath_bnb_all = './outputs/bnb-20s.xlsx';
const exportCoinDataToExcel = require('./models/exportServiceGrouperFireman');
const filePath_btc = './outputs/btc-5mx20s.xlsx';
const filePath_eth = './outputs/eth-5mx20s.xlsx';
const filePath_bnb = './outputs/bnb-5mx20s.xlsx';

let target_btc = {}, target_eth = {}, target_bnb = {};

let count_wins = {
    'fire_win': 0,
    'water_win': 0,
    'rounds_checked': 0,
    'gen_even_win': 0,
    'gen_odd_win': 0,
    'total': 0
};
let map_btc = new Map();
let map_eth = new Map();
let map_bnb = new Map();


setTimeout(async function () {

    try {
        for (let i = 1; i < 2; i++) {
            const start_day = moment.utc().add(-i, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss');
            const end_day = moment.utc().add(-i, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss');
            console.log('Started', start_day);

            // let res_bit = await db.prepareOneDayTicksBitcoin(start_day, end_day)
            // let res_eth = await db.prepareOneDayTicksEther(start_day, end_day)
            let res_bnb = await db.prepareOneDayTickBNB(start_day, end_day)
            // preparingCoinData(res_bit, 'bitcoin');
            // preparingCoinData(res_eth, 'ethereum');
            preparingCoinData(res_bnb, 'binance');
        }

        // Results
        console.log('::RESULTS::');
        // console.log(target_btc);

        // makingRoundsData(target_btc, map_btc);
        // makingRoundsData(target_eth, map_eth);
        makingRoundsData(target_bnb, map_bnb);
        // console.log(map_btc)

        // Transfer to Excel
        const workSheetColumnNamesAll = ['TIME_UTC', 'WINNER_TYPE', 'DB_ID', 'TIMESTAMP', 'CLOSE', 'TIME12'];
        // exportCoinDataToExcelAll(target_btc, workSheetColumnNamesAll, 'btc_20s', filePath_btc_all);
        // exportCoinDataToExcelAll(target_eth, workSheetColumnNamesAll, 'eth_20s', filePath_eth_all);
        // exportCoinDataToExcelAll(target_bnb, workSheetColumnNamesAll, 'bnb_20s', filePath_bnb_all);

        const workSheetColumnNamesRounds = ['Rounds', 'TIME_MIN', 'WINNER', 'RANGE', 'FIRST_WINNER_TYPE'];
        // exportCoinDataToExcel(map_btc, workSheetColumnNamesRounds, 'btc_5mx20s', filePath_btc);
        // exportCoinDataToExcel(map_eth, workSheetColumnNamesRounds, 'eth_5mx20s', filePath_eth);
        // exportCoinDataToExcel(map_bnb, workSheetColumnNamesRounds, 'bnb_5mx20s', filePath_bnb);

        // GETTING WINNER INFORMATION
        // preparingWinnerData(map_bnb);
        // preparingWinnerData(map_eth);
        preparingWinnerData(map_bnb);
        console.log(count_wins);

    } catch (err) {
        console.log(err);
    }
}, 1000);


// ORGANIZING TIME PERIODS
function preparingCoinData(raw_data, coin_type) {
    raw_data.map(ele => {
        let time = new Date(parseInt(ele['binstamp']));
        if (time.getSeconds() % 20 === 0) {
            let hour = shapingTime(time.getUTCHours());
            let minutes = shapingTime(time.getMinutes());
            let seconds = shapingTime(time.getSeconds());
            let key = `${hour}:${minutes}:${seconds}`;
            declaringResults(ele, key, coin_type);
        }
    })
}

function shapingTime(value) {
    if (value == 0) {
        return '00';
    } else if (value > 0 && value < 10) {
        return `0${value}`;
    } else {
        return value;
    }
}

// CUMULATIVE SUMMARY CALCULATION
function declaringResults(ele, key, coin_type) {
    let numb = Math.round(ele.close * 100) % 100;
    let result = (numb % 2 === 0) ? 'even' : 'odd';
    if (coin_type === 'bitcoin') {
        target_btc[`${key}`] = {result: result, data: ele};
    } else if(coin_type === 'ethereum') {
        target_eth[`${key}`] = {result: result, data: ele};
    } else {
        target_bnb[`${key}`] = {result: result, data: ele};
    }
    if (result === 'even') {
        count_wins['gen_even_win']++;
    } else {
        count_wins['gen_odd_win']++;
    }
    count_wins['total']++;
}

// PREPARING WIN INFORMATION DATA
function preparingWinnerData(map) {

    map.forEach(function (value_btc, key) {
        count_wins['rounds_checked']++;
        if(value_btc['winner'] === 'even') {
            count_wins['fire_win']++;
        } else if(value_btc['winner'] === 'odd') {
            count_wins['water_win']++;
        } else {
            console.log('Should not reach this');
        }
    });
}

// ORGANIZING ROUNDS ON MAPS
function makingRoundsData(target_pair, map) {

    let key_list = Object.keys(target_pair);
    key_list.forEach((key) => {
        let round = key.split(':')[0] * 12 + Math.floor(parseInt(key.split(':')[1]) / 5) + 1;
        let cur_pairs = key.split(':')[2];
        if (!(parseInt(key.split(':')[1]) % 5 === 0 && cur_pairs == '00') &&
            !(parseInt(key.split(':')[1]) % 5 === 4 && (cur_pairs == '00' || cur_pairs == '20' || cur_pairs == '40'))) {
            // console.log('TARGET: ', key);

            if (map.has(round)) {
                let value = map.get(round);
                if (target_pair[key].result === 'odd') {
                    value['total_wins_odd'] += 1;
                    if (value['first_winner'] === 'odd' && !value['range_failed']) {
                        value['range'] += 1;
                    } else {
                        value['range_failed'] = true;
                    }
                } else {
                    value['total_wins_even'] += 1;
                    if (value['first_winner'] === 'even' && !value['range_failed']) {
                        value['range'] += 1;
                    } else {
                        value['range_failed'] = true;
                    }
                }
                value['counts'] += 1;
                map.set(round, value);
            } else {
                let new_input = {winner: null, counts: 1};
                new_input['time_min'] = `${key.split(':')[0]}:${key.split(':')[1]}`;
                if (target_pair[key].result === 'odd') {
                    new_input['total_wins_odd'] = 1;
                    new_input['total_wins_even'] = 0;
                    new_input['first_winner'] = 'odd'
                } else {
                    new_input['total_wins_odd'] = 0;
                    new_input['total_wins_even'] = 1;
                    new_input['first_winner'] = 'even'
                }
                new_input['range'] = 1;
                new_input['range_failed'] = false
                map.set(round, new_input);
            }

        }

        // declaring the winner of the round
        if (parseInt(key.split(':')[1]) % 5 === 4) {
            let results = map.get(round);
            if(results['range'] >= 6) {
                results.winner = results['first_winner'];
                // console.log('+++++++++++++++')
            } else {
                results.winner = (results['total_wins_even'] > results['total_wins_odd']) ? 'even' : 'odd';
            }
            map.set(round, results);
        }
    })

}





