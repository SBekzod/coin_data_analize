const xlsx = require('xlsx');
const path = require('path');

const exportExcel = (data, workSheetColumnNames, workSheetName, filePath) => {
    const workBook = xlsx.utils.book_new();
    const workSheetData = [
        workSheetColumnNames,
        ... data
    ];
    const workSheet = xlsx.utils.aoa_to_sheet(workSheetData);
    xlsx.utils.book_append_sheet(workBook, workSheet, workSheetName);
    xlsx.writeFile(workBook, path.resolve(filePath));
}

const exportCoinDataToExcel = (coin_data, workSheetColumnNames, workSheetName, filePath) => {
    const data = coin_data;
    let key_list = Object.keys(coin_data);
    let export_list = [];
    key_list.forEach(ele => {
        let target_ele = coin_data[ele];
        let insert_obj = [
            ele,
            target_ele['result'],
            target_ele['data'].id,
            target_ele['data']['binstamp'],
            target_ele['data']['close'],
            target_ele['data']['coltime'],
        ];
        export_list.push(insert_obj);
    })
    exportExcel(export_list, workSheetColumnNames, workSheetName, filePath);
}

module.exports = exportCoinDataToExcel;