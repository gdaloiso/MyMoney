# MyMoney

App mobile per tenere traccia di entrate e uscite, con budget, spese ricorrenti e report mensili e annuali.
Tutti i dati restano **solo sul telefono** (database SQLite locale): nessun account, nessun server.

Costruita con [Expo](https://expo.dev) (SDK 58), React Native e Expo Router.

## Funzionalità

- **Home**: saldo del mese, entrate e uscite, prossime spese ricorrenti in scadenza, aggiunta rapida di un movimento.
- **Movimenti**: lista raggruppata per mese (con totali) e per giorno, intestazioni dei mesi fisse durante lo scroll.
  Ricerca per nota, categoria o importo; filtri per tipo (entrate/uscite) e per categoria. Tocca per modificare, tieni premuto per eliminare.
- **Report**:
  - vista *Mese*: risparmio, budget, spese per categoria, andamento degli ultimi 6 mesi;
  - vista *Anno*: saldo annuale, spesa media mensile, confronto con l'anno precedente, mese più caro e migliore, grafico a 12 mesi, spese per categoria.
- **Budget** mensili per categoria, con avviso quando ti avvicini o superi il limite.
- **Spese ricorrenti** (affitto, abbonamenti…) che si registrano da sole alla scadenza.
- **Categorie** personalizzabili (nome, icona, colore).
- **Sicurezza**: blocco con PIN e sblocco biometrico (Face ID / impronta).
- **Backup**: esportazione e importazione CSV dei movimenti (la reimportazione non crea doppioni).
- Tema chiaro, scuro o automatico.

## Sviluppo

Requisiti: Node.js e npm.

```bash
npm install
npx expo start
```

Dal terminale puoi aprire l'app su un emulatore Android, su un simulatore iOS o con [Expo Go](https://expo.dev/go).

Prima di considerare finita una modifica:

```bash
npx tsc --noEmit   # typecheck
npx expo lint      # lint
```

> Le cartelle `ios/` e `android/` non sono nel repository: vengono generate da Expo (Continuous Native Generation).
> La configurazione nativa si cambia da `app.json` e dai config plugin, mai a mano.

## Generare l'APK

La build gira nel cloud con [EAS Build](https://docs.expo.dev/build/introduction/) e serve un account Expo.

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Il profilo `preview` (in `eas.json`) produce un **APK** installabile direttamente: a fine build ottieni un link da aprire
sul telefono. Il profilo `production` produce invece un `.aab` per il Play Store.

Alla prima build lascia che EAS generi e gestisca la chiave di firma. Gli aggiornamenti installati sopra una versione
precedente devono essere firmati con la stessa chiave.

- Package Android: `it.gdalo.mymoney`
- Per reinstallare una build passata: `npx eas-cli@latest build:run -p android`

## Struttura del progetto

```
src/
  app/          Schermate (Expo Router): tab Home, Movimenti, Report, Impostazioni; form e schermate secondarie
  components/   Componenti condivisi (card, righe movimento, filtri, dashboard annuale, tastierino PIN…)
  features/     Provider di stato (movimenti, categorie, budget, ricorrenze, blocco, impostazioni) e backup CSV
  db/           Accesso al database SQLite
  lib/          Logica pura: formattazione, report, filtri, ricorrenze, CSV, categorie, tipi
  constants/    Tema (colori, spaziature)
  hooks/        Hook per tema e schema colori
```

## Note

- I dati non vengono sincronizzati né salvati in cloud. Per cambiare telefono: esporta il CSV dalle Impostazioni,
  salvalo (Drive, e-mail…) e importalo sul nuovo dispositivo. Il CSV contiene solo i movimenti: budget e ricorrenze vanno reimpostati.
- Se disinstalli l'app perdi i dati: fai un'esportazione CSV prima.
