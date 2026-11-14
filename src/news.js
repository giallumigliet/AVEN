
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
    local: false
};

const newsLoading = {
    global: false,
    local: false
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

    newsLoaded.local = false;
}


// =========================================
// UTILITÀ
// =========================================

function getNewsContainer(type) {

    return document.getElementById(
        type === "global"
            ? "news-global"
            : "news-local"
    );
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
// RSS - NOTIZIE GLOBALI
// =========================================

async function fetchGlobalNews() {

    const results = [];

    for (const feed of NEWS_CONFIG.globalFeeds) {

        try {

            const endpoint =
                NEWS_CONFIG.rssConverter +
                encodeURIComponent(feed.url);

            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error("Errore RSS");
            }

            const data = await response.json();

            if (data.status !== "ok") {
                throw new Error("Feed non disponibile");
            }

            const articles = (data.items || [])
                .map(item =>
                    normalizeArticle(item, feed.name)
                );

            results.push(...articles);

        } catch (error) {

            console.error(
                `Errore feed ${feed.name}:`,
                error
            );

        }
    }

    return results;
}


// =========================================
// GDELT - NOTIZIE LOCALI
// =========================================

async function fetchLocalNews() {

    const location =
        newsLocation.city ||
        newsLocation.region;

    if (!location) {
        throw new Error("Località non disponibile");
    }

    const query =
        `"${location}" sourceCountry:IT sourcelang:Italian`;

    const params = new URLSearchParams({
        query,
        mode: "ArtList",
        format: "json",
        maxrecords: "30",
        sort: "HybridRel"
    });

    const endpoint =
        "https://api.gdeltproject.org/api/v2/doc/doc?" +
        params.toString();

    const response = await fetch(endpoint);

    if (!response.ok) {
        throw new Error("GDELT non disponibile");
    }

    const data = await response.json();

    return (data.articles || []).map(article =>
        normalizeArticle(
            article,
            article.domain || "Fonte"
        )
    );
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

    if (!["global", "local"].includes(type)) return;

    if (newsLoading[type]) return;

    if (newsLoaded[type] && !force) return;

    const container = getNewsContainer(type);

    if (!container) return;

    newsLoading[type] = true;

    showNewsMessage(
        type,
        "Caricamento notizie..."
    );

    try {

        const articles = type === "global"
            ? await fetchGlobalNews()
            : await fetchLocalNews();

        const processed = processNews(articles);

        renderNews(type, processed);

        newsLoaded[type] = true;

    } catch (error) {

        console.error(
            `Errore caricamento news ${type}:`,
            error
        );

        showNewsMessage(
            type,
            "Impossibile caricare le notizie."
        );

    } finally {

        newsLoading[type] = false;
    }
}


// =========================================
// FUNZIONI PUBBLICHE
// =========================================

// Carica entrambe le sezioni
export function loadAllNews() {

    loadNews("global");
    loadNews("local");
}


// Aggiorna entrambe le sezioni
export function refreshNews() {

    loadNews("global", true);
    loadNews("local", true);
}


// Carica una singola sezione
export function loadNewsSection(type) {

    loadNews(type);
}
