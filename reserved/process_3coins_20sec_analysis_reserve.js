const moment = require('moment')
console.log(`Process started ${process.env.NODE_ENV === 'PRODUCTION' ? process.env.NODE_ENV : 'DEVELOPMENT'} ${moment.utc().format("YYYY-MM-DD HH:mm:ss")}`);
const dotenv = require('dotenv');
dotenv.config({path: './.env'});
const MySql = require('../models/mysql2');
const db = new MySql();
const exportCoinDataToExcel = require('../models/exportService');
const filePath_btc = './outputs/btc-20s.xlsx'
const filePath_eth = './outputs/eth-20s.xlsx'
const filePath_bnb = './outputs/bnb-20s.xlsx'


let target_btc = {}, target_eth = {}, target_bnb = {};

let doubles_btc = {'00': 0, '11': 0, '22': 0, '33': 0, '44': 0, '55': 0, '66': 0, '77': 0, '88': 0, '99': 0};
let doubles_eth = {'00': 0, '11': 0, '22': 0, '33': 0, '44': 0, '55': 0, '66': 0, '77': 0, '88': 0, '99': 0};
let doubles_bnb = {'00': 0, '11': 0, '22': 0, '33': 0, '44': 0, '55': 0, '66': 0, '77': 0, '88': 0, '99': 0};


let count_wins = {
    'btc': {'win': 0, 'draw': 0},
    'eth': {'win': 0, 'draw': 0},
    'bnb': {'win': 0, 'draw': 0},
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
            let res_bnb = await db.prepareOneDayTickBNB(start_day, end_day)
            preparingCoinData(res_bit, 'bitcoin');
            preparingCoinData(res_eth, 'ethereum');
            preparingCoinData(res_bnb, 'binance');
        }

        // Results
        console.log('::RESULTS::');
        console.log(`BTC total ${Object.keys(target_btc).length}`);
        console.log(`ETH total ${Object.keys(target_eth).length}`);
        console.log(`BNB total ${Object.keys(target_bnb).length}`);
        console.log('btc:', doubles_btc);
        console.log('eth:', doubles_eth);
        console.log('bnb:', doubles_bnb);


        // Transfer to Excel
        const workSheetColumnNames = ['TIME_UTC', 'SUMMARY', 'DB_ID', 'TIMESTAMP', 'CLOSE', 'TIME12'];
        exportCoinDataToExcel(target_btc, workSheetColumnNames, 'btc_20s', filePath_btc);
        exportCoinDataToExcel(target_eth, workSheetColumnNames, 'eth_20s', filePath_eth);
        exportCoinDataToExcel(target_bnb, workSheetColumnNames, 'bnb_20s', filePath_bnb);
        // console.log(target_btc);

        // GETTING WINNER INFORMATION
        preparingWinnerData();
        console.log('FINAL DATA');
        console.log(count_wins);

    } catch(err) {
        console.log(err);
    }
}, 1000);


// ORGANIZING TIME PERIODS
function preparingCoinData(raw_data, coin_type) {
    raw_data.map(ele => {
        let time = new Date(parseInt(ele['binstamp']));
        if (time.getSeconds() % 20 === 0) {
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


// CUMULATIVE SUMMARY CALCULATION
function cumulateDigits(ele, key, coin_type) {

    let numb, first_digit, second_digit;
    numb = Math.floor(ele.close * 1000 / 10) % 100;

    if (numb < 10) {
        first_digit = 0;
        second_digit = numb;
    } else if (numb >= 10 && numb < 100) {
        first_digit = Math.floor(numb / 10);
        second_digit = numb % 10;
    }

    let summary = first_digit + second_digit;

    if(first_digit === second_digit) {
        switch (coin_type) {
            case 'bitcoin':
                doubles_btc[`${first_digit}${second_digit}`]++;
                break;
            case 'ethereum':
                doubles_eth[`${first_digit}${second_digit}`]++;
                break;
            case 'binance':
                doubles_bnb[`${first_digit}${second_digit}`]++;
                break;
            default:
                console.log('should not reach');
                break;
        }
        let double_summary = 0;
        switch(first_digit) {
            case 0:
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
    } else if (coin_type === 'binance') {
        target_bnb[`${key}`] = {summary, data: ele};
    }

}

function preparingWinnerData() {
    Object.keys(target_btc).forEach((key) => {
        let ele = target_btc[`${key}`];
        if (target_eth.hasOwnProperty(`${key}`) && target_bnb.hasOwnProperty(`${key}`)) {
            count_wins['rounds_checked']++;
            // console.log('*****************');

            let btc_amount = ele['summary'];
            let eth_amount = target_eth[`${key}`]['summary'];
            let bnb_amount = target_bnb[`${key}`]['summary'];
            if (btc_amount > eth_amount && btc_amount > bnb_amount) {
                count_wins['btc']['win']++;
            } else if (eth_amount > btc_amount && eth_amount > bnb_amount) {
                count_wins['eth']['win']++;
            } else if (bnb_amount > eth_amount && bnb_amount > btc_amount) {
                count_wins['bnb']['win']++;
            } else if (eth_amount === btc_amount && eth_amount === bnb_amount) {
                count_wins['super_draw']++;
            } else if (eth_amount === btc_amount) {
                count_wins['btc']['draw']++;
                count_wins['eth']['draw']++;
            } else if (bnb_amount === btc_amount) {
                count_wins['btc']['draw']++;
                count_wins['bnb']['draw']++;
            } else if (eth_amount === bnb_amount) {
                count_wins['eth']['draw']++;
                count_wins['bnb']['draw']++;
            } else {
                console.log('SHOULD NOT BE COMMITTED');
            }

        }
        // console.log(key);
        // console.log(ele);
    })

}






