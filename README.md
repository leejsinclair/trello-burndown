Generate a burndown chart from Trello in Google Docs
===========================

Script for Google Docs to generate the data for a burndown chart from a Trello board. It was derived from the excellent article found at http://echobehind.wordpress.com/2012/06/28/create-your-own-burndown-chart-using-trello-api-and-google-apps-script/


## How to use

Create a trello app
https://trello.com/1/appKey/generate

****************
****************
Get a token for your Trello App
https://trello.com/1/authorize?key=substitutewithyourapplicationkey&name=ReplaceWithAppName&expiration=never&response_type=token
****************
****************

Put the App Key and Member Token into the trelloFetch function

Create a spreadsheet and change the name of the sheet to '#active'. 
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

