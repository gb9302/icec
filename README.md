# IceC Lab Next v0.7.4 - Ingredient Technical Engine

Release dedicata alla compilazione affidabile dei dati tecnici ingredienti e alla disambiguazione dei prodotti nel Bilanciatore. PostgreSQL e schema restano compatibili.

## Novita v0.7.4
- nuovo **Ingredient Technical Engine** nella scheda ingrediente
- pulsante **Completa dati tecnici**: propone soltanto valori derivabili dai dati disponibili
- calcolo automatico Solidi = 100 - Acqua e viceversa
- per latte/panna/latte in polvere: proposta MSNF = Solidi - Grassi quando i dati sono disponibili
- per tipologie tecniche note: proposta della composizione zuccherina (es. lattosio nel latte in polvere, destrosio nel destrosio)
- PAC/POD proponibili dalla composizione zuccherina con coefficienti tecnici IceC; se la base e stimata anche PAC/POD restano marcati **Stimati**
- nessun valore specifico del produttore viene sovrascritto
- ogni proposta mostra formula/motivazione e provenienza, e richiede conferma prima del salvataggio
- nel Bilanciatore gli ingredienti sono mostrati come **Nome — Produttore** per distinguere prodotti omonimi
- ricerca Ingredienti estesa a nome, produttore, categoria e tipologia tecnica
- produttore riportato anche nelle schede di stampa e negli snapshot

## Principio dati
Priorita: **Dichiarato dal produttore > Calcolato da dati specifici > Stimato dalla libreria IceC > Sconosciuto**.
Un valore stimato non viene presentato come dichiarato e non sostituisce mai un dato gia inserito.

## Upgrade
1. `./scripts/backup.sh`
2. estrarre lo ZIP in `~/projects/icec/update/`
3. copiare il contenuto della cartella release sulla root `~/projects/icec/`
4. verificare `cat VERSION` -> `0.7.4`
5. commit/push sul branch `next`
6. `docker compose up -d --build`
7. `./scripts/status.sh`

Non usare `docker compose down -v`.

---

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
