import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, ArrowLeft, Cpu, Lock } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
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
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-purple-400">Informativa Legale</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Privacy Policy</h1>
          </div>
        </div>

        <div className="bg-zinc-900/20 border border-zinc-900 rounded-3xl p-6 sm:p-10 space-y-8 text-sm text-zinc-300 leading-relaxed">
          <p className="text-zinc-400">
            Ultimo aggiornamento: <strong>2 luglio 2026</strong>
          </p>

          <p>
            Benvenuto su <strong>Personale Artificiale</strong>. La tua privacy e la sicurezza dei tuoi dati sono la nostra massima priorità. Questa Privacy Policy descrive come raccogliamo, utilizziamo, proteggiamo e condividiamo i tuoi dati personali quando utilizzi la nostra piattaforma e i nostri servizi, comprese le nostre integrazioni con WhatsApp, Telegram e Google Workspace.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Titolare del Trattamento</h2>
            <p>
              Il titolare del trattamento dei dati è:
              <br />
              <strong>Personale Artificiale S.r.l.</strong>
              <br />
              Via della Scrofa 104, 00186 Roma (RM)
              <br />
              P.IVA: IT12345678901
              <br />
              Email di contatto: <a href="mailto:privacy@personaleartificiale.it" className="text-purple-400 hover:underline">privacy@personaleartificiale.it</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Tipologia di Dati Raccolti</h2>
            <p>
              Raccogliamo diverse tipologie di informazioni per fornirti il Servizio ed ottimizzare l'esperienza d'uso:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Dati Account utente:</strong> Nome, cognome, indirizzo email, informazioni di pagamento (elaborate in modo sicuro da Stripe).
              </li>
              <li>
                <strong className="text-zinc-200">Dati di Configurazione Agente:</strong> Nome dell'agente, tono di voce, istruzioni operative, e file PDF caricati come knowledge base aziendale.
              </li>
              <li>
                <strong className="text-zinc-200">Credenziali OAuth e API:</strong> Token di autorizzazione Google Workspace (Gmail, Calendar, Drive) per consentire all'agente di eseguire le azioni richieste. Non salviamo password.
              </li>
              <li>
                <strong className="text-zinc-200">Contenuto dei Messaggi:</strong> I testi e i messaggi vocali inviati all'agente virtuale via WhatsApp o Telegram, necessari per l'elaborazione dei comandi tramite modelli linguistici (LLM).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. Finalità del Trattamento</h2>
            <p>
              I dati personali vengono raccolti esclusivamente per le seguenti finalità:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li>Erogare e gestire il servizio di dipendente virtuale AI.</li>
              <li>Permettere l'integrazione e l'esecuzione automatica di task su Gmail, Google Calendar e Google Drive.</li>
              <li>Gestire la fatturazione, l'abbonamento e i pagamenti sicuri tramite il circuito Stripe.</li>
              <li>Fornire assistenza tecnica e rispondere alle richieste di supporto.</li>
              <li>Rispettare gli obblighi di legge in materia fiscale e contabile.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Integrazione Google API ed Evolution API</h2>
            <p>
              Il nostro servizio utilizza le API ufficiali di Google OAuth 2.0. L'uso dei dati ricevuti dalle API di Google da parte di Personale Artificiale rispetta pienamente le norme sul livello di accesso dei dati utente di Google.
            </p>
            <p>
              I file caricati in formato PDF e i messaggi ricevuti vengono elaborati temporaneamente per consentire l'interazione RAG (Retrieval-Augmented Generation) e l'elaborazione del modello AI. I dati non vengono trasmessi a terzi per scopi promozionali, né utilizzati per l'addestramento di modelli di intelligenza artificiale commerciali generali non controllati dall'utente.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">5. Sicurezza dei Dati</h2>
            <p>
              Adottiamo misure di sicurezza tecnologiche avanzate e organizzative per proteggere i tuoi dati personali da perdita, abuso, accesso non autorizzato o alterazione. Tutti i dati in transito vengono crittografati tramite protocollo SSL/TLS e conservati in server protetti.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">6. Diritti dell'Interessato (GDPR)</h2>
            <p>
              In conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR), hai il diritto di:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li>Accedere ai tuoi dati personali in nostro possesso.</li>
              <li>Chiedere la rettifica dei dati inesatti o l'integrazione di quelli incompleti.</li>
              <li>Chiedere la cancellazione permanente dei tuoi dati personali ("diritto all'oblio").</li>
              <li>Revocare in qualsiasi momento il consenso alle integrazioni Google Workspace o WhatsApp.</li>
              <li>Presentare un reclamo all'Autorità Garante per la Protezione dei Dati Personali.</li>
            </ul>
            <p>
              Per esercitare uno qualsiasi di questi diritti, puoi inviarci una richiesta scritta all'indirizzo email <a href="mailto:supporto@personaleartificiale.it" className="text-purple-400 hover:underline">supporto@personaleartificiale.it</a>.
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
