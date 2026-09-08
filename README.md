# IceC Lab v0.6 — Scientific Engine

Web app statica per il bilanciamento di gelati, sorbetti e granite, derivata dal workbook IceC.

## Novità v0.6
- Identità della ricetta ben visibile nel riquadro Formula.
- Indicatore “Modifiche non salvate” durante l'editing.
- Primo Scientific Engine prudenziale: PAC miscela, PAC su acqua, acqua e solidi letti come grandezze distinte.
- Eliminata la precedente conversione lineare temperatura → target PAC: la temperatura resta un contesto di valutazione, non una scorciatoia matematica.
- Controlli di coerenza dati: solidi + acqua e zuccheri vs carboidrati.
- PAC su acqua disponibile in modalità Avanzata.
- Pannello scientifico che esplicita i limiti del modello: la v0.6 non pretende di stimare ancora la quota d'acqua congelata.
- Profili e range restano personalizzabili e separati dalle condizioni di servizio.

## Nota scientifica
La v0.6 adotta un approccio conservativo. PAC/POD sono indicatori di formulazione utili, ma una previsione della curva di congelamento richiede un modello che tenga conto della composizione dei soluti e della concentrazione della fase non congelata. Per questo IceC non trasforma automaticamente un PAC in “morbidezza a -18 °C”.

## Avvio
Aprire `index.html` oppure pubblicare la cartella con GitHub Pages. I dati personali continuano a essere salvati nel localStorage del browser.
