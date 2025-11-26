# Broos 2.0 - Complete Application Blueprint

## 1. Introductie & Kernconcepten

### 1.1. Doel van de Applicatie
Broos 2.0 is een webapplicatie ontworpen als een partner in mentaal welzijn voor (jonge) sporters. De kern van de app is een AI-gestuurde chatbot, "Broos" genaamd, die dagelijks met spelers praat om hun welzijn te monitoren. De app biedt ook dashboards voor clubstaf en -beheerders om geanonimiseerde, geaggregeerde trends te bekijken en in te grijpen wanneer de AI zorgwekkende signalen detecteert.

### 1.2. Tech Stack
- **Framework**: Next.js (met App Router)
- **Taal**: TypeScript
- **UI Componenten**: React, ShadCN UI
- **Styling**: Tailwind CSS
- **Backend Services & Database**: Firebase (Authentication, Firestore)
- **AI Functionaliteit**: Genkit
- **Progressive Web App (PWA)**: `next-pwa` voor offline functionaliteit en installatie.

---

## 2. Architectuur & Bestandsstructuur

- **`src/app/`**: Hoofdmap voor de Next.js App Router.
    - **`(auth)/`**: Routegroep voor authenticatiepagina's (Login, Register, etc.). Deze hebben een aparte, minimale layout.
    - **`(app)/`**: Routegroep voor de ingelogde gebruikerservaring. Deze gebruiken de hoofdapplicatie-layout met navigatie.
    - **`(maintenance)/`**: Routegroep voor onderhoudspagina's zoals `cleanup-db` en `file-importer`.
    - **`api/`**: API routes, specifiek voor de cron job trigger (`/api/cron`).
    - **`actions/`**: Next.js Server Actions die server-side logica uitvoeren, aangeroepen vanaf de client.
- **`src/components/`**: React componenten.
    - **`app/`**: Specifieke componenten voor de applicatie-functionaliteit (bv. `chat-interface.tsx`, `dashboard-content.tsx`).
    - **`auth/`**: Componenten voor de authenticatie-formulieren.
    - **`ui/`**: Herbruikbare UI-componenten, grotendeels gebaseerd op ShadCN (Button, Card, etc.).
- **`src/context/`**: React Context providers, met name `user-context.tsx` voor het beheren van de sessie van de ingelogde gebruiker.
- **`src/ai/`**: Alle Genkit-gerelateerde code.
    - **`flows/`**: Definitie van de AI-flows (gesprekslogica, data-analyse).
    - **`genkit.ts`**: Initialisatie van de Firebase Admin SDK voor server-side gebruik.
    - **`retriever.ts`**: Logica voor het ophalen van documenten uit de kennisbank (RAG).
    - **`types.ts`**: Zod-schema's en TypeScript types voor de input en output van de AI-flows.
- **`src/lib/`**: Hulpfuncties en type-definities.
    - **`firebase/`**: Client-side Firebase initialisatie en custom hooks (`useUser`, `useDoc`, `useCollection`).
    - **`types.ts`**: Globale TypeScript interfaces (UserProfile, Team, Club, etc.).
- **`src/services/`**: Server-side helper functies die interageren met de database (bv. `firestore-service.ts`).
- **`firestore.rules`**: Beveiligingsregels voor de Firestore database.
- **`docs/`**: Documentatie, inclusief dit blueprint.
- **`e2e/`**: Playwright End-to-End tests.

---

## 3. Authenticatie & Gebruikersrollen

### 3.1. Authenticatie-provider
- **Firebase Authentication** wordt gebruikt voor e-mail/wachtwoord authenticatie.

### 3.2. Gebruikersrollen
Er zijn drie rollen (`UserRole`):
1.  **`player`**: De sporter. Kan chatten met de buddy en het eigen dashboard bekijken.
2.  **`staff`**: Coach of teamlid. Kan geaggregeerde data en alerts voor het eigen team zien.
3.  **`responsible`**: Clubbeheerder. Kan alle teams beheren, club-brede analyses zien en de kennisbank beheren.

