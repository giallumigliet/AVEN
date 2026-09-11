// google-calendar.js

import { auth } from "./firebase.js";

import {
  GoogleAuthProvider,
  reauthenticateWithPopup
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


const CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly";


function getTodayRange() {

  const now = new Date();

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
    timeMin: start.toISOString(),
    timeMax: end.toISOString()
  };

}


export async function getTodayCalendarEvents() {

  const user =
    auth.currentUser;

  if (!user) {
    return [];
  }


  const provider =
    new GoogleAuthProvider();

  provider.addScope(
    CALENDAR_SCOPE
  );


  try {

    const result =
      await reauthenticateWithPopup(
        user,
        provider
      );


    const credential =
      GoogleAuthProvider
        .credentialFromResult(
          result
        );


    const accessToken =
      credential?.accessToken;


    if (!accessToken) {

      throw new Error(
        "Google Calendar authorization failed."
      );

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
          Boolean(event.start?.date)

      }));


  } catch (error) {

    console.error(
      "Google Calendar:",
      error
    );

    throw error;

  }

}
