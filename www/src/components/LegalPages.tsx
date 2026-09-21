import { LegalLayout } from "~/components/SiteChrome";

const contact = (
  <a href="mailto:info@personaleartificiale.it">info@personaleartificiale.it</a>
);

export function PrivacyPage() {
  return (
    <LegalLayout eyebrow="Informativa" title="Privacy" updated="4 luglio 2026">
      <section>
        <h2>Chi gestisce i dati</h2>
        <p>
          Il riferimento per questo sito e per il servizio è Personale
          Artificiale. Per domande o richieste relative ai dati personali puoi
          scrivere a {contact}.
        </p>
      </section>
      <section>
        <h2>Quali dati possiamo trattare</h2>
        <p>
          Il sito pubblico non richiede registrazione. Trattiamo i dati che
          scegli di inviarci via email e le informazioni tecniche strettamente
          necessarie alla sicurezza e al funzionamento del sito.
        </p>
        <p className="mt-3">
          Se attivi un servizio, trattiamo soltanto i dati necessari a
          configurarlo e a svolgere le attività che richiedi. Finalità,
          strumenti collegati, tempi di conservazione e soggetti coinvolti
          vengono definiti in base al servizio scelto.
        </p>
        <p className="mt-3">
          Registrazione, configurazione e utilizzo del servizio avvengono
          sull’area riservata app.personaleartificiale.it, con sessioni
          protette e dati isolati per ciascun cliente. Il dettaglio delle
          misure di sicurezza è descritto nella pagina{" "}
          <a href="/garanzie">Garanzie e policy</a>.
        </p>
      </section>
      <section>
        <h2>Perché li trattiamo</h2>
        <ul>
          <li>rispondere alle tue richieste;</li>
          <li>preparare e fornire il servizio richiesto;</li>
          <li>proteggere il sito e prevenire usi impropri;</li>
          <li>rispettare gli obblighi applicabili.</li>
        </ul>
      </section>
      <section>
        <h2>Conservazione e condivisione</h2>
        <p>
          Conserviamo i dati per il tempo necessario alla richiesta o al
          servizio e per gli eventuali obblighi applicabili. Non vendiamo dati
          personali. Possiamo usare fornitori tecnici solo quando necessari al
          funzionamento del servizio e con tutele adeguate.
        </p>
      </section>
      <section>
        <h2>I tuoi diritti</h2>
        <p>
          Puoi chiedere accesso, correzione, cancellazione, limitazione o
          opposizione nei casi previsti dalla legge. Puoi anche rivolgerti
          all’autorità competente per la protezione dei dati. Per esercitare i
          tuoi diritti scrivi a {contact}.
        </p>
      </section>
    </LegalLayout>
  );
}

export function GuaranteesPage() {
  return (
    <LegalLayout
      eyebrow="Fiducia"
      title="Garanzie e policy del servizio"
      updated="21 settembre 2026"
    >
      <section>
        <h2>Dati isolati e sotto il tuo controllo</h2>
        <p>
          I documenti, le conversazioni e le configurazioni di ogni cliente sono
          separati da quelli di tutti gli altri, con accesso limitato a quanto serve
          per far funzionare il tuo assistente. Puoi esportare o cancellare i tuoi
          dati in autonomia dalla dashboard in qualsiasi momento: non serve scriverci.
        </p>
      </section>
      <section>
        <h2>Nessun costo di attivazione</h2>
        <p>
          Registrazione, configurazione iniziale e avvio del servizio sono compresi
          nel canone del piano scelto. Non ci sono costi una tantum nascosti prima di
          iniziare a usare l’assistente.
        </p>
      </section>
      <section>
        <h2>Protezione WhatsApp e rischio di sospensione</h2>
        <p>
          Il numero principale del servizio, i limiti di invio, il delay tra i
          messaggi e le risposte solo a conversazioni richieste riducono in modo
          concreto il rischio che WhatsApp sospenda o limiti un numero. Non possiamo
          però garantire in modo assoluto le decisioni di una piattaforma di terze
          parti: se il tuo utilizzo del servizio è conforme alle nostre policy, ti
          diamo comunque la massima assistenza in caso di problemi con WhatsApp.
        </p>
      </section>
      <section>
        <h2>Continuità del servizio</h2>
        <p>
          Monitoriamo l’infrastruttura e interveniamo con priorità sui malfunzionamenti.
          Non si tratta di una garanzia assoluta di funzionamento ininterrotto (nessun
          servizio online può darla), ma di un impegno concreto a mantenere il
          servizio disponibile e a comunicare tempestivamente eventuali disservizi.
        </p>
      </section>
      <section>
        <h2>Un sistema innovativo, in evoluzione continua</h2>
        <p>
          Personale Artificiale è una piattaforma sperimentale nel senso migliore del
          termine: nasce da tecnologie di intelligenza artificiale in rapido
          miglioramento e viene aggiornata di continuo. Le funzioni possono cambiare o
          migliorare nel tempo, sempre incluse nel canone. Proprio perché è
          innovativo, ti chiediamo di controllare le risposte e le azioni prima che
          producano effetti importanti: è per questo che tu resti sempre al comando.
        </p>
      </section>
      <section>
        <h2>Flessibilità e diritto di recesso</h2>
        <p>
          Puoi gestire rinnovo e disdetta in autonomia dal portale di fatturazione. I
          cicli pluri-mensili (3, 6 o 12 mesi) si pagano in anticipo con lo sconto
          indicato al momento dell’acquisto e non sono rimborsabili a metà periodo,
          salvo il diritto di recesso riconosciuto per legge ai consumatori entro 14
          giorni dall’acquisto. Il dettaglio completo è nei{" "}
          <a href="/termini-servizio">Termini di servizio</a>.
        </p>
      </section>
      <section>
        <h2>Hai dubbi prima di iscriverti?</h2>
        <p>Scrivici a {contact}: rispondiamo prima che tu attivi il servizio, non solo dopo.</p>
      </section>
    </LegalLayout>
  );
}

