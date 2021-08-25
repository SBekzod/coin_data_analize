const moment = require('moment');
console.log(`Process started ${process.env.NODE_ENV === 'PRODUCTION' ? process.env.NODE_ENV : 'DEVELOPMENT'} ${moment.utc().format("YYYY-MM-DD HH:mm:ss")}`);
const dotenv = require('dotenv');
dotenv.config({path: './../.env'});
const MySql = require('./../models/mysql2');
const db = new MySql();
const exportCoinDataToExcel = require('./../models/exportServiceGrouper');
const filePath_btc = './../outputs/btc-5mx30s.xlsx';
const filePath_eth = './../outputs/eth-5mx30s.xlsx';
const exportCoinDataToExcelSec = require('./../models/volum_added/exportService');
const filePath_btc_sec = './../outputs/btc-30s.xlsx';
const filePath_eth_sec = './../outputs/eth-30s.xlsx';
let target_btc = {}, target_eth = {};
let count_wins = {
    'btc': {'win': 0, 'draw': 0},
    'eth': {'win': 0, 'draw': 0},
    'rounds_checked': 0,
};
let map_btc = new Map();
let map_eth = new Map();


setTimeout(async function () {
    try {
        for (let i = 1; i < 2; i++) {
            const start_day = moment.utc().add(-i, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss');
            const end_day = moment.utc().add(-i, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss');
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

        // preparing round information
        makingRoundsData(target_btc, map_btc);
        makingRoundsData(target_eth, map_eth);
        // console.log(map_btc);

        // Transfer to Excel
        const workSheetColumnNames = ['Rounds', 'TIME_MIN', 'TOTAL'];
        exportCoinDataToExcel(map_btc, workSheetColumnNames, 'btc_5mx30s', filePath_btc);
        exportCoinDataToExcel(map_eth, workSheetColumnNames, 'eth_5mx30s', filePath_eth);
        // Transfer to Excel
        const workSheetColumnNamesSec = ['TIME_UTC', 'SUM_DIGITS', 'DB_ID', 'TIMESTAMP', 'CLOSE', 'VOLUME', 'TIME12'];
        exportCoinDataToExcelSec(target_btc, workSheetColumnNamesSec, 'btc_30s', filePath_btc_sec);
        exportCoinDataToExcelSec(target_eth, workSheetColumnNamesSec, 'eth_30s', filePath_eth_sec);

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
    let summary = 0, numb, numb_volume;

    // adding the close amount final digit
    numb = Math.round(ele.close * 100) % 100;
    if (numb < 10) {
        summary += numb;
    } else if (numb >= 10 && numb < 100) {
        summary += numb % 10;
    }

    if (coin_type === 'bitcoin') {

        // adding the volume data amount final digit
        numb_volume = Math.round(ele.volume * 1000000) % 100;
        if (numb_volume < 10) {
            summary += numb_volume;
        } else if (numb_volume >= 10 && numb_volume < 100) {
            summary += numb_volume % 10;
        }

        if(summary > 10) summary = summary % 10;
        target_btc[`${key}`] = {summary, data: ele};
    } else if (coin_type === 'ethereum') {

        // adding the volume data amount final digit
        numb_volume = Math.round(ele.volume * 100000) % 100;
        if (numb_volume < 10) {
            summary += numb_volume;
        } else if (numb_volume >= 10 && numb_volume < 100) {
            summary += numb_volume % 10;
        }

        if(summary > 10) summary = summary % 10;
        target_eth[`${key}`] = {summary, data: ele};
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


