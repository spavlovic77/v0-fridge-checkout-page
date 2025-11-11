# Instant Payment Integration

Tento projekt obsahuje implementáciu Instant payment metódy podľa technických špecifikácií:
- Payment Link Standard v1.3
- NOP Lite Integration Manual
- MQTT komunikácia pre notifikácie

## Architektúra

### Backend komponenty

1. **NOP Client** (`lib/nop-client.ts`)
   - Komunikácia s NOP API cez mTLS
   - Generovanie transaction ID (EndToEndId)

2. **MQTT Client** (`lib/mqtt-client.ts`)
   - Pripojenie na MQTT broker cez TLS/mTLS
   - Subscribe na payment notifikácie
   - Topic: `VATSK-XXX/POKLADNICA-XXX/QR-XXX`

3. **Payment Link Generator** (`lib/payment-link.ts`)
   - Generovanie payment linkov podľa Payment Link Standard
   - Detekcia mobile/desktop zariadení

4. **Certificate Utils** (`lib/certificate-utils.ts`)
   - Parsing VATSK a POKLADNICA z certifikátov

### API Endpoints

- `POST /api/instant-payment/init` - Inicializácia platby
- `GET /api/instant-payment/status/[id]` - Status platby
- `POST /api/instant-payment/status/[id]` - Update statusu

### Frontend komponenty

- `InstantPaymentModal` - Zobrazenie QR kódu (desktop) alebo deep link (mobile)
- Automatické polling pre status platby
- Countdown timer (2 minúty)

## Setup

### 1. Certifikáty

Umiestnite certifikáty do `./certs/`:
- `kverkom-int-client.pem` - Client certifikát
- `kverkom-int-client.key` - Private key
- `kverkom-ca-bundle.pem` - CA bundle

### 2. Environment Variables

\`\`\`bash
cp .env.example .env.local
\`\`\`

Nastavte cesty k certifikátom a API endpoints.

### 3. Inštalácia

\`\`\`bash
npm install
\`\`\`

### 4. Spustenie

\`\`\`bash
npm run dev
\`\`\`

## Flow

1. **Inicializácia platby**
   - Používateľ klikne na "Dokončiť nákup"
   - Frontend volá `/api/instant-payment/init`
   
2. **Získanie Transaction ID**
   - Backend volá NOP API: `POST /api/v1/generateNewTransactionId`
   - Obdrží `transaction_id` (QR-XXX)

3. **Generovanie Payment Link**
   - Format: `https://payme.sk/?V=1&IBAN=...&AM=...&CC=EUR&CN=...&PI=QR-XXX`

4. **Device Detection**
   - **Mobile (iOS/Android)**: Deep link otvorí banking app
   - **Desktop**: Zobrazí QR kód na scanovanie

5. **MQTT Subscription**
   - Backend sa prihlási na topic: `VATSK-XXX/POKLADNICA-XXX/QR-XXX`
   - Čaká na payment notifikáciu

6. **Payment Notification**
   - Banka pošle notifikáciu cez MQTT
   - Backend spracuje notifikáciu
   - Frontend polling detekuje zmenu statusu

7. **Success**
   - Zobrazí success obrazovku
   - Redirect na ďalší krok

## Demo Mode

Pre testovanie bez skutočných certifikátov:
- NOP API volania používajú mock data
- MQTT connection je optional
- Status sa môže manuálne updatovať cez API

## Production Notes

- Implementujte správnu QR code library (napr. `qrcode`)
- Použite databázu namiesto in-memory storage
- Implementujte retry logiku pre API volania
- Monitorujte MQTT connection health
- Validujte `dataIntegrityHash` v notifikáciách