export function CookiePage() {
  return (
    <LegalLayout
      eyebrow="Informativa"
      title="Cookie Policy"
      updated="4 luglio 2026"
    >
      <section>
        <h2>Cosa usa questo sito</h2>
        <p>
          Usiamo solo tecnologie necessarie per far funzionare il sito e
          ricordare che hai letto l’avviso. Non usiamo cookie pubblicitari,
          sistemi di profilazione o strumenti di analisi delle visite.
        </p>
      </section>
      <section>
        <h2>La scelta salvata</h2>
        <p>
          Quando premi “Ho capito”, il browser salva la voce{" "}
          <strong>necessary</strong> nella propria memoria locale. Serve solo a
          non mostrarti di nuovo lo stesso avviso. Non identifica la persona e
          non viene usata per pubblicità.
        </p>
      </section>
      <section>
        <h2>Come cancellarla</h2>
        <p>
          Puoi eliminare questa preferenza dalle impostazioni del browser
          cancellando i dati del sito. Alla visita successiva, l’avviso verrà
          mostrato di nuovo.
        </p>
      </section>
      <section>
        <h2>Contatti</h2>
        <p>Per chiarimenti puoi scrivere a {contact}.</p>
      </section>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Condizioni"
      title="Termini di servizio"
      updated="4 luglio 2026"
    >
      <section>
        <h2>Il servizio</h2>
        <p>
          Personale Artificiale offre un aiuto digitale configurato per svolgere
          attività indicate dall’utente, come preparare email, organizzare
          appuntamenti, leggere documenti e aggiornare informazioni di lavoro.
        </p>
      </section>
      <section>
        <h2>Controllo e responsabilità dell’utente</h2>
        <p>
          L’utente decide istruzioni, permessi e conferme. È sua responsabilità
          controllare le informazioni e approvare le azioni importanti prima che
          producano effetti verso clienti, collaboratori o terzi.
        </p>
      </section>
      <section>
        <h2>Canone, cicli di fatturazione e attivazione</h2>
        <p>
          Il canone del piano comprende, per l’uso previsto, infrastruttura,
          accesso ai modelli di intelligenza artificiale, consumi, manutenzione
          e aggiornamenti. Non è previsto alcun costo di attivazione o
          configurazione iniziale separato dal canone.
        </p>
        <p className="mt-3">
          Oltre al ciclo mensile, l’utente può scegliere di pagare in anticipo
          un ciclo di 3, 6 o 12 mesi con lo sconto indicato al momento
          dell’acquisto. L’importo del ciclo scelto viene addebitato in
          un’unica soluzione all’inizio del periodo e non è rimborsabile a
          metà periodo, salvo il diritto di recesso descritto più sotto. Al
          termine del ciclo, l’abbonamento si rinnova automaticamente per lo
          stesso periodo, salvo disdetta dal portale di fatturazione.
        </p>
      </section>
      <section>
        <h2>Sistema sperimentale e in evoluzione</h2>
        <p>
          Personale Artificiale è una piattaforma innovativa basata su modelli
          di intelligenza artificiale in continua evoluzione: funzioni,
          risposte e performance possono cambiare o migliorare nel tempo. Le
          risposte automatiche possono essere incomplete o imprecise. Le
          stime di tempo e valore mostrate sul sito sono indicative e non
          garantiscono un risultato. Il servizio non sostituisce consulenze
          professionali, legali, fiscali o sanitarie.
        </p>
      </section>
      <section>
        <h2>WhatsApp e rischio di sospensione</h2>
        <p>
          Adottiamo policy tecniche (numero dedicato, limiti di invio, risposte
          solo a conversazioni consentite) per ridurre il rischio che WhatsApp
          sospenda o limiti un numero collegato al servizio. Trattandosi di
          decisioni prese da una piattaforma di terze parti, non possiamo
          garantirne in modo assoluto l’esito: l’utente riconosce questo
          limite e si impegna a un uso conforme alle policy indicate nella
          pagina <a href="/garanzie">Garanzie e policy</a>.
        </p>
      </section>
      <section>
        <h2>Uso corretto</h2>
        <p>
          Il servizio non può essere usato per attività illecite, ingannevoli,
          lesive dei diritti altrui o per inviare comunicazioni non richieste.
          In caso di uso improprio, l’accesso può essere limitato o sospeso.
        </p>
      </section>
      <section>
        <h2>Diritto di recesso</h2>
        <p>
          Se sei un consumatore, hai diritto di recedere dal contratto entro 14
          giorni dall’acquisto senza dover indicare il motivo, scrivendo a{" "}
          {contact}. Se hai richiesto espressamente che il servizio inizi
          prima della scadenza dei 14 giorni, potresti dover corrispondere
          l’importo relativo alla parte di servizio già fornita fino alla
          richiesta di recesso, come previsto dal Codice del Consumo.
        </p>
      </section>
      <section>
        <h2>Contatti e legge applicabile</h2>
        <p>
          Si applica la legge italiana, fatti salvi i diritti inderogabili
          dell’utente. Per richieste relative al servizio scrivi a {contact}.
        </p>
      </section>
    </LegalLayout>
  );
}
