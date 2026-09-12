# IceC Lab Next v0.4.0 — Scientific Foundation v2

Novità: tipologia tecnica e produttore per ingrediente; provenienza per i principali dati tecnici; libreria tecnica iniziale; dati produttore prioritari; qualità dell’analisi scientifica e diagnostica prudenziale. Lo schema PostgreSQL resta compatibile: i nuovi attributi sono salvati nel payload JSONB.

## Aggiornamento

Dopo aver pubblicato questa release sul branch `next`, sull’installazione permanente eseguire `./scripts/update.sh`. Il database viene salvato automaticamente prima dell’aggiornamento.

# IceC Lab Next v0.3.2 - Update & Operations

PostgreSQL resta la fonte primaria. Questa release introduce un workflow permanente basato su Git per aggiornare la singola installazione `~/projects/icec`, senza creare una nuova cartella a ogni release.

## Prima installazione della v0.3.2 sul branch `next`
Questa e l'ultima release che richiede un aggiornamento manuale dei file. Dopo aver portato questi file nel branch `next` e averli committati/pushati, gli aggiornamenti successivi si eseguono con `./scripts/update.sh`.

Il progetto Compose resta `icec-lab-next-v03`, quindi continua a usare il volume PostgreSQL esistente. Non usare `docker compose down -v`.

## Aggiornamento automatico
Dalla cartella permanente:

```bash
cd ~/projects/icec
./scripts/update.sh
```

Lo script:
1. verifica branch `next` e working tree pulito;
2. crea un backup PostgreSQL SQL;
3. esegue fetch e fast-forward da `origin/next`;
4. ricostruisce/avvia i container;
5. attende DB, API e Web healthy;
6. verifica API e integrita dati.

Se ci sono modifiche locali non committate, lo script si ferma senza aggiornarle o sovrascriverle.

## Stato rapido

```bash
./scripts/status.sh
```

Mostra versione, stato container, health API e ultimo backup.

## Backup e restore

```bash
./scripts/backup.sh
./scripts/restore.sh backups/icec-YYYYMMDD-HHMMSS.sql
```

`restore.sh` richiede conferma esplicita. I backup sono esclusi da Git.

## Comandi quotidiani

```bash
docker compose ps
docker compose logs -f
docker compose down
docker compose up -d
```

Non usare `docker compose down -v` salvo intenzione esplicita di eliminare il database.
