# 🛵 Kurye Yönetim Sistemi

Restoran siparişlerini kuryelere otomatik atayan, gerçek zamanlı takip eden tam yığın bir kurye yönetim platformu. **NestJS + PostgreSQL** backend, **React + Vite + Tailwind** frontend.

---

## ✨ Özellikler

### Yönetim Paneli (Admin)

- **Dashboard** – Canlı KPI, son 7 gün sipariş grafiği, durum dağılımı pasta grafiği, son 10 siparişin canlı listesi
- **Restoran Yönetimi** – CRUD, aktif/pasif toggle, arama, sayfalama
- **Kurye Yönetimi** – Online/offline, araç tipi filtreleri; harita üzerinde konum modali; yıldızlı puanlama
- **Sipariş Yönetimi** – Durum filtreleri, restoran/tarih filtreleri, manuel/otomatik kurye atama, durum geçiş matrisi, harita üzerinde rota
- **Otomatik Kurye Atama** – Mesafe (Haversine) + yük + puan skoruna dayalı algoritma
- **Canlı Harita** – Restoranlar, çevrimiçi kuryeler ve aktif teslimat noktaları; her 5 sn'de polling

### Restoran Paneli

- **Restoran Dashboard** – Bugünkü sipariş, bekleyen, teslim edilen, ortalama teslimat süresi
- **Yeni Sipariş** – Müşteri bilgileri, harita ile konum seçimi, adres araması (Nominatim), tek tıkla kurye çağırma
- **Siparişlerim** – Tarih (bugün/hafta/ay) ve durum filtreleri, ciro istatistiği

### Genel

- 🔐 JWT tabanlı kimlik doğrulama (admin / restaurant / courier rolleri)
- 🌗 Toast bildirimleri ve global hata yakalama
- 💀 Skeleton loader'lar
- 📱 Responsive (mobilde hamburger menü, tablo yatay scroll)
- ✅ Tüm formlarda client-side validation (react-hook-form)

---

## 🧰 Teknoloji Yığını

**Backend**

