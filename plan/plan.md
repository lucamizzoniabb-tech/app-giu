# FIPSAS Sorteggi Pro

Web app per gestire le gare di pesca sportiva FIPSAS: iscritti, settori automatici, sorteggio, pesa live, classifiche ed export.
Ha una home pubblica con le gare e le classifiche live, un'area riservata ad Admin, Giudice e Ispettori e la comunicazione in tempo reale tra Giudice e Ispettori di sponda sui loro cellulari.

## A chi è rivolta
- **Pubblico e concorrenti**: consultano le gare e le classifiche live senza login.
- **Admin**: crea le gare, gestisce gli utenti, assegna le gare ai giudici e i settori agli ispettori.
- **Giudice di gara**: gestisce iscritti, sorteggio, campo gara, pesa, validazione delle misure, classifica, chat e chiusura gara.
- **Ispettore di sponda**: dalla spiaggia inserisce le misure dei concorrenti del proprio settore.

## Funzionalità principali ed esperienza

### Home pubblica (senza login)
- Elenco di 8-10 gare d'esempio (es. "Selettiva Provinciale Surf Casting Frosinone"; località come Ceccano, Aniene, Ponza), con badge della specialità, data, luogo, tipo gara, stato (Iscrizioni Aperte / Sorteggiata / In Corso Live / Conclusa), iscritti sui posti totali e settori (es. "24 iscritti => A10 B10 C TECNICO 4").
- Bottoni "Dettaglio" e "Classifica Live Pubblica": la classifica è in sola lettura, si aggiora in tempo reale e mostra solo le misure approvate.
- Bottone "Area Giudici" nell'intestazione per andare al login.
- Sezione **Circolari e Regolamenti**: documenti con titolo, anno, specialità e link al PDF ufficiale FIPSAS (ad esempio la Circolare Normativa Surf Casting 2026 su fipsas.it), con filtro per specialità e anno. L'admin può aggiungere, modificare ed eliminare i documenti.

### Login e ruoli
Account di prova:

| Utente | Password | Ruolo | Assegnazione d'esempio |
|---|---|---|---|
| admin | admin123 | ADMIN | tutto |
| giudice1 | giudice123 | GIUDICE | gara Surf Casting demo |
| ispettore1 | isp123 | ISPETTORE | SETTORE A |
| ispettore2 | isp123 | ISPETTORE | SETTORE B |
| ispettore3 | isp123 | ISPETTORE | SETTORE C TECNICO |

- La sessione resta attiva sul dispositivo; dopo il login ogni utente vede il pannello del proprio ruolo.

### Pannello Admin
- Gestione gare (creazione, modifica, eliminazione): nome, data, luogo, specialità, tipo gara, zone, numero massimo di iscritti, stato.
- Gestione utenti giudici e ispettori (creazione, modifica, eliminazione).
- Assegnazione di una gara a un giudice e di gara e settore a ogni ispettore.
- Iscritti di ogni gara ed export in CSV.

### Pannello Giudice (gara assegnata)
- **Intestazione**: scelta della specialità tra le 20 previste (Pesca al Colpo, Fiume, Feeder, Feeder Method, Trota Lago, Trota Torrente, Trout Area, Surf Casting, Canna Riva, Canna Natante, Bolentino, Carp Fishing, Bass Belly, Bass Natante, Kayak, Predatori Natante, Mosca, Lancio Tecnico, Street, Storione) e del tipo gara (Individuale, Squadre 4, Box 4, Coppie 2, Società). Badge con Specialità | Tipo | Iscritti | Settori.
- **Iscritti**:
  - form con nome, cognome, società, provincia, squadra/box/coppia, rank facoltativo e casella "esterno precedente";
  - tabella con eliminazione;
  - importazione CSV da incollare (Nome,Cognome,Società,Provincia,Squadra);
  - preset demo di 24 nomi di 6 società;
  - configurazione delle zone da 1 a 4 e bottone Sorteggia.
- **Settori automatici FIPSAS**:
  - settori da 10 e un solo settore TECNICO con il resto, senza posti vuoti: 24 => A10 B10 C TECNICO 4; 32 => A10 B10 C10 D TECNICO 2;
  - banner "{n} ISCRITTI => {settori} - NESSUN POSTO VUOTO".
- **Sorteggio** secondo il tipo gara:
  - Individuale: società distribuite al massimo tra i settori e una testa di serie per settore, se c'è il rank;
  - Squadre 4: i 4 componenti in 4 zone diverse;
  - Box 4: 4 picchetti contigui nello stesso settore, con lo stesso colore;
  - Coppie 2: 2 picchetti contigui;
  - Società: al massimo 1 per società in ogni settore.
  - Picchetti mescolati da 1 a n; gli esterni sono il primo e l'ultimo di ogni zona.
- **Campo gara**: griglia per zona e settore con picchetto, nome, società e squadra; il settore tecnico ha lo sfondo giallo.
- **Pesa Live**:
  - una card per concorrente o gruppo;
  - Surf Casting: specie, cm, peso facoltativo, elenco delle catture con specie, cm, misura minima, punti base, bonus e totale, ed eliminazione;
  - Colpo/Feeder e simili: singole pesate o peso totale;
  - per Coppie, Box e Squadre: totale del gruppo con il dettaglio per componente, e selettore della vista Individuale/Gruppi.
- **Punteggio Surf Casting**:
  - tabella delle misure minime e dei coefficienti fornita nel prompt;
  - sotto misura vale 1 punto; altrimenti (cm − misura minima + 1) × coefficiente + base, più un bonus di 50;
  - il totale è la somma dei punti più la somma dei pesi.
