import {
  ExchangeService,
  Uri,
  WellKnownFolderName,
  CalendarView,
  DateTime,
  PropertySet,
  AppointmentSchema,
  CalendarFolder,
  WebCredentials,
} from 'ews-javascript-api';
import * as readline from 'readline';
import * as readlineSync from 'readline-sync';

export const syncComanndHandler = async () => {
  const service = new ExchangeService();
  service.Url = new Uri('https://outlook.office365.com/Ews/Exchange.asmx');

  const username = await getUsername();
  const password = getPassword();
  service.Credentials = new WebCredentials(username, password);

  const startDate = DateTime.Now;
  const endDate = startDate.AddDays(30);
  const NUM_APPTS = 5;

  const calendar = await CalendarFolder.Bind(
    service,
    WellKnownFolderName.Calendar,
    new PropertySet()
  );
  const cView = new CalendarView(startDate, endDate, NUM_APPTS);
  cView.PropertySet = new PropertySet(
    AppointmentSchema.Subject,
    AppointmentSchema.Start,
    AppointmentSchema.End
  );

  const appointments = await calendar.FindAppointments(cView);

  console.log(
    `The first ${NUM_APPTS} appointments on your calendar from ${startDate.Date.ToShortDateString()} to ${endDate.Date.ToShortDateString()} are: \n`
  );
  for (const a of appointments.Items) {
    console.log(
      `Subject: ${a.Subject.toString()} Start: ${a.Start.toString()} End: ${a.End.toString()}`
    );
  }
};

const getUsername = (): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Username: ', (username) => {
      rl.close();
      resolve(username);
    });
  });
};

const getPassword = () => {
  return readlineSync.question('Password: ', {
    hideEchoBack: true, // パスワードを隠す
  });
};
