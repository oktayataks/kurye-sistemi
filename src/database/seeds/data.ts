import { VehicleType } from '../../couriers/courier.entity';

export const ADMIN = {
  email: 'admin@demo.com',
  password: 'admin123',
  fullName: 'Sistem Yöneticisi',
  phone: '05550000000',
};

export interface RestaurantSeed {
  ownerEmail: string;
  ownerFullName: string;
  ownerPhone: string;
  password: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

export const RESTAURANTS: RestaurantSeed[] = [
  {
    ownerEmail: 'pizzapalace@demo.com',
    ownerFullName: 'Mehmet Yılmaz',
    ownerPhone: '05551110001',
    password: 'demo123',
    name: 'Pizza Palace',
    address: 'Barbaros Bulvarı No:34, Beşiktaş, İstanbul',
    phone: '02122223344',
    latitude: 41.0431,
    longitude: 29.0064,
  },
  {
    ownerEmail: 'burgerhouse@demo.com',
    ownerFullName: 'Ali Demir',
    ownerPhone: '05551110002',
    password: 'demo123',
    name: 'Burger House',
    address: 'Bağdat Caddesi No:128, Kadıköy, İstanbul',
    phone: '02163334455',
    latitude: 40.9905,
    longitude: 29.0235,
  },
  {
    ownerEmail: 'sushimaster@demo.com',
    ownerFullName: 'Ayşe Kaya',
    ownerPhone: '05551110003',
    password: 'demo123',
    name: 'Sushi Master',
    address: 'Halaskargazi Caddesi No:88, Şişli, İstanbul',
    phone: '02124445566',
    latitude: 41.0602,
    longitude: 28.9874,
  },
  {
    ownerEmail: 'kebapci@demo.com',
    ownerFullName: 'Mustafa Öztürk',
    ownerPhone: '05551110004',
    password: 'demo123',
    name: 'Kebapçı Mehmet',
    address: 'İncirli Caddesi No:55, Bakırköy, İstanbul',
    phone: '02125556677',
    latitude: 40.9758,
    longitude: 28.8722,
  },
  {
    ownerEmail: 'lezzetkosesi@demo.com',
    ownerFullName: 'Fatma Şahin',
    ownerPhone: '05551110005',
    password: 'demo123',
    name: 'Lezzet Köşesi',
    address: 'İstiklal Caddesi No:212, Beyoğlu, İstanbul',
    phone: '02126667788',
    latitude: 41.0369,
    longitude: 28.9777,
  },
];

export interface CourierSeed {
  email: string;
  fullName: string;
  phone: string;
  password: string;
  vehicleType: VehicleType;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  rating: number;
}

export const COURIERS: CourierSeed[] = [
  {
    email: 'kurye1@demo.com',
    fullName: 'Ahmet Kara',
    phone: '05552220001',
    password: 'demo123',
    vehicleType: VehicleType.MOTORBIKE,
    latitude: 41.0451,
    longitude: 29.0094,
    isOnline: true,
    rating: 4.8,
  },
  {
    email: 'kurye2@demo.com',
    fullName: 'Hasan Çelik',
    phone: '05552220002',
    password: 'demo123',
    vehicleType: VehicleType.MOTORBIKE,
    latitude: 40.9925,
    longitude: 29.0265,
    isOnline: true,
    rating: 4.6,
  },
  {
    email: 'kurye3@demo.com',
    fullName: 'Emre Doğan',
    phone: '05552220003',
    password: 'demo123',
    vehicleType: VehicleType.BIKE,
    latitude: 41.0612,
    longitude: 28.9894,
    isOnline: true,
    rating: 4.9,
  },
  {
    email: 'kurye4@demo.com',
    fullName: 'Yusuf Aydın',
    phone: '05552220004',
    password: 'demo123',
    vehicleType: VehicleType.CAR,
    latitude: 40.9778,
    longitude: 28.8742,
    isOnline: true,
    rating: 4.4,
  },
  {
    email: 'kurye5@demo.com',
    fullName: 'Burak Aslan',
    phone: '05552220005',
    password: 'demo123',
    vehicleType: VehicleType.MOTORBIKE,
    latitude: 41.0389,
    longitude: 28.9797,
    isOnline: true,
    rating: 4.7,
  },
  {
    email: 'kurye6@demo.com',
    fullName: 'Selim Koç',
    phone: '05552220006',
    password: 'demo123',
    vehicleType: VehicleType.BIKE,
    latitude: 41.0289,
    longitude: 28.9999,
    isOnline: true,
    rating: 4.3,
  },
  {
    email: 'kurye7@demo.com',
    fullName: 'Kerim Polat',
    phone: '05552220007',
    password: 'demo123',
    vehicleType: VehicleType.MOTORBIKE,
    latitude: 41.0501,
    longitude: 29.0151,
    isOnline: true,
    rating: 4.5,
  },
  {
    email: 'kurye8@demo.com',
    fullName: 'Murat Arslan',
    phone: '05552220008',
    password: 'demo123',
    vehicleType: VehicleType.CAR,
    latitude: 41.0185,
    longitude: 28.9650,
    isOnline: false,
    rating: 4.1,
  },
  {
    email: 'kurye9@demo.com',
    fullName: 'Onur Türk',
    phone: '05552220009',
    password: 'demo123',
    vehicleType: VehicleType.BIKE,
    latitude: 40.9650,
    longitude: 29.0890,
    isOnline: false,
    rating: 4.0,
  },
  {
    email: 'kurye10@demo.com',
    fullName: 'Cem Güler',
    phone: '05552220010',
    password: 'demo123',
    vehicleType: VehicleType.MOTORBIKE,
    latitude: 41.0780,
    longitude: 28.9750,
    isOnline: false,
    rating: 4.2,
  },
];

export const CUSTOMER_FIRST_NAMES = [
  'Zeynep',
  'Elif',
  'Mehmet',
  'Ali',
  'Ayşe',
  'Fatma',
  'Mustafa',
  'Hasan',
  'Hüseyin',
  'İbrahim',
  'Selin',
  'Deniz',
  'Cansu',
  'Berk',
  'Ece',
  'Kerem',
  'Buse',
  'Eren',
  'Yasin',
  'Beyza',
];

export const CUSTOMER_LAST_NAMES = [
  'Yıldız',
  'Aksoy',
  'Şen',
  'Erdoğan',
  'Korkmaz',
  'Çetin',
  'Yılmaz',
  'Demir',
  'Kaya',
  'Şahin',
  'Öztürk',
  'Arslan',
  'Doğan',
  'Aydın',
  'Polat',
  'Koç',
  'Tekin',
  'Bulut',
  'Güneş',
  'Acar',
];

export const STREETS = [
  'Atatürk Caddesi',
  'Cumhuriyet Caddesi',
  'İstiklal Sokak',
  'Mimar Sinan Caddesi',
  'Fevzi Çakmak Sokak',
  'Bağlar Sokak',
  'Yıldız Caddesi',
  'Gül Sokak',
  'Lale Caddesi',
  'Menekşe Sokak',
  'Çiçek Sokak',
  'Defne Caddesi',
  'Söğüt Sokak',
  'Çınar Caddesi',
  'Akasya Sokak',
];

export const NEIGHBORHOODS = [
  { name: 'Etiler, Beşiktaş', lat: 41.0810, lng: 29.0335 },
  { name: 'Levent, Beşiktaş', lat: 41.0820, lng: 29.0125 },
  { name: 'Caddebostan, Kadıköy', lat: 40.9685, lng: 29.0625 },
  { name: 'Moda, Kadıköy', lat: 40.9846, lng: 29.0259 },
  { name: 'Mecidiyeköy, Şişli', lat: 41.0670, lng: 28.9930 },
  { name: 'Nişantaşı, Şişli', lat: 41.0497, lng: 28.9930 },
  { name: 'Florya, Bakırköy', lat: 40.9760, lng: 28.7894 },
  { name: 'Ataköy, Bakırköy', lat: 40.9850, lng: 28.8474 },
  { name: 'Cihangir, Beyoğlu', lat: 41.0301, lng: 28.9841 },
  { name: 'Galata, Beyoğlu', lat: 41.0257, lng: 28.9740 },
  { name: 'Maslak, Sarıyer', lat: 41.1100, lng: 29.0200 },
  { name: 'Bebek, Beşiktaş', lat: 41.0788, lng: 29.0419 },
];

export const ORDER_NOTES = [
  'Kapıda nakit ödeme',
  'Zile basmayın, kapıyı çalın',
  'Apartman girişine bırakabilirsiniz',
  'Ekstra peçete lütfen',
  'Acılı olmasın',
  'İçecek soğuk olsun',
  null,
  null,
  null,
];
