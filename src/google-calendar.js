// google-calendar.js

import { auth } from "./firebase.js";


const CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly";
const CALENDAR_LIST_SCOPE =
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly";


function getTodayRange() {

  const now =
    new Date();

  const start =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );

  const end =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );

  return {
    timeMin:
      start.toISOString(),

    timeMax:
      end.toISOString()
  };

}


export async function getGoogleCalendarList() {
  const accessToken =
    sessionStorage.getItem("aven-google-access-token");

  if (!accessToken) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      minAccessRole: "reader",
      showDeleted: "false",
      maxResults: "250"
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (response.status === 401) {
      sessionStorage.removeItem(
        "aven-google-access-token"
      );
      return [];
    }

    if (!response.ok) {
      const errorData =
        await response.json().catch(() => null);

      throw new Error(
        `Google Calendar list error: ${response.status} ${
          errorData?.error?.message || ""
        }`
      );
    }

    const data = await response.json();

    return (data.items || [])
      .filter((calendar) => {
        return [
          "reader",
          "writer",
          "owner"
        ].includes(calendar.accessRole);
      })
      .map((calendar) => ({
        id: calendar.id,
        summary:
          calendar.summary ||
          calendar.summaryOverride ||
          "Untitled calendar",
        primary: Boolean(calendar.primary)
      }));

  } catch (error) {
    console.error(
      "Google Calendar list:",
      error
    );

    return [];
  }
}


export async function getTodayCalendarEvents() {

  const user =
    auth.currentUser;

  if (!user) {
    return [];
  }


  const accessToken =
    sessionStorage.getItem(
      "aven-google-access-token"
    );


  if (!accessToken) {

    console.warn(
      "Google Calendar is not authorized."
    );

    return [];

  }


  const {
    timeMin,
    timeMax
  } =
    getTodayRange();


  const params =
    new URLSearchParams({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false"
    });


  try {

    const response =
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`
          }
        }
      );


    if (response.status === 401) {

      sessionStorage.removeItem(
        "aven-google-access-token"
      );

      console.warn(
        "Google Calendar access token expired."
      );

      return [];

    }


    if (!response.ok) {
      const errorData =
        await response.json().catch(
          () => null
        );
    
      console.error(
        "Google Calendar API error:",
        errorData
      );
    
      throw new Error(
        `Google Calendar error: ${response.status} ${
          errorData?.error?.message || ""
        }`
      );
    
    }


    const data =
      await response.json();


    return (data.items || [])
      .filter(event =>
        event.status !== "cancelled"
      )
      .map(event => ({
        id:
          event.id,

        summary:
          event.summary ||
          "Untitled event",

        start:
          event.start?.dateTime ||
          event.start?.date ||
          null,

        end:
          event.end?.dateTime ||
          event.end?.date ||
          null,

        allDay:
          Boolean(
            event.start?.date
          )
      }));


  } catch (error) {

    console.error(
      "Google Calendar:",
      error
    );

    return [];

  }

}



export async function getMonitoredCalendarIds() {
  const user = auth.currentUser;

  if (!user) return [];

  const ref = doc(
    db,
    "users",
    user.uid,
    "settings",
    "googleCalendar"
  );

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return [];
  }

  return snapshot.data().calendarIds || [];
}



export async function saveMonitoredCalendarIds(calendarIds) {
  const user = auth.currentUser;

  if (!user) return;

  const ref = doc(
    db,
    "users",
    user.uid,
    "settings",
    "googleCalendar"
  );

  await setDoc(ref, {
    configured: true,
    calendarIds
  });
}
