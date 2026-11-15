
/* =========================================
   AVEN - NEWS
   ========================================= */

// CONFIGURAZIONE

const NEWS_CONFIG = {
    maxArticles: 6,
    maxAgeHours: 48,

    globalFeeds: [
        {
            name: "BBC News",
            url: "https://feeds.bbci.co.uk/news/world/rss.xml"
        }
    ],

    rssConverter:
        "https://api.rss2json.com/v1/api.json?rss_url="
};


// =========================================
// LOCALITÀ
// =========================================

let newsLocation = {
    city: "",
    region: "",
    country: "",
    countryCode: ""
};


// =========================================
// STATO
// =========================================

const newsLoaded = {
    global: false,
    national: false,
    local: false
};

const newsRequests = {
    global: null,
    national: null,
    local: null
};


// =========================================
// LOCALITÀ - RICEVE I DATI DAL METEO
// =========================================

export function setNewsLocation(location) {
    newsLocation = {
        city: location?.city || "",
        region: location?.region || "",
        country: location?.country || "",
        countryCode: location?.countryCode || ""
    };

    newsLoaded.global = false;
    newsLoaded.national = false;
    newsLoaded.local = false;
}


// =========================================
// UTILITÀ
// =========================================

function getNewsContainer(type) {
    return document.getElementById(`news-${type}`);
}


function formatNewsTime(dateString) {

    if (!dateString) return "";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "";

    const minutes = Math.floor(
        (Date.now() - date.getTime()) / 60000
    );

    if (minutes < 0) return "Ora";

    if (minutes < 60) {
        return `${minutes} min fa`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} ore fa`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `${days} giorni fa`;
    }

    return date.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short"
    });
}


function isRecentArticle(dateString) {

    if (!dateString) return false;

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return false;

    const age = Date.now() - date.getTime();

    return age >= 0 &&
        age <= NEWS_CONFIG.maxAgeHours * 60 * 60 * 1000;
}


function normalizeTitle(title) {

    return (title || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N} ]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}


// =========================================
// FILTRO NOTIZIE
// =========================================

function isRelevantNews(article) {

    const title = (article.title || "").toLowerCase();

    if (!title) return false;

    const excludedWords = [
        "gossip",
        "vip",
        "reality show",
        "grande fratello",
        "sanremo",
        "calciomercato",
        "red carpet",
        "influencer",
        "oroscopo"
    ];

    return !excludedWords.some(word =>
        title.includes(word)
    );
}


// =========================================
// NORMALIZZAZIONE ARTICOLI
// =========================================

function normalizeArticle(article, source) {

    return {
        title: article.title || "",
        url: article.link || article.url || "",
        source: article.author || source,
        publishedAt:
            article.pubDate ||
            article.publishedAt ||
            article.seendate ||
            ""
    };
}


// =========================================
// RSS - NOTIZIE 
// =========================================

let lastNewsRequest = { global: 0, national: 0, local: 0 };

async function fetchGoogleRss(rssUrl, fallbackSource) {
    const endpoint = NEWS_CONFIG.rssConverter + encodeURIComponent(rssUrl);
    const response = await fetch(endpoint);

    if (!response.ok) {
        throw new Error("Servizio RSS non disponibile");
    }

    const data = await response.json();

    if (data.status !== "ok") {
        throw new Error("Feed non disponibile");
    }

    return (data.items || []).map(article =>
        normalizeArticle(article, article.author || fallbackSource)
    );
}



// NOTIZIE GLOBALI (Topic Mondo nella lingua locale)
async function fetchGlobalNews() {
    const now = Date.now();
    if (now - lastNewsRequest.global < 10000) {
        throw new Error("Attendi qualche secondo prima di riprovare.");
    }
    lastNewsRequest.global = now;

    const countryCode = (newsLocation.countryCode || "IT").toUpperCase();
    const langCode = countryCode.toLowerCase();

    // Google News RSS per le notizie dal mondo filtrate per lingua/paese dell'utente
    const rssUrl = `https://news.google.com/rss/headlines/section/topic/WORLD?hl=${langCode}&gl=${countryCode}&ceid=${countryCode}:${langCode}`;
    
    return fetchGoogleRss(rssUrl, "Google News Mondo");
}




