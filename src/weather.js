const API_URL = "https://api.open-meteo.com/v1/forecast";


// ================================
// WEATHER CODE → ICONA
// ================================

export function getWeatherIcon(code) {

    if (code === 0) return "☀️";
    if ([1, 2].includes(code)) return "🌤️";
    if (code === 3) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
    if ([61, 63, 65, 66, 67].includes(code)) return "🌧️";
    if ([71, 73, 75, 77].includes(code)) return "❄️";
    if ([80, 81, 82].includes(code)) return "🌦️";
    if ([95, 96, 99].includes(code)) return "⚡";

    return "?";
}


// ================================
// RECUPERA METEO
// ================================

export async function getWeather() {

    // Posizione
    const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            resolve,
            reject
        );
    });

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;


    // API meteo
    const hourlyUrl =
        `${API_URL}?latitude=${lat}` +
        `&longitude=${lon}` +
        `&hourly=temperature_2m,weather_code,precipitation_probability` +
        `&forecast_days=2` +
        `&timezone=auto` +
        `&models=icon_ch2`;

    const dailyUrl =
        `${API_URL}?latitude=${lat}` +
        `&longitude=${lon}` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
        `&forecast_days=7` +
        `&timezone=auto` +
        `&models=ecmwf_ifs025`;

    const [hourlyResponse, dailyResponse] = await Promise.all([ fetch(hourlyUrl), fetch(dailyUrl) ]);

    if ((!hourlyResponse.ok || !dailyResponse.ok)) {
        throw new Error("Errore nel recupero del meteo");
    }

    const hourlyData = await hourlyResponse.json(); 
    const dailyData = await dailyResponse.json();

    // Nome località
    const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=it`
    );

    const geoData = await geoResponse.json();
    const location = geoData.address.city || geoData.address.town || geoData.address.village ||  "";

    return { location, hourly: hourlyData, daily: dailyData };
}


// ================================
// DATI ORARI
// +1 +2 +3 +5 +8... ORE
// ================================

export function getHourlyPreview(data) {

    const offsets = [1, 2, 3, 5, 7, 9, 12, 14];

    const currentTime = new Date();

    const currentHour = currentTime.getHours();


    return offsets.map(offset => {

        const targetHour = currentHour + offset;

        const index = data.hourly.time.findIndex(time => {

            const hour = Number(
                time.split("T")[1].split(":")[0]
            );

            return (
                hour === targetHour % 24
            );
        });


        if (index === -1) {
            return null;
        }


        const code = data.hourly.weather_code[index];

        return {

            hour: data.hourly.time[index]
                .split("T")[1]
                .slice(0, 5),

            temperature:
                Math.round(
                    data.hourly.temperature_2m[index]
                ),

            weatherCode: code,

            icon: getWeatherIcon(code)

        };

    }).filter(Boolean);
}


// ================================
// 6 GIORNI SUCCESSIVI
// ================================

export function getNextDays(data) {

    const days = [];

    for (let i = 1; i <= 6; i++) {

        const code = data.daily.weather_code[i];

        const date = new Date(
            data.daily.time[i] + "T12:00:00"
        );


        days.push({

            date: data.daily.time[i],

            day: date.toLocaleDateString(
                "it-IT",
                {
                    weekday: "short"
                }
            ),

            min:
                Math.round(
                    data.daily.temperature_2m_min[i]
                ),

            max:
                Math.round(
                    data.daily.temperature_2m_max[i]
                ),

            weatherCode: code,

            icon: getWeatherIcon(code)

        });

    }

    return days;
}


// ================================
// TEMPERATURA / ICONA ATTUALE
// ================================

export function getCurrentWeather(data) {

    const now = new Date();

    const currentHour =
        now.getHours();


    const index =
        data.hourly.time.findIndex(time => {

            const hour = Number(
                time.split("T")[1].split(":")[0]
            );

            return hour === currentHour;

        });


    if (index === -1) {
        return null;
    }


    const code =
        data.hourly.weather_code[index];


    return {

        temperature:
            Math.round(
                data.hourly.temperature_2m[index]
            ),

        weatherCode: code,

        icon: getWeatherIcon(code)

    };
}


// ================================
// PIOGGIA O PRECIPITAZIONI OGGI?
// ================================

export function hasPrecipitationToday(data) {

    const today =
        data.daily.time[0];


    const startIndex =
        data.hourly.time.findIndex(
            time => time.startsWith(today)
        );


    if (startIndex === -1) {
        return false;
    }


    // Controlliamo le ore di oggi
    // e vediamo se il weather code indica
    // pioggia / rovesci / temporale.

    for (
        let i = startIndex;
        i < startIndex + 24 &&
        i < data.hourly.time.length;
        i++
    ) {

        const code =
            data.hourly.weather_code[i];


        if (
            [51, 53, 55, 56, 57,
             61, 63, 65, 66, 67,
             80, 81, 82,
             95, 96, 99].includes(code)
        ) {

            return true;

        }

    }


    return false;
}
