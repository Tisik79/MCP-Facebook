# AI Marketing Agent - Návrh systému

## Přehled projektu

**Název:** AI Marketing Agent pro Facebook
**Verze:** 1.0
**Datum:** 6. ledna 2026
**Autor:** Jan Tesnar + Claude AI

---

## 1. Vize a cíle

### 1.1 Vize
Autonomní AI agent, který samostatně spravuje Facebook marketing - vytváří obsah, spravuje reklamy, optimalizuje rozpočet a reportuje výsledky. Člověk pouze schvaluje klíčové akce a sleduje výsledky.

### 1.2 Hlavní cíle
- **Automatizace** rutinních marketingových úkonů
- **AI-powered rozhodování** na základě dat
- **Human-in-the-loop** schvalování důležitých akcí
- **Transparentnost** přes emailové reporty
- **Optimalizace rozpočtu** pro maximální ROI

### 1.3 Klíčové funkce
| Funkce | Popis |
|--------|-------|
| Automatická tvorba obsahu | AI generuje příspěvky na základě strategie |
| Správa kampaní | Vytváření, optimalizace, pauzování |
| Rozpočtové řízení | Alokace rozpočtu podle výkonu |
| Schvalovací workflow | Email notifikace, one-click schválení |
| Reporting | Denní/týdenní přehledy emailem |

---

## 2. Architektura systému

### 2.1 Vysokoúrovňový pohled

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI MARKETING AGENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐                           ┌─────────────┐     │
│   │  SCHEDULER  │                           │   CONFIG    │     │
│   │   (Cron)    │                           │  & GOALS    │     │
│   └──────┬──────┘                           └──────┬──────┘     │
│          │                                         │             │
│          ▼                                         ▼             │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      AI BRAIN                            │   │
│   │                    (Claude API)                          │   │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│   │  │ Analyze │  │ Decide  │  │ Create  │  │ Report  │    │   │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│   └─────────────────────────────────────────────────────────┘   │
│          │                                                       │
│          ▼                                                       │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   APPROVAL QUEUE                         │   │
│   │   [Pending] ──▶ [Email] ──▶ [User Click] ──▶ [Execute]  │   │
│   └─────────────────────────────────────────────────────────┘   │
│          │                                         │             │
│          ▼                                         ▼             │
│   ┌─────────────┐                           ┌─────────────┐     │
│   │  FACEBOOK   │                           │    EMAIL    │     │
│   │  GRAPH API  │                           │   SERVICE   │     │
│   └─────────────┘                           └─────────────┘     │
│          │                                         │             │
│          ▼                                         ▼             │
│   ┌─────────────┐                           ┌─────────────┐     │
│   │  DATABASE   │                           │    USER     │     │
│   │   (State)   │                           │  (Schválí)  │     │
│   └─────────────┘                           └─────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Komponenty

#### 2.2.1 Scheduler (Plánovač)
Spouští automatické úlohy v definovaných časech.

| Úloha | Čas | Popis |
|-------|-----|-------|
| `morningAnalysis` | 06:00 | Analýza včerejšího výkonu |
| `contentSuggestion` | 08:00 | Návrh nového obsahu |
| `performanceCheck` | 12:00, 18:00 | Kontrola běžících kampaní |
| `budgetOptimization` | 20:00 | Optimalizace rozpočtu |
| `dailyReport` | 21:00 | Denní shrnutí |
| `weeklyReport` | Ne 18:00 | Týdenní report |

#### 2.2.2 AI Brain (Mozek)
Claude API provádí veškeré rozhodování.

**Vstup:**
- Aktuální stav kampaní
- Historická data (insights)
- Definované cíle a rozpočet
- Schválená strategie

**Výstup:**
- Návrhy akcí k provedení
- Zdůvodnění každé akce
- Očekávaný dopad

#### 2.2.3 Approval Queue (Schvalovací fronta)
Mechanismus pro human-in-the-loop kontrolu.

**Stavy akce:**
```
PENDING ──▶ APPROVED ──▶ EXECUTED
    │           │
    │           └──▶ FAILED
    │
    └──▶ REJECTED
    │
    └──▶ EXPIRED (timeout)
```

#### 2.2.4 Executor (Vykonavatel)
Provádí schválené akce přes Facebook Graph API.

#### 2.2.5 Email Service
Odesílá notifikace a reporty.

---

## 3. Datové modely

### 3.1 Konfigurace agenta

