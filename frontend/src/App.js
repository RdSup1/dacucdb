import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Equipment from "./pages/Equipment";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <div className="App">
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/cadastro" element={<Register />} />
                        <Route path="/equipamentos" element={<Equipment />} />
                        <Route path="/painel" element={
                            <ProtectedRoute><Dashboard /></ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                            <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
                        } />
                    </Routes>
                </BrowserRouter>
                <Toaster theme="dark" position="bottom-right" />
            </AuthProvider>
        </div>
    );
}

export default App;
