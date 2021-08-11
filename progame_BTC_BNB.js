const moment = require('moment');
console.log(`Process started ${process.env.NODE_ENV === 'PRODUCTION' ? process.env.NODE_ENV : 'DEVELOPMENT'} ${moment.utc().format("YYYY-MM-DD HH:mm:ss")}`);
const dotenv = require('dotenv');
dotenv.config({path: './.env'});
const MySql = require('./models/mysql2');
const db = new MySql();
const exportCoinDataToExcel = require('./models/exportServiceGrouper');
const filePath_btc = './outputs/btc-5mx30s.xlsx';
const filePath_bnb = './outputs/bnb-5mx30s.xlsx';
const exportCoinDataToExcelSec = require('./models/exportService');
const filePath_btc_sec = './outputs/btc-30s.xlsx';
const filePath_bnb_sec = './outputs/bnb-30s.xlsx';
let target_btc = {}, target_bnb = {};
let count_wins = {
    'btc': {'win': 0, 'draw': 0},
    'bnb': {'win': 0, 'draw': 0},
    'rounds_checked': 0,
};
let map_btc = new Map();
let map_bnb = new Map();


setTimeout(async function () {
    try {
        for (let i = 1; i < 2; i++) {
            const start_day = moment.utc().add(-i, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss');
            const end_day = moment.utc().add(-i, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss');
            console.log('Started', start_day);

            let res_bit = await db.prepareOneDayTicksBitcoin(start_day, end_day)
            let res_bnb = await db.prepareOneDayTickBNB(start_day, end_day)
            preparingCoinData(res_bit, 'bitcoin');
            preparingCoinData(res_bnb, 'binance');
        }
        // Results
        console.log('::RESULTS::');
        console.log(`BTC total ${Object.keys(target_btc).length}`);
        console.log(`BNB total ${Object.keys(target_bnb).length}`);

        // preparing round information
        makingRoundsData(target_btc, map_btc);
        makingRoundsData(target_bnb, map_bnb);
        // console.log(map_btc);

        // Transfer to Excel
        const workSheetColumnNames = ['Rounds', 'TIME_MIN', 'TOTAL'];
        exportCoinDataToExcel(map_btc, workSheetColumnNames, 'btc_5mx30s', filePath_btc);
        exportCoinDataToExcel(map_bnb, workSheetColumnNames, 'bnb_5mx30s', filePath_bnb);
        // Transfer to Excel
        const workSheetColumnNamesSec = ['TIME_UTC', 'FINAL_DIGIT', 'DB_ID', 'TIMESTAMP', 'CLOSE', 'TIME12'];
        exportCoinDataToExcelSec(target_btc, workSheetColumnNamesSec, 'btc_30s', filePath_btc_sec);
        exportCoinDataToExcelSec(target_bnb, workSheetColumnNamesSec, 'bnb_30s', filePath_bnb_sec);

        // GETTING WINNER INFORMATION
        preparingWinnerData();
        console.log(count_wins);
    } catch (err) {
        console.log(err);
    }
}, 1000);



// ORGANIZING TIME PERIODS
function preparingCoinData(raw_data, coin_type) {
    raw_data.map(ele => {
        let time = new Date(parseInt(ele['binstamp']));

        //TODO: RECREATE THE LACKING DATA
        if (time.getSeconds() % 30 === 0) {
            let hour = shapingTime(time.getUTCHours());
            let minutes = shapingTime(time.getMinutes());
            let seconds = shapingTime(time.getSeconds());
            let key = `${hour}:${minutes}:${seconds}`;
            cumulateDigits(ele, key, coin_type);
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
function cumulateDigits(ele, key, coin_type) {
    let summary, numb;
    numb = Math.round(ele.close * 100) % 100;
    if (numb < 10) {
        summary = numb;
    } else if (numb >= 10 && numb < 100) {
        summary = numb % 10;
    }
    if (coin_type === 'bitcoin') {
        target_btc[`${key}`] = {summary, data: ele};
    } else if (coin_type === 'binance') {
        target_bnb[`${key}`] = {summary, data: ele};
    }
}



// ORGANIZING ROUNDS ON MAPS
function makingRoundsData(target_pair, map) {

    let key_list = Object.keys(target_pair);
    key_list.forEach((key) => {
        let round = key.split(':')[0] * 12 + Math.floor(parseInt(key.split(':')[1]) / 5) + 1;
        let cur_pairs = key.split(':')[2];
        if (!(parseInt(key.split(':')[1]) % 5 === 0 && cur_pairs == '00')) {
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



// PREPARING WIN INFO
function preparingWinnerData() {

    map_btc.forEach(function (value_btc, key) {
        count_wins['rounds_checked']++;
        let value_bnb = map_bnb.get(key);
        !value_bnb ? value_bnb = {total_summary: 0} : '';

        if (value_btc['total_summary'] > value_bnb['total_summary']) {
            count_wins['btc']['win']++;
        } else if (value_bnb['total_summary'] > value_btc['total_summary']) {
            count_wins['bnb']['win']++;
        } else if (value_btc['total_summary'] === value_bnb['total_summary']) {
            count_wins['btc']['draw']++;
            count_wins['bnb']['draw']++;
        } else {
            console.log('SHOULD NOT BE COMMITTED');
        }

    });
}