// NOTIZIE NAZIONALI (Stato)
async function fetchNationalNews() {
    const now = Date.now();
    if (now - lastNewsRequest.national < 10000) {
        throw new Error("Attendi qualche secondo prima di riprovare.");
    }
    lastNewsRequest.national = now;

    const country = newsLocation.country || "Italia";
    const countryCode = (newsLocation.countryCode || "IT").toUpperCase();
    const langCode = countryCode.toLowerCase();

    const rssUrl = `https://news.google.com/rss?hl=${langCode}&gl=${countryCode}&ceid=${countryCode}:${langCode}`;
    return fetchGoogleRss(rssUrl, `Google News ${country}`);
}

// NOTIZIE LOCALI (Città / Regione)
async function fetchLocalNews() {
    const now = Date.now();
    if (now - lastNewsRequest.local < 10000) {
        throw new Error("Attendi qualche secondo prima di riprovare.");
    }
    lastNewsRequest.local = now;

    const location = newsLocation.city || newsLocation.region;
    if (!location) {
        throw new Error("Località non disponibile");
    }

    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(location + " notizie")}&hl=it&gl=IT&ceid=IT:it`;
    return fetchGoogleRss(rssUrl, `Google News ${location}`);
}


// =========================================
// ELABORAZIONE NOTIZIE
// =========================================

function processNews(articles) {

    const uniqueArticles = new Map();

    articles
        .filter(isRelevantNews)
        .filter(article =>
            isRecentArticle(article.publishedAt)
        )
        .forEach(article => {

            if (!article.title || !article.url) return;

            try {

                const url = new URL(article.url);

                if (
                    !["https:", "http:"].includes(url.protocol)
                ) {
                    return;
                }

            } catch {
                return;
            }

            const key = normalizeTitle(article.title);

            if (!uniqueArticles.has(key)) {
                uniqueArticles.set(key, article);
            }
        });

    return [...uniqueArticles.values()]
        .sort((a, b) =>
            new Date(b.publishedAt) -
            new Date(a.publishedAt)
        )
        .slice(0, NEWS_CONFIG.maxArticles);
}


// =========================================
// RENDERING
// =========================================

function renderNews(type, articles) {

    const container = getNewsContainer(type);

    if (!container) return;

    container.replaceChildren();

    if (!articles.length) {

        showNewsMessage(
            type,
            "Nessuna notizia disponibile al momento."
        );

        return;
    }

    articles.forEach(article => {

        const item = document.createElement("article");
        item.className = "news-item";

        const link = document.createElement("a");
        link.className = "news-title";
        link.href = article.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = article.title;

        const meta = document.createElement("div");
        meta.className = "news-meta";

        const source = document.createElement("span");
        source.className = "news-source";
        source.textContent = article.source;

        const time = document.createElement("span");
        time.className = "news-time";
        time.textContent = formatNewsTime(
            article.publishedAt
        );

        meta.append(source, time);

        item.append(link, meta);

        container.appendChild(item);
    });
}


// =========================================
// MESSAGGI
// =========================================

function showNewsMessage(type, message) {

    const container = getNewsContainer(type);

    if (!container) return;

    container.replaceChildren();

    const element = document.createElement("p");

    element.className = "news-message";
    element.textContent = message;

    container.appendChild(element);
}


// =========================================
// CARICAMENTO
// =========================================

async function loadNews(type, force = false) {
    if (!["global", "national", "local"].includes(type)) return;

    if (newsRequests[type]) return newsRequests[type];
    if (newsLoaded[type] && !force) return;

    const container = getNewsContainer(type);
    if (!container) return;

    let request;
    request = (async () => {
        showNewsMessage(type, "Caricamento notizie...");

        try {
            let articles = [];
            if (type === "global") articles = await fetchGlobalNews();
            else if (type === "national") articles = await fetchNationalNews();
            else if (type === "local") articles = await fetchLocalNews();

            const processed = processNews(articles);
            renderNews(type, processed);
            newsLoaded[type] = true;

        } catch (error) {
            console.error(`Errore caricamento news ${type}:`, error);
            showNewsMessage(type, "Impossibile caricare le notizie.");
        } finally {
            if (newsRequests[type] === request) {
                newsRequests[type] = null;
            }
        }
    })();

    newsRequests[type] = request;
    return request;
}

export function loadAllNews() {
    return Promise.all([
        loadNews("global"),
        loadNews("national"),
        loadNews("local")
    ]);
}

export function refreshNews() {
    return Promise.all([
        loadNews("global", true),
        loadNews("national", true),
        loadNews("local", true)
    ]);
}


// Carica una singola sezione
export function loadNewsSection(type) {

    loadNews(type);
}
