const moment = require('moment')
console.log(`Process started ${process.env.NODE_ENV === 'PRODUCTION' ? process.env.NODE_ENV : 'DEVELOPMENT'} ${moment.utc().format("YYYY-MM-DD HH:mm:ss")}`);
const dotenv = require('dotenv');
dotenv.config({path: './../.env'});
const MySql = require('./../models/mysql2');
const db = new MySql();
const exportCoinDataToExcel = require('./../models/exportServiceAdd');
const filePath_one = './../outputs/excel-coin-1.xlsx'
const filePath_sec = './../outputs/excel-coin-2.xlsx'


const fir_target = {};
const sec_target = {};

setTimeout(async function() {

    try {
        for(let i = 0; i < 7; i++) {
            const start_day = moment.utc().add( -i, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss');
            const end_day = moment.utc().add( -i, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss');
            fir_target[`${i}`] = {start_day: start_day, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, 'total': 0};
            sec_target[`${i}`] = {start_day: start_day, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, 'total': 0};

            let response = await db.prepareOneDayTicksBitcoin(start_day, end_day)
            // let response = await db.prepareOneDayTicksEther(start_day, end_day)
            // let response = await db.prepareOneDayTickBNB(start_day, end_day)

            console.log(`Total tick counts: ${response.length}`);
            response.map(ele => {
                console.log('*****************');
                // console.log(ele.id);
                // console.log(ele.volume);
                declareDigits(ele.volume, i);
            })

        }

        // Results of first and second digits
        console.log('fir_target: ', fir_target);
        console.log('sec_target: ', sec_target);
        const workSheetColumnNames = ['ID', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'start_day'];
        exportCoinDataToExcel(fir_target, workSheetColumnNames, 'COIN_FIRST', filePath_one);
        exportCoinDataToExcel(sec_target, workSheetColumnNames, 'COIN_SECOND', filePath_sec);

    } catch(err) {
        console.log(err);
    }
}, 1000);


function declareDigits(volume, i) {

    let numb = Math.round(volume * 1000000) % 100, first_digit, second_digit;
    // let numb = Math.round(volume * 100000) % 100, first_digit, second_digit;
    // let numb = Math.round(volume * 10000) % 100, first_digit, second_digit;


    if(numb < 10) {
        first_digit = 0;
        second_digit = numb;
    } else if(numb >= 10 && numb < 100) {
        first_digit = Math.floor(numb / 10);
        second_digit = numb % 10;
    }

    separetedDigitAnalysis(first_digit, second_digit, i);
    console.log(`numb: ${numb}, first_dig: ${first_digit} and second_dig: ${second_digit}`);
}


function separetedDigitAnalysis(first, second, i) {
    fir_target[`${i}`][`${first}`]++;
    fir_target[`${i}`]['total']++;

    sec_target[`${i}`][`${second}`]++;
    sec_target[`${i}`]['total']++;
}







