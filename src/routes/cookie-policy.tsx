import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft, Cpu, Cookie } from "lucide-react";

export const Route = createFileRoute("/cookie-policy")({
  component: CookiePolicy,
});

function CookiePolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between relative">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[120px] pointer-events-none" />

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
            <Cookie className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-purple-400">Informativa Legale</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Cookie Policy</h1>
          </div>
        </div>

        <div className="bg-zinc-900/20 border border-zinc-900 rounded-3xl p-6 sm:p-10 space-y-8 text-sm text-zinc-300 leading-relaxed">
          <p className="text-zinc-400">
            Ultimo aggiornamento: <strong>2 luglio 2026</strong>
          </p>

          <p>
            Questo sito web utilizza i cookie e tecnologie simili per garantire il corretto funzionamento delle procedure e migliorare l'esperienza di navigazione degli utenti. Questo documento fornisce informazioni dettagliate sull'uso dei cookie, su come sono utilizzati da <strong>Personale Artificiale</strong> e su come gestirli.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Cosa sono i Cookie?</h2>
            <p>
              I cookie sono piccoli file di testo che i siti visitati dagli utenti inviano ai loro terminali (solitamente al browser), dove vengono memorizzati per essere poi ritrasmessi agli stessi siti alla visita successiva. I cookie possono essere utilizzati per diverse finalità (es. autenticazione informatica, monitoraggio di sessioni, memorizzazione di informazioni su specifiche configurazioni riguardanti gli utenti, memorizzazione delle preferenze, ecc.).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Tipologie di Cookie Utilizzati</h2>
            <p>
              Nel nostro sito utilizziamo le seguenti tipologie di cookie:
            </p>
            <ul className="list-disc pl-5 space-y-4 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Cookie Tecnici e Necessari (Prima parte):</strong> Questi cookie sono essenziali per il funzionamento del sito. Consentono la navigazione tra le pagine, la memorizzazione delle sessioni di checkout sicure di Stripe, il mantenimento dello stato di autenticazione nella dashboard utente e la memorizzazione della tua preferenza circa l'accettazione dei cookie stessi. Senza questi cookie, il sito non potrebbe funzionare correttamente.
              </li>
              <li>
                <strong className="text-zinc-200">Cookie Analitici (Terza parte):</strong> Utilizzati per raccogliere informazioni in forma aggregata e anonima sul numero degli utenti e su come questi visitano il sito (es. Google Analytics con IP anonimizzato). Questi cookie ci aiutano a misurare le performance e a migliorare l'usabilità del sito.
              </li>
              <li>
                <strong className="text-zinc-200">Cookie di Profilazione e Marketing (Terza parte):</strong> Utilizzati per tracciare la provenienza delle visite dalle nostre campagne pubblicitarie (es. Google Ads, LinkedIn Pixel). Questi cookie sono installati solo previo tuo esplicito consenso fornito tramite il nostro Cookie Banner.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. Elenco dei Cookie di Terze Parti</h2>
            <p>
              Navigando su questo sito potresti ricevere cookie da siti gestiti da altre organizzazioni. In particolare:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Stripe:</strong> Cookie tecnici essenziali per elaborare i pagamenti degli abbonamenti e prevenire frodi finanziarie.
              </li>
              <li>
                <strong className="text-zinc-200">Google Workspace API:</strong> Cookie temporanei utilizzati durante la procedura di connessione OAuth 2.0 sicura per identificare l'utente.
              </li>
              <li>
                <strong className="text-zinc-200">Google Ads / Tag Manager:</strong> Cookie di tracciamento delle conversioni pubblicitarie (attivati solo con consenso).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Gestione e Disabilitazione dei Cookie</h2>
            <p>
              Puoi modificare in qualsiasi momento le tue preferenze relative ai cookie cliccando sul pulsante di revoca nel banner oppure configurando direttamente il tuo browser.
            </p>
            <p>
              La disabilitazione totale o parziale dei cookie tecnici può compromettere l'utilizzo delle funzionalità riservate agli utenti registrati (in particolare l'accesso alla dashboard e l'onboarding).
            </p>
            <p>
              Per disabilitare i cookie tramite i browser principali:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400 text-xs">
              <li><strong>Google Chrome:</strong> Impostazioni {">"} Privacy e sicurezza {">"} Cookie e altri dati dei siti.</li>
              <li><strong>Mozilla Firefox:</strong> Opzioni {">"} Privacy e sicurezza {">"} Cookie e dati dei siti web.</li>
              <li><strong>Safari:</strong> Preferenze {">"} Privacy {">"} Blocca tutti i cookie.</li>
              <li><strong>Microsoft Edge:</strong> Impostazioni {">"} Autorizzazioni sito {">"} Cookie e dati del sito.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">5. Contatti</h2>
            <p>
              Per qualsiasi chiarimento in merito alla presente informativa sull'uso dei cookie, puoi contattare il Titolare del Trattamento all'indirizzo email <a href="mailto:privacy@personaleartificiale.it" className="text-purple-400 hover:underline">privacy@personaleartificiale.it</a>.
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