```typescript
interface AgentConfig {
  // Identifikace
  agentId: string
  name: string

  // Facebook účet
  facebookPageId: string
  facebookAccountId: string

  // Rozpočet
  budget: {
    total: number           // Celkový rozpočet (Kč)
    period: 'monthly' | 'weekly'
    dailyLimit: number      // Max. denní útrata
    alertThreshold: number  // Upozornit při X% vyčerpání
  }

  // Cíle
  goals: Goal[]

  // Strategie
  strategy: {
    targetAudience: string
    tone: string
    topics: string[]
    postFrequency: 'daily' | 'every_other_day' | 'weekly'
    preferredPostTimes: string[]  // ["09:00", "18:00"]
  }

  // Schvalování
  approval: {
    email: string
    requireApprovalFor: ActionType[]
    autoApproveBelow: number  // Auto-schválit akce pod X Kč
    timeoutHours: number      // Expirace neschválených akcí
  }

  // Notifikace
  notifications: {
    dailyReport: boolean
    weeklyReport: boolean
    instantAlerts: boolean
  }
}
```

### 3.2 Cíl

```typescript
interface Goal {
  id: string
  type: 'leads' | 'reach' | 'engagement' | 'followers' | 'conversions'
  target: number
  current: number
  period: 'daily' | 'weekly' | 'monthly'
  priority: 'high' | 'medium' | 'low'
}
```

### 3.3 Akce čekající na schválení

```typescript
interface PendingAction {
  id: string
  createdAt: Date
  expiresAt: Date

  // Typ akce
  type: ActionType

  // Payload podle typu
  payload: CreatePostPayload | BoostPostPayload | AdjustBudgetPayload | ...

  // AI reasoning
  reasoning: string
  expectedImpact: string
  confidence: 'high' | 'medium' | 'low'

  // Schválení
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'executed' | 'failed'
  approvalToken: string  // Unikátní token pro email link
  approvedAt?: Date
  approvedBy?: string
  executedAt?: Date
  executionResult?: any
}

type ActionType =
  | 'create_post'
  | 'boost_post'
  | 'create_campaign'
  | 'adjust_budget'
  | 'pause_campaign'
  | 'resume_campaign'
  | 'create_ad'
  | 'modify_targeting'
```

### 3.4 Příklady payloadů

```typescript
interface CreatePostPayload {
  content: string
  imageUrl?: string
  link?: string
  scheduledTime?: Date
}

interface BoostPostPayload {
  postId: string
  budget: number
  duration: number  // dny
  targeting?: TargetingSpec
}

interface AdjustBudgetPayload {
  campaignId: string
  currentBudget: number
  newBudget: number
  reason: string
}
```

### 3.5 Audit log

```typescript
interface AuditLogEntry {
  id: string
  timestamp: Date
  actionId: string
  eventType: 'created' | 'approved' | 'rejected' | 'executed' | 'failed'
  details: any
  userId?: string
}
```

---

## 4. Workflow a procesy

### 4.1 Denní workflow

