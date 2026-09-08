# IceC Lab v0.7 — Smart Balancer

## Novità v0.7
- Scientific Engine visibile esclusivamente in modalità Avanzata.
- Pulsanti informativi sui principali parametri tecnici (PAC, POD, PAC su acqua, MSNF, acqua, solidi, ecc.).
- Distinzione visiva tra calcolo compositivo, target empirico e futura predizione.
- Primo Smart Balancer: diagnostica contestuale per zuccheri, PAC, grassi e solidi con indicazioni prudenti sulle leve di formulazione.
- Il contesto freezer domestico viene spiegato senza conversioni lineari temperatura/PAC.
- PAC su acqua presentato esplicitamente come indicatore comparativo, non come valore con un target universale.
- Footer e Scientific Engine aggiornati a v0.7.

## Principio scientifico
IceC separa ciò che calcola dai dati della formula, i target empirici configurati nel profilo e le predizioni del comportamento fisico. La v0.7 non stima ancora percentuale di acqua congelata o consistenza alla temperatura selezionata: per farlo in modo affidabile serviranno dati più granulari sulla composizione dei soluti e un modello crioscopico dedicato.

## Pubblicazione
Applicazione statica compatibile con GitHub Pages. Sostituire i file della release precedente mantenendo lo stesso percorso del repository. I dati utente continuano a essere salvati nel localStorage del browser.
