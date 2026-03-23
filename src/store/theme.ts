import { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark" | "blue" | "pink";

const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: any) => {
    const [theme, setTheme] = useState<Theme>("light");

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value= {{ theme, setTheme }
}>
    { children }
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);