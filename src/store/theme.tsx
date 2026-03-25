import { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "blue" | "pink";

const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children, initialTheme }: any) => {
    const [theme, setTheme] = useState<Theme>("dark");

    useEffect(() => {
        if (initialTheme) {
            setTheme(initialTheme);
        }
    }, [initialTheme]);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);