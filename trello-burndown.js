/*

Derived from code at 
http://echobehind.wordpress.com/2012/06/28/create-your-own-burndown-chart-using-trello-api-and-google-apps-script/
Excellent article that explains everything really well
I assume it was developed by Dražen

I have modified it and customised it for our set-up and needs

 How to use...

 Create a trello app
 https://trello.com/1/appKey/generate

 ****************
 ****************
 Get a token for your Trello App
 https://trello.com/1/authorize?key=substitutewithyourapplicationkey&name=BurndownChart&expiration=never&response_type=token
 ****************
 ****************

 Put the App Key and Member Token into the trelloFetch function

 Create a spreadsheet and change the name of the sheet to '#active'
 Enter the following information into Column J
 1. Sprint Number
 2. Sprint Name
 3. Start date in the format day.month.year. eg 31.7.2013
 4. The day after the end date in the same format
 5. The trello board ID (from teh boards URL) eg. kN0WBZDt

 Run the function sprintStart()
 This should populate the spreadsheet with dates for the entire sprint
 and start the process of fetching data from Trello

 Create a graph that shows the data - burndown-tastic
 */


// Some constants
var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets(),
    activeSheet = "",
    sprintInfoColumn = 12,
    doneListName = 'Done',
    unplannedCardName = 'unplanned',
    notCommittedCardName = 'not-committed';

// Find the active sheet
for (var i=0; i<sheets.length; i++) {
    if (sheets[i].getName().indexOf("#active") != -1)
        activeSheet = sheets[i].getName();
}

var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(activeSheet);


/**
 * Helper function - makes a Trello API call
 * @param url
 * @returns {*}
 */
function trelloFetch(url) {
    // Constants
    var apiEndPoint = "https://api.trello.com/1",
        key = "yourkey",
        token = "yourtoken";

    // Build the URL to call
    var completeUrl = apiEndPoint + url + "?key=" + key + "&token=" + token;

    // Get the data and return it
    var jsonData = UrlFetchApp.fetch(completeUrl);
    return Utilities.jsonParse(jsonData.getContentText());
}


/**
 * Does the main work of fetching data from trello and generating
 * a row of data for the spreadsheet
 * @param boardId
 * @returns {Array}
 */
function getActiveSprintData(boardId) {
    var i, out = [],
        results = {
            stories: 0,
            unsized: 0,
            all: 0,
            left: 0,
            uncommitted: 0,
            unplanned: 0,
            done: 0
        };

    // Get the lists and cards from Trello
    var boardLists = trelloFetch("/boards/" + boardId + "/lists/");
    var boardCards = trelloFetch("/boards/" + boardId + "/cards/");
    var doneListId = null;

    // See if we can find the 'Done' List
    for (i=0; i<boardLists.length; i++) {
        if (boardLists[i].name == doneListName)
            doneListId = boardLists[i].id;
    }

    // Go through all the cards on the board, counting up points
    for (i=0; i<boardCards.length; i++) {

        // See if the card has the points in the title. eg (3) Three Point Story
        var regex = /\((\d+)\)/;
        var storyPoints = boardCards[i].name.match(regex);

        // Get the points as a number and add them up
        storyPoints = storyPoints ? parseInt(storyPoints[1]) : 0;
        results.all += storyPoints;
        results.stories++;

        // If it was unsized, note that too
        if (storyPoints === 0) {
            results.unsized++;
        }

        // Check if the story is unplanned or uncommitted.
        if (boardCards[i].labels.length > 0) {
            for (var label=0; label < boardCards[i].labels.length; label++) {
                // Check the label for the Not Committed label or Unplanned label
                if (boardCards[i].labels[label].name == notCommittedCardName) {
                    results.uncommitted += storyPoints;
                } else if (boardCards[i].labels[label].name == unplannedCardName) {
                    results.unplanned += storyPoints;
                }
            }
        }

        // count finished stories
        if (boardCards[i].idList == doneListId) {
            results.done += storyPoints;
        }
    }

    // figure out how many are left still to do
    results.left = results.all - results.done;

    // return the data as an array
    out[0] = [results.stories, results.unsized, results.left, results.done, results.uncommitted, results.unplanned, results.all];
    return out;
}





/**
 * fetch data from Trello and append it to Spreadsheet
 */
function fetchData() {
    var data,
        baseRow = 2,
        baseColumn = 1,
        dateNow = new Date(),
        today = dateNow.getDate() + "." + (dateNow.getMonth()+1) + "." + dateNow.getYear() + ":" + dateNow.getHours(),
        sprintId = sheet.getRange(5, sprintInfoColumn).getValue();

    // Try and find the row in the spreadsheet for the current data
    while (sheet.getRange(baseRow, baseColumn).getValue() != "") {
        if (sheet.getRange(baseRow, baseColumn).getValue() == today) {
            break;
        }

        // not this row, try and next one
        baseRow++;
    }

    // Fetch the data from Trello and update the row
    data = getActiveSprintData(sprintId);
    sheet.getRange(baseRow, baseColumn + 1, 1, 7).setValues(data);
}





/* generate dates from start to end of a sprint */
function sprintStart() {
    var baseRow = 2,
        baseColumn = 1;
    var startDateArray = sheet.getRange(3, sprintInfoColumn).getValue().split("."),
        endDateArray = sheet.getRange(4, sprintInfoColumn).getValue().split(".");
    var currentDate = new Date(startDateArray[2], parseInt(startDateArray[1])-1, parseInt(startDateArray[0])),
        endDate = new Date(endDateArray[2], parseInt(endDateArray[1])-1, parseInt(endDateArray[0]));

    // generate headers
    sheet.getRange(baseRow-1, baseColumn, 1, 8).setValues([['Date', 'Stories', 'Unsized Stories', 'Points Remaining', 'Points done', 'Uncommitted', 'Unplanned', 'All']]);

    // generate dates
    while (currentDate.getTime() != endDate.getTime()) {
        for (var hour=9; hour<=17; hour++) {
            sheet.getRange(baseRow, baseColumn, 1, 1).setValue(currentDate.getDate() + "." + (currentDate.getMonth()+1) + "." + currentDate.getYear() + ":" + hour);
            baseRow++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // create a Trigger that fires every now and then
    ScriptApp.newTrigger("fetchData").timeBased().everyMinutes(15).create();

    // create a Trigger that will fire at the end of the sprint to stop everything
    var endTriggerDate = new Date(endDateArray[2], endDateArray[1] - 1, endDateArray[0], 10);
    ScriptApp.newTrigger("sprintEnd").timeBased().at(endTriggerDate).create();
}



/* remove all triggers when it comes to the end of a Sprint */
function sprintEnd() {
    var triggers = ScriptApp.getScriptTriggers();
    for (var i = 0; i < triggers.length; i++) {
        ScriptApp.deleteTrigger(triggers[i]);
    }
}



// Dummy function to test updating the spreadsheet - ignore
function rikTest() {
    var endDateTrigger = new Date(2013, 7, 12, 10, 45);
    sheet.getRange(40, 1, 1, 1).setValue(endDateTrigger);
}
