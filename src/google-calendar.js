// google-calendar.js

import { auth, db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// =========================================================
// DATE RANGE
// =========================================================

function getTodayRange() {

  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  const end = new Date(
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


// =========================================================
// GOOGLE OAUTH ACCESS TOKEN
// =========================================================

const GOOGLE_OAUTH_CLIENT_ID =
  "760754542696-76ubln7l5v654nullin96fsff6drs0sn.apps.googleusercontent.com";

const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
].join(" ");

let googleTokenClient = null;

let googleAccessToken = null;

let googleAccessTokenExpiresAt = 0;

let googleTokenRequest = null;


function initGoogleTokenClient() {

  if (googleTokenClient) {
    return googleTokenClient;
  }

  if (
    !window.google ||
    !window.google.accounts ||
    !window.google.accounts.oauth2
  ) {
    throw new Error(
      "Google Identity Services is not loaded."
    );
  }

  googleTokenClient =
    window.google.accounts.oauth2.initTokenClient({
      client_id:
        GOOGLE_OAUTH_CLIENT_ID,

      scope:
        GOOGLE_CALENDAR_SCOPES,

      callback: () => {}
    });

  return googleTokenClient;

}


function storeGoogleAccessToken(
  accessToken,
  expiresIn
) {

  googleAccessToken =
    accessToken;

  googleAccessTokenExpiresAt =
    Date.now() +
    Math.max(
      0,
      Number(expiresIn || 3600) - 60
    ) *
      1000;

}


async function requestGoogleAccessToken() {

  if (googleTokenRequest) {
    return googleTokenRequest;
  }

  googleTokenRequest =
    new Promise(
      (resolve, reject) => {

        try {

          const tokenClient =
            initGoogleTokenClient();


          tokenClient.callback =
            (response) => {

              if (
                response.error
              ) {

                reject(
                  new Error(
                    response.error_description ||
                    response.error
                  )
                );

                return;

              }


              if (
                !response.access_token
              ) {

                reject(
                  new Error(
                    "Google did not return an access token."
                  )
                );

                return;

              }


              storeGoogleAccessToken(
                response.access_token,
                response.expires_in
              );


              resolve(
                response.access_token
              );

            };


          tokenClient.error_callback =
            (error) => {

              reject(
                error
              );

            };


          tokenClient.requestAccessToken({
            prompt: ""
          });

        } catch (error) {

          reject(error);

        }

      }
    ).finally(() => {

      googleTokenRequest =
        null;

    });


  return googleTokenRequest;

}


export async function getValidGoogleAccessToken() {

  if (
    googleAccessToken &&
    Date.now() <
      googleAccessTokenExpiresAt
  ) {

    return googleAccessToken;

  }


  return requestGoogleAccessToken();

}


// =========================================================
// GOOGLE CALENDAR LIST
// =========================================================

export async function getGoogleCalendarList() {

  if (!auth.currentUser) {
    return [];
  }

  let accessToken;

  try {
    accessToken = await getValidGoogleAccessToken();
  } catch (error) {
    console.error("Unable to authorize Google Calendar:", error);
    return [];
  }

  try {

    const calendars = [];

    let pageToken = null;

    do {

      const params = new URLSearchParams({
        minAccessRole: "reader",
        showDeleted: "false",
        maxResults: "250"
      });

      if (pageToken) {
        params.set(
          "pageToken",
          pageToken
        );
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params}`,
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

        throw new Error(
          "Google Calendar authorization expired."
        );

      }

      if (!response.ok) {

        const errorData =
          await response.json().catch(
            () => null
          );

        throw new Error(
          `Google Calendar list error: ${response.status} ${
            errorData?.error?.message || ""
          }`
        );

      }

      const data =
        await response.json();

      calendars.push(
        ...(data.items || [])
      );

      pageToken =
        data.nextPageToken || null;

    } while (pageToken);


    return calendars

      // AVEN needs event details, so freeBusyReader
      // calendars are not useful here.
      .filter((calendar) => {

        return [
          "reader",
          "writerWithoutPrivateAccess",
          "writer",
          "owner"
        ].includes(
          calendar.accessRole
        );

      })

      .map((calendar) => ({

        id: calendar.id,

        summary:
          calendar.summary ||
          calendar.summaryOverride ||
          "Untitled calendar",

        primary:
          Boolean(calendar.primary),

        backgroundColor:
          calendar.backgroundColor ||
          null

      }));

  } catch (error) {

    console.error(
      "Google Calendar list:",
      error
    );

    throw error;

  }

}


// =========================================================
// GOOGLE CALENDAR SETTINGS
// =========================================================

export async function getGoogleCalendarSettings() {

  const user =
    auth.currentUser;

  if (!user) {

    return {
      configured: false,
      calendarIds: []
    };

  }


  const ref = doc(
    db,
    "users",
    user.uid,
    "settings",
    "googleCalendar"
  );


  const snapshot =
    await getDoc(ref);


  if (!snapshot.exists()) {

    return {
      configured: false,
      calendarIds: []
    };

  }


  const data =
    snapshot.data();


  return {

    configured:
      Boolean(data.configured),

    calendarIds:
      Array.isArray(data.calendarIds)
        ? data.calendarIds
        : []

  };

}


// =========================================================
// SAVE MONITORED CALENDARS
// =========================================================

export async function saveMonitoredCalendarIds(
  calendarIds
) {

  const user =
    auth.currentUser;

  if (!user) {
    return;
  }


  const ref = doc(
    db,
    "users",
    user.uid,
    "settings",
    "googleCalendar"
  );


  await setDoc(
    ref,
    {
      configured: true,
      calendarIds: Array.isArray(calendarIds)
        ? calendarIds
        : []
    }
  );

}




export async function getTodayMonitoredCalendarEvents() {
  const settings = await getGoogleCalendarSettings();

  if (!settings.configured) {
    return [];
  }

  if (!settings.calendarIds.length) {
    return [];
  }

  const eventsByCalendar = await Promise.all(
    settings.calendarIds.map((calendarId) =>
      getTodayCalendarEvents(calendarId)
    )
  );

  return eventsByCalendar
    .flat()
    .sort((a, b) => {
      const aStart =
        a.start?.dateTime ||
        a.start?.date ||
        "";

      const bStart =
        b.start?.dateTime ||
        b.start?.date ||
        "";

      return aStart.localeCompare(bStart);
    });
}


// =========================================================
// TODAY'S EVENTS
// =========================================================

export async function getTodayCalendarEvents(calendarId) {
  const user =
    auth.currentUser;

  if (!user) {
    return [];
  }


  if (!calendarId) {
    return [];
  }


  let accessToken;
  try {
    accessToken = await getValidGoogleAccessToken();
  } catch (error) {
    console.error("Unable to authorize Google Calendar:", error);
    return [];
  }


  const {
    timeMin,
    timeMax
  } = getTodayRange();


  const params =
    new URLSearchParams({

      timeMin,

      timeMax,

      singleEvents:
        "true",

      orderBy:
        "startTime",

      showDeleted:
        "false"

    });


  try {

    const response =
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`
          }
        }
      );


    if (response.status === 401) {

      googleAccessToken = null;
    
      googleAccessTokenExpiresAt = 0;
    
      console.warn(
        "Google Calendar access token expired. Retrying..."
      );
    
      try {
    
        const newAccessToken =
          await requestGoogleAccessToken();
    
    
        const retryResponse =
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
            {
              headers: {
                Authorization:
                  `Bearer ${newAccessToken}`
              }
            }
          );
    
    
        if (!retryResponse.ok) {
    
          const retryError =
            await retryResponse
              .json()
              .catch(() => null);
    
          console.error(
            "Google Calendar retry error:",
            retryError
          );
    
          return [];
    
        }
    
    
        const retryData =
          await retryResponse.json();
    
    
        return (retryData.items || [])
    
          .filter(
            (event) =>
              event.status !== "cancelled"
          )
    
          .map((event) => ({
    
            id:
              event.id,
    
            calendarId:
              calendarId,
    
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
    
    
      } catch (retryError) {
    
        console.error(
          "Google Calendar retry failed:",
          retryError
        );
    
        return [];
    
      }
    
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

      .filter(
        (event) =>
          event.status !== "cancelled"
      )

      .map((event) => ({

        id:
          event.id,

        calendarId:
          calendarId,

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
