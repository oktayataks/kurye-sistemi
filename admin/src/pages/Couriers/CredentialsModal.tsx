import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  MdCheckCircle,
  MdContentCopy,
  MdWarningAmber,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';

export interface NewCourierCredentials {
  fullName: string;
  email: string;
  password: string;
}

interface CredentialsModalProps {
  isOpen: boolean;
  credentials: NewCourierCredentials | null;
  onClose: () => void;
}

/**
 * Yeni kurye oluşturulduktan sonra giriş bilgilerini bir kez gösteren modal.
 * - Sarı uyarı: "Bu bilgileri bir daha göremeyeceksiniz"
 * - Kopyala (WhatsApp/SMS formatında düz metin)
 * - Şifreyi gizle/göster
 */
export default function CredentialsModal({
  isOpen,
  credentials,
  onClose,
}: CredentialsModalProps) {
  const [showPassword, setShowPassword] = useState(true);

  useEffect(() => {
    if (isOpen) setShowPassword(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !credentials) return null;

  const handleCopyAll = async () => {
    const text =
      `🚗 Kurye Paneli Giriş Bilgileri\n\n` +
      `Ad: ${credentials.fullName}\n` +
      `E-posta: ${credentials.email}\n` +
      `Şifre: ${credentials.password}\n\n` +
      `Mobil uygulamayı indirip bu bilgilerle giriş yapabilirsiniz.`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Giriş bilgileri panoya kopyalandı');
    } catch {
      toast.error('Kopyalama başarısız — tarayıcı izin vermedi');
    }
  };

  const handleCopyField = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} kopyalandı`);
    } catch {
      toast.error('Kopyalama başarısız');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başarı header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
            <MdCheckCircle className="text-green-600 text-4xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Kurye Eklendi!</h2>
          <p className="text-sm text-gray-500 mt-1">
            Giriş bilgilerini kuryeye iletin
          </p>
        </div>

        {/* Sarı uyarı kutusu */}
        <div className="mx-6 mb-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
          <div className="flex items-start gap-2 mb-3">
            <MdWarningAmber className="text-yellow-700 text-xl flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-yellow-800">
              Bu bilgileri bir daha göremeyeceksiniz!
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
            {/* Ad */}
            <CredentialRow
              label="Ad Soyad"
              value={credentials.fullName}
              onCopy={() => handleCopyField('Ad', credentials.fullName)}
            />

            {/* E-posta */}
            <CredentialRow
              label="E-posta"
              value={credentials.email}
              onCopy={() => handleCopyField('E-posta', credentials.email)}
              monospace
            />

            {/* Şifre — büyük punto, gizle/göster */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Şifre
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title={showPassword ? 'Gizle' : 'Göster'}
                  >
                    {showPassword ? (
                      <MdVisibilityOff className="text-base" />
                    ) : (
                      <MdVisibility className="text-base" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyField('Şifre', credentials.password)}
                    className="p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                    title="Şifreyi kopyala"
                  >
                    <MdContentCopy className="text-base" />
                  </button>
                </div>
              </div>
              <p className="font-mono text-2xl font-bold text-indigo-600 tracking-widest break-all select-all">
                {showPassword ? credentials.password : '•'.repeat(credentials.password.length)}
              </p>
            </div>
          </div>

          <p className="text-xs text-yellow-700 mt-3 leading-relaxed">
            Bu bilgileri kuryeye <strong>WhatsApp, SMS veya telefon</strong> ile
            iletin. Kurye, mobil uygulamada bu bilgilerle giriş yapacak.
          </p>
        </div>

        {/* Aksiyon butonları */}
        <div className="bg-gray-50 px-6 py-4 flex items-center gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <MdContentCopy className="text-base" />
            Tümünü Kopyala
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Yardımcı: tek satırlık alan + kopyala butonu ────────────────────────────

interface CredentialRowProps {
  label: string;
  value: string;
  onCopy: () => void;
  monospace?: boolean;
}

function CredentialRow({ label, value, onCopy, monospace = false }: CredentialRowProps) {
  return (
    <div className="px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`text-sm font-semibold text-gray-900 mt-0.5 break-all ${
            monospace ? 'font-mono' : ''
          }`}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
        title={`${label}'ı kopyala`}
      >
        <MdContentCopy className="text-base" />
      </button>
    </div>
  );
}
