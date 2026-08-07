import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import BrandLogo from "../layout/BrandLogo";

const FEATURES = [
  { icon: BarChart3, text: "Sigue pesos, repeticiones y volumen" },
  { icon: Sparkles, text: "Recupera automáticamente tu última sesión" },
  { icon: ShieldCheck, text: "Tu progreso, organizado en un solo lugar" },
];

export default function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { login, register, resetPassword } = useAuth();

  const isLogin = mode === "login";

  const clearFeedback = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const changeMode = () => {
    setMode((current) => (current === "login" ? "register" : "login"));
    setPassword("");
    clearFeedback();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!isLogin && password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const result = isLogin
      ? await login(email.trim(), password)
      : await register(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setErrorMessage(result.error.message || "No pudimos completar la solicitud.");
      return;
    }

    if (!isLogin && !result.data?.session) {
      setSuccessMessage("Cuenta creada. Revisa tu correo para confirmar el acceso.");
    }
  };

  const handlePasswordReset = async () => {
    clearFeedback();
    if (!email.trim()) {
      setErrorMessage("Escribe tu correo antes de solicitar la recuperación.");
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);

    if (error) {
      setErrorMessage(error.message || "No se pudo enviar el correo de recuperación.");
      return;
    }

    setSuccessMessage("Te enviamos un enlace para restablecer tu contraseña.");
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-brand-panel">
          <BrandLogo />
          <div className="auth-brand-panel__content">
            <span className="auth-eyebrow">Entrena con intención</span>
            <h1>Tu progreso merece algo mejor que una nota perdida.</h1>
            <p>
              Treino convierte cada sesión en información útil para que sepas qué hiciste,
              qué puedes superar y cómo estás avanzando.
            </p>
          </div>

          <div className="auth-feature-list">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="auth-feature-item">
                <span><Icon size={18} /></span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-mobile-brand">
            <BrandLogo compact />
          </div>

          <div className="auth-form-heading">
            <span className="auth-eyebrow">{isLogin ? "Bienvenido de vuelta" : "Empieza hoy"}</span>
            <h2>{isLogin ? "Inicia sesión" : "Crea tu cuenta"}</h2>
            <p>
              {isLogin
                ? "Continúa desde tu última sesión y sigue construyendo progreso."
                : "Guarda tus entrenamientos y mantén tus marcas siempre disponibles."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label className="auth-field">
              <span>Correo electrónico</span>
              <div className="auth-input-wrap">
                <Mail size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Contraseña</span>
              <div className="auth-input-wrap">
                <Lock size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {isLogin && (
              <button
                type="button"
                className="auth-forgot-button"
                onClick={handlePasswordReset}
                disabled={loading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            {errorMessage && (
              <div className="auth-feedback auth-feedback--error" role="alert">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="auth-feedback auth-feedback--success" role="status">
                <CheckCircle2 size={17} />
                {successMessage}
              </div>
            )}

            <button type="submit" className="auth-submit-button" disabled={loading}>
              <span>{loading ? "Procesando..." : isLogin ? "Entrar a Treino" : "Crear cuenta"}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch-copy">
            {isLogin ? "¿Todavía no tienes una cuenta?" : "¿Ya tienes una cuenta?"}
            <button type="button" onClick={changeMode}>
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>

          <p className="auth-legal-copy">
            Al continuar aceptas usar Treino para registrar información de tus entrenamientos.
          </p>
        </section>
      </div>
    </main>
  );
}
