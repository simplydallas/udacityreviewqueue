/**
 * Flattens review data.  Assume max 1 level nested but does not hard code
 * flattening in case there are changes to the review API's JSON object
 */
function curDataFlat() {
  var data = curData();
  var headers = {};
  for (var r = 0, len = data.length; r < len; r++) {

    var review = data[r]
    var newObj = {};

    for (var i in review) {
      var type = $.type(review[i]);
      //catch this one manually so it is always first
      if (i === "full_feedback") {
        //skip this one since it is a derived column
      }
      else if (type === "array") {
        if(review[i].length) {
          for (var x = 0, len = review[i].length; x < len; x++) {
            headers[i + "_" + (x + 1)] = "";
            newObj[i + "_" + (x + 1)] = catchDates(review[i][x]);
          }
        }
      }
      else if (type === "object") {
        for (var y in review[i]) {
          if(review[i][y] !== null && review[i][y] !== undefined) {
            headers[i + "_" + y] = "";
            newObj[i + "_" + y] = catchDates(review[i][y]);
          }
        }
      }
      else if (review[i] !== null && review[i] !== undefined){
        headers[i] = "";
        newObj[i] = catchDates(review[i]);
      }
    }
    data[r] = newObj;
  }
  //add headers as first object in the array
  data.unshift(headers);

  return data;
}

/**
 * Reformat dates in iso 8601 format but pass everything else unchanged
 * @param  {various} data unknown data format, usually a string
 * @return {various} either the original data or a date/time string
 */
function catchDates(data) {
  if (moment(data,moment.ISO_8601,true).isValid()) {
    return moment(data).format("L hh:mm:ss")
  }
  return data
}

/**
 * parse flattened review data JSON into a CSV string
 * @return {string} escaped and parsed string
 */
function curDataCSV() {
  var data = curDataFlat();
  if(data.length === 0) return '';
  var headers = Object.keys(data[0]);
  var csvStr = headers.join(',') + '\n';

  for (i = 1, len = data.length; i < len; i++) {
    var review = data[i];
    for (x = 0, hLen = headers.length; x < hLen; x++) {
      var header = headers[x];
      if(x > 0) csvStr += ',';
      if(review.hasOwnProperty(header)) {
        var curVal = review[header];
        if ($.type(curVal) === "string") {
          curVal = '"' + curVal.replace(/(\r\n|\n|\r)/gm,"")
                                     .replace(/"/gm,'""') + '"';
        }
        csvStr += curVal;
      }
    }
    csvStr += '\n';
  }

  return encodeURIComponent(csvStr);;
}

/**
 * Export review data JSON to CSV file format.
 * Cleanup is done first to flatten and filter the data
 */
function exportCSV() {
  var csvStr = curDataCSV();
  var uri = 'data:text/csv;charset=utf-8,'+ csvStr;
  var fileName = 'review_data_' + moment().format('YYYY-MM-DD') + '.csv'
  
  var linkEl = document.createElement('a');
  linkEl.setAttribute('href', uri);
  linkEl.setAttribute('download', fileName);
  linkEl.click();
  $(linkEl).remove();
}

/**
 * Export review data JSON to json file format.
 * No cleanup is done on this export version
 */
function exportJSON() {
  var dataStr = curDataStr();
  var uri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  var fileName = 'review_data_' + moment().format('YYYY-MM-DD') + '.json'

  var linkEl = document.createElement('a');
  linkEl.setAttribute('href', uri);
  linkEl.setAttribute('download', fileName);
  linkEl.click();
  $(linkEl).remove();
}