```
┌────────────────────────────────────────────────────────────────┐
│                        DENNÍ CYKLUS                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  06:00  ┌─────────────────────────────────────────────────┐    │
│         │ RANNÍ ANALÝZA                                    │    │
│         │ • Stáhnout včerejší insights                     │    │
│         │ • Porovnat s cíli                                │    │
│         │ • Identifikovat problémy/příležitosti            │    │
│         └─────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  08:00  ┌─────────────────────────────────────────────────┐    │
│         │ NÁVRH OBSAHU                                     │    │
│         │ • AI vygeneruje příspěvek podle strategie        │    │
│         │ • Odešle ke schválení emailem                    │    │
│         └─────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  08:00-12:00  ┌─────────────────────────────────────────────┐  │
│               │ ČEKÁNÍ NA SCHVÁLENÍ                         │  │
│               │ • Uživatel dostane email                    │  │
│               │ • Klikne [SCHVÁLIT] / [UPRAVIT] / [ZAMÍTNOUT]│  │
│               └─────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  Po schválení ┌─────────────────────────────────────────────┐  │
│               │ PUBLIKACE                                    │  │
│               │ • Příspěvek se publikuje                     │  │
│               │ • Potvrzovací email                          │  │
│               └─────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  12:00, 18:00 ┌─────────────────────────────────────────────┐  │
│               │ KONTROLA VÝKONU                             │  │
│               │ • Jak si vedou běžící kampaně?              │  │
│               │ • Potřeba úprav? → Návrh ke schválení       │  │
│               └─────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  20:00  ┌─────────────────────────────────────────────────┐    │
│         │ OPTIMALIZACE ROZPOČTU                            │    │
│         │ • Přerozdělit rozpočet podle výkonu              │    │
│         │ • Návrhy ke schválení                            │    │
│         └─────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  21:00  ┌─────────────────────────────────────────────────┐    │
│         │ DENNÍ REPORT                                     │    │
│         │ • Shrnutí dne                                    │    │
│         │ • Klíčové metriky                                │    │
│         │ • Provedené akce                                 │    │
│         │ • Plán na zítra                                  │    │
│         └─────────────────────────────────────────────────┘    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 Schvalovací proces

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCHVALOVACÍ PROCES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. AI vytvoří návrh akce                                       │
│     │                                                            │
│     ▼                                                            │
│  2. Akce se uloží do DB se statusem PENDING                     │
│     │                                                            │
│     ▼                                                            │
│  3. Vygeneruje se unikátní approval token                       │
│     │                                                            │
│     ▼                                                            │
│  4. Odešle se email s tlačítky:                                 │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ 📧 Nový návrh ke schválení                              │ │
│     │                                                          │ │
│     │ Typ: Nový příspěvek                                     │ │
│     │ Obsah: "Hledáte nový domov? Máme pro vás..."           │ │
│     │                                                          │ │
│     │ 🤖 AI zdůvodnění:                                       │ │
│     │ "Pondělní ráno je ideální čas pro engagement..."        │ │
│     │                                                          │ │
│     │ [✅ SCHVÁLIT]  [✏️ UPRAVIT]  [❌ ZAMÍTNOUT]             │ │
│     └─────────────────────────────────────────────────────────┘ │
│     │                                                            │
│     ▼                                                            │
│  5. Uživatel klikne na tlačítko                                 │
│     │                                                            │
│     ├──▶ SCHVÁLIT: Server provede akci                          │
│     │              └──▶ Potvrzovací email                       │
│     │                                                            │
│     ├──▶ UPRAVIT:  Otevře se webový formulář                   │
│     │              └──▶ Po úpravě se provede                    │
│     │                                                            │
│     └──▶ ZAMÍTNOUT: Akce se zruší                               │
│                     └──▶ AI se učí z odmítnutí                  │
│                                                                  │
│  6. Timeout (24h): Akce automaticky expiruje                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Rozhodovací logika AI

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI ROZHODOVACÍ STROM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT: Aktuální stav, cíle, rozpočet, historie                 │
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. ANALÝZA VÝKONU                                           ││
│  │    • CTR < 1%? → Problém s obsahem                          ││
│  │    • CPC > threshold? → Problém s targetingem               ││
│  │    • Reach klesá? → Potřeba nového obsahu                   ││
│  │    • Budget vyčerpán? → Stop nebo realokace                 ││
│  └─────────────────────────────────────────────────────────────┘│
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 2. POROVNÁNÍ S CÍLI                                         ││
│  │    • Leads: aktuální vs. cíl                                ││
│  │    • Reach: aktuální vs. cíl                                ││
│  │    • Engagement: aktuální vs. cíl                           ││
│  │    • Tempo: stihneme cíl do konce období?                   ││
│  └─────────────────────────────────────────────────────────────┘│
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 3. GENEROVÁNÍ AKCÍ                                          ││
│  │                                                              ││
│  │    IF výkon dobrý AND cíle plněny:                          ││
│  │       → Pokračovat, případně škálovat                       ││
│  │                                                              ││
│  │    IF výkon špatný:                                         ││
│  │       → Analyzovat příčinu                                  ││
│  │       → Navrhnout opravu (obsah/targeting/budget)           ││
│  │                                                              ││
│  │    IF cíle neplněny AND je rozpočet:                        ││
│  │       → Navrhnout zvýšení aktivity                          ││
│  │                                                              ││
│  │    IF rozpočet téměř vyčerpán:                              ││
│  │       → Prioritizovat nejvýkonnější kampaně                 ││
│  │       → Pozastavit nevýkonné                                ││
│  └─────────────────────────────────────────────────────────────┘│
│     │                                                            │
│     ▼                                                            │
│  OUTPUT: Seznam navržených akcí s prioritou a zdůvodněním       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Email šablony

### 5.1 Schvalovací email

```html
Subject: 🤖 [AI Agent] Nový návrh ke schválení: Příspěvek

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 NOVÝ PŘÍSPĚVEK KE SCHVÁLENÍ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Obsah příspěvku:
┌─────────────────────────────────────────────────┐
│ 🏠 Hledáte nový domov v Praze?                  │
│                                                  │
│ Máme pro vás exkluzivní nabídky bytů,           │
│ které jinde nenajdete.                          │
│                                                  │
│ ✅ Bez provize                                  │
│ ✅ Osobní přístup                               │
│ ✅ 10+ let zkušeností                           │
│                                                  │
│ 👉 Kontaktujte nás ještě dnes!                  │
└─────────────────────────────────────────────────┘

🤖 Proč AI navrhuje tento příspěvek:
"Pondělní ráno (9:00) má historicky nejvyšší
engagement. Téma bydlení rezonuje s vaší cílovou
skupinou. Poslední příspěvek byl před 3 dny."

📊 Očekávaný dopad:
• Reach: 2,000 - 5,000 lidí
• Engagement: 50 - 150 interakcí

⏰ Platnost: Tento návrh vyprší za 24 hodin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    [✅ SCHVÁLIT]    [✏️ UPRAVIT]    [❌ ZAMÍTNOUT]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.2 Denní report

