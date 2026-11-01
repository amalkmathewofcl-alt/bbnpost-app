import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'g2yvs59l', // 👈 Your Project ID
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
});

export interface Article {
  id: string;
  title: string;
  imageUrl?: string;
  categories: string[];
  content?: string; // 👈 Changed to 'content' to match your App UI
  date?: string;
}

export const fetchArticles = async (): Promise<Article[]> => {
  const query = `*[_type == "article"] | order(publishedAt desc) {
    "id": _id,
    title,
    "imageUrl": mainImage.asset->url,
    "categories": [category],
    "date": publishedAt,
    body
  }`;

  try {
    const data = await client.fetch(query);
    
    return data.map((item: any) => {
      // 👇 Convert Sanity's Rich Text into an HTML string
      let htmlContent = '<p>No content available</p>';
      if (item.body && Array.isArray(item.body)) {
        htmlContent = item.body.map((block: any) => {
          if (block._type === 'block' && block.children) {
            const text = block.children.map((child: any) => child.text).join('');
            return `<p>${text}</p>`;
          }
          return '';
        }).join('');
      }

      return {
        id: item.id,
        title: item.title,
        imageUrl: item.imageUrl || 'https://via.placeholder.com/600x400',
        categories: item.categories[0] ? [item.categories[0]] : ['NEWS'],
        content: htmlContent, // 👈 Pass the HTML string to the app
        date: item.date
      };
    });
  } catch (error) {
    console.error("Error fetching from Sanity:", error);
    return [];
  }
};