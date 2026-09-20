/**
 * Sonora Track Catalog Seed Data
 *
 * Real YouTube videoIds for curated tracks across genres relevant
 * to Sonora's musical identity (Bollywood, Indie, R&B, Acoustic, etc.).
 *
 * Thumbnails are constructed from the standard YouTube thumbnail URL:
 *   https://img.youtube.com/vi/{videoId}/hqdefault.jpg
 *
 * This is the initial seeded catalog. Users can also add tracks
 * via the "Add by YouTube URL" flow.
 */

const buildThumbnail = (videoId) =>
  `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

export const CATALOG_SEED = [
  // ── Bollywood / Hindi ──────────────────────────────────────────────
  {
    provider: 'youtube',
    providerId: 'v5tQoUsqZsI',
    title: 'Dhurandhar — Title Track',
    artist: 'Hanumankind, Shashwat Sachdev',
    thumbnail: buildThumbnail('v5tQoUsqZsI'),
    duration: 213,
  },
  {
    provider: 'youtube',
    providerId: 'P4Kh6UxGTY8',
    title: 'Yeh Fitoor Mera',
    artist: 'Arijit Singh',
    thumbnail: buildThumbnail('P4Kh6UxGTY8'),
    duration: 295,
  },
  {
    provider: 'youtube',
    providerId: 'Gu01BQSE8C4',
    title: 'Heeriye',
    artist: 'Arijit Singh, Jasleen Royal',
    thumbnail: buildThumbnail('Gu01BQSE8C4'),
    duration: 226,
  },
  {
    provider: 'youtube',
    providerId: 'h37PLqkGDjU',
    title: 'Raataan Lambiyan',
    artist: 'Jubin Nautiyal, Asees Kaur',
    thumbnail: buildThumbnail('h37PLqkGDjU'),
    duration: 253,
  },
  {
    provider: 'youtube',
    providerId: 'JtEAn5-QBMU',
    title: 'Kesariya',
    artist: 'Arijit Singh',
    thumbnail: buildThumbnail('JtEAn5-QBMU'),
    duration: 274,
  },
  {
    provider: 'youtube',
    providerId: 'gSwCFbsH2CM',
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
    thumbnail: buildThumbnail('gSwCFbsH2CM'),
    duration: 259,
  },
  {
    provider: 'youtube',
    providerId: 'WXuK6gekU1Y',
    title: 'Channa Mereya',
    artist: 'Arijit Singh',
    thumbnail: buildThumbnail('WXuK6gekU1Y'),
    duration: 276,
  },
  {
    provider: 'youtube',
    providerId: 'xFvHkv_fIDQ',
    title: 'Ik Vaari Aa',
    artist: 'Arijit Singh',
    thumbnail: buildThumbnail('xFvHkv_fIDQ'),
    duration: 281,
  },
  {
    provider: 'youtube',
    providerId: 'Xl95FMqWi0g',
    title: 'Ae Dil Hai Mushkil',
    artist: 'Arijit Singh',
    thumbnail: buildThumbnail('Xl95FMqWi0g'),
    duration: 263,
  },
  {
    provider: 'youtube',
    providerId: 'fMRIBmtTF-U',
    title: 'Tera Ban Jaunga',
    artist: 'Akhil Sachdeva, Tulsi Kumar',
    thumbnail: buildThumbnail('fMRIBmtTF-U'),
    duration: 220,
  },
  // ── Indie / Contemporary Hindi ─────────────────────────────────────
  {
    provider: 'youtube',
    providerId: 'Ke6rddXGFz8',
    title: 'Kho Gaye Hum Kahan',
    artist: 'Prateek Kuhad',
    thumbnail: buildThumbnail('Ke6rddXGFz8'),
    duration: 233,
  },
  {
    provider: 'youtube',
    providerId: '6ASNp3Jqh30',
    title: 'Cold/Mess',
    artist: 'Prateek Kuhad',
    thumbnail: buildThumbnail('6ASNp3Jqh30'),
    duration: 207,
  },
  {
    provider: 'youtube',
    providerId: 'VNLhvBNRZME',
    title: 'Kasoor',
    artist: 'Prateek Kuhad',
    thumbnail: buildThumbnail('VNLhvBNRZME'),
    duration: 240,
  },
  {
    provider: 'youtube',
    providerId: 'PVjiKRfKpPI',
    title: 'O Bedardeya',
    artist: 'Pritam, Arijit Singh',
    thumbnail: buildThumbnail('PVjiKRfKpPI'),
    duration: 219,
  },
  {
    provider: 'youtube',
    providerId: 'rOp7MK9DPz4',
    title: 'Phir Bhi Tumko Chahungi',
    artist: 'Shreya Ghoshal',
    thumbnail: buildThumbnail('rOp7MK9DPz4'),
    duration: 249,
  },
  {
    provider: 'youtube',
    providerId: 'Q2NrMClOUBA',
    title: 'Teri Mitti',
    artist: 'B Praak',
    thumbnail: buildThumbnail('Q2NrMClOUBA'),
    duration: 330,
  },
  // ── R&B / Soul ─────────────────────────────────────────────────────
  {
    provider: 'youtube',
    providerId: 'XXYlFuWEuKI',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    thumbnail: buildThumbnail('XXYlFuWEuKI'),
    duration: 200,
  },
  {
    provider: 'youtube',
    providerId: '4NRXx6U8ABQ',
    title: 'Save Your Tears',
    artist: 'The Weeknd',
    thumbnail: buildThumbnail('4NRXx6U8ABQ'),
    duration: 215,
  },
  {
    provider: 'youtube',
    providerId: 'uelHwf8o7_U',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    thumbnail: buildThumbnail('uelHwf8o7_U'),
    duration: 230,
  },
  {
    provider: 'youtube',
    providerId: '2Vv-BfVoq4g',
    title: 'Perfect',
    artist: 'Ed Sheeran',
    thumbnail: buildThumbnail('2Vv-BfVoq4g'),
    duration: 263,
  },
  {
    provider: 'youtube',
    providerId: 'lp-EO5I60KA',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    thumbnail: buildThumbnail('lp-EO5I60KA'),
    duration: 234,
  },
  // ── Acoustic / Lo-fi / Ambient ─────────────────────────────────────
  {
    provider: 'youtube',
    providerId: 'ktvTqknDobU',
    title: 'Riptide',
    artist: 'Vance Joy',
    thumbnail: buildThumbnail('ktvTqknDobU'),
    duration: 204,
  },
  {
    provider: 'youtube',
    providerId: 'dJ3lOy6xQv4',
    title: 'Budapest',
    artist: 'George Ezra',
    thumbnail: buildThumbnail('dJ3lOy6xQv4'),
    duration: 208,
  },
  {
    provider: 'youtube',
    providerId: 'Odh0G8RLOAI',
    title: 'Sunset Lover',
    artist: 'Petit Biscuit',
    thumbnail: buildThumbnail('Odh0G8RLOAI'),
    duration: 240,
  },
  {
    provider: 'youtube',
    providerId: 'pBkHHoOIIn8',
    title: 'Skinny Love',
    artist: 'Bon Iver',
    thumbnail: buildThumbnail('pBkHHoOIIn8'),
    duration: 225,
  },
  {
    provider: 'youtube',
    providerId: 'yKNxeF4KMsY',
    title: 'Holocene',
    artist: 'Bon Iver',
    thumbnail: buildThumbnail('yKNxeF4KMsY'),
    duration: 330,
  },
  // ── Pop / International ────────────────────────────────────────────
  {
    provider: 'youtube',
    providerId: 'JGwWNGJdvx8',
    title: 'Shape of You (Official)',
    artist: 'Ed Sheeran',
    thumbnail: buildThumbnail('JGwWNGJdvx8'),
    duration: 234,
  },
  {
    provider: 'youtube',
    providerId: 'pRpeEdMmmQ0',
    title: 'Shallow',
    artist: 'Lady Gaga, Bradley Cooper',
    thumbnail: buildThumbnail('pRpeEdMmmQ0'),
    duration: 216,
  },
  {
    provider: 'youtube',
    providerId: 'fHI8X4OXluQ',
    title: 'Golden Hour',
    artist: 'JVKE',
    thumbnail: buildThumbnail('fHI8X4OXluQ'),
    duration: 209,
  },
  {
    provider: 'youtube',
    providerId: 'VuNIsY6JdUw',
    title: 'Another Love',
    artist: 'Tom Odell',
    thumbnail: buildThumbnail('VuNIsY6JdUw'),
    duration: 248,
  },
]
