# IceC Lab Next v0.7.3 - Production Tools

Release focalizzata sull'uso quotidiano in laboratorio. PostgreSQL resta la fonte primaria e lo schema esistente rimane compatibile: i nuovi attributi degli ingredienti (es. allergeni) sono conservati nei payload JSONB.

## Novita v0.7.3
- Stampa Produzione dal Bilanciatore e dal Ricettario.
- Scheda tecnica stampabile/salvabile in PDF dal browser con parametri tecnici, nutrizionali stimati e allergeni.
- Calcolo nutrizionale ricetta per 100 g dai valori degli ingredienti.
- Allergeni dichiarati nella scheda ingrediente e aggregazione automatica nella ricetta.
- Costing v2: costo miscela, EUR/kg, costo batch/vaschetta e costo porzione; resta l'avviso di costo incompleto se manca un prezzo.
- Confronto tra ricetta attuale e snapshot associato a una nota post-produzione, con delta dei parametri e delle grammature.
- Versione Web/API allineata a 0.7.3.

## Nota su nutrizionali e allergeni
I risultati dipendono dalla completezza e correttezza dei dati inseriti. Non sostituiscono analisi di laboratorio, etichette originali o verifiche normative professionali.

## Aggiornamento manuale con cartella update
1. Eseguire `./scripts/backup.sh` dalla root `~/projects/icec`.
2. Estrarre lo ZIP in `~/projects/icec/update/`.
3. Copiare il contenuto della cartella release sulla root dell'app senza sostituire `.env`.
4. Verificare `cat VERSION` (deve essere `0.7.3`).
5. Commit/push sul branch `next`.
6. Eseguire `docker compose up -d --build` e `./scripts/status.sh`.

Non usare `docker compose down -v`: eliminerebbe il volume PostgreSQL.


## v0.7.3 - Smart Ingredient Input
- Acquisizione foto da smartphone o file locale nella scheda ingrediente.
- OCR assistito per etichette nutrizionali e schede tecniche.
- Estrazione proposta di kcal, carboidrati, zuccheri, grassi, proteine, fibre, sale, PAC, POD, sostanza secca e umidita quando riconoscibili.
- Anteprima, confidenza OCR e testo riconosciuto prima dell'applicazione.
- I valori OCR vengono marcati come dichiarati solo quando l'utente sceglie **Applica i valori riconosciuti** e restano comunque non salvati fino a **Salva ingrediente**.
- Nessuna modifica allo schema PostgreSQL.

### Nota OCR
Il motore OCR viene eseguito dal container API con Tesseract.js. La prima scansione puo richiedere piu tempo. OCR e parsing sono assistivi: verificare sempre l'etichetta o la scheda tecnica originale prima di salvare.

## v0.7.3 - OCR Pipeline v2
- preprocessing multiplo automatico (originale, grayscale, alto contrasto, etichette colorate)
- selezione automatica della variante OCR più coerente
- parser conservativo: i valori impossibili vengono lasciati vuoti
- suggerimenti separati per possibili decimali persi, mai applicati automaticamente
- supporto fino a 4 foto dello stesso ingrediente in una singola scansione
- confidenza basata anche sulla coerenza nutrizionale, non solo sulla confidenza OCR