```html
Subject: 📊 [AI Agent] Denní report - 6. ledna 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 DENNÍ REPORT - Svobodné Reality

Datum: 6. ledna 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 ROZPOČET
┌─────────────────────────────────────────────────┐
│ Celkový měsíční rozpočet:     10,000 Kč        │
│ Utraceno tento měsíc:          1,850 Kč        │
│ Zbývá:                         8,150 Kč        │
│ Dnešní útrata:                   320 Kč        │
│ ████████░░░░░░░░░░░░ 18.5%                     │
└─────────────────────────────────────────────────┘

📈 DNEŠNÍ VÝKON
┌─────────────────────────────────────────────────┐
│ Metrika          Dnes      Včera     Změna     │
│ ─────────────────────────────────────────────── │
│ Impressions      4,521     3,890     +16.2%    │
│ Reach            2,341     2,105     +11.2%    │
│ Clicks             127       98      +29.6%    │
│ CTR               2.81%    2.52%     +0.29%    │
│ Leads                3        2      +50.0%    │
└─────────────────────────────────────────────────┘

🎯 PLNĚNÍ CÍLŮ (tento měsíc)
┌─────────────────────────────────────────────────┐
│ Cíl              Aktuální   Cíl      Stav      │
│ ─────────────────────────────────────────────── │
│ Leads               12       50      ████░░ 24%│
│ Reach           15,420   100,000     ██░░░░ 15%│
│ Followers           +8       +50     ██░░░░ 16%│
└─────────────────────────────────────────────────┘

✅ PROVEDENÉ AKCE DNES
• 09:15 - Publikován příspěvek "Hledáte byt..."
• 14:30 - Zvýšen rozpočet kampaně #123 na 200 Kč/den
• 18:00 - Pozastavena kampaň #456 (nízký výkon)

❌ ZAMÍTNUTÉ NÁVRHY
• 08:00 - Příspěvek o víkendové prohlídce (zamítnuto)

📋 PLÁN NA ZÍTRA
• 09:00 - Návrh nového příspěvku
• Pokračovat v optimalizaci kampaně #123

🤖 AI DOPORUČENÍ
"Dnešní výkon byl nadprůměrný. Doporučuji
pokračovat v podobném stylu obsahu. Zvážit
zvýšení rozpočtu pro kampaň #123, která
má nejlepší CTR."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    [📊 ZOBRAZIT DETAILY]    [⚙️ NASTAVENÍ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 6. Technická specifikace

### 6.1 Technologie

| Komponenta | Technologie | Důvod |
|------------|-------------|-------|
| Runtime | Node.js 20+ | Async, TypeScript |
| Framework | Express.js | HTTP server pro webhooky |
| Database | SQLite / PostgreSQL | Persistence stavu |
| Scheduler | node-cron | Časované úlohy |
| Email | Nodemailer + SendGrid | Spolehlivé doručování |
| AI | Claude API (Anthropic) | Nejlepší reasoning |
| Facebook | Graph API v18.0 | Oficiální API |

### 6.2 Struktura projektu

```
ai-marketing-agent/
├── src/
│   ├── index.ts                    # Entry point
│   ├── config/
│   │   ├── index.ts                # Hlavní konfigurace
│   │   ├── agent.ts                # Konfigurace agenta
│   │   └── env.ts                  # Environment variables
│   │
│   ├── scheduler/
│   │   ├── index.ts                # Scheduler setup
│   │   └── tasks/
│   │       ├── morningAnalysis.ts
│   │       ├── contentSuggestion.ts
│   │       ├── performanceCheck.ts
│   │       ├── budgetOptimization.ts
│   │       ├── dailyReport.ts
│   │       └── weeklyReport.ts
│   │
│   ├── ai/
│   │   ├── client.ts               # Claude API client
│   │   ├── brain.ts                # Hlavní AI logika
│   │   ├── prompts/
│   │   │   ├── system.ts           # System prompts
│   │   │   ├── analyze.ts          # Analýza výkonu
│   │   │   ├── decide.ts           # Rozhodování
│   │   │   ├── create.ts           # Tvorba obsahu
│   │   │   └── report.ts           # Generování reportů
│   │   └── actions/
│   │       ├── types.ts            # Typy akcí
│   │       └── generator.ts        # Generátor akcí
│   │
│   ├── facebook/
│   │   ├── client.ts               # Graph API client
│   │   ├── campaigns.ts            # Správa kampaní
│   │   ├── adsets.ts               # Správa ad setů
│   │   ├── ads.ts                  # Správa reklam
│   │   ├── posts.ts                # Správa příspěvků
│   │   └── insights.ts             # Získávání dat
│   │
│   ├── approval/
│   │   ├── queue.ts                # Fronta ke schválení
│   │   ├── processor.ts            # Zpracování schválení
│   │   ├── executor.ts             # Vykonání akcí
│   │   └── httpServer.ts           # Webhook endpoint
│   │
│   ├── email/
│   │   ├── client.ts               # Email client
│   │   ├── sender.ts               # Odesílání
│   │   └── templates/
│   │       ├── approval.ts         # Schvalovací email
│   │       ├── confirmation.ts     # Potvrzení
│   │       ├── dailyReport.ts      # Denní report
│   │       └── weeklyReport.ts     # Týdenní report
│   │
│   ├── database/
│   │   ├── client.ts               # DB connection
│   │   ├── schema.ts               # Schéma tabulek
│   │   ├── migrations/             # Migrace
│   │   └── repositories/
│   │       ├── actions.ts          # CRUD pro akce
│   │       ├── budget.ts           # Rozpočet
│   │       └── audit.ts            # Audit log
│   │
│   ├── monitoring/
│   │   ├── health.ts               # Health check
│   │   ├── metrics.ts              # Metriky
│   │   └── alerts.ts               # Alerting
│   │
│   └── utils/
│       ├── logger.ts               # Logging
│       ├── dates.ts                # Práce s daty
│       └── formatting.ts           # Formátování
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/
│   ├── setup.ts                    # Inicializace
│   └── migrate.ts                  # Migrace DB
│
├── package.json
├── tsconfig.json
├── .env.example
├── docker-compose.yml              # Pro lokální dev
├── Dockerfile                      # Pro deployment
└── README.md
```

### 6.3 Environment variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=sqlite://./data/agent.db
# nebo: postgresql://user:pass@host:5432/db

# Facebook
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
FACEBOOK_ACCESS_TOKEN=xxx
FACEBOOK_PAGE_ID=xxx
FACEBOOK_PAGE_ACCESS_TOKEN=xxx
FACEBOOK_ACCOUNT_ID=act_xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=xxx
EMAIL_FROM=agent@svobodne-reality.cz

# Agent
AGENT_NAME=Svobodné Reality Agent
APPROVAL_EMAIL=jan.tesnar@email.cz
APPROVAL_TIMEOUT_HOURS=24
DAILY_BUDGET_LIMIT=500
MONTHLY_BUDGET=10000

# Webhook (pro schvalování)
WEBHOOK_BASE_URL=https://agent.svobodne-reality.cz
WEBHOOK_SECRET=xxx
```

