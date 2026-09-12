# IceC Lab Next v0.6.0 - Production Tools

Release focalizzata sull'uso quotidiano in laboratorio. PostgreSQL resta la fonte primaria e lo schema esistente rimane compatibile: i nuovi attributi degli ingredienti (es. allergeni) sono conservati nei payload JSONB.

## Novita v0.6.0
- Stampa Produzione dal Bilanciatore e dal Ricettario.
- Scheda tecnica stampabile/salvabile in PDF dal browser con parametri tecnici, nutrizionali stimati e allergeni.
- Calcolo nutrizionale ricetta per 100 g dai valori degli ingredienti.
- Allergeni dichiarati nella scheda ingrediente e aggregazione automatica nella ricetta.
- Costing v2: costo miscela, EUR/kg, costo batch/vaschetta e costo porzione; resta l'avviso di costo incompleto se manca un prezzo.
- Confronto tra ricetta attuale e snapshot associato a una nota post-produzione, con delta dei parametri e delle grammature.
- Versione Web/API allineata a 0.6.0.

## Nota su nutrizionali e allergeni
I risultati dipendono dalla completezza e correttezza dei dati inseriti. Non sostituiscono analisi di laboratorio, etichette originali o verifiche normative professionali.

## Aggiornamento manuale con cartella update
1. Eseguire `./scripts/backup.sh` dalla root `~/projects/icec`.
2. Estrarre lo ZIP in `~/projects/icec/update/`.
3. Copiare il contenuto della cartella release sulla root dell'app senza sostituire `.env`.
4. Verificare `cat VERSION` (deve essere `0.6.0`).
5. Commit/push sul branch `next`.
6. Eseguire `docker compose up -d --build` e `./scripts/status.sh`.

Non usare `docker compose down -v`: eliminerebbe il volume PostgreSQL.
