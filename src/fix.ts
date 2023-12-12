import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import readline from 'readline';
import {
  REDIRECT_URL,
  JSON_FILE_PATH,
  googleClientID,
  googleClientSecret,
  getCredentials,
  getCredentialsFromJSON,
  getEvents,
  deleteEvents,
  createEvent,
} from './util/googleApiUtility';
import {
  displayDateTimeRange,
  dividedDateTimeRange,
  groupEventsByDate,
  isInRange,
} from './util/dateTimeUtility';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const getResponse = async (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (response) => {
      const lowerCaseResponse = response.toLowerCase();
      if (
        lowerCaseResponse === 'y' ||
        lowerCaseResponse === 'yes' ||
        lowerCaseResponse === 'n' ||
        lowerCaseResponse === 'no'
      ) {
        rl.close();
        resolve(lowerCaseResponse);
      } else {
        resolve(getResponse(question));
      }
    });
  });
};

const fixCommandHandler = async () => {
  const oauth2Client = new OAuth2Client(
    googleClientID,
    googleClientSecret,
    REDIRECT_URL
  );

  const credentials = fs.existsSync(JSON_FILE_PATH)
    ? getCredentialsFromJSON(JSON_FILE_PATH)
    : await getCredentials(oauth2Client);
  if (credentials) {
    oauth2Client.setCredentials(credentials);
  }

  const dateTimeRange = process.argv[2];
  const afterEventName = process.argv[3];
  const beforeEventName = process.argv[4];

  try {
    const beforeEvents = await getEvents(oauth2Client, beforeEventName);
    if (beforeEvents) {
      const groupedEvents = groupEventsByDate(beforeEvents);
      await displayDateTimeRange(groupedEvents);
      const [startDateTime, endDateTime] = dividedDateTimeRange(dateTimeRange);
      if (isInRange(startDateTime, endDateTime, beforeEvents)) {
        console.log('Are you sure to remove schedules?');
        const response = await getResponse(
          `And add this?\n${dateTimeRange}\n(y/n) > `
        );
        const lowerCaseResolve = response.toLowerCase();
        if (lowerCaseResolve === 'y' || lowerCaseResolve === 'yes') {
          await deleteEvents(oauth2Client, beforeEventName);
          await createEvent(
            oauth2Client,
            afterEventName,
            startDateTime,
            endDateTime
          );
        }
      } else {
        console.log(`Could not find schedule in "${beforeEventName}" events.`);
      }
    } else {
      console.log('No upcoming events found.');
    }
  } catch (error) {
    await getCredentials(oauth2Client);
    await fixCommandHandler();
  }
};

fixCommandHandler();
