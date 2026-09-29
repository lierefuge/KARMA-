/* ============================================================
   KARMA — data/artist-photos.js  (OTOMATİK ÜRETİLDİ)
   Her sanatçının GERÇEK profil resmi (Deezer açık API, 500×500).
   Kaynak: api.deezer.com/search/artist → picture_xl
   Üretici: node tools/fetch-artist-photos.js
   Kullanım: K.imagery.portrait(id) bu haritayı ilk sırada kullanır.
   Güncelleme: 2026-09-28
   ============================================================ */
(function (K) {
  "use strict";
  K.ARTIST_PHOTOS = {
 "sehinsah": "https://cdn-images.dzcdn.net/images/artist/39b2e6d49de9a33fbc6ba6f2f87a59ff/500x500-000000-80-0-0.jpg",
 "weghrumi": "https://cdn-images.dzcdn.net/images/artist/581f037adccfedcae5a9dab2a0861368/500x500-000000-80-0-0.jpg",
 "ceza": "https://cdn-images.dzcdn.net/images/artist/2af230afdd9e93989d7d7288e93fb536/500x500-000000-80-0-0.jpg",
 "sagopa": "https://cdn-images.dzcdn.net/images/artist/b532395d78190bc78ef3a257bedd4e04/500x500-000000-80-0-0.jpg",
 "ezhel": "https://cdn-images.dzcdn.net/images/artist/86897403b02175990e9d84322a94654a/500x500-000000-80-0-0.jpg",
 "benfero": "https://cdn-images.dzcdn.net/images/artist/cd7de0ac70198ea395e8c43fac6200cd/500x500-000000-80-0-0.jpg",
 "motive": "https://cdn-images.dzcdn.net/images/artist/ed94718f8e0248951ed2c5c4ce54bf07/500x500-000000-80-0-0.jpg",
 "uzi": "https://cdn-images.dzcdn.net/images/artist/ea18be765d0bfba80fceef535464a060/500x500-000000-80-0-0.jpg",
 "mavi": "https://cdn-images.dzcdn.net/images/artist/e7234aeff0081367e7e856b5fd54058e/500x500-000000-80-0-0.jpg",
 "lvbelc5": "https://cdn-images.dzcdn.net/images/artist/55eba79b292dbef8e65d5b7b6873b9e8/500x500-000000-80-0-0.jpg",
 "saniser": "https://cdn-images.dzcdn.net/images/artist/d8deeddd09abac1127373594f20b65b2/500x500-000000-80-0-0.jpg",
 "normender": "https://cdn-images.dzcdn.net/images/artist/d96f52551488565b93aefe42d8614f83/500x500-000000-80-0-0.jpg",
 "gazapizm": "https://cdn-images.dzcdn.net/images/artist/71c71137eb285c89290ef98049925fbd/500x500-000000-80-0-0.jpg",
 "khontkar": "https://cdn-images.dzcdn.net/images/artist/9c79cec86b88498bad27c2937f4a5a16/500x500-000000-80-0-0.jpg",
 "blok3": "https://cdn-images.dzcdn.net/images/artist/bcd7669bc107dd4b066deb45a31b1f9d/500x500-000000-80-0-0.jpg",
 "reckol": "https://cdn-images.dzcdn.net/images/artist/cd9e07c5b18385145ed70f83d42c31e9/500x500-000000-80-0-0.jpg",
 "cakal": "https://cdn-images.dzcdn.net/images/artist/ebcf22e5c3a0eb3178b8a6f6bc1a5a6c/500x500-000000-80-0-0.jpg",
 "lilzey": "https://cdn-images.dzcdn.net/images/artist/62ab8878be60c6baa7fc4537581e4507/500x500-000000-80-0-0.jpg",
 "heijan": "https://cdn-images.dzcdn.net/images/artist/cf403c5f6e7ba740e2565c5fd6112539/500x500-000000-80-0-0.jpg",
 "muti": "https://cdn-images.dzcdn.net/images/artist/0f291c21c2d5752cd7333548f71061be/500x500-000000-80-0-0.jpg",
 "era7capone": "https://cdn-images.dzcdn.net/images/artist/4cc148453373e887d1956b6344a7b04f/500x500-000000-80-0-0.jpg",
 "ati242": "https://cdn-images.dzcdn.net/images/artist/4cc148453373e887d1956b6344a7b04f/500x500-000000-80-0-0.jpg",
 "murda": "https://cdn-images.dzcdn.net/images/artist/dbd7de9aa7a90a039f18dee17edd84dd/500x500-000000-80-0-0.jpg",
 "patron": "https://cdn-images.dzcdn.net/images/artist/c454710c0a9c702d3a418b8d360531d3/500x500-000000-80-0-0.jpg",
 "defkhan": "https://cdn-images.dzcdn.net/images/artist/cff12842befa3ac20e0d01d8acd3647b/500x500-000000-80-0-0.jpg",
 "contra": "https://cdn-images.dzcdn.net/images/artist/34058238651485571d9341ce8e466ea5/500x500-000000-80-0-0.jpg",
 "hidra": "https://cdn-images.dzcdn.net/images/artist/742b1b092644cdf3f94507cad391bbd8/500x500-000000-80-0-0.jpg",
 "joker": "https://cdn-images.dzcdn.net/images/artist/dd529891ea8e57340c8d7e909e29a257/500x500-000000-80-0-0.jpg",
 "sila": "https://cdn-images.dzcdn.net/images/artist/7bc5759ce8c01896adff9ae390a18065/500x500-000000-80-0-0.jpg",
 "edis": "https://cdn-images.dzcdn.net/images/artist/f506aa24a14dabc72c980f2c41bdce24/500x500-000000-80-0-0.jpg",
 "hadise": "https://cdn-images.dzcdn.net/images/artist/01a9c3f2fe42c62083ad4268cef30d07/500x500-000000-80-0-0.jpg",
 "aleynatilki": "https://cdn-images.dzcdn.net/images/artist/aa451cd32910ea3553ebaa714b7e8e9c/500x500-000000-80-0-0.jpg",
 "simge": "https://cdn-images.dzcdn.net/images/artist/908d0545255bdaa93da39e59631fa9aa/500x500-000000-80-0-0.jpg",
 "melekmosso": "https://cdn-images.dzcdn.net/images/artist/db39d7dd961550f0c4e46ad9869ac452/500x500-000000-80-0-0.jpg",
 "lierefuge": "https://cdn-images.dzcdn.net/images/artist/edbbc7a37f30c4374fcce0901b3219c0/500x500-000000-80-0-0.jpg",
 "deryaulug": "https://cdn-images.dzcdn.net/images/artist/7c900d0401f655f0bfff2dc8ec07d737/500x500-000000-80-0-0.jpg"
};
})(window.K = window.K || {});
