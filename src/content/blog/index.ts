// Blog post registry - add new posts here
export interface BlogPost {
  title: string;
  description: string;
  date: string;
  slug: string;
  excerpt: string;
  content: string;
}

// Import raw markdown files
import whyLearnGulfArabic from './why-learn-gulf-arabic.md?raw';
import gulfVsFusha from './gulf-vs-fusha-arabic.md?raw';
import gulfArabicCourseForExpats from './gulf-arabic-course-for-expats.md?raw';
import fushaVsGulfArabic from './fusha-vs-gulf-arabic.md?raw';

function parseFrontmatter(markdown: string): BlogPost {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);
  
  if (!match) {
    throw new Error('Invalid frontmatter format');
  }
  
  const frontmatter = match[1];
  const content = match[2].trim();
  
  const metadata: Record<string, string> = {};
  frontmatter.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      metadata[key] = value;
    }
  });
  
  return {
    title: metadata.title || '',
    description: metadata.description || '',
    date: metadata.date || '',
    slug: metadata.slug || '',
    excerpt: metadata.excerpt || '',
    content
  };
}

// Parse all posts
const allPosts: BlogPost[] = [
  parseFrontmatter(whyLearnGulfArabic),
  parseFrontmatter(gulfVsFusha),
  parseFrontmatter(gulfArabicCourseForExpats),
  parseFrontmatter(fushaVsGulfArabic),
];

// Sort by date (newest first)
export const blogPosts = allPosts.sort((a, b) => 
  new Date(b.date).getTime() - new Date(a.date).getTime()
);

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map(post => post.slug);
}
