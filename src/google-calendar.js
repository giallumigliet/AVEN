// google-calendar.js

import { auth } from "./firebase.js";


const CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly";


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

      throw new Error(
        `Google Calendar error: ${response.status}`
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
