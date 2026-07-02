import { createFileRoute, Link } from "@tanstack/react-router";
import { Scale, ArrowLeft, Cpu, FileText } from "lucide-react";

export const Route = createFileRoute("/termini")({
  component: TerminiServizio,
});

function TerminiServizio() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between relative">
      {/* Decorative Blur */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="bg-zinc-900/30 backdrop-blur-md border-b border-zinc-900/80 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center">
              <Cpu className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-base font-bold text-white">Personale Artificiale</span>
          </Link>
          <Link
            to="/"
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors border border-zinc-800 rounded-full px-3 py-1.5 bg-zinc-900/50 hover:bg-zinc-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Torna al sito
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-purple-400">Accordo Contrattuale</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Termini di Servizio</h1>
          </div>
        </div>

        <div className="bg-zinc-900/20 border border-zinc-900 rounded-3xl p-6 sm:p-10 space-y-8 text-sm text-zinc-300 leading-relaxed">
          <p className="text-zinc-400">
            Ultimo aggiornamento: <strong>2 luglio 2026</strong>
          </p>

          <p>
            I presenti Termini di Servizio ("Termini") regolano l'accesso e l'uso della piattaforma, del sito web e dei servizi software di intelligenza artificiale forniti da <strong>Personale Artificiale S.r.l.</strong> ("noi", "ci" o "nostro"). Ti preghiamo di leggere attentamente i presenti Termini prima di completare l'acquisto di un abbonamento o di utilizzare i nostri dipendenti virtuali AI.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Accettazione dei Termini</h2>
            <p>
              Registrandoti sulla nostra piattaforma, completando il pagamento di setup e abbonamento su Stripe, o utilizzando in qualsiasi modo il nostro software, dichiari di aver letto, compreso e accettato di essere vincolato dai presenti Termini. Se non accetti i presenti Termini, non sei autorizzato a utilizzare il nostro servizio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Descrizione del Servizio</h2>
            <p>
              Personale Artificiale fornisce software basato su intelligenza artificiale configurabile tramite una dashboard web (onboarding wizard) in grado di integrarsi tramite OAuth 2.0 con i servizi Google Workspace dell'utente (Gmail, Calendar, Drive) e di operare come assistente digitale tramite account WhatsApp o Telegram collegati.
            </p>
            <p>
              L'utente prende atto e accetta che le risposte dell'agente AI sono generate da modelli linguistici avanzati e, pur essendo addestrate tramite file di conoscenza (PDF), possono eccezionalmente presentare inesattezze. È responsabilità dell'utente monitorare l'attività del dipendente virtuale.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. Piani, Prezzi e Politica di Setup</h2>
            <p>
              I nostri piani tariffari prevedono due componenti di costo distinte:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Costo di Setup iniziale (una tantum):</strong> Copre l'attivazione dell'infrastruttura, il provisioning del database di memoria vettoriale e l'assistenza dedicata per l'onboarding. Questo costo viene addebitato immediatamente al momento del checkout e non è rimborsabile una volta avviata la procedura di configurazione dell'agente.
              </li>
              <li>
                <strong className="text-zinc-200">Abbonamento Mensile ricorrente:</strong> Consente l'accesso continuo alla piattaforma e l'operatività h24 dell'agente. L'abbonamento si rinnova automaticamente ogni mese.
              </li>
            </ul>
            <p>
              I prezzi correnti sono quelli esposti sul sito al momento dell'acquisto. Tutti i pagamenti sono elaborati in modo sicuro da Stripe.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Cancellazione e Churn Policy</h2>
            <p>
              L'utente può disdire l'abbonamento mensile in qualsiasi momento, senza alcuna penale, direttamente dalla propria area riservata o contattando il supporto all'indirizzo email <a href="mailto:supporto@personaleartificiale.it" className="text-purple-400 hover:underline">supporto@personaleartificiale.it</a>.
            </p>
            <p>
              In caso di disdetta prima del rinnovo, l'agente virtuale rimarrà operativo fino al termine del periodo mensile già pagato. Alla scadenza, la sessione WhatsApp verrà interrotta e i dati di configurazione verranno archiviati per un periodo di 30 giorni prima di essere eliminati definitivamente per motivi di sicurezza.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">5. Uso Consentito e Limitazioni</h2>
            <p>
              L'utente si impegna a utilizzare il servizio in conformità con tutte le leggi applicabili e a non utilizzare i dipendenti virtuali per:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li>Inviare comunicazioni di massa non sollecitate (spam) o promozioni ingannevoli.</li>
              <li>Sostituirsi in modo fraudolento all'identità di terzi soggetti o enti pubblici.</li>
              <li>Trattare dati bancari protetti o informazioni riservate sensibili in violazione del GDPR.</li>
              <li>Svolgere attività illegali o contrarie all'ordine pubblico.</li>
            </ul>
            <p>
              Ci riserviamo il diritto di sospendere o interrompere l'accesso al servizio in caso di violazione accertata dei presenti Termini o delle policy di utilizzo di Stripe, WhatsApp/Meta o Google.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">6. Limitazione di Responsabilità</h2>
            <p>
              Nei limiti massimi consentiti dalla legge, Personale Artificiale S.r.l. non sarà responsabile per eventuali danni indiretti, incidentali, speciali, consequenziali o punitivi, o per qualsiasi perdita di profitti o ricavi, derivanti da disservizi di rete, malfunzionamenti delle API di terze parti (Google, Meta), o risposte errate o imprecise fornite dall'agente AI.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">7. Legge Applicabile e Foro Competente</h2>
            <p>
              I presenti Termini sono regolati e interpretati in conformità con la legge italiana. Per qualsiasi controversia derivante dall'interpretazione o dall'esecuzione del presente contratto sarà competente in via esclusiva il Foro di Roma.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 px-6 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 Personale Artificiale S.r.l. Tutti i diritti riservati.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <Link to="/cookie-policy" className="hover:text-zinc-300 transition-colors">Cookie Policy</Link>
            <Link to="/termini-servizio" className="hover:text-zinc-300 transition-colors">Termini di Servizio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
