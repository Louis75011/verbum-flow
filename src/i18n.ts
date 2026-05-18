export type LanguageData = {
  sourceLabel: string;
  targetLabel: string;
  uiLabel: string;
  autoDetect: string;
  transcribeTransl: string;
  processing: string;
  transcription: string;
  translation: string;
  summary: string;
  copy: string;
  download: string;
  characters: string;
  estimatedReadingTime: string;
  min: string;
  dragDrop: string;
  orClick: string;
  errorGeneric: string;
  uploading: string;
  readyToProcess: string;
  process: string;
  transcribingStatus: string;
  translatingStatus: string;
  summarizingStatus: string;
};

export const translations: Record<string, LanguageData> = {
  en: {
    sourceLabel: "Source Language",
    targetLabel: "Target Language",
    uiLabel: "UI Language",
    autoDetect: "Auto-detect",
    transcribeTransl: "Transcribe & Translate",
    processing: "Processing...",
    transcription: "Transcription",
    translation: "Translation",
    summary: "Summary",
    copy: "Copy",
    download: "Download .txt",
    characters: "Characters",
    estimatedReadingTime: "Estimated reading time",
    min: "min",
    dragDrop: "Drag & drop audio/video file here",
    orClick: "or click to browse",
    errorGeneric: "An error occurred during transcription and translation.",
    uploading: "Uploading...",
    readyToProcess: "Ready to process",
    process: "Processing via Gemini 2.0 Flash...",
    transcribingStatus: "Transcribing audio...",
    translatingStatus: "Translating content...",
    summarizingStatus: "Generating summary..."
  },
  fr: {
    sourceLabel: "Langue Source",
    targetLabel: "Langue Cible",
    uiLabel: "Langue de l'interface",
    autoDetect: "Détection auto",
    transcribeTransl: "Transcrire et Traduire",
    processing: "Traitement en cours...",
    transcription: "Transcription",
    translation: "Traduction",
    summary: "Résumé",
    copy: "Copier",
    download: "Télécharger .txt",
    characters: "Caractères",
    estimatedReadingTime: "Temps de lecture estimé",
    min: "min",
    dragDrop: "Glissez-déposez le fichier audio/vidéo ici",
    orClick: "ou cliquez pour parcourir",
    errorGeneric: "Une erreur est survenue lors de la transcription et la traduction.",
    uploading: "Téléversement...",
    readyToProcess: "Prêt au traitement",
    process: "Traitement via Gemini 2.0 Flash...",
    transcribingStatus: "Transcription audio en cours...",
    translatingStatus: "Traduction en cours...",
    summarizingStatus: "Création du résumé en cours..."
  },
  es: {
    sourceLabel: "Idioma de origen",
    targetLabel: "Idioma destino",
    uiLabel: "Idioma de la interfaz",
    autoDetect: "Detectar",
    transcribeTransl: "Transcribir y Traducir",
    processing: "Procesando...",
    transcription: "Transcripción",
    translation: "Traducción",
    summary: "Resumen",
    copy: "Copiar",
    download: "Descargar .txt",
    characters: "Caracteres",
    estimatedReadingTime: "Tiempo de lectura estimado",
    min: "min",
    dragDrop: "Arrastre y suelte el archivo de audio/vídeo aquí",
    orClick: "o haga clic para buscar",
    errorGeneric: "Se produjo un error durante la transcripción y traducción.",
    uploading: "Subiendo...",
    readyToProcess: "Listo para procesar",
    process: "Procesando via Gemini 2.0 Flash...",
    transcribingStatus: "Transcribiendo audio...",
    translatingStatus: "Traduciendo contenido...",
    summarizingStatus: "Generando resumen..."
  },
  it: {
    sourceLabel: "Lingua di origine",
    targetLabel: "Lingua di destinazione",
    uiLabel: "Lingua dell'interfaccia",
    autoDetect: "Rilevamento auto",
    transcribeTransl: "Trascrivi e Traduci",
    processing: "Elaborazione...",
    transcription: "Trascrizione",
    translation: "Traduzione",
    summary: "Riepilogo",
    copy: "Copia",
    download: "Scarica .txt",
    characters: "Caratteri",
    estimatedReadingTime: "Tempo di lettura stimato",
    min: "min",
    dragDrop: "Trascina e rilascia qui il file audio/video",
    orClick: "o fai clic per sfogliare",
    errorGeneric: "Si è verificato un errore durante la trascrizione e la traduzione.",
    uploading: "Caricamento...",
    readyToProcess: "Pronto per l'elaborazione",
    process: "Elaborazione tramite Gemini 2.0 Flash...",
    transcribingStatus: "Trascrizione audio in corso...",
    translatingStatus: "Traduzione dei contenuti...",
    summarizingStatus: "Generazione del riepilogo..."
  },
  de: {
    sourceLabel: "Ausgangssprache",
    targetLabel: "Zielsprache",
    uiLabel: "UI-Sprache",
    autoDetect: "Auto-Erkennung",
    transcribeTransl: "Transkribieren & Übersetzen",
    processing: "Verarbeitung...",
    transcription: "Transkription",
    translation: "Übersetzung",
    summary: "Zusammenfassung",
    copy: "Kopieren",
    download: ".txt herunterladen",
    characters: "Zeichen",
    estimatedReadingTime: "Geschätzte Lesezeit",
    min: "Min.",
    dragDrop: "Audio-/Videodatei hierher ziehen & ablegen",
    orClick: "oder klicken zum Durchsuchen",
    errorGeneric: "Während der Transkription und Übersetzung ist ein Fehler aufgetreten.",
    uploading: "Hochladen...",
    readyToProcess: "Bereit zur Verarbeitung",
    process: "Verarbeitung über Gemini 2.0 Flash...",
    transcribingStatus: "Audio wird transkribiert...",
    translatingStatus: "Inhalt wird übersetzt...",
    summarizingStatus: "Zusammenfassung wird erstellt..."
  }
};
