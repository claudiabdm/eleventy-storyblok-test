require('dotenv').config();

module.exports = async () => {
  const locales = await getLocales();
  const stories = await getStories(locales);
  return { stories, navLinks: getNavLinks(stories) };
}

async function getStories(locales) {
  const StoryblokClient = require('storyblok-js-client');
  let sb = new StoryblokClient({
    accessToken: process.env.token,
    cache: {
      clear: 'auto',
      type: 'memory'
    }
  });
  const localizedStories = [];
  for (locale of locales) {
    const { data } = await sb.get(`cdn/stories?language=${locale}`, { version: 'draft' });
    const transformedStories = data.stories.map(story => ({ ...story, permalink: createPermalink(story, locale) }))
    localizedStories.push(...transformedStories);
  }
  return localizedStories;
}


async function getLocales() {
  const Cache = require('@11ty/eleventy-cache-assets');
  try {
    const { space } = await Cache(
      `https://api.storyblok.com/v1/cdn/spaces/me?token=${process.env.token}`,
      {
        duration: '1d',
        type: 'json'
      }
    );
    return ['en', ...space.language_codes];
  } catch (err) {
    console.log(err);
    return [];
  }
}

function getNavLinks(stories) {
  const notIncluded = new RegExp(/projects\/\w+|proyectos\/\w+/, 'i');
  let navlinks = {};
  navlinks = stories.reduce((localizedLinks, story) => {
    if (!localizedLinks[story.lang]) {
      localizedLinks[story.lang] = [];
    }
    if (!notIncluded.test(story.full_slug)) {
      let link = {
        link: story.path === '/' ? '/' : `/${story.default_full_slug}`,
        text: story.name.toLowerCase(),
        icon: story.name.toLowerCase(),
      };
      if (story.lang !== 'en') {
        const translatedSlug = story.translated_slugs.filter(slug => slug.lang === story.lang)[0];
        link = {
          link: story.path === '/' ? `/${locale}/` : `/${story.full_slug}`,
          text: (translatedSlug.name || story.name).toLowerCase(),
          icon: story.name.toLowerCase(),
        }
      }
      localizedLinks[story.lang].push(link);
    }
    return localizedLinks;
  }, {});
  return navlinks;
}

function createPermalink(story, locale) {
  if (locale === 'en') {
    return story.path === '/' ? story.path : story.default_full_slug;
  } else {
    return story.path === '/' ? `${locale}/` : story.full_slug;
  }
}