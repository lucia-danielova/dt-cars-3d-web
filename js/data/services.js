export const COMPANY_INFO = {
  name: "D&T CARS s.r.o.",
  address: "Kočánková 7, 851 04 Bratislava - Petržalka",
  phones: ["0905 228 241", "0908 745 865", "02 62316259"],
  email: "dtcars@dtcars.sk",
  mapUrl: "https://maps.google.com/?q=Kočánková+7,+851+04+Bratislava"
};

export const SERVICES = [
  {
    id: "autoservis",
    title: "Autoservis",
    category: "Servisné práce",
    zoneId: "engine",
    description: "Kompletná údržba, diagnostika motora, podvozku, výmena oleja, filtrov, brzdových platničiek a opravy vozidiel."
  },
  {
    id: "plnenie-klimatizacii",
    title: "Plnenie klimatizácií",
    category: "Servisné práce",
    zoneId: "engine",
    description: "Kontrola tesnosti klimatizačného systému, odsatie starého chladiva, vákuovanie a doplnenie chladiva aj oleja."
  },
  {
    id: "dezinfekcia-ozonom",
    title: "Dezinfekcia klimatizácií ozónom",
    category: "Servisné práce",
    zoneId: "cabin",
    description: "Hĺbková dezinfekcia interiéru a výduchov ventilácie ozónom – odstránenie baktérií, plesní, vírusov a zápachu."
  },
  {
    id: "pneuservis",
    title: "Pneuservis",
    category: "Kolesá & Pneumatiky",
    zoneId: "wheels",
    description: "Sezónne prezúvanie osobných a SUV vozidiel, presné vyvažovanie kolies a opravy defektov."
  },
  {
    id: "uskladnenie-pneumatik",
    title: "Uskladnenie pneumatík",
    category: "Kolesá & Pneumatiky",
    zoneId: "wheels",
    description: "Bezpečné a profesionálne sezónne uskladnenie vašich pneumatík alebo kompletných sád kolies."
  },
  {
    id: "predaj-pneumatik",
    title: "Predaj pneumatík",
    category: "Predaj sortimentu",
    zoneId: "wheels",
    description: "Široký výber letných, zimných a celoročných pneumatík pre všetky typy osobných a úžitkových vozidiel."
  },
  {
    id: "predaj-diskov",
    title: "Predaj diskov",
    category: "Predaj sortimentu",
    zoneId: "wheels",
    description: "Predaj kvalitných hliníkových (ALU) aj plechových diskov vrátane poradenstva pri výbere rozmerov."
  },
  {
    id: "predaj-nahradnych-dielov",
    title: "Predaj náhradných dielov",
    category: "Predaj sortimentu",
    zoneId: "exhaust",
    description: "Rýchle dodanie originálnych aj kvalitných alternatívnych náhradných dielov pre všetky značky áut."
  }
];

export const DIAGNOSTIC_ZONES = {
  engine: {
    id: "engine",
    label: "Motor, chladenie & klíma",
    badge: "Zóna 1 — Predná časť",
    action: "openHood",
    cameraPos: [2.4, 1.9, 3.2],
    cameraTarget: [0, 0.75, 1.2],
    serviceIds: ["autoservis", "plnenie-klimatizacii", "predaj-nahradnych-dielov"],
    symptoms: [
      "Svieti kontrolka motora",
      "Klíma slabo chladí / nechladí",
      "Nezvyčajný zvuk z motorového priestoru",
      "Výmena oleja, filtrov alebo rozvodov"
    ]
  },
  wheels: {
    id: "wheels",
    label: "Kolesá, pneumatiky, disky & brzdy",
    badge: "Zóna 2 — Podvozok & Kolesá",
    action: "inspectWheels",
    cameraPos: [3.6, 1.3, 1.8],
    cameraTarget: [0.9, 0.45, 0.4],
    serviceIds: ["pneuservis", "uskladnenie-pneumatik", "predaj-pneumatik", "predaj-diskov"],
    symptoms: [
      "Sezónne prezutie a vyváženie",
      "Defekt alebo únik tlaku v pneumatike",
      "Pískanie alebo vibrácie pri brzdení",
      "Dopyt na nové pneumatiky / disky"
    ]
  },
  cabin: {
    id: "cabin",
    label: "Interiér & Ventilácia",
    badge: "Zóna 3 — Kabína vozidla",
    action: "openDoors",
    cameraPos: [2.7, 1.7, 0.2],
    cameraTarget: [0, 0.85, 0.0],
    serviceIds: ["dezinfekcia-ozonom", "plnenie-klimatizacii", "autoservis"],
    symptoms: [
      "Zápach z klimatizácie / ventilácie",
      "Dezinfekcia interiéru ozónom",
      "Zahmlievanie okien / výmena kabínového filtra"
    ]
  },
  exhaust: {
    id: "exhaust",
    label: "Zadná náprava, výfuk & diely",
    badge: "Zóna 4 — Zadná časť",
    action: "openTrunk",
    cameraPos: [-2.6, 1.6, -3.2],
    cameraTarget: [0, 0.65, -1.3],
    serviceIds: ["autoservis", "predaj-nahradnych-dielov"],
    symptoms: [
      "Hlučný výfuk alebo klepanie vzadu",
      "Búchanie zadnej nápravy na nerovnostiach",
      "Objednávka konkrétneho náhradného dielu"
    ]
  }
};