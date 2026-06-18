import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isLogin
      ? await login(email, password)
      : await register(email, password);

    if (error) alert(error.message);
    setLoading(false);
  };

  // Sin wrapper propio con minHeight/100vh: el centrado y la altura ya los
  // resuelve .app-root en App.jsx (única fuente de altura de viewport).
  return (
    <form
      onSubmit={handleSubmit}
      style={{ background: "#1e1e24", padding: "40px", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>{isLogin ? "Iniciar Sesión" : "Crear Cuenta"}</h2>

      <input type="email" placeholder="Email" required onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #374151", background: "#121214", color: "white" }} />

      <input type="password" placeholder="Contraseña" required onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "6px", border: "1px solid #374151", background: "#121214", color: "white" }} />

      <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
        {loading ? "Cargando..." : isLogin ? "Entrar" : "Registrarse"}
      </button>

      <p style={{ textAlign: "center", marginTop: "20px", color: "#9ca3af", cursor: "pointer" }} onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
      </p>
    </form>
  );
}