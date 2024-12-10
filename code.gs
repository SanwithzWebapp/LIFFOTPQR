// https://docs.google.com/spreadsheets/d/1PAMhEEu4kDzEXxyslOPOhJVlhNa_AfKKnmLcqLhl7hQ/copy


function doPost(e) {
    const lock = LockService.getDocumentLock();
    lock.tryLock(5000); // Wait up to 5 seconds for the lock.

    try {
        const { uid, name, phone, email, action, otpUid, stampCount } = e.parameter;
        const regSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Registrations");
        const dataSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data");
        const tokenSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Token");

        if (!uid || !name) {
            return ContentService.createTextOutput("Error: Missing required parameters (uid, name).");
        }

        // Handle user registration
        if (action === "register") {
            const newRow = [new Date(), uid, name, "'" + phone, email];
            regSheet.appendRow(newRow);
            const newDataRow = [new Date(), uid, name, "Reg", 0];
            dataSheet.appendRow(newDataRow);
            return ContentService.createTextOutput("Registration successful!");
        }

        // Handle stamp update with token validation
        if (action === "stamp") {
            if (!otpUid) {
                return ContentService.createTextOutput("Error: Missing otpUid for stamp action.");
            }

            const tokenData = tokenSheet.getDataRange().getValues();
            let isCodeValid = false;

            for (let i = 1; i < tokenData.length; i++) {
                if (tokenData[i][0] === otpUid && tokenData[i][1] !== "Used") {
                    tokenSheet.getRange(i + 1, 2).setValue("Used");
                    isCodeValid = true;
                    break;
                }
            }

            if (!isCodeValid) {
                return ContentService.createTextOutput("Error: Token has already been used or is invalid.");
            }

            const newStampRow = [
                new Date(),
                uid,
                name,
                otpUid,
                parseInt(stampCount || 1, 10)
            ];
            dataSheet.appendRow(newStampRow);

            return ContentService.createTextOutput("Stamp data saved successfully and token marked as used!");
        }

        // Handle reset action
        if (action === "reset") {
            const dataRange = dataSheet.getRange(2, 2, dataSheet.getLastRow() - 1, 1); // Column B (USER_UID)
            const textFinder = dataRange.createTextFinder(uid);
            const matches = textFinder.findAll();

            matches.forEach(match => {
                const row = match.getRow();
                dataSheet.getRange(row, 5).setValue(0); // Set column E (SCORE) to 0
            });

            return ContentService.createTextOutput("All scores reset to 0 for the user!");
        }

        return ContentService.createTextOutput("Error: Invalid action.");
    } catch (error) {
        return ContentService.createTextOutput("Error saving data: " + error.message);
    } finally {
        lock.releaseLock();
    }
}





function doGet(e) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data");
    const uid = e.parameter.uid;

    if (!uid) {
        return ContentService.createTextOutput("UID is required.");
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const filteredData = rows.filter(row => row[1] === uid);

    if (filteredData.length === 0) {
        return ContentService.createTextOutput("No data found for this UID.");
    }

    const result = filteredData
        .map(row => {
            // Convert stampCount into a visual representation using Font Awesome
            const stampCount = row[4] || 0;
            const completed = '<i class="fa-solid fa-heart"></i>';
            const incomplete = '<i class="fas fa-times"></i>';

            const stamps = Array.from({ length: 10 }, (_, i) => (i < stampCount ? completed : incomplete)).join(" ");

            return `TIMESTAMP: ${row[0]}, USER_UID: ${row[1]}, USER_NAME: ${row[2]}, CODE: ${row[3]}, STAMPS: ${stamps}`;
        })
        .join("\n");

    return ContentService.createTextOutput(result);
}




function onOpen() {
var ui = SpreadsheetApp.getUi();
ui.createMenu('Token Generator')
.addItem('Generate Token', 'generateUids')
.addToUi();
}

function generateUids() {
  const rowAdd = 50
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Token');
  const range = sheet.getRange(`A${sheet.getLastRow() + 1}:A${sheet.getLastRow() + rowAdd}`);
  range.setValues(Array.from({ length: range.getNumRows() }, () => [Utilities.getUuid().split("-")[0]]));
}
