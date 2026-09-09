# IceC Lab v0.8.3 — Ingredient Data Quality

## Novità v0.8
- Mantiene la v0.7.1 come baseline e le stesse chiavi localStorage: ingredienti, ricette, profili e note esistenti restano compatibili.
- Scientific Engine disponibile solo in modalità Avanzata.
- Nuovi campi opzionali per la composizione zuccherina degli ingredienti: saccarosio, destrosio/glucosio, fruttosio, lattosio, maltosio e zucchero invertito.
- Indicatore di copertura/confidenza della composizione zuccherina della ricetta.
- Smart Balancer multivariato: interpreta insieme PAC, POD, zuccheri, solidi, grassi e profilo prodotto.
- Diagnostica specifica per Granita e profili a base acqua.
- Se la composizione zuccherina non è sufficientemente nota, IceC dichiara esplicitamente che l'analisi PAC/POD è parziale.

## Nota scientifica
I nuovi campi di dettaglio non sostituiscono PAC/POD già presenti nel database e non vengono usati per inventare automaticamente valori mancanti. Servono a costruire progressivamente un modello più trasparente e affidabile. La v0.8 non stima ancora acqua congelata o consistenza alla temperatura selezionata.

## Deploy GitHub Pages
Pubblicare il contenuto della cartella `IceC-Web` nel repository. Non cancellare il localStorage del browser durante l'aggiornamento.


## v0.8.1
- Toggle Vista avanzata nella scheda ingrediente.
- Composizione zuccherina spostata nella vista avanzata e trattata come dato opzionale.
- Campi avanzati vuoti = sconosciuto, non zero.
- Provenienza composizione: dichiarata, calcolata, stimata o sconosciuta.
- Proposta automatica prudenziale per ingredienti semplici riconoscibili (saccarosio, destrosio, fruttosio, lattosio, maltosio, zucchero invertito e ingredienti lattiero-caseari semplici).
- Nessuna deduzione automatica per prodotti complessi non riconoscibili.


## v0.8.3

- Corretto il selettore CSS che mostrava erroneamente “Zucchero specifico” anche su campi base come MSNF, PAC, POD, costo, acqua e solidi.
- Rinominati i campi in “Solidi totali / Sostanza secca” e “Acqua / Umidità”.
- Aggiunto controllo immediato di coerenza: sostanza secca + umidità deve essere circa 100% (tolleranza 0,5 punti).
- Le proposte automatiche IceC restano opzionali e non sovrascrivono automaticamente i dati inseriti; l’interfaccia ricorda che i dati specifici dichiarati dal produttore hanno priorità.
- Nessuna modifica alle chiavi localStorage: compatibile con i dati delle release precedenti.


## Hotfix v0.8.3
- Ripristializza esplicitamente lo stato dei filtri del Ricettario (`recipeFilter` e `recipeQuery`).
- Corregge il ReferenceError che interrompeva l’avvio dopo il rendering degli Ingredienti: il selettore ricette nel Bilanciatore risultava popolato, ma Ricettario e Profili & range restavano vuoti.
- Nessuna modifica alle chiavi localStorage o ai dati utente.