### 6.4 API Endpoints

```
POST /webhook/approve/:token     # Schválení akce
POST /webhook/reject/:token      # Zamítnutí akce
GET  /webhook/edit/:token        # Formulář pro úpravu
POST /webhook/edit/:token        # Uložení úpravy

GET  /health                     # Health check
GET  /metrics                    # Prometheus metriky (volitelné)
```

---

## 7. Bezpečnost

### 7.1 Bezpečnostní opatření

| Oblast | Opatření |
|--------|----------|
| **Tokeny** | Uloženy v env variables, nikdy v kódu |
| **Approval links** | Jednorázové tokeny s expirací |
| **Rate limiting** | Max. X akcí za den |
| **Budget limits** | Tvrdé limity, nelze překročit |
| **Audit log** | Vše se loguje |
| **Webhook secret** | Ověření podpisu requestů |

### 7.2 Zálohy a recovery

- Databáze: Denní automatické zálohy
- Konfigurace: Verzovaná v gitu
- Rollback: Možnost vrátit akce

---

## 8. Monitoring a alerting

### 8.1 Health checks

| Check | Frekvence | Alert při |
|-------|-----------|-----------|
| API dostupnost | 1 min | 3x failure |
| Facebook token | 1 hod | Token expiruje < 7 dní |
| Budget | průběžně | > 90% vyčerpáno |
| Pending actions | 1 hod | > 10 čekajících |

### 8.2 Metriky

- Počet provedených akcí / den
- Úspěšnost akcí (executed vs. failed)
- Průměrná doba schválení
- ROI kampaní

---

## 9. Deployment

### 9.1 Možnosti hostingu

| Služba | Cena | Výhody | Nevýhody |
|--------|------|--------|----------|
| **Railway** | ~$5/m | Jednoduché, auto-deploy | Vendor lock-in |
| **Render** | ~$7/m | Free tier, managed | Studený start |
| **DigitalOcean App** | ~$5/m | Jednoduché | Omezené |
| **VPS (Hetzner)** | ~$4/m | Plná kontrola | Údržba |
| **Vlastní server** | $0 | Bez nákladů | Dostupnost |

### 9.2 Docker deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  agent:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

---

## 10. Roadmap

### Fáze 1: MVP (2 týdny)
- [x] Základní scheduler
- [ ] Facebook API integrace (z MCP)
- [ ] AI brain - základní rozhodování
- [ ] Email notifikace
- [ ] Schvalovací workflow
- [ ] Denní reporty