### 3.3. Registratie Flow (`/` -> `/register`)
1.  **Start (`/`)**: De gebruiker kiest zijn rol (speler, staf, of beheerder).
2.  **Registratie (`/register?role=...`)**: De gebruiker vult naam, e-mail, wachtwoord en geslacht in. De rol wordt via de URL parameter vooraf ingevuld. Hij/zij moet ook de algemene voorwaarden accepteren.
3.  **Account Creatie**: Bij succes wordt een account aangemaakt in Firebase Auth en een bijbehorend `user` document in Firestore.
4.  **E-mail Verificatie (`/verify-email`)**: Er wordt een verificatiemail gestuurd. De gebruiker wordt naar deze pagina geleid en kan niet verder totdat de e-mail is geverifieerd. De app checkt op de achtergrond elke 5 seconden of de `emailVerified` status is gewijzigd.

### 3.4. Login & Wachtwoord Vergeten (`/login`)
1.  **Login**: Gebruiker vult e-mail en wachtwoord in.
2.  **Redirect**: Bij succes wordt de gebruiker doorgestuurd naar de juiste pagina (bv. `/dashboard`).
3.  **Wachtwoord Vergeten**: Vanuit het login-formulier kan de gebruiker een e-mailadres invullen en klikken op "Wachtwoord vergeten?". `sendPasswordResetEmail` van Firebase wordt aangeroepen om een herstel-link te sturen.

### 3.5. Sessiebeheer
- De `UserProvider` (`src/context/user-context.tsx`) wikkelt de hele applicatie.
- Het gebruikt de `onAuthStateChanged` listener van Firebase om de `user` en `userProfile` status globaal beschikbaar te maken.
- Het bevat nu ook de centrale routing-logica. Na het laden, controleert het de status van de gebruiker en stuurt deze door naar de juiste pagina (`/login`, `/verify-email`, `/complete-profile` of `/dashboard`), wat oneindige laad-lussen voorkomt.

---

## 4. Gebruikersopbouw (User Flows)

### 4.1. Speler-opbouw
1.  **Eerste Login**: Na verificatie, detecteert de `UserProvider` dat `userProfile.teamId` ontbreekt.
2.  **Redirect**: De speler wordt geforceerd doorgestuurd naar `/complete-profile`.
3.  **Profiel Aanvullen**: Op deze pagina vult de speler zijn geboortedatum en een unieke team-uitnodigingscode in.
4.  **Code Verificatie**: De `CompleteProfileForm` zoekt in **alle** `clubs` naar een `team` subcollectie met de overeenkomstige `invitationCode`.
5.  **Update**: Bij een match worden `teamId` en `clubId` opgeslagen in het `user` document in Firestore.
6.  **Voltooiing**: De `UserProvider` detecteert nu dat het profiel compleet is en geeft toegang tot het `/dashboard`.

### 4.2. Responsible-opbouw
1.  **Eerste Login**: Na verificatie, detecteert de `UserProvider` dat `userProfile.clubId` ontbreekt.
2.  **Dashboard Prompt**: Op het `/dashboard` wordt een prompt getoond om een club aan te maken.
3.  **Club Creatie (`/create-club`)**: De gebruiker kan hier ofwel een nieuwe club aanmaken (naam opgeven), ofwel een code invoeren om lid te worden van een bestaande club (`/join-club`).
4.  **Data Update**: Bij het aanmaken wordt een nieuw `club` document gemaakt en de `clubId` wordt in het `user` document opgeslagen. Bij het joinen wordt de `clubId` ook bijgewerkt.
5.  **Clubbeheer**: Zodra de `clubId` bekend is, toont het dashboard de clubmanagement-interface, waar de 'responsible' teams kan aanmaken en beheren.

### 4.3. Staff-opbouw
1.  **Eerste Login**: Identiek aan de speler-opbouw. Een staflid heeft ook een teamcode nodig om aan een specifiek team te worden gekoppeld.
2.  **Dashboard**: Het dashboard voor stafleden is beperkter. Ze zien alerts en inzichten specifiek voor hun team, maar kunnen geen teams aanmaken of club-brede instellingen beheren.

---

## 5. Database Structuur (Firestore)

De databasestructuur is gedefinieerd in `firestore.rules`.

