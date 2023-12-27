import {
  getCredentials,
  getEvents,
  initializeOAuth2Client,
} from './util/googleApiUtility';
import {
  displayDateTimeRange,
  groupEventsByDate,
} from './util/dateTimeUtility';
import { fixCommandHandler } from './fix';
import { exit } from 'process';
import { displayHowToUse } from './help';
import { syncComanndHandler } from './sync';

const listEvents = async (eventName: string) => {
  const oauth2Client = await initializeOAuth2Client();
  if (oauth2Client) {
    try {
      const events = await getEvents(oauth2Client, eventName);
      if (events) {
        const groupedEvents = groupEventsByDate(events);
        if (groupedEvents.length > 0) {
          console.log('Upcoming events:');
          await displayDateTimeRange(groupedEvents);
          if (events.length > 10) {
            console.log('The number of events exceeds 10.');
          }
        } else {
          console.log('No upcoming events found.');
        }
      } else {
        console.log('Could not found event.');
      }
    } catch (error) {
      await getCredentials(oauth2Client);
      await listEvents(eventName);
    } finally {
      exit();
    }
  } else {
    console.log('Could not initialize OAuth2Client.');
    exit();
  }
};

switch (process.argv[2]) {
  case 'hunt':
    listEvents(process.argv[3]);
    break;
  case 'fix':
    fixCommandHandler(process.argv[3], process.argv[4], process.argv[5]);
    break;
  case 'sync':
    syncComanndHandler();
    break;
  case 'help':
  case '-h':
  case '--help':
  default:
    console.log(displayHowToUse());
    exit();
}
