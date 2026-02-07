export function getYoutubeIdFromUrl(url) {
    return url.match(
        /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/,
    )?.[1] ?? '';
}

export function getMedalIdFromUrl(url) {
    return url.match(/medal\.tv\/(?:clip|clips|games\/[^\/]+\/clips)\/([^\/?#]+)/)?.[1] ?? '';
}

export function getTwitchClipIdFromUrl(url) {
    let match = url.match(/clips\.twitch\.tv\/([^\/?#]+)/);
    if (match) return match[1];

    match = url.match(/twitch\.tv\/[^\/]+\/clip\/([^\/?#]+)/);
    if (match) return match[1];

    match = url.match(/twitch\.tv\/clip\/([^\/?#]+)/);
    if (match) return match[1];

    return '';
}

export function getGoogleDriveIdFromUrl(url) {
    if (!url) return '';
    let match = url.match(/drive\.google\.com\/file\/d\/([^\/?#]+)/);
    if (match) return match[1];

    match = url.match(/drive\.google\.com\/open\?id=([^&\/#]+)/);
    if (match) return match[1];

    match = url.match(/uc\?id=([^&\/#]+)/);
    if (match) return match[1];

    return '';
}

export function getVimeoIdFromUrl(url) {
    return url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/)?.[1] ?? '';
}

export function getDailymotionIdFromUrl(url) {
    return url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/)?.[1] ?? '';
}

export function getStreamableIdFromUrl(url) {
    return url.match(/streamable\.com\/([a-zA-Z0-9]+)/)?.[1] ?? '';
}

export function getLoomIdFromUrl(url) {
    return url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)?.[1] ?? '';
}

export function getTikTokIdFromUrl(url) {
    return url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/)?.[1] ?? '';
}

export function getKickIdFromUrl(url) {
    return url.match(/[?&]clip=([a-zA-Z0-9_]+)/)?.[1] ?? '';
}

export function getVideoPlatform(url) {
    if (!url) return "unknown";
    if (/youtu\.?be/.test(url)) return "youtube";
    if (/medal\.tv/.test(url)) return "medal";
    if (/twitch\.tv/.test(url) || /clips\.twitch\.tv/.test(url)) return "twitch";
    if (/drive\.google\.com/.test(url)) return "googledrive";
    if (/vimeo\.com/.test(url)) return "vimeo";
    if (/dailymotion\.com/.test(url)) return "dailymotion";
    if (/streamable\.com/.test(url)) return "streamable";
    if (/loom\.com/.test(url)) return "loom";
    if (/tiktok\.com/.test(url)) return "tiktok";
    if (/kick\.com/.test(url)) return "kick";

    return "unknown";
}

export function embed(video) {
    const platform = getVideoPlatform(video);

    if (platform === "youtube") {
        return `https://www.youtube.com/embed/${getYoutubeIdFromUrl(video)}`;
    }

    if (platform === "medal") {
        const id = getMedalIdFromUrl(video);
        return `https://medal.tv/clip/${id}`;
    }

    if (platform === "twitch") {
        const id = getTwitchClipIdFromUrl(video);
        const parent = (typeof window !== "undefined" && window.location && window.location.hostname)
            ? window.location.hostname
            : "localhost";
        return `https://clips.twitch.tv/embed?clip=${id}&parent=${parent}`;
    }

    if (platform === "googledrive") {
        const id = getGoogleDriveIdFromUrl(video);
        return `https://drive.google.com/file/d/${id}/preview`;
    }

    if (platform === "vimeo") {
        const id = getVimeoIdFromUrl(video);
        return `https://player.vimeo.com/video/${id}`;
    }

    if (platform === "dailymotion") {
        const id = getDailymotionIdFromUrl(video);
        return `https://www.dailymotion.com/embed/video/${id}`;
    }

    if (platform === "streamable") {
        const id = getStreamableIdFromUrl(video);
        return `https://streamable.com/o/${id}`;
    }

    if (platform === "loom") {
        const id = getLoomIdFromUrl(video);
        return `https://www.loom.com/embed/${id}`;
    }

    if (platform === "tiktok") {
        const id = getTikTokIdFromUrl(video);

        return `https://www.tiktok.com/embed/v2/${id}`;
    }

    if (platform === "kick") {
        const id = getKickIdFromUrl(video);
        return `https://player.kick.com/clip/${id}`;
    }

    return video;
}

export function localize(num) {
    return num.toLocaleString(undefined, { minimumFractionDigits: 3 });
}

export function getThumbnailFromId(urlOrId) {
    // 1. Define Default
    const DEFAULT_THUMB = '/assets/default.png';

    if (!urlOrId) return DEFAULT_THUMB;

    const input = String(urlOrId).trim();
    const platform = getVideoPlatform(input);

    const possibleYouTubeId = input.match(/^[A-Za-z0-9_-]{6,}$/);

    if (platform === "youtube") {
        const id = getYoutubeIdFromUrl(input) || (possibleYouTubeId && possibleYouTubeId[0]);
        if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
    }

    if (platform === "unknown" && possibleYouTubeId) {
        return `https://img.youtube.com/vi/${possibleYouTubeId[0]}/mqdefault.jpg`;
    }

    if (platform === "medal") {
        const id = getMedalIdFromUrl(input);
        if (id) return `https://medal.tv/clip/${id}`;
    }

    if (platform === "twitch") {
        const id = getTwitchClipIdFromUrl(input);
        if (id) return `https://clips-media-assets2.twitch.tv/${id}-preview-480x272.jpg`;
    }

    if (platform === "googledrive") {
        const id = getGoogleDriveIdFromUrl(input);
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w544-h306`;
    }

    if (platform === "dailymotion") {
        const id = getDailymotionIdFromUrl(input);
        if (id) return `https://www.dailymotion.com/thumbnail/video/${id}`;
    }

    if (platform === "loom") {
        const id = getLoomIdFromUrl(input);
        if (id) return `https://cdn.loom.com/sessions/thumbnails/${id}-with-play.gif`;
    }

    // 2. Returns fallback for unsupported platforms (Vimeo, Streamable, etc.)
    return DEFAULT_THUMB;
}

export function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex],
        ];
    }

    return array;
}