- `users/{userId}`: (Entiteit: `UserProfile`)
    - Slaat alle profielinformatie op, inclusief rol, clubId, teamId, en de door AI gegenereerde samenvattingen van de onboarding.
    - **Subcollecties**:
        - `chats/{chatId}`: (Entiteit: `Chat`) Slaat metadata per chatdag op (bv. `2024-11-25`).
            - `messages/{messageId}`: (Entiteit: `ChatMessage`) Bevat de individuele berichten van de gebruiker en de AI.
        - `wellnessScores/{scoreId}`: (Entiteit: `WellnessScore`) Slaat de dagelijkse, door AI geëxtraheerde welzijnsscores op.
        - `alerts/{alertId}`: (Entiteit: `Alert`) Slaat door AI gedetecteerde alerts op.
        - `updates/{updateId}`: (Entiteit: `PlayerUpdate`) Bevat de gepersonaliseerde 'weetjes' voor de speler.
        - `trainings/{trainingId}`: (Entiteit: `PlayerTraining`) Individuele trainingen die de speler zelf toevoegt.
        - `fcmTokens/{tokenId}`: Slaat Firebase Cloud Messaging tokens op voor push-notificaties.

- `clubs/{clubId}`: (Entiteit: `Club`)
    - Bevat clubinformatie, zoals naam en eigenaar (`ownerId`), en een uitnodigingscode voor andere 'responsibles'.
    - **Subcollecties**:
        - `teams/{teamId}`: (Entiteit: `Team`) Bevat teaminformatie, inclusief naam, uitnodigingscode voor spelers/staf en wekelijks trainingsschema.
            - `staffUpdates/{updateId}`: (Entiteit: `StaffUpdate`) Wekelijkse inzichten voor de staf.
            - `summaries/{summaryId}`: (Entiteit: `TeamSummary`) Wekelijkse, geaggregeerde welzijnsdata voor het team.
        - `clubUpdates/{updateId}`: (Entiteit: `ClubUpdate`) Wekelijkse inzichten voor de clubbeheerder.

- `knowledge_base/{docId}`: (Entiteit: `KnowledgeDocument`)
    - Documenten (`.txt`, `.md`) die worden gebruikt als kennisbron voor de AI (RAG). Deze worden opgeslagen in een root-collectie.

### Security Rules (`firestore.rules`)
- **Gebruikerseigendom**: Gebruikers kunnen alleen hun eigen `user` document en subcollecties lezen en schrijven.
- **Rolgebaseerde Toegang**:
    - `responsible` gebruikers kunnen teams binnen hun eigen club beheren.
    - `staff` gebruikers kunnen leden van hun eigen team en bijbehorende alerts/summaries lezen.
- **Backend-Only Writes**: Collecties zoals `updates` en `summaries` kunnen alleen door de backend worden geschreven.

---

## 6. AI Functionaliteit (Genkit)

De AI-logica is opgedeeld in "flows" in `src/ai/flows/`, aangeroepen via Server Actions.

### 6.1. `chatWithBuddy` Server Action (`chat-actions.ts`)
Dit is de centrale router voor alle chatberichten.
1.  Het haalt het `userProfile` op.
2.  Als `onboardingCompleted` `false` is, roept het de `runOnboardingFlow` aan.
3.  Anders, roept het de `runWellnessAnalysisFlow` aan.

