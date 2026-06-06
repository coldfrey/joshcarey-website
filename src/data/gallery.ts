// Gallery items.
// LIGHT mode = sleek justified photo wall. DARK mode = `ls -lh` + `viu` viewer.
//
// Photos live in public/gallery/. `w`/`h` are the intrinsic pixel size — used
// for aspect-ratio (no layout shift) and the terminal "file size" illusion.
// `size` is the human file size shown in the `ls -lh` listing.
// After adding/removing photos, run `npm run lqip` to regenerate blur-up previews.
export interface GalleryItem {
  src: string;
  alt: string;
  title: string;
  file: string; // filename shown in terminal mode
  date: string; // YYYY-MM-DD
  size: string; // e.g. "1.2M"
  w: number;
  h: number;
  location?: string;
  span?: 'wide' | 'tall'; // optional grid emphasis
}

export const gallery: GalleryItem[] = [
  {
    src: '/gallery/under-sail.jpg',
    alt: 'A classic ketch sailing under full canvas on open blue water',
    title: 'Under sail',
    file: 'under-sail.jpg',
    date: '2023-08-22',
    size: '163K',
    w: 1036,
    h: 758,
    span: 'wide',
  },
  {
    src: '/gallery/sundown-yard.jpg',
    alt: 'The sun setting behind silhouetted harbour cranes',
    title: 'Sundown at the yard',
    file: 'sundown-yard.jpg',
    date: '2026-04-06',
    size: '102K',
    w: 768,
    h: 1020,
    span: 'tall',
  },
  {
    src: '/gallery/the-leap.jpg',
    alt: 'A group standing on the edge of a sea arch, about to jump',
    title: 'The leap',
    file: 'the-leap.jpg',
    date: '2022-07-10',
    size: '235K',
    w: 1084,
    h: 724,
    span: 'wide',
  },
  {
    src: '/gallery/desert-camp.jpg',
    alt: 'A camper van lit up under a star-filled desert sky',
    title: 'Camp under stars',
    file: 'desert-camp.jpg',
    date: '2022-07-15',
    size: '211K',
    w: 1024,
    h: 768,
  },
  {
    src: '/gallery/the-souk.jpg',
    alt: 'Browsing a colourful clothing stall in a busy souk',
    title: 'The souk',
    file: 'the-souk.jpg',
    date: '2022-07-06',
    size: '345K',
    w: 1008,
    h: 779,
  },
  {
    src: '/gallery/mountain-juniper.jpg',
    alt: 'A gnarled juniper clinging to a rocky mountain ridge',
    title: 'Mountain juniper',
    file: 'mountain-juniper.jpg',
    date: '2022-07-22',
    size: '311K',
    w: 768,
    h: 1024,
    span: 'tall',
  },
  {
    src: '/gallery/atlantic-cliffs.jpg',
    alt: 'A weathered headland dropping into a hazy Atlantic swell',
    title: 'The headland',
    file: 'atlantic-cliffs.jpg',
    date: '2022-07-07',
    size: '289K',
    w: 1024,
    h: 768,
  },
  {
    src: '/gallery/desert-loader.jpg',
    alt: 'A Caterpillar wheel loader working a sand-blown desert road',
    title: 'Desert machine',
    file: 'desert-loader.jpg',
    date: '2022-07-07',
    size: '225K',
    w: 1024,
    h: 768,
  },
];
