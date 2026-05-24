import { createContext, useContext, useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("fs_token");
        if (!token) {
            setLoading(false);
            return;
        }
        api.get("/auth/me")
            .then((res) => setUser(res.data))
            .catch(() => {
                localStorage.removeItem("fs_token");
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        try {
            const { data } = await api.post("/auth/login", { email, password });
            localStorage.setItem("fs_token", data.access_token);
            setUser(data.user);
            return { ok: true };
        } catch (e) {
            return { ok: false, error: formatApiError(e) };
        }
    }

    async function register(email, password, name) {
        try {
            const { data } = await api.post("/auth/register", { email, password, name });
            localStorage.setItem("fs_token", data.access_token);
            setUser(data.user);
            return { ok: true };
        } catch (e) {
            return { ok: false, error: formatApiError(e) };
        }
    }

    function logout() {
        localStorage.removeItem("fs_token");
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