### 6.2. Onboarding Flow (`onboarding-flow.ts`)
- **Doel**: De speler leren kennen via een gestructureerd gesprek.
- **Checklist & Volgorde**: De flow overloopt een vaste checklist van onderwerpen in deze specifieke volgorde:
    1.  `familySituation` (Gezinssituatie)
    2.  `schoolSituation` (School & Vrienden)
    3.  `personalGoals` (Ambities in voetbal en daarbuiten)
    4.  `matchPreparation` (Voorbereiding op wedstrijden)
    5.  `recoveryHabits` (Herstel na inspanning)
    6.  `additionalHobbies` (Hobby's en ontspanning)
- **Startbericht**: De allereerste keer wordt het eerste onderwerp (`familySituation`) geïntroduceerd, bijvoorbeeld: *"Laten we elkaar wat beter leren kennen. Hoe ziet je gezinssituatie eruit?"*
- **Logica & Data Opslag**:
    1.  De `runOnboardingFlow` controleert welk onderwerp het volgende is in de checklist dat nog niet in het `userProfile` is opgeslagen.
    2.  Het roept de `onboardingBuddyPrompt` aan met de gebruikersinput en het huidige onderwerp.
    3.  De AI bepaalt zelf wanneer een onderwerp is afgerond en geeft `isTopicComplete: true` en een `summary` terug.
    4.  De `saveOnboardingSummary` service slaat deze `summary` op in het corresponderende veld (bv. `familySituation`) in het `user/{userId}` document.
    5.  Dit herhaalt zich tot alle onderwerpen zijn behandeld. Dan wordt `onboardingCompleted` op `true` gezet.
- **Volledige Prompt (`onboardingBuddyPrompt`):**
    ```
    Je bent een empathische AI-psycholoog voor een jonge atleet genaamd {{{userName}}}.
    Je doel is om een natuurlijke, ondersteunende conversatie te hebben om de gebruiker beter te leren kennen.
    Je antwoord ('response') MOET in het Nederlands zijn.

    Het huidige onderwerp is '{{{currentTopic}}}'.
    - Leid het gesprek op een natuurlijke manier rond dit onderwerp. Stel vervolgvragen als de reactie van de gebruiker kort is om meer details te krijgen.
    - BELANGRIJK: Wees niet te opdringerig. Als de gebruiker aangeeft niet verder te willen praten over een detail, respecteer dat dan en rond het onderwerp af.
    - Als je vindt dat het onderwerp voldoende is besproken (of als de gebruiker aangeeft niet verder te willen), stel dan 'isTopicComplete' in op true.
    - Als 'isTopicComplete' waar is, geef dan een beknopte samenvatting (2-3 zinnen) van de input van de gebruiker voor dit onderwerp in het 'summary' veld, en eindig je 'response' met een vraag zoals "Ben je er klaar voor om het over iets anders te hebben?"
    - Anders, stel 'isTopicComplete' in op false en houd het gesprek gaande.

    Bericht van de gebruiker: "{{{userMessage}}}"
    Gespreksgeschiedenis over dit onderwerp:
    {{{chatHistory}}}
    ```

### 6.3. Wellness Analysis Flow (`wellness-analysis-flow.ts`)
- **Doel**: Een normaal gesprek voeren, welzijnsdata extraheren en alerts detecteren.
- **Logica**:
    1.  **RAG**: De `retrieveSimilarDocuments` functie zoekt in de `knowledge_base` naar relevante documenten.
    2.  Deze documenten worden meegegeven aan de `wellnessBuddyPrompt` om het antwoord van de AI te sturen.
    3.  **Data Extractie**: De prompt analyseert het gesprek om scores (1-5) en redenen voor welzijnsaspecten (stemming, stress, etc.) te extraheren.
    4.  **Alert Detectie**: De prompt zoekt naar signalen voor `Mental Health`, `Aggression`, etc.
    5.  **Opslaan**: De `saveWellnessData` service slaat alle geëxtraheerde data atomair op in Firestore.
- **Volledige Prompt (`wellnessBuddyPrompt`):**
    ```
    Je bent {{{buddyName}}}, een vriendelijke en behulpzame AI-buddy.
    Je antwoord ('response') MOET in het Nederlands zijn. Hou je antwoorden beknopt en boeiend.

    BELANGRIJK: Baseer je antwoord EERST op de informatie uit 'Relevante Documenten' als deze relevant is voor de vraag van de gebruiker. Gebruik anders je algemene kennis.

    Relevante Documenten (uit de kennisbank):
    ---
    {{#if retrievedDocs}}
        {{#each retrievedDocs}}
        - Document '{{name}}': {{{content}}}
        {{/each}}
    {{else}}
        Geen relevante documenten gevonden.
    {{/if}}
    ---

    ANALYSEER het gesprek op de achtergrond.
    1.  **Samenvatting:** Geef een beknopte, algemene samenvatting (1-2 zinnen) van het gehele gesprek van vandaag in het 'summary' veld.
    2.  **Welzijnsscores:** Extraheer scores (1-5) en redenen voor welzijnsaspecten. Vul ALLEEN de velden in 'wellnessScores' waarover de gebruiker expliciete informatie geeft.
    3.  **Alerts:** Analyseer de 'userMessage' op zorgwekkende signalen. Als je een duidelijk signaal detecteert, vul dan het 'alert' object met de 'alertType' en 'triggeringMessage'.

    Naam gebruiker: {{{userName}}}
    Bericht gebruiker: "{{{userMessage}}}"
    Gespreksgeschiedenis (voor context, hoeft niet herhaald te worden):
    {{{chatHistory}}}
    ```

### 6.4. Kennisbank (`ingest-flow.ts` & `retriever.ts`)
- `responsible` gebruikers kunnen `.txt` of `.md` bestanden uploaden.
- De `ingestDocument` server action slaat de inhoud op in de `knowledge_base` collectie.
- De `retrieveSimilarDocuments` functie voert een keyword-gebaseerde zoekopdracht uit.

---

## 7. Geautomatiseerde Analyses (Cron Job)

- **Trigger**: Een HTTP GET request naar `/api/cron` (beveiligd in productie).
- **`runAnalysisJob` (`cron-actions.ts`)**:
    1.  **Notificaties**: Stuurt een push-herinnering naar elke speler voor de dagelijkse check-in.
    2.  **Team Analyse**: Verzamelt per team de `wellnessScores`, laat de `analyzeTeamData` flow een `summary` en een `insight` genereren, en slaat deze op.
    3.  **Speler 'Weetjes'**: Roept na de teamanalyse de `generatePlayerUpdate` flow aan, die de individuele score van een speler vergelijkt met het teamgemiddelde en een gepersonaliseerd "weetje" genereert.
    4.  **Club Analyse**: Bundelt de `summaries` van alle teams van een club, laat de `analyzeClubData` flow een club-breed inzicht genereren.

---

## 8. Styling & Layout

### 8.1. Kleurenschema (`globals.css`)
- **Primary**: `250 50% 70%` (Zacht lavendel)
- **Background**: `220 40% 95%` (Zeer licht, zachtblauw)
- **Accent**: `150 50% 70%` (Zacht mintgroen)

### 8.2. Lettertype (`layout.tsx`)
- **Poppins**: Wordt geladen via Google Fonts.

### 8.3. "Claymorphism" Effect (`tailwind.config.ts`)
- Een subtiel "klei-effect" wordt toegepast op `Card` en `Button` via custom `box-shadow` definities (`shadow-clay-card`, `shadow-clay-btn`, etc.).

### 8.4. Layouts & Laadschermen
- **Auth Layout (`(auth)/layout.tsx`)**: Minimale, gecentreerde layout.
- **App Layout (`(app)/layout.tsx`)**: Standaard layout voor ingelogde gebruikers met een header.
- **Player Layout (`(app)/layout.tsx`)**: Specifiek voor spelers, met een navigatiebalk onderaan voor mobiel.
- **Laadschermen**: De `UserProvider` toont een gecentreerde spinner met het logo tijdens het laden van de initiële gebruiker- en profielgegevens, wat oneindige lussen op de login-pagina's voorkomt.

---

## 9. End-to-End Testen (Playwright)

- **Configuratie (`playwright.config.ts`)**: Stelt de `baseURL`, de `webServer` (start `npm run dev`) en projecten in.
- **Globale Setup (`e2e/global-setup.ts`)**:
    - Leest Firebase admin credentials uit de `.env` file (vereist voor lokale tests).
    - Maakt voor elke testrun een set nieuwe, geverifieerde testgebruikers (player, staff, responsible) aan in Firebase Auth en Firestore.
    - Slaat de credentials van deze testgebruikers op in `process.env` zodat de tests ze kunnen gebruiken om in te loggen.
- **Test-bestanden (`e2e/*.spec.ts`)**:
    - `auth.spec.ts`: Test de registratie-flow.
    - `player.spec.ts`: Test de "profiel aanvullen" flow voor een speler.
    - `responsible.spec.ts`: Test de "club en team aanmaken" flow voor een clubverantwoordelijke.

---

## 10. Go-Live Checklist Samenvatting (`docs/go-live-checklist.md`)

- Dit document bevat de laatste stappen voor de productielancering.
- **Belangrijke openstaande punten**:
    - Implementeren van een mechanisme voor **ouderlijke toestemming** voor minderjarigen (GDPR).
    - Vervangen van de placeholder **privacybeleid** en **algemene voorwaarden** door juridisch getoetste documenten.
    - Het refactoren van het dashboard om statistieken te scheiden van clubbeheer.
- Dit benadrukt de noodzaak om juridische en compliance-aspecten af te ronden voordat de applicatie live gaat.
