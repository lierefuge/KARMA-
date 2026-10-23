/* ============================================================
   KARMA — data/release-intel.js  (OTOMATİK ÜRETİLDİ)
   Son 30 günde çıkan GERÇEK parçalar + AI zenginleştirme alanı.

   Üretici : node tools/fetch-new-releases.js
   Kaynak  : iTunes Lookup API (country=TR) — albüm → parça
   Tarih   : 2026-10-23  ·  24 kayıt (24 tanesi depoda yok)

   ŞEMA (kayıt başına)
   -------------------
     title        gerçek parça adı
     artistId     oyundaki sanatçı kimliği (js/data/artists.js)
     artistName   oyundaki sahne adı
     album        albüm/single adı
     art          600x600 kapak
     releaseDate  YYYY-MM-DD (iTunes, TR)
     ms           süre (milisaniye)
     url          iTunes sayfası
     trackArtist  iTunes'un tam sanatçı dizesi ("Şehinşah & Hidra")
     isNew        real-songs.js'te YOK mu?
     intel        AI zenginleştirmesi — null ise henüz işlenmedi.
                  tools/ai-enrich.js doldurur; fetch bu alanı KORUR.
                  { genre, mood, energy, tempo, fit{playlistId:0..1},
                    note, tags[], model, v }

   DÜZENLEMEYİN — bir sonraki çalıştırmada üzerine yazılır.
   ============================================================ */
