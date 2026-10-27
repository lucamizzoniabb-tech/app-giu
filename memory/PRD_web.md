# PRD – Gare Ufficiali Live (FIPSAS Sorteggi Pro)

## Original problem
L'utente ha fornito un prompt/HTML di un'app per gare di pesca sportiva FIPSAS e ha chiesto di migliorarla e modificarla. Piano approvato: home pubblica con gare e classifiche live, area riservata Admin/Giudice/Ispettore, sorteggio FIPSAS, pesa live, validazione delle misure in tempo reale, chat, export CSV, circolari.

## Modifiche successive chieste dall'utente
- Admin unico: mizzxbox@hotmail.it / rosalba; giudici e ispettori si registrano e vengono approvati dall'Admin
- L'ispettore entra in una gara solo su invito del giudice e dopo averlo accettato
- Settori mostrati come elenco e non come tabelle
- Punti Surf Casting interi, presi dalla Tabella di conversione PDF (52 specie, cm 7-83)
- Caricamento dei PDF di circolari e regolamenti nell'app (Object Storage)
- Gare in ordine di data, con quelle live in alto; titolo dell'app "Gare Ufficiali Live"
- Il giudice gestisce gare e iscrizioni e può creare le proprie gare; l'ispettore inserisce solo le misure

## Architettura
- FastAPI + MongoDB:
  - `server.py`: rotte
  - `logic.py`: settori, sorteggio, classifica e punti da tabella
  - `seed.py`: dati demo
  - `storage.py`: Emergent Object Storage
  - `specie_tabella.json`: tabella di conversione
- Autenticazione JWT con token Bearer (localStorage) e bcrypt
- Tempo reale tramite polling ogni 2,5 secondi
- React con pagine Home, GaraPublic, Login, Admin, GiudiceList, Giudice e Ispettore

## Implementato (giugno 2026)
- Tutta la Fase 1 dell'MVP, più le modifiche elencate sopra
- Iterazione di test 1: backend 24/24 e tutti i flussi frontend passati
- Correzioni successive al test:
  - eliminando una gara si eliminano anche i suoi inviti
  - solo l'Admin può riaprire una gara conclusa
  - la Validazione mostra i punti di ogni misura

## Backlog
- P1: blocco degli accessi dopo troppi tentativi errati; restrizione del CORS
- P1: avviso quando un Box o una Coppia non entra intero in un settore
- P2: foto della cattura, verbale PDF, iscrizioni online, statistiche (Fase 2)
- P3: notifiche push, funzionamento offline, dominio dedicato (Fase 3)
