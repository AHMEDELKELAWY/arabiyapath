// Blog post registry - add new posts here
import { BLOG_SLUG_REDIRECTS, RETIRED_BLOG_SLUGS } from './redirects';

export interface BlogPost {
  title: string;
  description: string;
  date: string;
  slug: string;
  excerpt: string;
  content: string;
  /** Optional social share image (absolute path under /public). */
  image?: string;
}

// Import raw markdown files
import whyLearnGulfArabic from './why-learn-gulf-arabic.md?raw';
import gulfVsFusha from './gulf-vs-fusha-arabic.md?raw';
import gulfArabicCourseForExpats from './gulf-arabic-course-for-expats.md?raw';
import fushaVsGulfArabic from './fusha-vs-gulf-arabic.md?raw';
import learnArabicBeginnersGuide from './learn-arabic-beginners-guide.md?raw';
import gulfArabicCourseForExpatsInDubai from './gulf-arabic-course-for-expats-in-dubai.md?raw';
import howToOrderFoodInGulfArabicDubai from './how-to-order-food-in-gulf-arabic-dubai.md?raw';
import dailyGulfArabicPhrases from './10-daily-gulf-arabic-phrases-for-expats.md?raw';
import arabicForExpatsInSaudiArabia from './arabic-for-expats-in-saudi-arabia.md?raw';
import learnArabicOnline from './learn-arabic-online.md?raw';
import onlineArabicClasses from './online-arabic-classes.md?raw';
import arabicLessonsOnline from './arabic-lessons-online.md?raw';
import arabicOnlineCourse from './arabic-online-course.md?raw';
import learnArabicLanguageOnline from './learn-arabic-language-online.md?raw';
import studyArabicOnline from './study-arabic-online.md?raw';
import arabicLanguageOnline from './arabic-language-online.md?raw';
import learnArabicOnlineCourse from './learn-arabic-online-course.md?raw';
import learnarabiconline from './learnarabiconline.md?raw';
import learnArabicForBeginners from './learn-arabic-for-beginners.md?raw';
import learnArabicFast from './learn-arabic-fast.md?raw';
import arabicConversationCourse from './arabic-conversation-course.md?raw';
import bestArabicLearningApp from './best-arabic-learning-app.md?raw';
import learnGulfArabicOnline from './learn-gulf-arabic-online.md?raw';
// Cluster pages: Gulf / Khaleeji + Fusha topical depth
import khaleejiVsEgyptian from './khaleeji-vs-egyptian-arabic.md?raw';
import gulfAlphabetPronunciation from './gulf-arabic-alphabet-and-pronunciation.md?raw';
import hundredGulfPhrases from './100-gulf-arabic-phrases.md?raw';
import isGulfArabicHard from './is-gulf-arabic-hard-to-learn.md?raw';
import fushaVsAmmiyya from './fusha-vs-ammiyya.md?raw';
import fushaAlphabet from './fusha-arabic-alphabet.md?raw';
import learnGulfArabicOnlineForBeginners from './learn-gulf-arabic-online-for-beginners.md?raw';


function parseFrontmatter(markdown: string): BlogPost {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);
  
  if (!match) {
    throw new Error('Invalid frontmatter format');
  }
  
  const frontmatter = match[1];
  // Strip a leading "# Title" — the page already renders the title as the single
  // H1, and a second H1 in the body dilutes the page's heading structure.
  const content = match[2].trim().replace(/^#\s+[^\n]+\n+/, '');

  
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
    image: metadata.image || undefined,
    content
  };
}

// Parse all posts
const allPosts: BlogPost[] = [
  parseFrontmatter(whyLearnGulfArabic),
  parseFrontmatter(gulfVsFusha),
  parseFrontmatter(gulfArabicCourseForExpats),
  parseFrontmatter(fushaVsGulfArabic),
  parseFrontmatter(learnArabicBeginnersGuide),
  parseFrontmatter(gulfArabicCourseForExpatsInDubai),
  parseFrontmatter(howToOrderFoodInGulfArabicDubai),
  parseFrontmatter(dailyGulfArabicPhrases),
  parseFrontmatter(arabicForExpatsInSaudiArabia),
  parseFrontmatter(learnArabicOnline),
  parseFrontmatter(onlineArabicClasses),
  parseFrontmatter(arabicLessonsOnline),
  parseFrontmatter(arabicOnlineCourse),
  parseFrontmatter(learnArabicLanguageOnline),
  parseFrontmatter(studyArabicOnline),
  parseFrontmatter(arabicLanguageOnline),
  parseFrontmatter(learnArabicOnlineCourse),
  parseFrontmatter(learnarabiconline),
  parseFrontmatter(learnArabicForBeginners),
  parseFrontmatter(learnArabicFast),
  parseFrontmatter(arabicConversationCourse),
  parseFrontmatter(bestArabicLearningApp),
  parseFrontmatter(learnGulfArabicOnline),
  parseFrontmatter(khaleejiVsEgyptian),
  parseFrontmatter(gulfAlphabetPronunciation),
  parseFrontmatter(hundredGulfPhrases),
  parseFrontmatter(isGulfArabicHard),
  parseFrontmatter(fushaVsAmmiyya),
  parseFrontmatter(fushaAlphabet),
  parseFrontmatter(learnGulfArabicOnlineForBeginners),

];

// Sort by date (newest first), excluding slugs retired by consolidation
export const blogPosts = allPosts
  .filter((post) => !RETIRED_BLOG_SLUGS.has(post.slug))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map(post => post.slug);
}

export { BLOG_SLUG_REDIRECTS, RETIRED_BLOG_SLUGS };

