import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

const translations = {
    en: {
        // Sidebar
        dashboard: 'Dashboard',
        aiImageCapture: 'AI Image Capture',
        expenses: 'Expenses',
        income: 'Income',
        accountsWallets: 'Accounts & Wallets',
        budgetPlanning: 'Budget Planning',
        reportsAnalytics: 'Reports & Analytics',
        aiAssistant: 'AI Assistant',
        notifications: 'Notifications',
        importExport: 'Import / Export',
        profileSettings: 'Profile & Settings',
        helpSupport: 'Help & Support',
        logout: 'Logout',
        // Common
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        loading: 'Loading...',
        // Expenses page
        expenseManagement: 'Expense Management',
        totalExpenses: 'Total Expenses',
        transactions: 'Transactions',
        aiDetected: 'AI Detected',
        addExpense: 'Add Expense',
        editExpense: 'Edit Expense',
        announceTotal: 'Announce total expenses',
        voiceMessage: 'Your total expenses are',
        voiceTransactions: 'You have {count} transactions',
    },
    es: {
        dashboard: 'Panel',
        aiImageCapture: 'Captura de Imagen IA',
        expenses: 'Gastos',
        income: 'Ingresos',
        accountsWallets: 'Cuentas y Billeteras',
        budgetPlanning: 'Planificación de Presupuesto',
        reportsAnalytics: 'Informes y Análisis',
        aiAssistant: 'Asistente IA',
        notifications: 'Notificaciones',
        importExport: 'Importar / Exportar',
        profileSettings: 'Perfil y Configuración',
        helpSupport: 'Ayuda y Soporte',
        logout: 'Cerrar Sesión',
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        add: 'Agregar',
        search: 'Buscar',
        loading: 'Cargando...',
        expenseManagement: 'Gestión de Gastos',
        totalExpenses: 'Gastos Totales',
        transactions: 'Transacciones',
        aiDetected: 'Detectado por IA',
        addExpense: 'Agregar Gasto',
        editExpense: 'Editar Gasto',
        announceTotal: 'Anunciar gastos totales',
        voiceMessage: 'Sus gastos totales son',
        voiceTransactions: 'Tiene {count} transacciones',
    },
    fr: {
        dashboard: 'Tableau de Bord',
        aiImageCapture: 'Capture Image IA',
        expenses: 'Dépenses',
        income: 'Revenus',
        accountsWallets: 'Comptes et Portefeuilles',
        budgetPlanning: 'Planification Budget',
        reportsAnalytics: 'Rapports et Analyses',
        aiAssistant: 'Assistant IA',
        notifications: 'Notifications',
        importExport: 'Importer / Exporter',
        profileSettings: 'Profil et Paramètres',
        helpSupport: 'Aide et Support',
        logout: 'Déconnexion',
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        add: 'Ajouter',
        search: 'Rechercher',
        loading: 'Chargement...',
        expenseManagement: 'Gestion des Dépenses',
        totalExpenses: 'Dépenses Totales',
        transactions: 'Transactions',
        aiDetected: 'Détecté par IA',
        addExpense: 'Ajouter Dépense',
        editExpense: 'Modifier Dépense',
        announceTotal: 'Annoncer les dépenses totales',
        voiceMessage: 'Vos dépenses totales sont de',
        voiceTransactions: 'Vous avez {count} transactions',
    },
    de: {
        dashboard: 'Übersicht',
        aiImageCapture: 'KI Bilderfassung',
        expenses: 'Ausgaben',
        income: 'Einkommen',
        accountsWallets: 'Konten und Geldbörsen',
        budgetPlanning: 'Budgetplanung',
        reportsAnalytics: 'Berichte und Analysen',
        aiAssistant: 'KI-Assistent',
        notifications: 'Benachrichtigungen',
        importExport: 'Import / Export',
        profileSettings: 'Profil und Einstellungen',
        helpSupport: 'Hilfe und Support',
        logout: 'Abmelden',
        save: 'Speichern',
        cancel: 'Abbrechen',
        delete: 'Löschen',
        edit: 'Bearbeiten',
        add: 'Hinzufügen',
        search: 'Suchen',
        loading: 'Laden...',
        expenseManagement: 'Ausgabenverwaltung',
        totalExpenses: 'Gesamtausgaben',
        transactions: 'Transaktionen',
        aiDetected: 'KI-erkannt',
        addExpense: 'Ausgabe hinzufügen',
        editExpense: 'Ausgabe bearbeiten',
        announceTotal: 'Gesamtausgaben ansagen',
        voiceMessage: 'Ihre Gesamtausgaben betragen',
        voiceTransactions: 'Sie haben {count} Transaktionen',
    },
    hi: {
        dashboard: 'डैशबोर्ड',
        aiImageCapture: 'AI छवि कैप्चर',
        expenses: 'खर्चे',
        income: 'आय',
        accountsWallets: 'खाते और वॉलेट',
        budgetPlanning: 'बजट योजना',
        reportsAnalytics: 'रिपोर्ट और विश्लेषण',
        aiAssistant: 'AI सहायक',
        notifications: 'सूचनाएं',
        importExport: 'आयात / निर्यात',
        profileSettings: 'प्रोफ़ाइल और सेटिंग्स',
        helpSupport: 'सहायता और समर्थन',
        logout: 'लॉग आउट',
        save: 'सहेजें',
        cancel: 'रद्द करें',
        delete: 'हटाएं',
        edit: 'संपादित करें',
        add: 'जोड़ें',
        search: 'खोजें',
        loading: 'लोड हो रहा है...',
        expenseManagement: 'खर्च प्रबंधन',
        totalExpenses: 'कुल खर्च',
        transactions: 'लेनदेन',
        aiDetected: 'AI द्वारा पहचाना',
        addExpense: 'खर्च जोड़ें',
        editExpense: 'खर्च संपादित करें',
        announceTotal: 'कुल खर्च बताएं',
        voiceMessage: 'आपका कुल खर्च है',
        voiceTransactions: 'आपके पास {count} लेनदेन हैं',
    },
};

// Map language code to sidebar nav label keys
const sidebarLabelKeys = {
    '/dashboard': 'dashboard',
    '/image-capture': 'aiImageCapture',
    '/expenses': 'expenses',
    '/income': 'income',
    '/accounts': 'accountsWallets',
    '/budget': 'budgetPlanning',
    '/reports': 'reportsAnalytics',
    '/ai-chat': 'aiAssistant',
    '/notifications': 'notifications',
    '/data-management': 'importExport',
    '/profile': 'profileSettings',
    '/help': 'helpSupport',
};

const LANGUAGE_NAMES = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    hi: 'Hindi',
};

// Voice language mapping for SpeechSynthesis
const VOICE_LANG_MAP = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    hi: 'hi-IN',
};

export { sidebarLabelKeys, LANGUAGE_NAMES, VOICE_LANG_MAP };

export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState(() => {
        return localStorage.getItem('snapspend-language') || 'en';
    });

    const setLanguage = (lang) => {
        setLanguageState(lang);
        localStorage.setItem('snapspend-language', lang);
    };

    const t = (key) => {
        return translations[language]?.[key] || translations.en[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}