### Fáze 2: Rozšíření (2 týdny)
- [ ] Webové rozhraní pro úpravy
- [ ] Pokročilá AI logika
- [ ] A/B testování obsahu
- [ ] Týdenní/měsíční reporty

### Fáze 3: Optimalizace (průběžně)
- [ ] Machine learning z historických dat
- [ ] Automatická optimalizace targetingu
- [ ] Integrace s dalšími platformami (Instagram)
- [ ] Mobilní notifikace

---

## 11. Odhad nákladů

### 11.1 Provozní náklady (měsíčně)

| Položka | Odhad |
|---------|-------|
| Hosting | $5 - $10 |
| Claude API | $10 - $30 (dle využití) |
| SendGrid (email) | $0 (free tier) |
| **Celkem** | **$15 - $40 / měsíc** |

### 11.2 Náklady na vývoj

| Fáze | Odhad hodin |
|------|-------------|
| MVP | 40-60 hodin |
| Rozšíření | 30-40 hodin |
| **Celkem** | **70-100 hodin** |

---

## 12. Webový Dashboard

### 12.1 Přehled

Webový dashboard slouží jako hlavní rozhraní pro:
- **Monitoring** - real-time přehled výkonu
- **Komunikace s AI** - chat interface pro dotazy a příkazy
- **Schvalování** - alternativa k emailům
- **Konfigurace** - nastavení agenta

### 12.2 Architektura dashboardu

