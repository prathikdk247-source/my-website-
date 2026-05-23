import React, { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null=loading, false=logged out, object=logged in
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ac_token");
    if (!token) {
      setUser(false);
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {
        localStorage.removeItem("ac_token");
        setUser(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("ac_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("ac_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    localStorage.removeItem("ac_token");
    setUser(false);
  };

  const updateMe = async (payload) => {
    const { data } = await api.put("/auth/me", payload);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, updateMe, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
