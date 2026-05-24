import { useEffect, useState, useCallback } from "react"; // Added useCallback
import { AuthContext, AuthProvider } from "./AuthContext";
import { Config } from "../../API/Config";
import api from "../../API/CustomApi";

const UserContextProvider = ({ children }) => {
    const [auth, setAuth] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState("");

    // 1. Define logout first so checkAuth can use it safely
    const logout = async () => {
        try {
            await api.post(Config.LogoutUrl);
            localStorage.clear();
            setAuth(false);
            setUser(null);
            setUserEmail("");
            console.log("Logged out successfully.");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const getUserInfo = async (email) => {
        try {
            // Note: Since we set withCredentials in CustomApi, 
            // we don't need to add it here manually.
            const response = await api.get(`${Config.GETDATAUrl}`, {
                params: { email },
            });

            if (response.data) {
                localStorage.setItem("UserInfo", JSON.stringify(response.data));
                setUser(response.data);
            }
        } catch (error) {
            console.error("Error in getting Data", error);
        }
    };

    // 2. Use useCallback to prevent unnecessary re-renders
    const checkAuth = useCallback(async () => {
        try {
            const response = await api.get(Config.CHECKAuthUrl);

            if (response.data.authenticated) {
                const email = response.data.user.email;
                setUserEmail(email);
                await getUserInfo(email);
                setAuth(true);
            } else {
                // If the server says not authenticated, clear local state
                setAuth(false);
                setUser(null);
                localStorage.clear();
            }
        } catch (error) {
            // This is where your 401 usually lands
            console.error("Authentication check failed:", error.response?.data?.message || error.message);
            setAuth(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const refreshUser = () => {
        if (userEmail) getUserInfo(userEmail);
    };

    return (
        <AuthProvider value={{ auth, setAuth, user, setUser, logout, loading, checkAuth, refreshUser }}>
            {!loading && children} 
        </AuthProvider>
    );
};

export default UserContextProvider;