```
┌─────────────────────────────────────────────────────────────────┐
│                      WEB DASHBOARD                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Frontend  │◀──▶│   Backend   │◀──▶│  Database   │         │
│  │  (HTML/JS)  │    │  (Express)  │    │  (SQLite)   │         │
│  └─────────────┘    └──────┬──────┘    └─────────────┘         │
│                            │                                     │
│                            ▼                                     │
│         ┌─────────────────────────────────────┐                 │
│         │           External APIs              │                 │
│         │  ┌─────────┐  ┌─────────┐           │                 │
│         │  │ Facebook│  │ Claude  │           │                 │
│         │  │   API   │  │   API   │           │                 │
│         │  └─────────┘  └─────────┘           │                 │
│         └─────────────────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 12.3 Stránky dashboardu

| Stránka | URL | Popis |
|---------|-----|-------|
| **Dashboard** | `/` | Hlavní přehled, grafy, KPIs |
| **Kampaně** | `/campaigns` | Seznam a správa kampaní |
| **Příspěvky** | `/posts` | Historie a plánování příspěvků |
| **Schválení** | `/approvals` | Fronta ke schválení |
| **AI Chat** | `/chat` | Komunikace s AI agentem |
| **Reporty** | `/reports` | Historie reportů |
| **Nastavení** | `/settings` | Konfigurace agenta |
| **Logs** | `/logs` | Audit log a historie |

### 12.4 Hlavní dashboard - wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🤖 AI Marketing Agent                    [Jan Tesnar] [⚙️] [🔔 3]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 📊 PŘEHLED                                            Dnes 6.1.2026 ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │                                                                      ││
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐││
│  │  │   ROZPOČET   │ │    REACH     │ │    LEADS     │ │     CTR      │││
│  │  │              │ │              │ │              │ │              │││
│  │  │  8,150 Kč    │ │   15,420     │ │     12       │ │    2.81%     │││
│  │  │  zbývá       │ │   tento měs. │ │   / 50 cíl   │ │    ↑ 0.3%    │││
│  │  │  ████████░░  │ │   ██░░░░░░░░ │ │   ████░░░░░░ │ │   ✅ dobré   │││
│  │  │    81.5%     │ │     15%      │ │     24%      │ │              │││
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌────────────────────────────────────┐ ┌──────────────────────────────┐│
│  │ 📈 VÝKON (posledních 7 dní)        │ │ ⏳ KE SCHVÁLENÍ (3)          ││
│  ├────────────────────────────────────┤ ├──────────────────────────────┤│
│  │                                     │ │                              ││
│  │     ╭─────────────────────╮        │ │ ┌────────────────────────┐  ││
│  │  5k │        ╱╲   ╱╲      │        │ │ │ 📝 Nový příspěvek      │  ││
│  │     │   ╱╲  ╱  ╲ ╱  ╲     │        │ │ │ "Hledáte byt..."       │  ││
│  │  3k │  ╱  ╲╱    ╳    ╲    │        │ │ │ [✅] [✏️] [❌]         │  ││
│  │     │ ╱              ╲   │        │ │ └────────────────────────┘  ││
│  │  1k │╱                ╲──│        │ │ ┌────────────────────────┐  ││
│  │     └─────────────────────┘        │ │ │ 💰 Zvýšit rozpočet     │  ││
│  │      Po Út St Čt Pá So Ne          │ │ │ Kampaň #123: +250 Kč   │  ││
│  │                                     │ │ │ [✅] [❌]              │  ││
│  │  ── Impressions  ── Clicks         │ │ └────────────────────────┘  ││
│  │                                     │ │ ┌────────────────────────┐  ││
│  └────────────────────────────────────┘ │ │ ⏸️ Pozastavit #456      │  ││
│                                          │ │ Důvod: Nízký výkon      │  ││
│  ┌────────────────────────────────────┐ │ │ [✅] [❌]              │  ││
│  │ 🤖 AI AGENT STATUS                  │ │ └────────────────────────┘  ││
│  ├────────────────────────────────────┤ │                              ││
│  │ Status: ✅ Aktivní                  │ └──────────────────────────────┘│
│  │ Poslední akce: před 2 hodinami     │                                 │
│  │ Další plánovaná: 18:00 (kontrola)  │ ┌──────────────────────────────┐│
│  │                                     │ │ 📋 POSLEDNÍ AKCE             ││
│  │ [💬 Chat s AI] [⏸️ Pozastavit]     │ ├──────────────────────────────┤│
│  └────────────────────────────────────┘ │ • 14:30 Publikován příspěvek ││
│                                          │ • 12:00 Kontrola výkonu OK   ││
│                                          │ • 09:15 Denní analýza        ││
│                                          │ • 08:00 Agent spuštěn        ││
│                                          │                              ││
│                                          │ [Zobrazit vše →]             ││
│                                          └──────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.5 AI Chat interface

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💬 Chat s AI Agentem                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  🧑 Ty (10:30)                                                      ││
│  │  ┌─────────────────────────────────────────────────────────────┐   ││
│  │  │ Jak si vedou naše kampaně tento týden?                      │   ││
│  │  └─────────────────────────────────────────────────────────────┘   ││
│  │                                                                      ││
│  │  🤖 AI Agent (10:31)                                                ││
│  │  ┌─────────────────────────────────────────────────────────────┐   ││
│  │  │ Tento týden máte celkově dobré výsledky:                    │   ││
│  │  │                                                              │   ││
│  │  │ 📊 **Souhrn týdne:**                                        │   ││
│  │  │ • Reach: 18,420 (+12% vs. minulý týden)                     │   ││
│  │  │ • Leads: 8 (na dobré cestě k cíli 12/týden)                 │   ││
│  │  │ • Útrata: 1,850 Kč (v rámci rozpočtu)                       │   ││
│  │  │ • Nejlepší kampaň: #123 (CTR 3.2%)                          │   ││
│  │  │                                                              │   ││
│  │  │ ⚠️ Kampaň #456 má nízký výkon, doporučuji pozastavit.       │   ││
│  │  │                                                              │   ││
│  │  │ Chcete, abych připravil podrobnější analýzu?                │   ││
│  │  └─────────────────────────────────────────────────────────────┘   ││
│  │                                                                      ││
│  │  🧑 Ty (10:32)                                                      ││
│  │  ┌─────────────────────────────────────────────────────────────┐   ││
│  │  │ Ano, a připrav návrh příspěvku na téma jarních slev.        │   ││
│  │  └─────────────────────────────────────────────────────────────┘   ││
│  │                                                                      ││
│  │  🤖 AI Agent (10:33)                                                ││
│  │  ┌─────────────────────────────────────────────────────────────┐   ││
│  │  │ Připravil jsem návrh příspěvku:                             │   ││
│  │  │                                                              │   ││
│  │  │ ┌─────────────────────────────────────────────────────────┐ │   ││
│  │  │ │ 🌸 JARNÍ SLEVY na realitní služby!                      │ │   ││
│  │  │ │                                                          │ │   ││
│  │  │ │ Využijte speciální nabídku:                             │ │   ││
│  │  │ │ ✅ Prodej nemovitosti bez provize                       │ │   ││
│  │  │ │ ✅ Bezplatné ocenění                                    │ │   ││
│  │  │ │ ✅ Platí do konce března                                │ │   ││
│  │  │ │                                                          │ │   ││
│  │  │ │ 📞 Volejte: 774 700 799                                 │ │   ││
│  │  │ └─────────────────────────────────────────────────────────┘ │   ││
│  │  │                                                              │   ││
│  │  │ [✅ Schválit a publikovat] [✏️ Upravit] [💾 Uložit draft]  │   ││
│  │  └─────────────────────────────────────────────────────────────┘   ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 💬 Napište zprávu...                                    [Odeslat ➤]││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  Příklady: "Analyzuj kampaň #123" | "Navrhni příspěvek" | "Zobraz report"│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.6 Technologie frontendu

| Komponenta | Technologie | Důvod |
|------------|-------------|-------|
| **HTML/CSS** | Vanilla + Tailwind CSS | Rychlé, bez build stepu |
| **JavaScript** | Vanilla ES6+ | Žádné závislosti |
| **Grafy** | Chart.js | Jednoduché, lehké |
| **Ikony** | Heroicons / Emoji | Bez závislostí |
| **Real-time** | Server-Sent Events | Jednoduché, nativní |

### 12.7 API Endpoints pro dashboard

```
# Dashboard data
GET  /api/dashboard              # Hlavní přehled
GET  /api/dashboard/stats        # KPIs
GET  /api/dashboard/chart/:type  # Data pro grafy

