# Vybe su App Store — guida passo passo (senza Mac)

Tutto si fa dal browser, anche da iPad o iPhone. Segui i passi in ordine.
Dove vedi **⚠️ segreto** non incollare mai quel valore in chat o su GitHub: va solo nei siti indicati.

---

## 1. Account Apple Developer (99 $ all'anno)

1. Vai su **developer.apple.com/programs/enroll** e accedi con il tuo ID Apple
   (serve l'autenticazione a due fattori attiva sull'ID Apple).
2. Scegli **Individuo / Ditta individuale** (per una società servirebbe il numero D-U-N-S).
3. Paga i 99 $. L'attivazione può richiedere da qualche ora a 2 giorni.

## 2. L'identità dell'app (Bundle ID) con le notifiche

1. developer.apple.com → **Certificates, Identifiers & Profiles** → **Identifiers** → **+**.
2. Scegli **App IDs** → **App**.
3. Descrizione: `Vybe` · Bundle ID: **Explicit** → `it.vybe.app`
   (è già scritto così nel progetto: se lo cambi, va cambiato anche in `app/capacitor.config.json`,
   nel progetto Xcode e in `codemagic.yaml`).
4. Nelle Capabilities spunta **Push Notifications**. Salva.

## 3. La chiave per le notifiche (APNs) → su Vercel

1. developer.apple.com → **Keys** → **+** → nome `Vybe Push` → spunta **Apple Push Notifications service (APNs)** → Continua → Registra.
2. **Scarica il file `.p8`** (si può scaricare una volta sola: conservalo bene). ⚠️ segreto
3. Annota il **Key ID** (10 caratteri) e il tuo **Team ID** (in alto a destra, o in Membership).
4. Vai su **vercel.com** → progetto **vybe** → **Settings** → **Environment Variables** e aggiungi
   (ambiente: Production):

   | Nome | Valore |
   |---|---|
   | `APNS_KEY` | tutto il testo del file `.p8`, comprese le righe `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----` ⚠️ segreto |
   | `APNS_KEY_ID` | il Key ID |
   | `APNS_TEAM_ID` | il Team ID |
   | `APNS_BUNDLE_ID` | `it.vybe.app` |

5. Dopo averle salvate, serve un nuovo deploy perché il server le legga (chiedimelo: lo faccio io).

Il server è già pronto: appena ci sono queste 4 variabili, le notifiche arrivano anche all'app iPhone.

## 4. L'app su App Store Connect

1. Vai su **appstoreconnect.apple.com** → **App** → **+** → **Nuova app**.
2. Piattaforma **iOS** · Nome **Vybe** (se è già preso prova `Vybe Social` o `Vybe – Amici veri`) ·
   Lingua principale **Italiano** · Bundle ID **it.vybe.app** · SKU `vybe-ios` · Accesso completo.

## 5. La chiave per Codemagic (App Store Connect API)

1. App Store Connect → **Utenti e accessi** → **Integrazioni** → **App Store Connect API** → **Chiavi del team** → **+**.
2. Nome `Codemagic`, accesso **App Manager** → Genera.
3. Scarica il file `.p8` della chiave ⚠️ segreto e annota **Issuer ID** e **Key ID**.

## 6. Codemagic: compila l'app nel cloud e la manda su TestFlight

1. Vai su **codemagic.io** → accedi con **GitHub** → aggiungi il repository **Vybe**.
2. **Team settings → Integrations → Developer Portal → Manage keys → Add key**:
   - nome: **`Vybe App Store Connect`** (esattamente così: è il nome scritto in `codemagic.yaml`)
   - Issuer ID, Key ID e il file `.p8` del punto 5.
3. **Team settings → Code signing identities**:
   - **iOS certificates** → **Generate certificate** → tipo **Apple Distribution** (usa la chiave appena aggiunta).
   - **iOS provisioning profiles** → **Fetch profiles** → scegli il profilo **App Store** per `it.vybe.app`
     (se non c'è, Codemagic ti fa crearlo; deve includere le Push Notifications).
4. Apri l'app Vybe in Codemagic → **Start new build** → workflow **Vybe iPhone → TestFlight** → branch **main**.
5. Dopo circa 15–25 minuti la build arriva su App Store Connect → **TestFlight**.

> Il piano gratuito di Codemagic include 500 minuti al mese su Mac: bastano per molte build.

## 7. Provala sul tuo iPhone (TestFlight)

1. Installa l'app **TestFlight** dall'App Store.
2. App Store Connect → la tua app → **TestFlight** → **Tester interni** → aggiungi te stesso.
3. Apri TestFlight sull'iPhone e installa Vybe.
4. Controlla: accesso, feed, chat, foto/video, fotocamera, mappa, **notifiche** (Impostazioni → Notifiche → "Mandami una notifica di prova").

## 8. Scheda dello Store e invio in revisione

Tutti i testi pronti da copiare sono in **`app/TESTI-APP-STORE.md`**:
descrizione, parole chiave, risposte per la privacy, classificazione per età, note per la revisione.

Ti servono anche:
- **Screenshot** dell'iPhone (6,9" o 6,5"): fai 3–6 screenshot dall'app TestFlight (tasto laterale + volume su).
- **Account di prova** per chi fa la revisione: creane uno nuovo (es. `revisione.vybe@…`) con 1–2 post,
  che segue e viene seguito da un altro account di prova, così possono provare anche la chat.

Poi: App Store Connect → la tua app → **Distribuzione** → scegli la build → **Invia per la revisione**.
La revisione di solito dura 1–3 giorni.

---

### Domande frequenti

- **Devo ricompilare l'app per ogni novità di Vybe?** No. L'app apre il sito Vybe: tutte le novità arrivano da sole.
  Si ricompila solo per cambiare icona, permessi o parti native.
- **Gli acquisti (Vybe+, regali, mance)?** Nell'app iPhone sono spenti: Apple vorrebbe i suoi pagamenti.
  Sul sito restano come sono.
- **Chi ha meno di 14 anni?** Non può iscriversi. Se un account esistente ha meno di 14 anni, nell'app iPhone vede un avviso e può solo uscire.
