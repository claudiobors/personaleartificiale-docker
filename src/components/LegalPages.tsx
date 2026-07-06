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
        <h2>Canone e configurazione</h2>
        <p>
          Il canone del piano comprende, per l’uso previsto, infrastruttura,
          accesso ai modelli di intelligenza artificiale, consumi, manutenzione
          e aggiornamenti. Se previsto, il costo iniziale di configurazione è
          indicato separatamente prima dell’attivazione. Prezzo, durata e
          modalità di recesso sono riportati nella proposta accettata
          dall’utente.
        </p>
      </section>
      <section>
        <h2>Limiti del servizio</h2>
        <p>
          Le risposte automatiche possono essere incomplete o imprecise. Le
          stime di tempo e valore mostrate sul sito sono indicative e non
          garantiscono un risultato. Il servizio non sostituisce consulenze
          professionali, legali, fiscali o sanitarie.
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
        <h2>Contatti e legge applicabile</h2>
        <p>
          Si applica la legge italiana, fatti salvi i diritti inderogabili
          dell’utente. Per richieste relative al servizio scrivi a {contact}.
        </p>
      </section>
    </LegalLayout>
  );
}
