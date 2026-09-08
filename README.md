# IceC Lab — MVP v0.2

Seconda iterazione del prototipo web di bilanciamento gelato, sorbetto e granita.

## Novità v0.2
- Caricamento ricetta separato dalle condizioni di servizio.
- La categoria/profilo è proprietà della ricetta; servizio e temperatura sono un contesto di valutazione separato.
- Vista Base/Avanzato solo nella pagina Bilanciamento.
- `+ Ingrediente` crea una riga vuota.
- CRUD locale degli ingredienti: aggiunta, modifica e duplicazione.
- Nuova vista ingredienti più compatta e leggibile.
- Categorie del ricettario allineate ai profili, con `Non classificata` per le ricette importate.
- Salvataggio esplicito dei profili/range e ripristino preset.
- Controllo di completezza dati: segnala valori mancanti e costo ricetta incompleto.
- Nuova palette più sobria e professionale.

## Avvio
Pubblicabile come sito statico (ad esempio GitHub Pages). In locale basta servire la cartella con un web server statico.

## Persistenza
Questa versione mantiene dati personalizzati nel `localStorage` del browser. È adatta alla validazione dell'MVP, non è ancora la persistenza production/multi-device. La prossima fase architetturale prevista è un backend con database relazionale e account utente.

## Nota sui dati legacy
Nel workbook originale diversi campi a zero possono significare sia uno zero reale sia un dato non disponibile. La v0.2 introduce `null` per i nuovi ingredienti e applica segnalazioni prudenti ai dati legacy. Una futura migrazione guidata potrà normalizzare definitivamente questi valori.
