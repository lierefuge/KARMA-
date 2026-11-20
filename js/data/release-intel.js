/* ============================================================
   KARMA — data/release-intel.js  (OTOMATİK ÜRETİLDİ)
   Son 30 günde çıkan GERÇEK parçalar + AI zenginleştirme alanı.

   Üretici : node tools/fetch-new-releases.js
   Kaynak  : iTunes Lookup API (country=TR) — albüm → parça
   Tarih   : 2026-11-20  ·  13 kayıt (13 tanesi depoda yok)

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
     preview      30 sn ses önizlemesi (iTunes previewUrl) — yeni çıkışın
                  oyunda ÇALINABİLMESİNİ sağlar; yoksa null
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
  "asof": "2026-11-20",
  "window": 30,
  "source": "itunes-lookup-tr",
  "count": 13,
  "newCount": 13,
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
  "generated": "2026-11-20T02:12:50.155Z"
 },
 "releases": {
  "khontkar::ı̇çerı̇ye": {
   "title": "İÇERİYE",
   "artistId": "khontkar",
   "artistName": "Khontkar",
   "album": "İÇERİYE - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/c1/be/e9/c1bee9a4-7396-d0f8-8dbe-04d4c9421d7e/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-11-19",
   "ms": 144000,
   "url": "https://music.apple.com/tr/album/i-c-eri-ye/6835560601?i=6835560605&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/47/b0/19/47b019a1-1120-d1be-fa3b-47b5a8008824/mzaf_6809741498264706122.plus.aac.p.m4a",
   "trackArtist": "Khontkar, Tuby & Yung Ouzo",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "sert",
    "energy": 8,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.9,
     "traptr": 0.95,
     "drilltr": 0.3,
     "newmusic": 0.8,
     "nightmode": 0.4,
     "popturkiye": 0.1
    },
    "note": "Khontkar, Tuby ve Yung Ouzo'dan karanlık ve yüksek enerjili bir trap çalışması.",
    "tags": [
     "trap",
     "sert",
     "hiphop"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "lilzey::nejat_isler.mp3": {
   "title": "nejat_isler.mp3",
   "artistId": "lilzey",
   "artistName": "Lil Zey",
   "album": "nejat_isler.mp3 - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/8f/28/bd/8f28bdea-c4e4-ffd9-5b28-e6380fdef50b/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-11-13",
   "ms": 159040,
   "url": "https://music.apple.com/tr/album/nejat-isler-mp3/6827094961?i=6827095191&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/70/32/bb/7032bb43-1b45-4c4b-1863-89c9bc29d3b0/mzaf_8764265305343197722.plus.aac.p.m4a",
   "trackArtist": "Lil Zey",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "karanlık",
    "energy": 7,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.8,
     "traptr": 0.9,
     "drilltr": 0.2,
     "newmusic": 0.9,
     "nightmode": 0.8,
     "popturkiye": 0.1
    },
    "note": "Lil Zey'in hipnotik vokalleriyle öne çıkan melankolik ve modern bir trap parçası.",
    "tags": [
     "trap",
     "melankolik",
     "gece"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "sehinsah::niagara": {
   "title": "Niagara",
   "artistId": "sehinsah",
   "artistName": "Şehinşah",
   "album": "Niagara - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/4b/a5/3e/4ba53e75-a6ff-68b4-e8b3-2ca903487cd7/0.jpg/600x600bb.jpg",
   "releaseDate": "2026-11-13",
   "ms": 218182,
   "url": "https://music.apple.com/tr/album/niagara/6828498154?i=6828498155&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/a4/e6/8b/a4e68b59-eb7e-9b26-9881-44c9f4b33d7d/mzaf_8674763340072503672.plus.aac.p.m4a",
   "trackArtist": "Şehinşah",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "enerjik",
    "energy": 8,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.9,
     "traptr": 0.8,
     "drilltr": 0.3,
     "newmusic": 0.9,
     "nightmode": 0.4,
     "popturkiye": 0.1
    },
    "note": "Şehinşah'ın kendine has flow'ları ve yüksek enerjili beat'leriyle dinamik bir çalışma.",
    "tags": [
     "rap",
     "dinamik",
     "flow"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "saniser::sağ kalır insan": {
   "title": "Sağ Kalır İnsan",
   "artistId": "saniser",
   "artistName": "Şanışer",
   "album": "Sağ Kalır İnsan - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/19/6e/64/196e64ee-010f-59f0-673e-fe67ca16be68/0.jpg/600x600bb.jpg",
   "releaseDate": "2026-11-13",
   "ms": 182160,
   "url": "https://music.apple.com/tr/album/sa%C4%9F-kal%C4%B1r-i-nsan/6828475467?i=6828475469&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/15/0c/53/150c53ae-3301-f2fe-2a65-d55a651a89b8/mzaf_10150288777151222680.plus.aac.p.m4a",
   "trackArtist": "Şanışer",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "düşünceli",
    "energy": 6,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.9,
     "traptr": 0.3,
     "drilltr": 0.1,
     "newmusic": 0.9,
     "nightmode": 0.7,
     "popturkiye": 0.2
    },
    "note": "Şanışer'in edebi lirizmini ve melodik nakaratlarını barındıran duygusal bir rap şarkısı.",
    "tags": [
     "lyrical",
     "melodik",
     "protest"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "sila::zor sevdiğimden (elektra)": {
   "title": "Zor Sevdiğimden (Elektra)",
   "artistId": "sila",
   "artistName": "Sıla",
   "album": "Zor Sevdiğimden (Elektra) - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/e8/3c/52/e83c529a-8a77-1c66-8372-b04f2f48fdd7/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-11-13",
   "ms": 169130,
   "url": "https://music.apple.com/tr/album/zor-sevdi%C4%9Fimden-elektra/6821101380?i=6821101862&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8b/06/06/8b06068e-988b-bc95-a323-49bf91ff7d9d/mzaf_12944066366860090058.plus.aac.p.m4a",
   "trackArtist": "Sıla & Tolga Şanlı",
   "isNew": true,
   "intel": {
    "genre": "pop",
    "mood": "romantik",
    "energy": 5,
    "tempo": "slow",
    "fit": {
     "rapturkiye": 0,
     "traptr": 0,
     "drilltr": 0,
     "newmusic": 0.8,
     "nightmode": 0.6,
     "popturkiye": 0.9
    },
    "note": "Sıla ve Tolga Şanlı'dan duygusal derinliği yüksek, akustik dokulu bir pop iş birliği.",
    "tags": [
     "pop",
     "akustik",
     "duygusal"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "weghrumi::ömerhayyam": {
   "title": "ÖMERHAYYAM",
   "artistId": "weghrumi",
   "artistName": "wegh Rumi",
   "album": "ÖMERHAYYAM - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/b1/7c/ea/b17cea89-2aaf-6a08-ec67-9ce283437c81/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-11-13",
   "ms": 138667,
   "url": "https://music.apple.com/tr/album/%C3%B6merhayyam/6833086836?i=6833086837&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0c/02/0e/0c020e35-4db3-dbf5-71bd-60d2837cbf5c/mzaf_2129284977356041206.plus.aac.p.m4a",
   "trackArtist": "Wegh",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "sert",
    "energy": 8,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.8,
     "traptr": 0.9,
     "drilltr": 0.4,
     "newmusic": 0.9,
     "nightmode": 0.5,
     "popturkiye": 0
    },
    "note": "Wegh'in agresif tarzını ve felsefi göndermelerini buluşturan sert bir trap parçası.",
    "tags": [
     "trap",
     "sert",
     "sokak"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "ati242::babyglock": {
   "title": "Babyglock",
   "artistId": "ati242",
   "artistName": "Ati242",
   "album": "Babyglock - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/2e/e9/ee/2ee9eeeb-e7ba-a9ce-723a-97d4ba9d1a62/711641013914.jpg/600x600bb.jpg",
   "releaseDate": "2026-11-06",
   "ms": 166000,
   "url": "https://music.apple.com/tr/album/babyglock/6823645867?i=6823645874&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/a5/15/39/a5153965-71f2-be92-b844-8d5fd499090a/mzaf_5022699986470079342.plus.aac.p.m4a",
   "trackArtist": "Ati242",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "agressive",
    "energy": 8,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.8,
     "traptr": 0.9,
     "drilltr": 0.3,
     "newmusic": 0.9,
     "nightmode": 0.2,
     "popturkiye": 0.1
    },
    "note": "Ati242'nin enerjisi yüksek, vurucu synthler ve sert altyapılı trap çalışması.",
    "tags": [
     "trap",
     "sert",
     "türkçe rap"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "sehinsah::70lik": {
   "title": "70'lik",
   "artistId": "sehinsah",
   "artistName": "Şehinşah",
   "album": "70'lik - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/55/c6/cc/55c6cc75-50c0-f9cc-5c62-6d6c394ecf9e/0.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-30",
   "ms": 151484,
   "url": "https://music.apple.com/tr/album/70lik/6821947549?i=6821947550&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/53/2a/64/532a64ed-90de-9184-448b-21d59f9d3b0e/mzaf_10072411139812807373.plus.aac.p.m4a",
   "trackArtist": "Şehinşah",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "karanlık, enerjik",
    "energy": 8,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.9,
     "traptr": 0.6,
     "drilltr": 0.2,
     "newmusic": 0.8,
     "nightmode": 0.5,
     "popturkiye": 0.1
    },
    "note": "Şehinşah'ın özgün vokali ve sert prodüksiyonuyla öne çıkan dinamik Türkçe rap çalışması.",
    "tags": [
     "rap",
     "şehinşah",
     "hip-hop"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "weghrumi::alo": {
   "title": "ALO",
   "artistId": "weghrumi",
   "artistName": "wegh Rumi",
   "album": "ALO - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/ac/91/f5/ac91f590-9936-39d7-8fbf-717ed24ed1cd/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-30",
   "ms": 192000,
   "url": "https://music.apple.com/tr/album/alo/6827193278?i=6827193283&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/96/75/2c/96752c70-aa1f-1d73-7eeb-e22e50bf750e/mzaf_2418059643948227014.plus.aac.p.m4a",
   "trackArtist": "Wegh",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "sert, agresif",
    "energy": 8,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.8,
     "traptr": 0.9,
     "drilltr": 0.4,
     "newmusic": 0.8,
     "nightmode": 0.4,
     "popturkiye": 0.1
    },
    "note": "Wegh'in kendine has üslubuyla harmanlanan tempolu ve modern trap tınlaması.",
    "tags": [
     "trap",
     "wegh",
     "sert"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "sila::uşak makamı (elektra)": {
   "title": "Uşak Makamı (Elektra)",
   "artistId": "sila",
   "artistName": "Sıla",
   "album": "Uşak Makamı (Elektra) - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/97/75/d7/9775d7e6-2738-8a9c-5d5d-cbc6c8728c6b/cover.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-30",
   "ms": 238034,
   "url": "https://music.apple.com/tr/album/u%C5%9Fak-makam%C4%B1-elektra/6821101625?i=6821101629&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b9/f8/b9/b9f8b98f-4b53-81d1-12e4-a4ac939a2790/mzaf_8897371133357917895.plus.aac.p.m4a",
   "trackArtist": "Sıla & Tolga Şanlı",
   "isNew": true,
   "intel": {
    "genre": "other",
    "mood": "sakin, melankolik",
    "energy": 4,
    "tempo": "slow",
    "fit": {
     "rapturkiye": 0,
     "traptr": 0,
     "drilltr": 0,
     "newmusic": 0.7,
     "nightmode": 0.7,
     "popturkiye": 0.4
    },
    "note": "Sıla ve Tolga Şanlı'dan makam unsurları barındıran dingin ve enstrümantal ağırlıklı eser.",
    "tags": [
     "akustik",
     "sıla",
     "etnik"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "hidra::fırma": {
   "title": "FIRMA",
   "artistId": "hidra",
   "artistName": "Hidra",
   "album": "FIRMA - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/1a/70/84/1a7084b8-ae7c-617b-0349-c1defc39c8b5/52724.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-29",
   "ms": 158351,
   "url": "https://music.apple.com/tr/album/firma/6827603293?i=6827603295&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/49/7c/2e/497c2e90-69ff-7a5b-f96f-738f900f6754/mzaf_1657670749555327369.plus.aac.p.m4a",
   "trackArtist": "Hidra",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "sert",
    "energy": 8,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.9,
     "traptr": 0.7,
     "drilltr": 0.2,
     "newmusic": 0.8,
     "nightmode": 0.3,
     "popturkiye": 0.1
    },
    "note": "Sert ritimleri ve vurucu sözleriyle öne çıkan yüksek enerjili bir Türkçe rap parçası.",
    "tags": [
     "rap",
     "sert",
     "hiphop"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "cakal::yara izi": {
   "title": "Yara İzi",
   "artistId": "cakal",
   "artistName": "Cakal",
   "album": "Yara İzi - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/00/de/75/00de75c1-f132-f991-3da8-4e2f26081313/711641090311.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-29",
   "ms": 164824,
   "url": "https://music.apple.com/tr/album/yara-i-zi/6825362099?i=6825362412&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/13/7e/b3/137eb365-3172-ab84-9dde-cd5fb8ed2a39/mzaf_14920250883208867611.plus.aac.p.m4a",
   "trackArtist": "Cakal & Zeynep Bastık",
   "isNew": true,
   "intel": {
    "genre": "pop",
    "mood": "melankolik",
    "energy": 5,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.4,
     "traptr": 0.4,
     "drilltr": 0.1,
     "newmusic": 0.9,
     "nightmode": 0.7,
     "popturkiye": 0.8
    },
    "note": "Pop ve trap tınılarını buluşturan duygusal ve akılda kalıcı bir düet parçası.",
    "tags": [
     "pop",
     "duet",
     "melankolik"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  },
  "sehinsah::sodom & gomore": {
   "title": "Sodom & Gomore",
   "artistId": "sehinsah",
   "artistName": "Şehinşah",
   "album": "Sodom & Gomore - Single",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/1c/99/d9/1c99d964-cc19-bd4b-dd07-1cc6adfac479/0.jpg/600x600bb.jpg",
   "releaseDate": "2026-10-23",
   "ms": 178025,
   "url": "https://music.apple.com/tr/album/sodom-gomore/6819328307?i=6819328316&uo=4",
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6f/a3/dc/6fa3dc73-81af-c3d3-f9bb-28dc4ed638b1/mzaf_16281985597293035163.plus.aac.p.m4a",
   "trackArtist": "Şehinşah & Hidra",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "Agresif ve Karanlık",
    "energy": 10,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.95,
     "traptr": 0.85,
     "drilltr": 0.2,
     "newmusic": 0.8,
     "nightmode": 0.2,
     "popturkiye": 0
    },
    "note": "Agresif lirikalite ve yüksek tempolu altyapıyla öne çıkan sert bir rap düeti.",
    "tags": [
     "agresif",
     "sert rap",
     "düet"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  }
 }
};
})(window.K = window.K || {});
