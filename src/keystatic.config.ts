import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: { kind: 'local' },
  collections: {
    posts: collection({
      label: 'Posts',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        published: fields.boolean({ label: 'Published', defaultValue: false }),
        date: fields.date({ label: 'Date', defaultValue: () => new Date().toISOString().split('T')[0] }),
        excerpt: fields.text({ label: 'Excerpt' }),
        content: fields.document({
          formatting: true,
          dividers: true,
          links: true,
          images: true,
        }),
      },
    }),
    pages: collection({
      label: 'Pages',
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        content: fields.document({
          formatting: true,
          dividers: true,
          links: true,
        }),
      },
    }),
  },
});
