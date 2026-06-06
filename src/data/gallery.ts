// Gallery items.
// LIGHT mode = sleek justified photo wall. DARK mode = `ls -lh` + `viu` viewer.
//
// Drop real photos in public/gallery/ and point `src` at them.
// `w`/`h` are the intrinsic pixel size — used for aspect-ratio (no layout shift)
// and the terminal "file size" illusion. `size` is the human file size shown in
// the `ls -lh` listing.
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
    src: '/gallery/monaco.svg',
    alt: 'Harbour view in Monaco',
    title: 'Monaco harbour',
    file: 'monaco.jpg',
    date: '2026-05-22',
    size: '2.1M',
    w: 1600,
    h: 1067,
    location: 'Monaco',
    span: 'wide',
  },
  {
    src: '/gallery/studio.svg',
    alt: 'Desk and studio setup',
    title: 'The setup',
    file: 'studio.jpg',
    date: '2026-03-10',
    size: '1.4M',
    w: 1067,
    h: 1600,
    span: 'tall',
  },
  {
    src: '/gallery/city-night.svg',
    alt: 'City lights at night',
    title: 'City, after dark',
    file: 'city-night.jpg',
    date: '2025-11-02',
    size: '1.8M',
    w: 1600,
    h: 1067,
  },
  {
    src: '/gallery/coast.svg',
    alt: 'Coastline at golden hour',
    title: 'Golden hour',
    file: 'coast.jpg',
    date: '2025-08-14',
    size: '1.1M',
    w: 1600,
    h: 1067,
  },
  {
    src: '/gallery/detail.svg',
    alt: 'A small detail shot',
    title: 'Detail',
    file: 'detail.jpg',
    date: '2025-06-01',
    size: '640K',
    w: 1067,
    h: 1600,
    span: 'tall',
  },
  {
    src: '/gallery/skyline.svg',
    alt: 'Skyline panorama',
    title: 'Skyline',
    file: 'skyline.jpg',
    date: '2025-02-19',
    size: '2.4M',
    w: 1600,
    h: 1067,
    span: 'wide',
  },
];
