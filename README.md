# Casino Tester 888

**Autor:** Jakub Varga (@jakubvarga)

Casino Tester 888 je pokročilý PWA (Progressive Web App) nástroj určený na bezpečnostný audit online kasín a iných webových aplikácií. Všetky testy bežia výhradne na strane klienta a poskytujú okamžitú spätnú väzbu v profesionálnom terminálovom rozhraní.

## ARZENÁL NÁSTROJOV

### Aktívne Testy
- **Centralizovaná Správa Cieľa:** Jednorazové nastavenie cieľových URL a parametrov pre všetky testy.
- **Automatické Zisťovanie:** Nástroj sa pokúša automaticky nájsť WebSocket URL na cieľovej stránke.
- **Pokročilý SQL/NoSQL Injection Tester:** Detekuje error-based, time-based a boolean-based zraniteľnosti.
- **Live WebSocket Interceptor:** Monitorujte komunikáciu v reálnom čase.
- **LIVE Režim:** Spustí sekvenciu všetkých kľúčových testov jedným klikom (chránené heslom `Jackpot5000`).
- **Export Reportov:** Stiahnite si výsledky testov vo formáte JSON alebo CSV.

### Inšpektory a Analyzátory
- **HTTP Headers Inspector:**
  - **Čo to robí?** Načíta a analyzuje HTTP hlavičky zo zadaného URL.
  - **Funkcie:** Automaticky kontroluje prítomnosť a správnosť kľúčových bezpečnostných hlavičiek (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, atď.) a upozorní na chýbajúce alebo zle nakonfigurované direktívy.
- **JWT (JSON Web Token) Analyzer:**
  - **Čo to robí?** Dekóduje a analyzuje JWT tokeny.
  - **Funkcie:** Prehľadne zobrazí obsah hlavičky a payloadu. Automaticky interpretuje časové údaje (expirácia, vydanie) a prevedie ich na ľudsky čitateľný formát, pričom vás upozorní, či je token stále platný.

- **Plne Client-Side:** Žiadne dáta neopúšťajú váš prehliadač.

---

## Ostré Funkcie pre Penetračné Testovanie (Adaptácia pre VPS)

Toto je rozpis najsilnejších funkcií nástroja a návod, ako ich logiku adaptovať pre použitie v skriptoch priamo na vašom VPS (napr. pomocou Node.js).

### 1. Prieskum a Zisťovanie Informácií (Reconnaissance)

