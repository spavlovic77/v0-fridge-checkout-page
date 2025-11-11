# Fridge Checkout Page - Instant Payment Integration

*Automaticky synchronizované s deploymentami na [v0.app](https://v0.app)*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/spavlovic77s-projects/v0-fridge-checkout-page)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/fzzNkcst2K8)

## Prehľad

Moderná checkout stránka pre e-shop s chladničkami, ktorá implementuje inovatívnu **Instant Payment** metódu podľa slovenských bankových štandardov. Systém využíva mTLS komunikáciu s NOP API a real-time MQTT notifikácie pre okamžité potvrdenie platieb.

## Deployment

Živý projekt: **[https://vercel.com/spavlovic77s-projects/v0-fridge-checkout-page](https://vercel.com/spavlovic77s-projects/v0-fridge-checkout-page)**

---

## 📋 Technické Špecifikácie

Implementácia je založená na nasledujúcich štandardoch:
- **Payment Link Standard v1.3** - Štandard platobných linkov
- **NOP Lite Integration Manual** - Integračný manuál pre NOP API
- **Standard for Push Payment Notification** - MQTT notifikácie

---

## 🏗️ Architektúra Systému

### Backend Komponenty

1. **NOP API Client** (`lib/nop-client.ts`)
   - mTLS autentifikácia s NOP API
   - Generovanie transaction ID (EndToEndId)
   - Endpoint: `https://api-erp-i.kverkom.sk`

2. **MQTT Subscribe Handler** (`app/api/instant-payment/subscribe/route.ts`)
   - Long-running request pre MQTT subscription
   - Čaká na payment notifikáciu až 60 sekúnd
   - Automatické pripojenie a odpojenie

3. **Payment Link Generator** (`lib/payment-link.ts`)
   - Generuje payment linky podľa Payment Link Standard v1.3
   - Format: `https://payme.sk/?V=1&IBAN=...&AM=...`
   - Automatické pridanie aktuálneho dátumu

4. **Certificate Parser** (`lib/certificate-utils.ts`)
   - Parsuje X.509 certifikáty pomocou node-forge
   - Extrahuje VATSK a POKLADNICA hodnoty
   - Validuje formát certifikátu

5. **QR Code Generator** (`lib/qrcode-generator.ts`)
   - Generuje QR kódy pre desktop používateľov
   - PAY by square kompatibilné

### API Endpointy

**1. POST `/api/instant-payment/init`**
- Inicializuje novú platbu
- Volá NOP API pre transaction ID
- Vracia payment link a údaje o zariadení

**2. POST `/api/instant-payment/subscribe`**
- Subscribne sa na MQTT topic pre konkrétnu transakciu
- Čaká na payment notifikáciu
- Timeout: 60 sekúnd

---

## 🔧 Inštalačný Návod

### Krok 1: Klónovanie Repozitára

\`\`\`bash
git clone https://github.com/spavlovic77/v0-fridge-checkout-page.git
cd v0-fridge-checkout-page
\`\`\`

### Krok 2: Inštalácia Závislostí

\`\`\`bash
npm install
\`\`\`

Projekt používa tieto kľúčové knižnice:
- `mqtt` - MQTT client pre Node.js
- `node-forge` - Parsing X.509 certifikátov
- `qrcode` - Generovanie QR kódov

### Krok 3: Konfigurácia Certifikátov

#### 3.1 Získanie Certifikátov

Pre integráciu s NOP API potrebujete nasledujúce certifikáty:

1. **Klientsky certifikát** (`KVERKOM_CLIENT_CERT`)
   - Pre pokladnice: rovnaký certifikát ako pre eKasa systém
   - Musí obsahovať v Subject CN poli: `CN = VATSK-XXXXXXXXXX POKLADNICA XXXXXXXXXXXXXX`
   - Alternatívne: POKLADNICA môže byť v OU poli

2. **Privátny kľúč** (`KVERKOM_CLIENT_KEY`)
   - Privátny kľúč ku klientskemu certifikátu

3. **CA Bundle** (`KVERKOM_CA_BUNDLE`)
   - Certifikáty certifikačných autorít
   - Akceptované: DigiCert Global Root G2, GeoTrust TLS RSA CA G1

#### 3.2 Nastavenie Environment Variables

Na **Vercel** (Production):

1. Otvorte projekt na Vercel Dashboard
2. Prejdite do **Settings → Environment Variables**
3. Pridajte nasledujúce premenné:

\`\`\`bash
# Klientsky certifikát (celý obsah PEM súboru)
KVERKOM_CLIENT_CERT=-----BEGIN CERTIFICATE-----
MIIFxzCCBK+gAwIBAgIQD...
...celý certifikát...
-----END CERTIFICATE-----

# Privátny kľúč (celý obsah PEM súboru)
KVERKOM_CLIENT_KEY=-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhki...
...celý kľúč...
-----END PRIVATE KEY-----

# CA Bundle (celý obsah PEM súboru)
KVERKOM_CA_BUNDLE=-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAg...
...všetky CA certifikáty...
-----END CERTIFICATE-----
\`\`\`

**Dôležité poznámky:**
- Skopírujte **celý obsah** PEM súborov vrátane BEGIN/END riadkov
- Zachovajte všetky nové riadky v certifikátoch
- Environment variables musia byť dostupné v **Production** aj **Preview** prostredí

Pre **lokálny vývoj**:

\`\`\`bash
# Vytvorte .env.local súbor
cp .env.example .env.local
\`\`\`

Upravte `.env.local` a pridajte certifikáty rovnakým spôsobom.

#### 3.3 Verifikácia Formátu Certifikátu

Váš klientsky certifikát musí obsahovať:

\`\`\`
Subject: C = SK, OU = 88812345678900001, CN = VATSK-1234567890 POKLADNICA 88812345678900001
\`\`\`

**Extrahovanie údajov:**

- **VATSK**: Číselná hodnota za `VATSK-` v CN poli
  - Príklad: `VATSK-1234567890` → extrahovane: `1234567890`
  
- **POKLADNICA**: Číselná hodnota v OU poli ALEBO za `POKLADNICA` v CN poli
  - Príklad z OU: `88812345678900001`
  - Príklad z CN: `POKLADNICA 88812345678900001` → extrahovane: `88812345678900001`

**Testovanie parsingu certifikátu:**

Systém automaticky vypíše do konzoly:
\`\`\`
[v0] 📜 Parsing certificate...
[v0] Certificate length: XXXX
[v0] Contains BEGIN CERTIFICATE: true/false
[v0] 📋 Parsed certificate data: { vatsk: 'XXXXXXXXXX', pokladnica: 'XXXXXXXXXXXXXX' }
\`\`\`

### Krok 4: Pochopenie MQTT Subscription Flow

#### 4.1 Ako Funguje MQTT Subscription

**Topic Formát:**
\`\`\`
VATSK-{vatsk}/POKLADNICA-{pokladnica}/QR-{transactionId}
\`\`\`

**Príklad:**
\`\`\`
VATSK-1234567890/POKLADNICA-88812345678900001/QR-ab29e346f1d841c8a95a63d857490818
\`\`\`

#### 4.2 MQTT Broker Konfigurácia

- **Host**: `mqtt-i.kverkom.sk` (hardcoded v kóde)
- **Port**: `8883` (TLS)
- **Protokol**: MQTT 3.1.1
- **Autentifikácia**: mTLS pomocou klientskych certifikátov
- **QoS**: 1 (at least once delivery)
- **Keep Alive**: 60 sekúnd

#### 4.3 Subscribe Endpoint Logika

Súbor: `app/api/instant-payment/subscribe/route.ts`

**Proces:**

1. **Prijatie parametrov:**
   \`\`\`typescript
   POST /api/instant-payment/subscribe
   Body: {
     transactionId: "QR-xxx",
     vatsk: "1234567890",
     pokladnica: "88812345678900001"
   }
   \`\`\`

2. **Vytvorenie MQTT topic:**
   \`\`\`typescript
   const topic = `VATSK-${vatsk}/POKLADNICA-${pokladnica}/${transactionId}`
   \`\`\`

3. **MQTT Connection:**
   \`\`\`typescript
   const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
     cert: clientCert,
     key: clientKey,
     ca: caBundle,
     rejectUnauthorized: true,
     keepalive: 60,
     connectTimeout: 30000
   })
   \`\`\`

4. **Subscribe na topic:**
   \`\`\`typescript
   client.subscribe(topic, { qos: 1 })
   \`\`\`

5. **Čakanie na správu:**
   - Endpoint zostáva otvorený až 60 sekúnd
   - Ak príde MQTT notifikácia, vráti sa okamžite
   - Timeout po 60 sekundách

6. **Console logy:**
   \`\`\`
   [v0] 🎯 MQTT Subscribe route called
   [v0] 📦 Received parameters: { transactionId, vatsk, pokladnica }
   [v0] 🔗 Connecting to MQTT broker...
   [v0] ✅ Connected to MQTT broker
   [v0] 📡 Subscribing to topic: VATSK-XXX/POKLADNICA-XXX/QR-XXX
   [v0] 📨 Received MQTT message on topic: ...
   [v0] 💰 Payment notification received
   \`\`\`

### Krok 5: Generovanie Transaction ID

#### 5.1 NOP API Endpoint

Súbor: `app/api/instant-payment/init/route.ts`

**NOP API Call:**
\`\`\`typescript
POST https://api-erp-i.kverkom.sk/api/v1/generateNewTransactionId
Headers:
  - Content-Type: application/json
mTLS: Klientsky certifikát + key
\`\`\`

**Response:**
\`\`\`json
{
  "transaction_id": "QR-01c40ef8bb2541659c2bd4abfb6a9964",
  "created_at": "2025-01-11T20:17:30.345Z"
}
\`\`\`

#### 5.2 Console Logy

Pri úspešnom volaní:
\`\`\`
[v0] 🚀 NOP API Request to: https://api-erp-i.kverkom.sk/api/v1/generateNewTransactionId
[v0] ✅ NOP API Response: { transaction_id: "QR-xxx", created_at: "..." }
\`\`\`

Pri chybe:
\`\`\`
[v0] ❌ NOP API Error: Error details...
[v0] Certificates missing or invalid
\`\`\`

### Krok 6: Spustenie Aplikácie

#### Development:
\`\`\`bash
npm run dev
\`\`\`

Aplikácia beží na `http://localhost:3000`

#### Production Build:
\`\`\`bash
npm run build
npm start
\`\`\`

### Krok 7: Testovanie Payment Flow

#### 7.1 Desktop Flow

1. Otvorte aplikáciu v browseri
2. Vyplňte dodacie údaje (alebo použite predvyplnené)
3. Vyberte "Instant payment"
4. Kliknite "Dokončiť nákup"
5. **Zobrazí sa QR kód**
6. Naskenujte QR kód mobilnou bankou
7. Potvrďte platbu v bankovej aplikácii
8. Systém automaticky dostane MQTT notifikáciu
9. Zobrazí sa success obrazovka

**Console logy pri QR zobrazení:**
\`\`\`
[v0] 📱 Device detected: desktop
[v0] 🎨 Generating QR code...
[v0] ✅ QR code generated successfully
\`\`\`

#### 7.2 Mobile Flow

1. Otvorte aplikáciu na mobile
2. Vyberte "Instant payment"
3. Kliknite "Dokončiť nákup"
4. **Automaticky sa otvorí banková aplikácia** (deep link)
5. Potvrďte platbu
6. Vráťte sa do checkout stránky
7. Systém automaticky dostane MQTT notifikáciu
8. Zobrazí sa success obrazovka

**Console logy pri mobile redirect:**
\`\`\`
[v0] 📱 Device detected: mobile (iOS/Android)
[v0] 🔗 Redirecting to banking app...
[v0] Payment link: https://payme.sk/?V=1&IBAN=...
\`\`\`

---

## 🔍 Debugging Guide

### Problém: Certificate parsing zlyhá

**Symptóm:**
\`\`\`
[v0] ❌ Missing certificate data - cannot subscribe to MQTT
[v0] Certificate data: null
\`\`\`

**Riešenie:**
1. Skontrolujte formát certifikátu v environment variables
2. Uistite sa, že certifikát obsahuje BEGIN/END riadky
3. Skontrolujte CN a OU polia:
   \`\`\`bash
   openssl x509 -in cert.pem -noout -subject
   \`\`\`

### Problém: MQTT connection zlyhá

**Symptóm:**
\`\`\`
[v0] ❌ MQTT connection error: ECONNREFUSED
\`\`\`

**Riešenie:**
1. Skontrolujte, či sú certifikáty správne nastavené
2. Overte MQTT host a port (hardcoded: `mqtt-i.kverkom.sk:8883`)
3. Skontrolujte firewall pravidlá

### Problém: NOP API SSL handshake failure

**Symptóm:**
\`\`\`
Error: ssl/tls alert handshake failure
\`\`\`

**Riešenie:**
1. Certifikát nie je validný pre mTLS
2. Private key nesedí k certifikátu
3. CA bundle neobsahuje správne root certifikáty

### Problém: Deep link nefunguje na mobile

**Symptóm:**
Payment link sa otvorí v browseri namiesto banking app

**Riešenie:**
1. Skontrolujte formát payment linku (musí začínať `https://payme.sk/`)
2. Uistite sa, že používateľ má nainštalovanú bankovú aplikáciu
3. Niektoré browsery blokujú automatické redirecty

---

## 📚 Ďalšie Informácie

### Štandardy a Dokumentácia

- Payment Link Standard v1.3
- NOP Lite Integration Manual
- Standard for Push Payment Notification

### Production Checklist

- ✅ Nasaďte validné produkčné certifikáty
- ✅ Zmeňte API endpoints na produkčné
- ✅ Implementujte databázu pre transaction tracking
- ✅ Pridajte retry logiku pre API calls
- ✅ Monitorujte MQTT connection health
- ✅ Validujte `dataIntegrityHash` v notifikáciách
- ✅ Implementujte error reporting (Sentry, LogRocket)

### Kontakty

Pre podporu a otázky ohľadom NOP API:
- **Email**: kverkom.kasoveIS@financnasprava.sk
- **Prevádzková doba**: 24x7
- **SLA (pilot)**: 8x5

---

## 🔗 Užitočné Linky

- [v0.app Chat](https://v0.app/chat/fzzNkcst2K8)
- [Vercel Deployment](https://vercel.com/spavlovic77s-projects/v0-fridge-checkout-page)
- [Slovak Banking Association](https://www.sbaonline.sk)