(function (K) {
  "use strict";
  K.RELEASE_INTEL = {
 "meta": {
  "asof": "2026-10-23",
  "window": 30,
  "source": "itunes-lookup-tr",
  "count": 24,
  "newCount": 24,
  "artistIds": {
   "sehinsah": 736313630,
   "weghrumi": 1564584641,
   "ceza": 127389488,
   "sagopa": 263633866,
   "ezhel": 1015463016,
   "benfero": 1363775273,
   "motive": 4626272,
   "uzi": 1448922098,
   "mavi": 1497144416,
   "lvbelc5": 1476999072,
   "saniser": 489573996,
   "normender": 1191518485,
   "gazapizm": 717795073,
   "khontkar": 651327571,
   "blok3": 1633245914,
   "reckol": 1505714059,
   "cakal": 322671226,
   "lilzey": 1478762401,
   "heijan": 1207443885,
   "muti": 1465923211,
   "era7capone": 1607891883,
   "ati242": 1422539373,
   "murda": 112316898,
   "patron": 159184160,
   "defkhan": 342309550,
   "contra": 1256287829,
   "hidra": 262372325,
   "joker": 1123499757,
   "sila": 268848049,
   "edis": 1359176380,
   "hadise": 171489403,
   "aleynatilki": 1141391002,
   "simge": 450650075,
   "melekmosso": 1274469906,
   "lierefuge": 1632511355,
   "deryaulug": 1118978883,
   "liashine": 1486825049
  },
  "generated": "2026-10-23T13:59:05.876Z"
 },
 "releases": {
  "sehinsah::sodom & gomore": {
   "title": "Sodom & Gomore",
   "artistId": "sehinsah",
   "artistName": "Şehinşah",
   "album": "Sodom & Gomore - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/1c/99/d9/1c99d964-cc19-bd4b-dd07-1cc6adfac479/0.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-23",
   "ms": 178025,
   "url": "https://music.apple.com/tr/album/sodom-gomore/6819328307?i=6819328316&uo=4",
   "trackArtist": "Şehinşah & Hidra",
   "isNew": true,
   "intel": null
  },
  "motive::akila": {
   "title": "Akila",
   "artistId": "motive",
   "artistName": "Motive",
   "album": "Akila - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/27/15/f3/2715f3f6-35a6-6809-c750-3ba608f88311/0.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-16",
   "ms": 168000,
   "url": "https://music.apple.com/tr/album/akila/6821364741?i=6821364744&uo=4",
   "trackArtist": "Motive",
   "isNew": true,
   "intel": null
  },
  "era7capone::bipolar": {
   "title": "BİPOLAR",
   "artistId": "era7capone",
   "artistName": "Era7capone",
   "album": "BİPOLAR",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/45/e8/44/45e844fe-0527-ecc3-57fa-eccf49ba6d53/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-16",
   "ms": 116818,
   "url": "https://music.apple.com/tr/album/bi-polar/6822741275?i=6822741459&uo=4",
   "trackArtist": "Era7capone & KERO",
   "isNew": true,
   "intel": null
  },
  "era7capone::gangsta mentalıte": {
   "title": "GANGSTA MENTALITE",
   "artistId": "era7capone",
   "artistName": "Era7capone",
   "album": "BİPOLAR",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/45/e8/44/45e844fe-0527-ecc3-57fa-eccf49ba6d53/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-16",
   "ms": 160000,
   "url": "https://music.apple.com/tr/album/gangsta-mentalite/6822741275?i=6822741467&uo=4",
   "trackArtist": "Era7capone",
   "isNew": true,
   "intel": null
  },
  "era7capone::knv": {
   "title": "KNV",
   "artistId": "era7capone",
   "artistName": "Era7capone",
   "album": "BİPOLAR",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/45/e8/44/45e844fe-0527-ecc3-57fa-eccf49ba6d53/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-16",
   "ms": 131000,
   "url": "https://music.apple.com/tr/album/knv/6822741275?i=6822741472&uo=4",
   "trackArtist": "Era7capone",
   "isNew": true,
   "intel": null
  },
  "era7capone::ok cnm": {
   "title": "OK CNM",
   "artistId": "era7capone",
   "artistName": "Era7capone",
   "album": "BİPOLAR",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/45/e8/44/45e844fe-0527-ecc3-57fa-eccf49ba6d53/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-16",
   "ms": 97500,
   "url": "https://music.apple.com/tr/album/ok-cnm/6822741275?i=6822741461&uo=4",
   "trackArtist": "Era7capone",
   "isNew": true,
   "intel": null
  },
  "era7capone::papilo": {
   "title": "PAPİLO",
   "artistId": "era7capone",
   "artistName": "Era7capone",
   "album": "BİPOLAR",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/45/e8/44/45e844fe-0527-ecc3-57fa-eccf49ba6d53/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-16",
   "ms": 152727,
   "url": "https://music.apple.com/tr/album/papi-lo/6822741275?i=6822741480&uo=4",
   "trackArtist": "Era7capone, MODIE & KERO",
   "isNew": true,
   "intel": null
  },
  "era7capone::yalancı": {
   "title": "YALANCI",
   "artistId": "era7capone",
   "artistName": "Era7capone",
   "album": "BİPOLAR",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/45/e8/44/45e844fe-0527-ecc3-57fa-eccf49ba6d53/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-16",
   "ms": 166917,
   "url": "https://music.apple.com/tr/album/yalanci/6822741275?i=6822741475&uo=4",
   "trackArtist": "Era7capone & Laçin",
   "isNew": true,
   "intel": null
  },
  "joker::beddua": {
   "title": "Beddua",
   "artistId": "joker",
   "artistName": "Joker",
   "album": "TRAVMA",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ce/42/7b/ce427bda-bb7b-8428-6e69-5810e19bfe87/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-09",
   "ms": 72562,
   "url": "https://music.apple.com/tr/album/beddua/6817887219?i=6817887870&uo=4",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": null
  },
  "joker::intikam için": {
   "title": "İntikam İçin",
   "artistId": "joker",
   "artistName": "Joker",
   "album": "TRAVMA",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ce/42/7b/ce427bda-bb7b-8428-6e69-5810e19bfe87/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-09",
   "ms": 139548,
   "url": "https://music.apple.com/tr/album/i-ntikam-i-%C3%A7in/6817887219?i=6817887868&uo=4",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": null
  },
  "joker::mutfak (skit)": {
   "title": "Mutfak (Skit)",
   "artistId": "joker",
   "artistName": "Joker",
   "album": "TRAVMA",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ce/42/7b/ce427bda-bb7b-8428-6e69-5810e19bfe87/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-09",
   "ms": 49959,
   "url": "https://music.apple.com/tr/album/mutfak-skit/6817887219?i=6817887862&uo=4",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": null
  },
  "reckol::rollıe": {
   "title": "ROLLIE",
   "artistId": "reckol",
   "artistName": "Reckol",
   "album": "ROLLIE - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/61/31/92/6131920a-a2a3-6dc1-97e8-59c4fe2df60d/0.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-09",
   "ms": 97885,
   "url": "https://music.apple.com/tr/album/rollie/6815343039?i=6815343040&uo=4",
   "trackArtist": "Reckol & Kuty",
   "isNew": true,
   "intel": null
  },
  "joker::söz": {
   "title": "Söz",
   "artistId": "joker",
   "artistName": "Joker",
   "album": "TRAVMA",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ce/42/7b/ce427bda-bb7b-8428-6e69-5810e19bfe87/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-09",
   "ms": 68095,
   "url": "https://music.apple.com/tr/album/s%C3%B6z/6817887219?i=6817887866&uo=4",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": null
  },
  "weghrumi::uykudan önce": {
   "title": "Uykudan Önce",
   "artistId": "weghrumi",
   "artistName": "wegh Rumi",
   "album": "Uykudan Önce - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/95/59/16/95591669-166d-5fa2-a569-8bc51c29fa7f/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-09",
   "ms": 165246,
   "url": "https://music.apple.com/tr/album/uykudan-%C3%B6nce/6819387621?i=6819387626&uo=4",
   "trackArtist": "Wegh",
   "isNew": true,
   "intel": null
  },
  "liashine::yüzünü unutuyorum": {
   "title": "Yüzünü Unutuyorum",
   "artistId": "liashine",
   "artistName": "Lia Shine",
   "album": "Yüzünü Unutuyorum - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/c8/ea/4e/c8ea4edf-c317-9a5e-217e-dd195f4982b6/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-09",
   "ms": 156000,
   "url": "https://music.apple.com/tr/album/y%C3%BCz%C3%BCn%C3%BC-unutuyorum/6816130792?i=6816130797&uo=4",
   "trackArtist": "Lia Shine",
   "isNew": true,
   "intel": null
  },
  "joker::ıntro": {
   "title": "Intro",
   "artistId": "joker",
   "artistName": "Joker",
   "album": "TRAVMA",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ce/42/7b/ce427bda-bb7b-8428-6e69-5810e19bfe87/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-09",
   "ms": 116868,
   "url": "https://music.apple.com/tr/album/intro/6817887219?i=6817887224&uo=4",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": null
  },
  "joker::şeytanlar ve melekler": {
   "title": "Şeytanlar ve Melekler",
   "artistId": "joker",
   "artistName": "Joker",
   "album": "TRAVMA",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ce/42/7b/ce427bda-bb7b-8428-6e69-5810e19bfe87/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-09",
   "ms": 222555,
   "url": "https://music.apple.com/tr/album/%C5%9Feytanlar-ve-melekler/6817887219?i=6817887228&uo=4",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": null
  },
  "murda::5am": {
   "title": "5AM",
   "artistId": "murda",
   "artistName": "Murda",
   "album": "UZAY",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e0/d7/91/e0d7915e-2e9e-a512-7898-3e8b04a74019/26UM1IM15333.rgb.jpg/600x600bb.jpg",
   "releaseDate": "2026-09-24",
   "ms": 132759,
   "url": "https://music.apple.com/tr/album/5am/6812656291?i=6812656537&uo=4",
   "trackArtist": "Murda",
   "isNew": true,
   "intel": null
  },
  "murda::5migros": {
   "title": "5Migros",
   "artistId": "murda",
   "artistName": "Murda",
   "album": "UZAY",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e0/d7/91/e0d7915e-2e9e-a512-7898-3e8b04a74019/26UM1IM15333.rgb.jpg/600x600bb.jpg",
   "releaseDate": "2026-09-24",
   "ms": 152442,
   "url": "https://music.apple.com/tr/album/5migros/6812656291?i=6812656543&uo=4",
   "trackArtist": "Murda",
   "isNew": true,
   "intel": null
  },
  "murda::br0ww/beddua": {
   "title": "Br0ww/Beddua",
   "artistId": "murda",
   "artistName": "Murda",
   "album": "UZAY",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e0/d7/91/e0d7915e-2e9e-a512-7898-3e8b04a74019/26UM1IM15333.rgb.jpg/600x600bb.jpg",
   "releaseDate": "2026-09-24",
   "ms": 265583,
   "url": "https://music.apple.com/tr/album/br0ww-beddua/6812656291?i=6812656533&uo=4",
   "trackArtist": "Murda",
   "isNew": true,
   "intel": null
  },
  "murda::sneakylink (feat. yung ouzo)": {
   "title": "sneakyLink (feat. Yung Ouzo)",
   "artistId": "murda",
   "artistName": "Murda",
   "album": "UZAY",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e0/d7/91/e0d7915e-2e9e-a512-7898-3e8b04a74019/26UM1IM15333.rgb.jpg/600x600bb.jpg",
   "releaseDate": "2026-09-24",
   "ms": 193628,
   "url": "https://music.apple.com/tr/album/sneakylink-feat-yung-ouzo/6812656291?i=6812656538&uo=4",
   "trackArtist": "Murda",
   "isNew": true,
   "intel": null
  },
  "murda::vallah (feat. summer cem)": {
   "title": "vAllah (feat. Summer Cem)",
   "artistId": "murda",
   "artistName": "Murda",
   "album": "UZAY",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e0/d7/91/e0d7915e-2e9e-a512-7898-3e8b04a74019/26UM1IM15333.rgb.jpg/600x600bb.jpg",
   "releaseDate": "2026-09-24",
   "ms": 210438,
   "url": "https://music.apple.com/tr/album/vallah-feat-summer-cem/6812656291?i=6812656535&uo=4",
   "trackArtist": "Murda",
   "isNew": true,
   "intel": null
  },
  "murda::yanıyorum": {
   "title": "yanıyorum",
   "artistId": "murda",
   "artistName": "Murda",
   "album": "UZAY",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e0/d7/91/e0d7915e-2e9e-a512-7898-3e8b04a74019/26UM1IM15333.rgb.jpg/600x600bb.jpg",
   "releaseDate": "2026-09-24",
   "ms": 164691,
   "url": "https://music.apple.com/tr/album/yan%C4%B1yorum/6812656291?i=6812656541&uo=4",
   "trackArtist": "Murda",
   "isNew": true,
   "intel": null
  },
  "sagopa::sor yıllara": {
   "title": "Sor Yıllara",
   "artistId": "sagopa",
   "artistName": "Sagopa Kajmer",
   "album": "Sor Yıllara - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/61/24/56/612456d7-0f8e-2505-0009-99cb2b1e66b5/885288605778.jpg/600x600bb.jpg",
   "releaseDate": "2026-09-23",
   "ms": 240000,
   "url": "https://music.apple.com/tr/album/sor-y%C4%B1llara/6813571510?i=6813571672&uo=4",
   "trackArtist": "Sagopa Kajmer",
   "isNew": true,
   "intel": null
  }
 }
};
})(window.K = window.K || {});
