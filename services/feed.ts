const FEED_URL = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent('https://www.thebbnpost.in/feeds/posts/default?alt=json&max-results=20');
export type Article = {
  id: string;
  title: string;
  link: string;
  published: string;
  content: string;
  imageUrl: string | null;
  categories: string[];
};

export async function fetchArticles(): Promise<Article[]> {
  try {
    const res = await fetch(FEED_URL);
    const data = await res.json();
    
    if (!data.feed || !data.feed.entry) return [];

    return data.feed.entry.map((entry: any) => {
      const link = entry.link.find((l: any) => l.rel === 'alternate')?.href || '';
      
      let imageUrl = entry.media$thumbnail?.url || null;
      if (imageUrl) {
        imageUrl = imageUrl.replace('/s72-c/', '/s400/');
      }

      return {
        id: entry.id.$t,
        title: entry.title.$t,
        link: link,
        published: entry.published.$t,
        content: entry.content?.$t || entry.summary?.$t || '',
        imageUrl: imageUrl,
        categories: entry.category?.map((c: any) => c.term) || [],
      };
    });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return [];
  }
}