# Kampaně
GET  /api/campaigns              # Seznam kampaní
GET  /api/campaigns/:id          # Detail kampaně
GET  /api/campaigns/:id/insights # Insights kampaně

# Příspěvky
GET  /api/posts                  # Seznam příspěvků
POST /api/posts                  # Vytvořit příspěvek

# Schvalování
GET  /api/approvals              # Fronta ke schválení
POST /api/approvals/:id/approve  # Schválit
POST /api/approvals/:id/reject   # Zamítnout

# AI Chat
POST /api/chat                   # Poslat zprávu AI
GET  /api/chat/history           # Historie chatu

# Agent
GET  /api/agent/status           # Status agenta
POST /api/agent/pause            # Pozastavit
POST /api/agent/resume           # Obnovit

# Nastavení
GET  /api/settings               # Získat nastavení
PUT  /api/settings               # Uložit nastavení

# Real-time
GET  /api/events                 # SSE stream pro live updates
```

### 12.8 Struktura frontend souborů

```
dashboard/
├── index.html                   # Hlavní dashboard
├── campaigns.html               # Správa kampaní
├── posts.html                   # Příspěvky
├── approvals.html               # Schvalování
├── chat.html                    # AI Chat
├── reports.html                 # Reporty
├── settings.html                # Nastavení
├── logs.html                    # Audit log
│
├── css/
│   ├── tailwind.min.css         # Tailwind CSS
│   ├── main.css                 # Vlastní styly
│   └── charts.css               # Styly pro grafy
│
├── js/
│   ├── app.js                   # Hlavní aplikace
│   ├── api.js                   # API client
│   ├── charts.js                # Grafy
│   ├── chat.js                  # Chat funkcionalita
│   ├── notifications.js         # Notifikace
│   └── realtime.js              # SSE handler
│
└── assets/
    ├── logo.svg
    └── favicon.ico
```

### 12.9 Responzivní design

Dashboard bude responzivní pro použití na:
- 🖥️ Desktop (1920px+)
- 💻 Laptop (1024px - 1919px)
- 📱 Tablet (768px - 1023px)
- 📱 Mobil (do 767px) - zjednodušený pohled

### 12.10 Zabezpečení dashboardu

| Ochrana | Implementace |
|---------|--------------|
| **Autentizace** | HTTP Basic Auth nebo session |
| **HTTPS** | Let's Encrypt certifikát |
| **CSRF** | Token v každém POST |
| **Rate limiting** | Max 100 req/min |
| **IP whitelist** | Volitelně pouze z domácí sítě |

### 12.11 Deployment na domácím serveru

```bash
# Předpoklady
# - Node.js 20+
# - Domácí server s Linux/macOS
# - Volný port (např. 3000)
# - Doména nebo DynDNS (volitelně)

# 1. Klonování
git clone https://github.com/user/ai-marketing-agent.git
cd ai-marketing-agent

# 2. Instalace
npm install

# 3. Konfigurace
cp .env.example .env
nano .env  # Vyplnit hodnoty

# 4. Build
npm run build

# 5. Spuštění
npm start

# 6. Systemd service (pro auto-start)
sudo nano /etc/systemd/system/ai-agent.service
```

```ini
# /etc/systemd/system/ai-agent.service
[Unit]
Description=AI Marketing Agent
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/ai-marketing-agent
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# 7. Aktivace služby
sudo systemctl enable ai-agent
sudo systemctl start ai-agent

# 8. Reverse proxy (Nginx) - volitelně
sudo apt install nginx
sudo nano /etc/nginx/sites-available/ai-agent
```

```nginx
# /etc/nginx/sites-available/ai-agent
server {
    listen 80;
    server_name agent.local;  # nebo vaše doména

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 13. Závěr

Tento návrh popisuje kompletní autonomního AI agenta pro správu Facebook marketingu. Systém je navržen s důrazem na:

1. **Bezpečnost** - human-in-the-loop schvalování
2. **Transparentnost** - emailové reporty a audit log
3. **Efektivitu** - AI-powered rozhodování
4. **Škálovatelnost** - modulární architektura

Další krok: Implementace MVP s základními funkcemi.

---

*Dokument vytvořen: 6. ledna 2026*
*Verze: 1.0*