- **Validazione delle misure**: le misure inviate dagli ispettori arrivano in tempo reale con un avviso e un contatore delle pendenti. Il giudice può approvare, rigettare con una motivazione o correggere specie e cm. Solo le misure approvate entrano in Pesa e Classifica.
- **Classifica**:
  - penalità per settore 1, 2, 3… in base al totale decrescente, con corona verde per il primo;
  - sotto-schede Settori (Pos, Picchetto, Nome, Società, Squadra, N. Pesci, Tot, Pen, Esterno), Squadre/Box/Coppie (somma delle penalità), Società (somma dei migliori) e Assoluta;
  - banner giallo per il settore tecnico ed export CSV.
- **Chat Ispettori**: chat in tempo reale con tutti gli ispettori o con uno solo.
- **Chiudi gara**: la gara passa a "Conclusa", le misure si bloccano e la classifica pubblica diventa definitiva.

### Pannello Ispettore (settore assegnato)
- Vede solo i concorrenti del proprio settore (picchetto e nome).
- Per ogni concorrente: specie con la misura minima indicata, cm a passi di 0,5, peso facoltativo e bottone "Invia misura". Un'anteprima dei punti avvisa se la cattura è sotto misura.
- Storico delle misure inviate con lo stato (In attesa / Approvata / Rigettata con motivazione), che si aggiorna in tempo reale.
- Chat con il giudice.

## Flusso utente
1. Il pubblico apre la home, vede le gare e la classifica live della gara in corso.
2. L'admin crea una gara, la assegna a giudice1 e assegna i settori agli ispettori.
3. Il giudice carica gli iscritti (preset demo o CSV), configura le zone e sorteggia; i settori e il campo gara si generano.
4. Telefono A, ispettore1 (SETTORE A): sceglie il picchetto 7, indica Spigola 38 cm e invia.
5. Telefono B, giudice1: la misura compare subito; il giudice la approva oppure la rigetta scrivendo il motivo, e può chiedere chiarimenti in chat.
6. L'ispettore vede subito l'esito; la pesa, la classifica interna e la classifica pubblica si aggiornano.
7. Il giudice chiude la gara e la classifica diventa definitiva; il CSV si può esportare.

## Aspetto e sensazione d'uso
- Minimal: sfondo bianco, bordi sottili, tipografia pulita, nessun testo di regolamento né suggerimento nelle schermate operative.
- Pensato prima per il cellulare: pulsanti grandi per l'uso in spiaggia e campi numerici con tastiera numerica.
- Il giallo segnala il settore tecnico, il verde il primo classificato; per gli stati delle misure si usano colori discreti.

## Fasi di sviluppo
**Fase 1 – MVP (si realizza ora)**
- Home pubblica con le gare demo, classifica live pubblica e sezione Circolari e Regolamenti.
- Login con i 5 account di prova e i tre pannelli per ruolo.
- Pannello Admin: gare, utenti, assegnazioni e documenti.
- Giudice: iscritti, settori automatici, sorteggio per tutti i tipi gara, campo gara, pesa live, validazione delle misure, classifiche, export CSV, chat e chiusura gara.
- Ispettore: invio delle misure del settore, stato in tempo reale e chat.
- Dati condivisi online: telefoni diversi si vedono in tempo reale.
- Una gara Surf Casting demo già sorteggiata, con 24 iscritti, settori A10 B10 C TECNICO 4, ispettori assegnati e alcune misure d'esempio, per provare subito con due telefoni.

**Fase 2**
- Foto della cattura allegata alla misura.
- Verbale di gara in PDF.
- Iscrizioni online del pubblico alle gare con "Iscrizioni Aperte".
- Storico e statistiche per concorrente e società.

**Fase 3**
- Notifiche push con l'app chiusa.
- Funzionamento in assenza di segnale in spiaggia, con invio automatico al ritorno della rete.
- Caricamento dei PDF delle circolari direttamente nell'app.
- Pubblicazione online definitiva con dominio dedicato.

## Ipotesi
- Il prompt chiedeva login e dati solo nel browser. Per usare due telefoni diversi i dati sono invece condivisi online e restano gli stessi su tutti i dispositivi.
- Il prompt chiedeva un singolo file App.tsx: qui l'app viene costruita come applicazione completa con un servizio dati, perché serve la sincronizzazione tra telefoni. Le funzionalità restano le stesse.
- La tabella delle specie contiene le 47 specie elencate nel prompt (non 48), senza aggiungerne altre.
- I nomi abbreviati dei coefficienti (es. "Aguglia Imp", "Balestra", "Serra") vengono collegati alle specie della tabella delle misure minime.
- I valori BASE erano incompleti. Si usano quelli indicati (Aguglia 25, Cefalo 30, Spigola 35, Orata 28, Mormora 22, Sarago Maggiore 30, Sogliola 30, Triglie 20, Serra 32, Leccia 40) e 20 per tutte le altre specie; l'admin può modificarli.
- Il peso si inserisce in grammi e si somma ai punti, come da formula del prompt.
- Il flusso del punto C, troncato nel prompt, è stato completato così: l'ispettore invia, il giudice approva, rigetta o corregge, la chat è in tempo reale e la classifica conta solo le misure approvate.
- Con lo stesso account si può accedere da più dispositivi; le assegnazioni dell'ispettore valgono per una gara alla volta.
- Le circolari sono link ai PDF ufficiali sul sito FIPSAS; quelle precaricate sono poche e reali, le altre le aggiunge l'admin.
- L'interfaccia è interamente in italiano.
