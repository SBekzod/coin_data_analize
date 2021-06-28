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

const exportCoinDataToExcel = (data, workSheetColumnNames, workSheetName, filePath) => {
    let key_list = Object.keys(data);
    let export_list = [];
    key_list.forEach(ele => {
        // console.log(ele)
        let target_ele = data[ele];
        // console.log(target_ele);
        let insert_obj = [
            ele,
            target_ele['0'],
            target_ele['1'],
            target_ele['2'],
            target_ele['3'],
            target_ele['4'],
            target_ele['5'],
            target_ele['6'],
            target_ele['7'],
            target_ele['8'],
            target_ele['9'],
            target_ele['start_day'],
        ];
        export_list.push(insert_obj);
    })

    // console.log('**********************************');
    // console.log('key list size: ', key_list.length);
    // console.log(export_list);
    // console.log('export list size: ', export_list.length);

    exportExcel(export_list, workSheetColumnNames, workSheetName, filePath);
}

module.exports = exportCoinDataToExcel;