#### **Funkcia: Automatické Zistenie WebSocket URL (`discoverWebSocketUrl`)**
- **Čo to robí?** Aktívne prehľadáva cieľovú webovú stránku a jej JavaScriptové súbory, aby našla skrytú WebSocket adresu (`ws://` alebo `wss://`), ktorú kasíno používa na komunikáciu v reálnom čase.
- **Ako to použiť na VPS?** Na serveri použijete `node-fetch` na stiahnutie obsahu HTML a JS súborov a potom aplikujete rovnakú RegEx logiku na nájdenie URL.
- **Kľúčová logika:**
  ```javascript
  const wsRegex = /(wss?:\/\/[^\s"'`<>]+)/g;
  const scriptRegex = /<script.*?src=["'](.*?)["']/g;
  
  // 1. Stiahnite HTML z hlavnej URL
  // const htmlText = await fetch(baseUrl).then(res => res.text());
  
  // 2. Hľadajte URL priamo v HTML
  // let foundUrl = htmlText.match(wsRegex);
  
  // 3. Ak nenájdete, extrahujte všetky JS skripty
  // const scriptSrcs = [...htmlText.matchAll(scriptRegex)].map(match => match[1]);
  
  // 4. Stiahnite a analyzujte každý skript
  // for (const src of scriptSrcs) {
  //   const scriptText = await fetch(new URL(src, baseUrl)).then(res => res.text());
  //   foundUrl = scriptText.match(wsRegex);
  //   if (foundUrl) break;
  // }
  ```

### 2. Aktívne Útoky a Hľadanie Zraniteľností

#### **Funkcia: Pokročilý SQL/NoSQL Injection Tester (`testSqlInjection`)**
- **Čo to robí?** Systematicky skúša viacero typov útokov na zadaný parameter, aby odhalila aj "slepé" (blind) zraniteľnosti.
  1.  **Error-Based:** Skúša vyvolať viditeľnú databázovú chybu.
  2.  **Time-Based Blind:** Pošle príkaz, ktorý donúti databázu "čakať". Ak odpoveď trvá výrazne dlhšie, zraniteľnosť je takmer istá.
  3.  **Boolean-Based Blind:** Porovnáva obsah odpovedí na logicky pravdivé a nepravdivé dopyty. Ak sa obsah výrazne líši (napr. dĺžkou), odhalí to zraniteľnosť.
- **Ako to použiť na VPS?** Ideálne pre skript na VPS. Vytvoríte slučku, ktorá bude posielať requesty s jednotlivými payloadmi pomocou `node-fetch`, merať čas odozvy a porovnávať dĺžku obsahu.
- **Kľúčové Payloads:**
  ```javascript
  const payloads = [
      // Error-based
      { name: 'Classic Error', type: 'error', value: "'"},
      { name: 'Numeric Error', type: 'error', value: "1 OR 1=1"},
      // Boolean-based
      { name: 'Boolean Logic (AND)', type: 'boolean', value: "' AND '1'='1", falseValue: "' AND '1'='2" },
      // Time-based
      { name: 'Time-Based MySQL (5s)', type: 'time', value: "' AND SLEEP(5)--", sleepTime: 5 },
      { name: 'Time-Based PostgreSQL (5s)', type: 'time', value: "'||pg_sleep(5)--", sleepTime: 5 },
      { name: 'Time-Based MSSQL (5s)', type: 'time', value: "'; WAITFOR DELAY '0:0:5'--", sleepTime: 5 },
  ];
  ```

#### **Funkcia: Test Neautorizovaného Prístupu k API (`testApiAccess`)**
- **Čo to robí?** Overuje, či citlivé API endpointy (napr. história herných výsledkov) nie sú prístupné bez prihlásenia.
- **Ako to použiť na VPS?** Jednoduchý `fetch` request na cieľovú URL. Na serveri na to stačí jeden riadok s `node-fetch` alebo `curl`.
- **Kľúčová logika:**
  ```javascript
  // const targetUrl = `${scope.baseUrl.replace(/\/$/, '')}/api/game/results`;
  // const res = await fetch(targetUrl);
  // if (res.status === 200) {
  //   console.log('[VULNERABILITY DETECTED] Unauthorized access was successful!');
  // } else if (res.status === 401 || res.status === 403) {
  //   console.log('[SECURE] API correctly denied access.');
  // }
  ```

### 3. Interakcia v Reálnom Čase

#### **Funkcia: WebSocket Interceptor (`interceptWebSocket`)**
- **Čo to robí?** Nadviaže spojenie s WebSocket serverom kasína, aby ste mohli naživo sledovať herné dáta, chat alebo iné udalosti.
- **Ako to použiť na VPS?** Namiesto `new WebSocket()` z prehliadača použijete na serveri knižnicu `ws`. Umožní vám to nielen počúvať, ale aj posielať vlastné, modifikované správy a testovať tak reakcie servera.
- **Kľúčová logika:**
  ```javascript
  // const ws = new WebSocket(wsUrl);
  // ws.onopen = () => console.log('Connection established.');
  // ws.onmessage = (event) => console.log(`Received message: ${event.data}`);
  // ws.onclose = () => console.log('Connection closed.');
  // ws.onerror = (err) => console.error('WebSocket error:', err);
  ```

---

## Inštalácia a Lokálne Spustenie

1.  **Nainštalujte závislosti:**
    ```bash
    npm install
    ```
2.  **Spustite vývojový server:**
    ```bash
    npm run dev
    ```
    Aplikácia bude dostupná na `http://localhost:5173`.

---

## Nasadenie na Produkčný VPS

Tieto kroky predpokladajú, že máte VPS s nainštalovaným Node.js, npm a webovým serverom ako Nginx.

1.  **Naklonujte repozitár na váš VPS:**
    ```bash
    git clone <URL_VASEHO_REPOZITARA>
    cd <NAZOV_PRIECINKA>
    ```

2.  **Nainštalujte závislosti:**
    ```bash
    npm install
    ```

3.  **Vytvorte produkčný build:**
    ```bash
    npm run build
    ```
    Tento príkaz vytvorí optimalizované statické súbory v priečinku `dist`.

4.  **Nakonfigurujte webový server (Nginx Príklad):**
    Vytvorte alebo upravte konfiguračný súbor pre vašu doménu v `/etc/nginx/sites-available/`:

    ```nginx
    server {
        listen 80;
        server_name vasa-domena.com;

        # Presmerovanie HTTP na HTTPS (odporúčané pre PWA)
        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl;
        server_name vasa-domena.com;

        # Cesty k SSL certifikátom (napr. z Let's Encrypt)
        ssl_certificate /etc/letsencrypt/live/vasa-domena.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/vasa-domena.com/privkey.pem;

        root /cesta/k/vasmu/projektu/dist;
        index index.html;

        location / {
            try_files $uri /index.html;
        }
    }
    ```
    - Nahraďte `vasa-domena.com` a `/cesta/k/vasmu/projektu/dist` správnymi hodnotami.
    - `try_files $uri /index.html;` je kľúčové pre správne fungovanie React Routera.

5.  **Reštartujte Nginx:**
    ```bash
    sudo systemctl restart nginx
    ```
    Vaša aplikácia by teraz mala byť dostupná na vašej doméne.

---
### Upozornenie
Tento nástroj používajte zodpovedne a výhradne na systémoch, na ktorých máte výslovné povolenie vykonávať testovanie. Neoprávnené testovanie je nelegálne.
