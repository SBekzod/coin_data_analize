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

const exportCoinDataToExcel = (map, workSheetColumnNames, workSheetName, filePath) => {

    let export_list = [];
    map.forEach((value, key)  => {
        let insert_obj = [
            key,
            value['time_min'],
            value['total_summary']
        ];
        export_list.push(insert_obj);
    });

    console.log('**********************************');
    console.log(export_list);
    console.log('export list size: ', export_list.length);

    exportExcel(export_list, workSheetColumnNames, workSheetName, filePath);
}

module.exports = exportCoinDataToExcel;