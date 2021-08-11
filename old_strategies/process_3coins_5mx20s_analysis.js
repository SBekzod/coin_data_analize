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

let prev_key_checker = '';
let target_btc = {}, target_eth = {}, target_bnb = {};
let count_wins = {
    'fire_even_win': 0,
    'water_odd_win': 0,
    'rounds_checked': 0,
    'gen_even_win': 0,
    'gen_odd_win': 0,
    'total': 0,
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

            let res_bit = await db.prepareOneDayTicksBitcoin(start_day, end_day)
            // let res_eth = await db.prepareOneDayTicksEther(start_day, end_day)
            // let res_bnb = await db.prepareOneDayTickBNB(start_day, end_day)
            preparingCoinData(res_bit, 'bitcoin');
            // preparingCoinData(res_eth, 'ethereum');
            // preparingCoinData(res_bnb, 'binance');
        }

        // Results
        console.log('::RESULTS::');
        // console.log(target_btc);
        // console.log(Object.keys(target_btc).length);

        makingRoundsData(target_btc, map_btc);
        // makingRoundsData(target_eth, map_eth);
        // makingRoundsData(target_bnb, map_bnb);
        // console.log(map_bnb)

        // Transfer to Excel
        const workSheetColumnNamesAll = ['TIME_UTC', 'WINNER_TYPE', 'DB_ID', 'TIMESTAMP', 'CLOSE', 'TIME12'];
        exportCoinDataToExcelAll(target_btc, workSheetColumnNamesAll, 'btc_20s', filePath_btc_all);
        // exportCoinDataToExcelAll(target_eth, workSheetColumnNamesAll, 'eth_20s', filePath_eth_all);
        // exportCoinDataToExcelAll(target_bnb, workSheetColumnNamesAll, 'bnb_20s', filePath_bnb_all);

        const workSheetColumnNamesRounds = ['ROUNDS', 'TIME_MIN', 'WINNER', 'RANGE', 'FIRST_WINNER_TYPE', 'D-SHOT'];
        exportCoinDataToExcel(map_btc, workSheetColumnNamesRounds, 'btc_5mx20s', filePath_btc);
        // exportCoinDataToExcel(map_eth, workSheetColumnNamesRounds, 'eth_5mx20s', filePath_eth);
        // exportCoinDataToExcel(map_bnb, workSheetColumnNamesRounds, 'bnb_5mx20s', filePath_bnb);

        // GETTING WINNER INFORMATION
        preparingWinnerData(map_btc);
        // preparingWinnerData(map_eth);
        // preparingWinnerData(map_bnb);
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

            //TODO: Find solution for db collection
            if(key !== prev_key_checker) {
                prev_key_checker = key;
                declaringResults(ele, key, coin_type);
            }

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
    // let total_numb = Math.round(ele.close * 100) % 100;
    // let numb = Math.trunc(total_numb / 10) + total_numb % 10;
    let result = (numb % 2 === 0) ? 'even' : 'odd';
    if (coin_type === 'bitcoin') {
        target_btc[`${key}`] = {result: result, data: ele};
    } else if (coin_type === 'ethereum') {
        target_eth[`${key}`] = {result: result, data: ele};
    } else {
        target_bnb[`${key}`] = {result: result, data: ele};
    }

    if (result === 'even') {
        count_wins['gen_even_win']++;
    } else if (result === 'odd') {
        count_wins['gen_odd_win']++;
    } else {
        console.log('Should not reach on declare results');
    }
    count_wins['total']++;

}

// PREPARING WIN INFORMATION DATA
function preparingWinnerData(map) {

    map.forEach(function (value, key) {
        count_wins['rounds_checked']++;
        if (value['winner'] === 'even') {
            count_wins['fire_even_win']++;
        } else if (value['winner'] === 'odd') {
            count_wins['water_odd_win']++;
        } else {
            console.log('Should not reach on prepare winner');
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

            let shot_order = definingShot(key);
            // console.log('SHOT_ORDER: ', shot_order);

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

                // COLLECTING D_SHOT AND WINNER INFORMATION
                if ((value['total_wins_even'] >= 6 || value['total_wins_odd'] >= 6) && value['d_shot'] === 0) {
                    value['d_shot'] = shot_order;
                    value.winner = (value['total_wins_even'] > value['total_wins_odd']) ? 'even' : 'odd';
                }



                map.set(round, value);
            } else {
                let new_input = {winner: null, counts: 1, d_shot: 0};
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

        // EXTRA CHECK FOR WINNER OF THE ROUND
        if (parseInt(key.split(':')[1]) % 5 === 4) {
            let result = map.get(round);
            if (result['d_shot'] === 0) {
                if (result['total_wins_even'] = result['total_wins_odd']) {
                    result.winner = (Math.floor(Math.random() * 2) === 0) ? 'even' : 'odd';
                    result['d_shot'] = result['counts'];
                } else {
                    result.winner = (result['total_wins_even'] > result['total_wins_odd']) ? 'even' : 'odd';
                    result['d_shot'] = result['counts'];
                }

                map.set(round, result);
            }
        }

    })

}


// SHOT ORDER DEFINER
function definingShot(key) {

    let order_shot = 0,
        min = parseInt(key.split(':')[1]),
        second = key.split(':')[2];

    switch (true) {
        case (min % 5 === 0 && second === '20'):
            order_shot = 1;
            break;
        case (min % 5 === 0 && second === '40'):
            order_shot = 2;
            break;
        case (min % 5 === 1 && second === '00'):
            order_shot = 3;
            break;
        case (min % 5 === 1 && second === '20'):
            order_shot = 4;
            break;
        case (min % 5 === 1 && second === '40'):
            order_shot = 5;
            break;
        case (min % 5 === 2 && second === '00'):
            order_shot = 6;
            break;
        case (min % 5 === 2 && second === '20'):
            order_shot = 7;
            break;
        case (min % 5 === 2 && second === '40'):
            order_shot = 8;
            break;
        case (min % 5 === 3 && second === '00'):
            order_shot = 9;
            break;
        case (min % 5 === 3 && second === '20'):
            order_shot = 10;
            break;
        case (min % 5 === 3 && second === '40'):
            order_shot = 11;
            break;
        default:
            console.log('SHOULD NOT REACH THIS CODE on SHOT ORDER FUNCTION');
            break;
    }
    return order_shot
}