- [NestJS 11](https://nestjs.com/) — modüler, decorator tabanlı framework
- [TypeORM](https://typeorm.io/) + PostgreSQL
- JWT ([@nestjs/jwt](https://github.com/nestjs/jwt)) + Passport
- bcrypt, class-validator, class-transformer
- Swagger UI (`/api/docs`)

**Frontend**

- React 19 + Vite + TypeScript
- TanStack Query 5 (data fetching, polling, cache)
- React Router 7
- React Hook Form (form & validation)
- React Toastify (notifications)
- React Leaflet (haritalar) + OpenStreetMap
- Tailwind CSS 4
- Recharts (grafikler)

---

## 🚀 Hızlı Başlangıç (Docker — Önerilen)

Tek komutla tüm bileşenler ayağa kalkar.

```bash
# 1) Repoyu klonlayın
git clone <repo-url>
cd kurye-sistemi

# 2) (Opsiyonel) ortam değişkenlerini özelleştirin
cp .env.example .env

# 3) Tüm servisleri başlatın
docker-compose up -d --build

# 4) Demo veriyi yükleyin
docker-compose exec backend node dist/database/seeds/seed.js
```

Hazır:

| Servis | URL |
| --- | --- |
| 🌐 Frontend | <http://localhost:5173> |
| 🔌 Backend API | <http://localhost:3000/api/v1> |
| 📚 Swagger | <http://localhost:3000/api/docs> |
| 🗄️ Postgres | `localhost:5432` |

Durdurmak için: `docker-compose down`.
Veriyi tamamen silmek için: `docker-compose down -v`.

---

## 💻 Yerel Geliştirme (Docker'sız)

### Gereksinimler

- Node.js 20+
- PostgreSQL 14+
- npm

### 1. Backend kurulumu

```bash
# Bağımlılıklar
npm install

# .env dosyası
cp .env.example .env
# DB bilgilerinizi kendi makinenize göre düzenleyin

# Veritabanını oluşturun (psql ya da pgAdmin ile)
createdb kurye_sistemi

# Geliştirme modunda çalıştırın (TypeORM synchronize ile şema otomatik oluşur)
npm run start:dev
```

Backend artık <http://localhost:3000/api/v1> adresinde dinliyor.
Swagger UI: <http://localhost:3000/api/docs>

### 2. Demo veriyi yükleyin

```bash
npm run seed
```

> Bu komut tüm tabloları temizler ve aşağıdaki verileri yükler.

### 3. Frontend kurulumu

Yeni bir terminalde:

```bash
cd admin
npm install
npm run dev
```

Frontend <http://localhost:5173> adresinde açılır.

---

## 🔐 Demo Kullanıcı Bilgileri

`npm run seed` çalıştırıldıktan sonra bu hesaplarla giriş yapabilirsiniz.

| Rol | E-posta | Şifre | Yönlendirilen Panel |
| --- | --- | --- | --- |
| 👨‍💼 **Admin** | `admin@demo.com` | `admin123` | `/` (Yönetim) |
| 🍽️ **Restoran** | `pizzapalace@demo.com` | `demo123` | `/restaurant` |
| 🍽️ Restoran | `burgerhouse@demo.com` | `demo123` | `/restaurant` |
| 🍽️ Restoran | `sushimaster@demo.com` | `demo123` | `/restaurant` |
| 🍽️ Restoran | `kebapci@demo.com` | `demo123` | `/restaurant` |
| 🍽️ Restoran | `lezzetkosesi@demo.com` | `demo123` | `/restaurant` |
| 🛵 Kurye | `kurye1@demo.com` … `kurye10@demo.com` | `demo123` | (panel henüz yok) |

Toplam: **1 admin, 5 restoran, 10 kurye** (7 online), **20 sipariş** (5 farklı durumda).

---

## 📜 Komut Referansı

### Kök dizin (Backend)

| Komut | Açıklama |
| --- | --- |
| `npm install` | Bağımlılıkları yükler |
| `npm run start:dev` | Watch modda başlatır |
| `npm run start:prod` | Compile edilmiş `dist`'i çalıştırır |
| `npm run build` | TypeScript'i derler (`dist/`) |
| `npm run seed` | DB'yi sıfırlar ve demo veriyi yükler |
| `npm run lint` | ESLint çalıştırır |
| `npm test` | Jest birim testleri |

### `admin/` dizini (Frontend)

| Komut | Açıklama |
| --- | --- |
| `npm install` | Bağımlılıkları yükler |
| `npm run dev` | Vite dev server (HMR) |
| `npm run build` | Production build (`dist/`) |
| `npm run preview` | Build'i lokal olarak servis eder |
| `npm run lint` | ESLint çalıştırır |

---

## 📁 Proje Yapısı

```text
kurye-sistemi/
├── src/                      # NestJS backend
│   ├── auth/                 # JWT auth + guards
│   ├── users/                # Kullanıcı CRUD
│   ├── restaurants/          # Restoran CRUD
│   ├── couriers/             # Kurye CRUD + konum/durum
│   ├── orders/               # Sipariş + atama algoritması
│   ├── common/               # Ortak DTO/interface'ler
│   ├── database/seeds/       # Demo veri seed scriptleri
│   ├── app.module.ts
│   └── main.ts
├── admin/                    # React + Vite frontend
│   └── src/
│       ├── components/       # Layout, Sidebar, Navbar, ortak UI
│       ├── pages/            # Login, Dashboard, Restaurants, Couriers, Orders, LiveMap, Restaurant/*
│       ├── hooks/            # useAuth, useMyRestaurant
│       ├── services/api.ts   # axios instance + tüm endpoint client'ları
│       ├── types/
│       └── utils/helpers.ts
├── Dockerfile                # Backend imajı
├── admin/Dockerfile          # Frontend imajı (nginx)
├── admin/nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🧠 Otomatik Atama Algoritması

Bekleyen bir sipariş için en uygun kurye, üç skorun ağırlıklı toplamı ile seçilir:

```text
totalScore = 0.5 × distanceScore   // Restoran ↔ kurye mesafesi (Haversine)
           + 0.3 × loadScore       // Mevcut aktif sipariş sayısı (az olan kazanır)
           + 0.2 × ratingScore     // Yıldız puanı (0–5)
```

Endpoint: `POST /api/v1/orders/:id/assign` — yanıt olarak skor breakdown'u da döner.

---

## 🌐 API Belgeleri

Sunucu ayağa kalktığında interaktif Swagger UI:

- **<http://localhost:3000/api/docs>**

Önemli endpoint'ler:

| Endpoint | Açıklama |
| --- | --- |
| `POST /auth/register` | Yeni kullanıcı kaydı |
| `POST /auth/login` | Giriş — JWT döner |
| `GET /auth/me` | Aktif kullanıcı bilgisi |
| `GET /restaurants` | Restoran listesi (sayfalı) |
| `GET /couriers?isOnline=true` | Kurye listesi (filtreli) |
| `GET /orders` | Sipariş listesi (status, restaurantId, courierId filtreleri) |
| `POST /orders` | Yeni sipariş oluştur |
| `POST /orders/:id/assign` | Otomatik kurye ata |
| `PATCH /orders/:id/status` | Durumu değiştir (manuel atama dahil) |

---

## 🛠️ Sorun Giderme

### Backend "ECONNREFUSED" verirse

PostgreSQL çalışmıyor olabilir. `pg_isready -h localhost -p 5432` ile kontrol edin.

### Frontend "Network Error" gösterirse

- Backend'in 3000 portunda çalıştığından emin olun.
- Tarayıcıda `import.meta.env.VITE_API_URL` doğru mu? Yerel için varsayılan `http://localhost:3000/api/v1`.

### `npm run seed` çakışıyorsa

Backend dev server (`npm run start:dev`) açıkken seed çalıştırılabilir; ancak ekstra TypeORM şema güncellemeleri tetiklenir. Kararlılık için dev server'ı kapatıp tekrar deneyin.

### Docker'da `synchronize` kapalıysa şema oluşmaz

Geliştirme için `docker-compose.yml` `NODE_ENV=production` ile çalışır ve `synchronize` üretimde kapalıdır. **İlk kurulumda** geçici olarak `NODE_ENV=development` ile başlatabilir veya `seed` komutu çalıştırılmadan önce manuel şema oluşturabilirsiniz. Hızlı yol:

```bash
# Geçici olarak sync açık başlat
NODE_ENV=development docker-compose up backend
# Şema oluştu → durdur, tekrar production modunda başlat
```

---

## 📝 Lisans

Bu proje öğrenim/portföy amaçlıdır. İsterseniz fork'layabilirsiniz.
