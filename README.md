# IceC Lab Next v0.3.1 - Data Safety & Integrity

Questa release consolida la v0.3: PostgreSQL resta la fonte primaria e vengono aggiunti backup, ripristino, export JSON e controlli di integrita.

## Aggiornamento dalla v0.3 senza perdere il database
La v0.3.1 usa esplicitamente lo stesso nome progetto Compose della cartella `IceC-Lab-Next-v0.3` (`icec-lab-next-v03`). In questo modo riutilizza il volume `icec-lab-next-v03_icec_postgres_data` creato dalla v0.3.

Non usare `docker compose down -v`.

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Apri http://localhost:3000 e verifica che ingredienti e ricette siano presenti.

## Verifica integrita
In **Profili & range > Sicurezza dati** usa **Verifica integrita**. Il controllo verifica conteggi, note orfane e nomi duplicati ignorando maiuscole/minuscole.

Da API e disponibile anche:

```bash
curl http://localhost:3000/api/integrity
```

## Export JSON portabile
In **Profili & range > Sicurezza dati** usa **Esporta JSON**. Il file contiene ingredienti, ricette, profili e note ed e utile anche per migrazioni applicative.

Il pulsante **Ripristina da JSON** richiede conferma e sostituisce lo stato dell'utente locale nel database.

## Backup PostgreSQL completo
Prima di un aggiornamento importante:

```bash
./scripts/backup.sh
```

I backup vengono creati in `backups/` come file SQL.

Per ripristinare:

```bash
./scripts/restore.sh backups/icec-YYYYMMDD-HHMMSS.sql
```

Il comando richiede di digitare `RESTORE` prima di procedere.

## Test persistenza consigliato
1. Esegui `./scripts/backup.sh`.
2. In IceC crea un ingrediente di test e attendi `PostgreSQL · sincronizzato`.
3. Esegui **Verifica integrita**.
4. `docker compose down` e poi `docker compose up -d`.
5. Apri IceC in un secondo browser/incognito: il dato deve essere presente.

## Sicurezza
- PostgreSQL non espone la porta 5432 a Windows.
- `docker compose down` conserva i dati.
- `docker compose down -v` elimina il volume: non usarlo salvo intenzione esplicita di cancellare il database.
