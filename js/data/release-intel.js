/* ============================================================
   KARMA — data/release-intel.js  (OTOMATİK ÜRETİLDİ)
   Son 30 günde çıkan GERÇEK parçalar + AI zenginleştirme alanı.

   Üretici : node tools/fetch-new-releases.js
   Kaynak  : iTunes Lookup API (country=TR) — albüm → parça
   Tarih   : 2026-10-30  ·  19 kayıt (19 tanesi depoda yok)

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
  "asof": "2026-10-30",
  "window": 30,
  "source": "itunes-lookup-tr",
  "count": 19,
  "newCount": 19,
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
  "generated": "2026-10-30T00:46:49.082Z"
 },
 "releases": {
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/09/2a/47/092a47d9-6a68-2f1c-76db-ceded2b823a7/mzaf_5530631931527147371.plus.aac.p.m4a",
   "trackArtist": "Motive",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "iddialı",
    "energy": 8,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.9,
     "traptr": 0.95,
     "drilltr": 0.3,
     "newmusic": 0.85,
     "nightmode": 0.4,
     "popturkiye": 0.1
    },
    "note": "Motive'den sert altyapısı ve iddialı vokaliyle öne çıkan dinamik bir trap parçası.",
    "tags": [
     "trap",
     "türkçe rap",
     "enerjik"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/de/bf/bd/debfbd3b-ca02-e7ff-8fdc-2a5471e0585f/mzaf_4952478229143804545.plus.aac.p.m4a",
   "trackArtist": "Era7capone & KERO",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "agresif",
    "energy": 8,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.85,
     "traptr": 0.9,
     "drilltr": 0.8,
     "newmusic": 0.85,
     "nightmode": 0.2,
     "popturkiye": 0.1
    },
    "note": "Era7capone ve KERO'dan yüksek enerjili, sert ritimlere sahip dinamik bir trap çalışması.",
    "tags": [
     "trap",
     "sert",
     "enerjik"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/af/7e/b6/af7eb6b7-2d10-e75e-3ce5-636757d12bfd/mzaf_1914654235569147348.plus.aac.p.m4a",
   "trackArtist": "Era7capone",
   "isNew": true,
   "intel": {
    "genre": "drill",
    "mood": "Sert ve agresif",
    "energy": 10,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.8,
     "traptr": 0.8,
     "drilltr": 0.9,
     "newmusic": 0.7,
     "nightmode": 0.1,
     "popturkiye": 0
    },
    "note": "Sert drill ritimleri ve sokak temasını öne çıkaran agresif vokal performansı.",
    "tags": [
     "drill",
     "sokak rap",
     "agresif"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/33/29/1a/33291ac7-3039-48e9-5cd8-e89791c642bd/mzaf_4353046306672721026.plus.aac.p.m4a",
   "trackArtist": "Era7capone",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "agresif",
    "energy": 10,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.8,
     "traptr": 0.85,
     "drilltr": 0.6,
     "newmusic": 0.8,
     "nightmode": 0.3,
     "popturkiye": 0.1
    },
    "note": "Era7capone'un enerjik ve karanlık trap tınılarına sahip dinamik parçası.",
    "tags": [
     "trap",
     "sert",
     "gece"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/6f/bd/21/6fbd214e-2f3e-8795-19d5-543faf9cc7a3/mzaf_14350991347007260218.plus.aac.p.m4a",
   "trackArtist": "Era7capone",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "özgüvenli",
    "energy": 10,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.8,
     "traptr": 0.9,
     "drilltr": 0.5,
     "newmusic": 0.8,
     "nightmode": 0.2,
     "popturkiye": 0.1
    },
    "note": "Bipolar albümünden dinamik ve vurucu trap ritimleriyle öne çıkan bir çalışma.",
    "tags": [
     "trap",
     "hit",
     "ritmik"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6b/f1/1b/6bf11b0b-55ae-4802-abb5-712bc08d1cd7/mzaf_3184238368036363135.plus.aac.p.m4a",
   "trackArtist": "Era7capone, MODIE & KERO",
   "isNew": true,
   "intel": {
    "genre": "drill",
    "mood": "sert",
    "energy": 10,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.8,
     "traptr": 0.8,
     "drilltr": 0.85,
     "newmusic": 0.8,
     "nightmode": 0.2,
     "popturkiye": 0.1
    },
    "note": "MODIE ve KERO eşliğinde tempolu ve sokak tınlayan sert bir drill parçası.",
    "tags": [
     "drill",
     "sokak",
     "düet"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/21/23/14/21231491-7b5f-9f44-d9c2-bb40fb1cd186/mzaf_4167762536284651350.plus.aac.p.m4a",
   "trackArtist": "Era7capone & Laçin",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "melankolik",
    "energy": 10,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.7,
     "traptr": 0.75,
     "drilltr": 0.2,
     "newmusic": 0.8,
     "nightmode": 0.8,
     "popturkiye": 0.2
    },
    "note": "Laçin eşliğinde melankolik altyapısı ve duygu yüklü vokalleriyle dikkat çeken parça.",
    "tags": [
     "melankolik",
     "rnb",
     "düet"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/da/00/0d/da000d54-d377-7535-1d5c-1f3f0407984e/mzaf_17527261986400770692.plus.aac.p.m4a",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "öfkeli",
    "energy": 10,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.9,
     "traptr": 0.4,
     "drilltr": 0.2,
     "newmusic": 0.75,
     "nightmode": 0.2,
     "popturkiye": 0.1
    },
    "note": "Joker'in sert flow'ları ve eleştirel sözleriyle öne çıkan protest rap örneği.",
    "tags": [
     "protest",
     "sert rap",
     "flow"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b1/91/45/b19145c6-2feb-2209-8328-d89de6d19fda/mzaf_4420901830767995228.plus.aac.p.m4a",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "karanlık",
    "energy": 10,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.9,
     "traptr": 0.4,
     "drilltr": 0.2,
     "newmusic": 0.75,
     "nightmode": 0.3,
     "popturkiye": 0.1
    },
    "note": "Travma albümünün karanlık atmosferini yansıtan tempolu ve hırslı bir rap parçası.",
    "tags": [
     "turkce rap",
     "hızlı",
     "karanlık"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/cf/84/f1/cf84f161-2fe1-e2f5-6412-c19804909a29/mzaf_1240569258613378214.plus.aac.p.m4a",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "karanlık",
    "energy": 3,
    "tempo": "slow",
    "fit": {
     "rapturkiye": 0.5,
     "traptr": 0.1,
     "drilltr": 0,
     "newmusic": 0.4,
     "nightmode": 0.3,
     "popturkiye": 0
    },
    "note": "Joker'in TRAVMA albümünden konsepti tamamlayan bir skit çalışması.",
    "tags": [
     "skit",
     "turkcerap",
     "joker"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/78/17/a7/7817a769-2911-6b56-53b7-e892d8a7e3bc/mzaf_7460366673436365587.plus.aac.p.m4a",
   "trackArtist": "Reckol & Kuty",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "enerjik",
    "energy": 8,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.7,
     "traptr": 0.9,
     "drilltr": 0.3,
     "newmusic": 0.8,
     "nightmode": 0.4,
     "popturkiye": 0.1
    },
    "note": "Reckol ve Kuty'den dinamik ve tempolu yeni nesil trap parçası.",
    "tags": [
     "trap",
     "reckol",
     "kuty"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b0/80/29/b0802958-dab8-4c9a-94b2-eb2591ada8d4/mzaf_5076638121459485063.plus.aac.p.m4a",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "sert",
    "energy": 7,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.9,
     "traptr": 0.3,
     "drilltr": 0.1,
     "newmusic": 0.7,
     "nightmode": 0.3,
     "popturkiye": 0
    },
    "note": "Joker'den güçlü vokaller ve lirik odaklı sert bir Türkçe rap parçası.",
    "tags": [
     "turkcerap",
     "joker",
     "boombap"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/94/1c/6a/941c6a82-c559-e156-77ca-4576427aa81e/mzaf_363067153605365101.plus.aac.p.m4a",
   "trackArtist": "Wegh",
   "isNew": true,
   "intel": {
    "genre": "trap",
    "mood": "melankolik",
    "energy": 5,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.7,
     "traptr": 0.6,
     "drilltr": 0.2,
     "newmusic": 0.7,
     "nightmode": 0.8,
     "popturkiye": 0.1
    },
    "note": "Wegh'ten melankolik tonda, gece dinlemelerine uygun atmosferik trap.",
    "tags": [
     "wegh",
     "melankolik",
     "trap"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ab/b7/3e/abb73e06-cd39-3c61-8260-cba0433ee347/mzaf_17059353751608700070.plus.aac.p.m4a",
   "trackArtist": "Lia Shine",
   "isNew": true,
   "intel": {
    "genre": "rnb",
    "mood": "hüzünlü",
    "energy": 4,
    "tempo": "slow",
    "fit": {
     "rapturkiye": 0.5,
     "traptr": 0.3,
     "drilltr": 0,
     "newmusic": 0.7,
     "nightmode": 0.9,
     "popturkiye": 0.4
    },
    "note": "Lia Shine'dan duygusal vokaller ve melankolik altyapıyla öne çıkan parça.",
    "tags": [
     "liashine",
     "rnb",
     "melankolik"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/05/f7/7e/05f77ee0-0a78-0cbe-4581-22cd5ba25c08/mzaf_15343480915589519503.plus.aac.p.m4a",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "epik",
    "energy": 6,
    "tempo": "mid",
    "fit": {
     "rapturkiye": 0.6,
     "traptr": 0.2,
     "drilltr": 0.1,
     "newmusic": 0.5,
     "nightmode": 0.3,
     "popturkiye": 0
    },
    "note": "TRAVMA albümünün atmosferini belirleyen anlatı ağırlıklı açılış parçası.",
    "tags": [
     "intro",
     "joker",
     "turkcerap"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
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
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/07/10/7a/07107a1f-509a-daab-b6a6-20e91887645e/mzaf_15465192085017685583.plus.aac.p.m4a",
   "trackArtist": "Joker",
   "isNew": true,
   "intel": {
    "genre": "rap",
    "mood": "agresif",
    "energy": 10,
    "tempo": "fast",
    "fit": {
     "rapturkiye": 0.9,
     "traptr": 0.4,
     "drilltr": 0.2,
     "newmusic": 0.8,
     "nightmode": 0.3,
     "popturkiye": 0.1
    },
    "note": "Sert beat'ler ve karanlık temalar içeren agresif Joker rap parçası.",
    "tags": [
     "sert rap",
     "joker",
     "travma"
    ],
    "model": "gemini-3.5-flash",
    "v": 1
   }
  }
 }
};
})(window.K = window.K || {});
