const moment = require('moment')
console.log(`Process started ${process.env.NODE_ENV === 'PRODUCTION' ? process.env.NODE_ENV : 'DEVELOPMENT'} ${moment.utc().format("YYYY-MM-DD HH:mm:ss")}`);
const dotenv = require('dotenv');
dotenv.config({path: './.env'});
const MySql = require('./models/mysql2');
const db = new MySql();

const exportCoinDataToExcel = require('./models/exportServiceGrouper');
const filePath_btc = './outputs/btc-3mx15s.xlsx';
const filePath_eth = './outputs/eth-3mx15s.xlsx';

let target_btc = {}, target_eth = {};
let doubles_btc = {'00': 0, '11': 0, '22': 0, '33': 0, '44': 0, '55': 0, '66': 0, '77': 0, '88': 0, '99': 0};
let doubles_eth = {'00': 0, '11': 0, '22': 0, '33': 0, '44': 0, '55': 0, '66': 0, '77': 0, '88': 0, '99': 0};
let count_wins = {
    'btc': {'win': 0, 'draw': 0},
    'eth': {'win': 0, 'draw': 0},
    'rounds_checked': 0,
};
let map_btc = new Map();
let map_eth = new Map();


setTimeout(async function() {

    try {
        for(let i = 1; i < 2; i++) {
            const start_day = moment.utc().add( -i, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss');
            const end_day = moment.utc().add( -i, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss');
            console.log('Started', start_day);

            let res_bit = await db.prepareOneDayTicksBitcoin(start_day, end_day)
            let res_eth = await db.prepareOneDayTicksEther(start_day, end_day)
            preparingCoinData(res_bit, 'bitcoin');
            preparingCoinData(res_eth, 'ethereum');
        }


        // Results
        console.log('::RESULTS::');
        console.log(`BTC total ${Object.keys(target_btc).length}`);
        console.log(`ETH total ${Object.keys(target_eth).length}`);
        // console.log('btc:', doubles_btc);
        // console.log('eth:', doubles_eth);
        // console.log(target_btc);


        // preparing round information
        makingRoundsData(target_btc, map_btc);
        makingRoundsData(target_eth, map_eth);
        // console.log(map_btc);

        // Transfer to Excel
        const workSheetColumnNames = ['Rounds', 'TIME_MIN', 'TOTAL'];
        exportCoinDataToExcel(map_btc, workSheetColumnNames, 'btc_3mx15s', filePath_btc);
        exportCoinDataToExcel(map_eth, workSheetColumnNames, 'eth_3mx15s', filePath_eth);

        // GETTING WINNER INFORMATION
        preparingWinnerData();
        console.log(count_wins);

    } catch(err) {
        console.log(err);
    }
}, 1000);


// ORGANIZING TIME PERIODS
function preparingCoinData(raw_data, coin_type) {
    raw_data.map(ele => {
        let time = new Date(parseInt(ele['binstamp']));
        if (time.getSeconds() % 15 === 0) {
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


// CUMULATIVE SUMMARY CALCULATION
function cumulateDigits(ele, key, coin_type) {

    let numb, first_digit, second_digit;
    numb = Math.round(ele.close * 100) % 100;

    if (numb < 10) {
        first_digit = 0;
        second_digit = numb;
    } else if (numb >= 10 && numb < 100) {
        first_digit = Math.floor(numb / 10);
        second_digit = numb % 10;
    }

    // double digit counts
    let summary = first_digit + second_digit;
    if(first_digit === second_digit && false) {
        switch (coin_type) {
            case 'bitcoin':
                doubles_btc[`${first_digit}${second_digit}`]++;
                break;
            case 'ethereum':
                doubles_eth[`${first_digit}${second_digit}`]++;
                break;
            default:
                console.log('should not reach');
                break;
        }
        let double_summary = 0;
        switch(first_digit) {
            case 0:
                double_summary = 0;
                break;
            case 5:
                double_summary = 20;
                break;
            case 1:
            case 6:
                double_summary = 4;
                break;
            case 2:
            case 7:
                double_summary = 8;
                break;
            case 3:
            case 8:
                double_summary = 12;
                break;
            case 4:
            case 9:
                double_summary = 16;
                break;
            default:
                console.log('should not reach: doubles');
                console.log(first_digit);
                break;
        }
        summary = double_summary;
    } else if (summary > 10) {
        summary = summary % 10;
    }

    if (coin_type === 'bitcoin') {
        target_btc[`${key}`] = {summary, data: ele};
    } else if (coin_type === 'ethereum') {
        target_eth[`${key}`] = {summary, data: ele};
    }

}


// PREPARING WIN INFO
function preparingWinnerData() {

    map_btc.forEach(function(value_btc, key) {
        count_wins['rounds_checked']++;
        let value_eth = map_eth.get(key);
        !value_eth ? value_eth = {total_summary: 0} : '';

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


// ORGANIZING ROUNDS ON MAPS
function makingRoundsData(target_pair, map) {

    let key_list = Object.keys(target_pair);
    key_list.forEach((key) => {
        let round = key.split(':')[0] * 20 + Math.floor(parseInt(key.split(':')[1]) / 3) + 1;
        let cur_pairs = key.split(':')[2];
        if (!(parseInt(key.split(':')[1]) % 3 === 0 && cur_pairs == '00') &&
            !(parseInt(key.split(':')[1]) % 3 === 2 &&  cur_pairs == '45')) {
            // console.log('TARGET: ', key);
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

        // if(parseInt(key.split(':')[1]) % 3 === 2 &&  cur_pairs == '45') {
        //     console.log('------------------------------------')
        // }

    })

}





