# MyMoney

App mobile per tenere traccia di entrate e uscite, con budget, spese ricorrenti e report mensili e annuali.
Tutti i dati restano **solo sul telefono** (database SQLite locale): nessun account, nessun server.

Costruita con [Expo](https://expo.dev) (SDK 58), React Native e Expo Router.

## Funzionalità

- **Home**: selettore del mese con saldo, entrate e uscite, scadenze ricorrenti ancora da registrare nel mese, ricerca/filtri e lista dei movimenti del mese raggruppata per giorno; aggiunta rapida di un movimento.
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

## Download

Scarica l'ultima versione per **Android** dalla pagina [Releases](https://github.com/gdaloiso/MyMoney/releases/latest): nella sezione *Assets* trovi il file `.apk`.

Per installarlo:

1. Apri il file `.apk` dal telefono.
2. Se Android lo chiede, consenti l'installazione da questa fonte (*Installa app sconosciute*).
3. Se Google Play Protect segnala l'app come non verificata, scegli *Installa comunque*: l'app non è pubblicata sul Play Store.

Gli aggiornamenti non sono automatici: per passare a una nuova versione scarica il nuovo `.apk` e installalo sopra quello esistente. I dati e le impostazioni restano.

Per iPhone non c'è un pacchetto scaricabile: si può provare con Expo Go (vedi sotto).

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
  app/          Schermate (Expo Router): tab Home, Report, Impostazioni; form e schermate secondarie
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
