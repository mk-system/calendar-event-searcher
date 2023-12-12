import { calendar_v3, google } from 'googleapis';
import { Credentials, OAuth2Client } from 'google-auth-library';
import { getEnv } from '../lib/env';
import readline from 'readline';
import { homedir } from 'os';
import { join } from 'path';
import fs from 'fs';

export const REDIRECT_URL = 'urn:ietf:wg:oauth:2.0:oob';
export const { googleClientID, googleClientSecret, googleCalendarID } =
  getEnv();
const SCOPE = ['https://www.googleapis.com/auth/calendar'];

export const JSON_DIR_PATH = join(homedir(), '.conf', 'timehunt', 'cache');
export const JSON_FILE_PATH = join(JSON_DIR_PATH, 'token.json');

export const getCredentialsFromJSON = (JSONFilePath: string) => {
  const buff = fs.readFileSync(JSONFilePath, 'utf8');
  try {
    return JSON.parse(buff) as Credentials;
  } catch (error) {
    return undefined;
  }
};

export const getCredentials = async (oauth2Client: OAuth2Client) => {
  return new Promise<Credentials | undefined>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPE,
    });

    console.log('Please open the URL on the right with your browser:\n', url);
    rl.question('Please paste the code shown: ', (code: string) => {
      oauth2Client.getToken(code, (_err, tokens) => {
        if (tokens) {
          fs.mkdirSync(JSON_DIR_PATH, { recursive: true });
          fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(tokens));
          console.log('Token has been issued: ', JSON_FILE_PATH);
          resolve(tokens);
        } else {
          resolve(undefined);
        }
      });
      rl.close();
    });
  });
};

const getCalendar = async (oauth2Client: OAuth2Client) => {
  return google.calendar({
    version: 'v3',
    auth: oauth2Client,
  });
};

export const getEvents = async (
  oauth2Client: OAuth2Client,
  eventName: string
) => {
  const calendar = await getCalendar(oauth2Client);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const timeMin = now.toISOString();

  try {
    const response = await calendar.events.list({
      calendarId: googleCalendarID,
      q: eventName,
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: timeMin,
    });
    const events = response.data.items;
    if (events) {
      return response.data.items as calendar_v3.Schema$Event[];
    }
  } catch (error) {
    console.log(error);
  }
  return undefined;
};

const getEventIds = async (oauth2Client: OAuth2Client, eventName: string) => {
  try {
    const events = await getEvents(oauth2Client, eventName);
    if (events) {
      return events
        .filter((event) => event.summary === eventName)
        .map((event) => event.id || '');
    }
  } catch (error) {
    console.log(error);
  }
};

const deleteEvent = async (oauth2Client: OAuth2Client, eventId: string) => {
  try {
    const calender = await getCalendar(oauth2Client);
    const response = await calender.events.delete({
      auth: oauth2Client,
      calendarId: googleCalendarID,
      eventId: eventId,
    });
    if (!response || response.status !== 200) {
      console.log('Failed to delete event.');
      return false;
    }
  } catch (error) {
    console.log(error);
  }
  return true;
};

export const deleteEvents = async (
  oauth2Client: OAuth2Client,
  eventName: string
) => {
  try {
    const eventIds = await getEventIds(oauth2Client, eventName);
    if (eventIds) {
      eventIds.map((eventId) => deleteEvent(oauth2Client, eventId));
      return true;
    }
  } catch (error) {
    console.log(error);
  }
  return false;
};

export const createEvent = async (
  oauth2Client: OAuth2Client,
  eventName: string,
  start: Date,
  end: Date
) => {
  const event = {
    summary: eventName,
    start: {
      dateTime: start.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
  };

  try {
    const calendar = await getCalendar(oauth2Client);
    return await calendar.events.insert({
      calendarId: googleCalendarID,
      requestBody: event,
    });
  } catch (error) {
    console.log(error);
  }
};
