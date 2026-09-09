# IceC Lab v0.8 — Smart Balancer / Sugar Intelligence

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
