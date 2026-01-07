'use server';

/**
 * YouTube Service
 * Fetches video tutorials from YouTube Data API
 * 
 * SETUP: Add YOUTUBE_API_KEY to your .env file
 * Get an API key from: https://console.cloud.google.com/apis/credentials
 */

export interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    duration: string;
    publishedAt: string;
}

interface YouTubeSearchResponse {
    items: Array<{
        id: { videoId: string };
        snippet: {
            title: string;
            description: string;
            thumbnails: {
                high: { url: string };
                medium: { url: string };
            };
            channelTitle: string;
            publishedAt: string;
        };
    }>;
}

interface YouTubeVideoDetailsResponse {
    items: Array<{
        id: string;
        contentDetails: {
            duration: string;
        };
    }>;
}

/**
 * Parse ISO 8601 duration to human-readable format
 * e.g., PT1H30M15S -> "1h 30m"
 */
function parseDuration(iso8601Duration: string): string {
    const match = iso8601Duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'Unknown';

    const hours = match[1] ? `${match[1]}h ` : '';
    const minutes = match[2] ? `${match[2]}m` : '';

    return (hours + minutes).trim() || '< 1m';
}

/**
 * Fetch videos from YouTube Data API
 */
export async function searchYouTubeVideos(
    query: string,
    maxResults: number = 12
): Promise<YouTubeVideo[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        console.warn('YOUTUBE_API_KEY not set - returning fallback courses');
        return getFallbackCourses(query);
    }

    try {
        // Step 1: Search for videos
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        searchUrl.searchParams.set('part', 'snippet');
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('type', 'video');
        searchUrl.searchParams.set('maxResults', maxResults.toString());
        searchUrl.searchParams.set('videoDuration', 'medium'); // 4-20 min videos
        searchUrl.searchParams.set('order', 'relevance');
        searchUrl.searchParams.set('key', apiKey);

        const searchResponse = await fetch(searchUrl.toString(), {
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!searchResponse.ok) {
            throw new Error(`YouTube API error: ${searchResponse.status}`);
        }

        const searchData: YouTubeSearchResponse = await searchResponse.json();
        const videoIds = searchData.items.map((item) => item.id.videoId).join(',');

        // Step 2: Get video duration details
        const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        detailsUrl.searchParams.set('part', 'contentDetails');
        detailsUrl.searchParams.set('id', videoIds);
        detailsUrl.searchParams.set('key', apiKey);

        const detailsResponse = await fetch(detailsUrl.toString(), {
            next: { revalidate: 3600 },
        });

        const detailsData: YouTubeVideoDetailsResponse = await detailsResponse.json();
        const durationMap = new Map<string, string>();

        for (const item of detailsData.items) {
            durationMap.set(item.id, parseDuration(item.contentDetails.duration));
        }

        // Step 3: Map to our YouTubeVideo interface
        return searchData.items.map((item) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
            channelTitle: item.snippet.channelTitle,
            duration: durationMap.get(item.id.videoId) || 'Unknown',
            publishedAt: item.snippet.publishedAt,
        }));
    } catch (error) {
        console.error('YouTube API Error:', error);
        return getFallbackCourses(query);
    }
}

/**
 * Fallback courses when API is unavailable
 * These are curated, real YouTube video IDs
 */
function getFallbackCourses(query: string): YouTubeVideo[] {
    const fallbackCourses: Record<string, YouTubeVideo[]> = {
        default: [
            {
                id: 'bMknfKXIFA8',
                title: 'React Course - Beginner\'s Tutorial for React JavaScript Library',
                description: 'Learn React JS in this full course for beginners.',
                thumbnail: 'https://img.youtube.com/vi/bMknfKXIFA8/hqdefault.jpg',
                channelTitle: 'freeCodeCamp.org',
                duration: '11h 55m',
                publishedAt: '2022-01-10T00:00:00Z',
            },
            {
                id: '30LWjhZzg50',
                title: 'TypeScript Tutorial for Beginners',
                description: 'Learn TypeScript in 1 Hour. Full TypeScript Tutorial.',
                thumbnail: 'https://img.youtube.com/vi/30LWjhZzg50/hqdefault.jpg',
                channelTitle: 'Programming with Mosh',
                duration: '1h 4m',
                publishedAt: '2021-04-07T00:00:00Z',
            },
            {
                id: 'Tn6-PIqc4UM',
                title: 'React Native Tutorial for Beginners',
                description: 'Build mobile apps with React Native.',
                thumbnail: 'https://img.youtube.com/vi/Tn6-PIqc4UM/hqdefault.jpg',
                channelTitle: 'Programming with Mosh',
                duration: '2h 28m',
                publishedAt: '2020-10-21T00:00:00Z',
            },
            {
                id: 'ENrzD9HAZK4',
                title: 'Next.js 14 Full Course 2024',
                description: 'Learn Next.js 14 with React and TypeScript.',
                thumbnail: 'https://img.youtube.com/vi/ENrzD9HAZK4/hqdefault.jpg',
                channelTitle: 'JavaScript Mastery',
                duration: '5h 30m',
                publishedAt: '2023-11-01T00:00:00Z',
            },
            {
                id: 'PkZNo7MFNFg',
                title: 'Learn JavaScript - Full Course for Beginners',
                description: 'This complete JavaScript course covers everything from the basics.',
                thumbnail: 'https://img.youtube.com/vi/PkZNo7MFNFg/hqdefault.jpg',
                channelTitle: 'freeCodeCamp.org',
                duration: '3h 26m',
                publishedAt: '2018-12-10T00:00:00Z',
            },
            {
                id: 'rfscVS0vtbw',
                title: 'Learn Python - Full Course for Beginners',
                description: 'This course will give you a full introduction to Python.',
                thumbnail: 'https://img.youtube.com/vi/rfscVS0vtbw/hqdefault.jpg',
                channelTitle: 'freeCodeCamp.org',
                duration: '4h 26m',
                publishedAt: '2018-07-11T00:00:00Z',
            },
        ],
    };

    return fallbackCourses[query.toLowerCase()] || fallbackCourses.default;
}

/**
 * Get curated learning categories
 */
export async function getLearningCategories(): Promise<string[]> {
    return [
        'React Tutorial',
        'TypeScript Tutorial',
        'Next.js Tutorial',
        'Node.js Tutorial',
        'Python for Beginners',
        'Leadership Skills',
        'UI/UX Design',
        'Communication Skills',
    ];
}
