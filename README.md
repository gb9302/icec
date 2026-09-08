# IceC Lab — MVP web

Prototipo web funzionante costruito a partire dal workbook `IceC (1).xlsx`.

## Avvio
Non richiede installazione. Per evitare limitazioni del browser sui file locali, dalla cartella del progetto eseguire:

```bash
python -m http.server 8080
```

poi aprire `http://localhost:8080`.

## Funzioni incluse
- import dei 31 ingredienti e delle ricette presenti nell'Excel;
- preload di una ricetta nel bilanciatore;
- ricalcolo in tempo reale di composizione, PAC, POD, calorie e costo;
- scaling a peso desiderato e pulsanti ±10 g;
- arrotondamento differenziato (0,1 g per ingredienti sensibili; 1 g per gli altri);
- profili: crema, frutta secca, cioccolato, frutta, sorbetto, granita;
- contesto di servizio: professionale, freezer domestico, personalizzato;
- modalità Base / Avanzato;
- assistente diagnostico rule-based;
- note di produzione;
- salvataggio di nuove ricette in `localStorage`;
- ricettario e database ingredienti consultabili;
- editor dei range nella sessione.

## Scelte architetturali per la versione production
L'MVP è volutamente client-side per poter essere provato subito. La versione production va separata in:

1. UI web React/Next.js + TypeScript.
2. Recipe Engine puro e testabile, indipendente dalla UI.
3. Rules Engine con profili/versioni e provenienza delle regole.
4. PostgreSQL con ownership per utente (`user_id`) su ingredienti, ricette, profili e produzioni.
5. API applicativa con autenticazione.
6. Importer Excel con validazione/anomaly report.

Entità principali: User, Ingredient, IngredientTechnicalProfile, Recipe, RecipeVersion, RecipeItem, ProductProfile, ServiceProfile, ProductionBatch, SensoryNote, CostHistory, Allergen.

## Nota tecnica importante
I range dell'MVP sono preset iniziali, non verità universali. I valori pubblicati da Carpigiani Gelato University per il gelato finito indicano, ad esempio, zuccheri 18–22%, grassi 7–16%, SML 7–12% e solidi totali 37–46%; per gelato frutta i valori cambiano. La versione production dovrà conservare fonte/versione di ogni profilo e distinguere range empirici da modelli fisico-chimici.

La relazione fra temperatura, durezza, PAC e frazione di acqua congelata non va ridotta a una singola proporzione lineare. Nell'MVP il profilo freezer domestico è quindi un aiuto configurabile; la fase successiva dovrà introdurre il calcolo crioscopico/ice curve con validazione sperimentale.
