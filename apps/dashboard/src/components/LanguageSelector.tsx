import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../core/i18n';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === i18n.language
  ) || SUPPORTED_LANGUAGES[0];

  const handleLanguageChange = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm">{currentLanguage.name}</span>
      </button>
      <div className="absolute right-0 top-full mt-1 w-40 bg-popover border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md ${
              lang.code === i18n.language ? 'bg-muted font-medium' : ''
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
}
